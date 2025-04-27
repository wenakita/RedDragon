// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DragonPartnerRegistry
 * @dev Registry for partner information and fee sharing
 * Partners can be integrated with Dragon's DEX swapping systems
 */
contract DragonPartnerRegistry is Ownable {
    using SafeERC20 for IERC20;
    
    struct Partner {
        address partnerAddress;      // Partner's wallet/contract address
        string name;                 // Partner name for identification
        uint256 feeShare;            // Partner's percentage of fees in basis points (10000 = 100%)
        bool isActive;               // Whether partner is currently active
        uint256 totalFeesEarned;     // Total fees earned by this partner
        uint256 createdAt;           // When the partner was added (timestamp)
        uint256 probabilityBoost;    // Partner's probability boost in basis points (10000 = 100%)
    }
    
    // Partner mapping: ID => Partner data
    mapping(uint256 => Partner) public partners;
    
    // Partner address to ID mapping for quick lookup
    mapping(address => uint256) public partnerIdByAddress;
    
    // Counter for generating unique partner IDs
    uint256 public nextPartnerId = 1;
    
    // Authorized distributor contracts that can record fee distributions
    mapping(address => bool) public authorizedDistributors;
    
    // Fee cap to prevent excessive fee sharing
    uint256 public maxFeeShare = 5000; // 50% max fee share (in basis points)
    
    // Probability boost cap 
    uint256 public maxProbabilityBoost = 690; // 6.9% max probability boost (in basis points)
    
    // Events
    event PartnerAdded(uint256 indexed partnerId, address indexed partnerAddress, string name, uint256 feeShare);
    event PartnerUpdated(uint256 indexed partnerId, uint256 feeShare, bool isActive);
    event PartnerProbabilityBoostUpdated(uint256 indexed partnerId, uint256 probabilityBoost);
    event PartnerFeeDistributed(uint256 indexed partnerId, address indexed token, uint256 amount);
    event DistributorAuthorized(address indexed distributor, bool isAuthorized);
    event MaxFeeShareUpdated(uint256 newMaxFeeShare);
    event MaxProbabilityBoostUpdated(uint256 newMaxProbabilityBoost);
    
    /**
     * @dev Add a new partner to the registry
     * @param _partnerAddress Address of partner's wallet/contract
     * @param _name Name for the partner
     * @param _feeShare Fee share in basis points (e.g., 1000 = 10%)
     * @param _probabilityBoost Probability boost in basis points (e.g., 100 = 1%)
     * @return partnerId ID of the newly created partner
     */
    function addPartner(
        address _partnerAddress, 
        string calldata _name, 
        uint256 _feeShare,
        uint256 _probabilityBoost
    ) external onlyOwner returns (uint256 partnerId) {
        require(_partnerAddress != address(0), "Partner address cannot be zero");
        require(_feeShare <= maxFeeShare, "Fee share exceeds maximum allowed");
        require(_probabilityBoost <= maxProbabilityBoost, "Probability boost exceeds maximum allowed");
        require(partnerIdByAddress[_partnerAddress] == 0, "Partner with this address already exists");
        
        partnerId = nextPartnerId++;
        
        partners[partnerId] = Partner({
            partnerAddress: _partnerAddress,
            name: _name,
            feeShare: _feeShare,
            isActive: true,
            totalFeesEarned: 0,
            createdAt: block.timestamp,
            probabilityBoost: _probabilityBoost
        });
        
        partnerIdByAddress[_partnerAddress] = partnerId;
        
        emit PartnerAdded(partnerId, _partnerAddress, _name, _feeShare);
        if (_probabilityBoost > 0) {
            emit PartnerProbabilityBoostUpdated(partnerId, _probabilityBoost);
        }
        
        return partnerId;
    }
    
    /**
     * @dev Update an existing partner's details
     * @param _partnerId ID of the partner to update
     * @param _feeShare New fee share in basis points
     * @param _isActive New active status
     */
    function updatePartner(
        uint256 _partnerId,
        uint256 _feeShare,
        bool _isActive
    ) external onlyOwner {
        require(partners[_partnerId].partnerAddress != address(0), "Partner does not exist");
        require(_feeShare <= maxFeeShare, "Fee share exceeds maximum allowed");
        
        partners[_partnerId].feeShare = _feeShare;
        partners[_partnerId].isActive = _isActive;
        
        emit PartnerUpdated(_partnerId, _feeShare, _isActive);
    }
    
    /**
     * @dev Update an existing partner's probability boost
     * @param _partnerId ID of the partner to update
     * @param _probabilityBoost New probability boost in basis points
     */
    function updatePartnerProbabilityBoost(
        uint256 _partnerId,
        uint256 _probabilityBoost
    ) external onlyOwner {
        require(partners[_partnerId].partnerAddress != address(0), "Partner does not exist");
        require(_probabilityBoost <= maxProbabilityBoost, "Probability boost exceeds maximum allowed");
        
        partners[_partnerId].probabilityBoost = _probabilityBoost;
        
        emit PartnerProbabilityBoostUpdated(_partnerId, _probabilityBoost);
    }
    
    /**
     * @dev Set the maximum allowed fee share
     * @param _maxFeeShare New maximum fee share in basis points
     */
    function setMaxFeeShare(uint256 _maxFeeShare) external onlyOwner {
        require(_maxFeeShare <= 10000, "Max fee share cannot exceed 100%");
        maxFeeShare = _maxFeeShare;
        
        emit MaxFeeShareUpdated(_maxFeeShare);
    }
    
    /**
     * @dev Set the maximum allowed probability boost
     * @param _maxProbabilityBoost New maximum probability boost in basis points
     */
    function setMaxProbabilityBoost(uint256 _maxProbabilityBoost) external onlyOwner {
        require(_maxProbabilityBoost <= 1000, "Max probability boost cannot exceed 10%");
        maxProbabilityBoost = _maxProbabilityBoost;
        
        emit MaxProbabilityBoostUpdated(_maxProbabilityBoost);
    }
    
    /**
     * @dev Record fees distributed to a partner
     * @param _partnerId ID of the partner
     * @param _token Address of the token distributed
     * @param _amount Amount of tokens distributed
     */
    function recordFeeDistribution(
        uint256 _partnerId,
        address _token,
        uint256 _amount
    ) external {
        require(msg.sender == owner() || authorizedDistributors[msg.sender], "Not authorized");
        require(partners[_partnerId].partnerAddress != address(0), "Partner does not exist");
        
        partners[_partnerId].totalFeesEarned += _amount;
        
        emit PartnerFeeDistributed(_partnerId, _token, _amount);
    }
    
    /**
     * @dev Authorize or deauthorize a distributor contract
     * @param _distributor Address of the distributor contract
     * @param _isAuthorized Whether the distributor is authorized
     */
    function setDistributorAuthorization(address _distributor, bool _isAuthorized) external onlyOwner {
        authorizedDistributors[_distributor] = _isAuthorized;
        
        emit DistributorAuthorized(_distributor, _isAuthorized);
    }
    
    /**
     * @dev Check if an address is an approved partner
     * @param _address Address to check
     * @return Whether the address is an approved partner
     */
    function isApprovedPartner(address _address) external view returns (bool) {
        uint256 partnerId = partnerIdByAddress[_address];
        if (partnerId == 0) return false;
        return partners[partnerId].isActive;
    }
    
    /**
     * @dev Get partner details by ID
     * @param _partnerId ID of the partner
     * @return partnerAddress Partner's address
     * @return name Partner's name
     * @return feeShare Partner's fee share
     * @return isActive Whether partner is active
     * @return totalFeesEarned Total fees earned by partner
     */
    function getPartner(uint256 _partnerId) external view returns (
        address partnerAddress,
        string memory name,
        uint256 feeShare,
        bool isActive,
        uint256 totalFeesEarned
    ) {
        Partner storage partner = partners[_partnerId];
        require(partner.partnerAddress != address(0), "Partner does not exist");
        
        return (
            partner.partnerAddress,
            partner.name,
            partner.feeShare,
            partner.isActive,
            partner.totalFeesEarned
        );
    }
    
    /**
     * @dev Get partner extended details by ID (includes probability boost)
     * @param _partnerId ID of the partner
     * @return partnerAddress Partner's address
     * @return name Partner's name
     * @return feeShare Partner's fee share
     * @return isActive Whether partner is active
     * @return totalFeesEarned Total fees earned by partner
     * @return probabilityBoost Partner's probability boost
     */
    function getPartnerExtended(uint256 _partnerId) external view returns (
        address partnerAddress,
        string memory name,
        uint256 feeShare,
        bool isActive,
        uint256 totalFeesEarned,
        uint256 probabilityBoost
    ) {
        Partner storage partner = partners[_partnerId];
        require(partner.partnerAddress != address(0), "Partner does not exist");
        
        return (
            partner.partnerAddress,
            partner.name,
            partner.feeShare,
            partner.isActive,
            partner.totalFeesEarned,
            partner.probabilityBoost
        );
    }
    
    /**
     * @dev Get partner ID by address
     * @param _address Partner's address
     * @return partnerId ID of the partner (0 if not found)
     */
    function getPartnerIdByAddress(address _address) external view returns (uint256) {
        return partnerIdByAddress[_address];
    }
    
    /**
     * @dev Get partner's fee share by address
     * @param _address Partner's address
     * @return feeShare Partner's fee share (0 if not found or inactive)
     */
    function getPartnerFeeShare(address _address) external view returns (uint256) {
        uint256 partnerId = partnerIdByAddress[_address];
        if (partnerId == 0 || !partners[partnerId].isActive) return 0;
        return partners[partnerId].feeShare;
    }
    
    /**
     * @dev Get partner's probability boost by address
     * @param _address Partner's address
     * @return probabilityBoost Partner's probability boost (0 if not found or inactive)
     */
    function getPartnerProbabilityBoost(address _address) external view returns (uint256) {
        uint256 partnerId = partnerIdByAddress[_address];
        if (partnerId == 0 || !partners[partnerId].isActive) return 0;
        return partners[partnerId].probabilityBoost;
    }
} 