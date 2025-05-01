// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DragonPartnerRegistry
 * @dev Registry for Dragon ecosystem partners
 * Tracks partner details, fee sharing, and probability boosts
 */
contract DragonPartnerRegistry is Ownable {
    struct Partner {
        string name;
        uint256 feeShare; // Basis points (e.g., 5000 = 50%)
        uint256 probabilityBoost; // Basis points (e.g., 200 = 2%)
        bool isActive;
    }
    
    // Partner data
    mapping(address => Partner) public partners;
    mapping(address => bool) public authorizedDistributors;
    address[] public partnerList;
    
    // Default probability boost for all partners (690 = 6.9%)
    uint256 public defaultProbabilityBoost = 690;
    
    // Events
    event PartnerAdded(address indexed partner, string name, uint256 feeShare, uint256 probabilityBoost);
    event PartnerUpdated(address indexed partner, string name, uint256 feeShare, uint256 probabilityBoost);
    event PartnerDeactivated(address indexed partner);
    event DistributorAuthorized(address indexed distributor, bool authorized);
    event DefaultProbabilityBoostUpdated(uint256 newDefaultBoost);
    
    /**
     * @dev Set the default probability boost for all partners
     * @param boost Default probability boost in basis points (e.g., 690 = 6.9%)
     */
    function setDefaultProbabilityBoost(uint256 boost) external onlyOwner {
        require(boost <= 690, "Probability boost cannot exceed 6.9%");
        defaultProbabilityBoost = boost;
        emit DefaultProbabilityBoostUpdated(boost);
    }
    
    /**
     * @dev Add a new partner to the registry with default probability boost
     * @param partnerAddress Address of the partner
     * @param name Name of the partner
     * @param feeShare Fee share in basis points (e.g., 5000 = 50%)
     */
    function addPartnerWithDefaultBoost(
        address partnerAddress,
        string memory name,
        uint256 feeShare
    ) external onlyOwner {
        addPartner(partnerAddress, name, feeShare, defaultProbabilityBoost);
    }
    
    /**
     * @dev Add a new partner to the registry
     * @param partnerAddress Address of the partner
     * @param name Name of the partner
     * @param feeShare Fee share in basis points (e.g., 5000 = 50%)
     * @param probabilityBoost Probability boost in basis points (e.g., 200 = 2%)
     */
    function addPartner(
        address partnerAddress,
        string memory name,
        uint256 feeShare,
        uint256 probabilityBoost
    ) public onlyOwner {
        require(partnerAddress != address(0), "Partner address cannot be zero");
        require(feeShare <= 10000, "Fee share cannot exceed 100%");
        require(probabilityBoost <= 690, "Probability boost cannot exceed 6.9%");
        require(!partners[partnerAddress].isActive, "Partner already exists");
        
        partners[partnerAddress] = Partner({
            name: name,
            feeShare: feeShare,
            probabilityBoost: probabilityBoost,
            isActive: true
        });
        
        partnerList.push(partnerAddress);
        
        emit PartnerAdded(partnerAddress, name, feeShare, probabilityBoost);
    }
    
    /**
     * @dev Update an existing partner's details
     * @param partnerAddress Address of the partner
     * @param name New name of the partner
     * @param feeShare New fee share in basis points
     * @param probabilityBoost New probability boost in basis points
     */
    function updatePartner(
        address partnerAddress,
        string memory name,
        uint256 feeShare,
        uint256 probabilityBoost
    ) public onlyOwner {
        require(partnerAddress != address(0), "Partner address cannot be zero");
        require(feeShare <= 10000, "Fee share cannot exceed 100%");
        require(probabilityBoost <= 690, "Probability boost cannot exceed 6.9%");
        require(partners[partnerAddress].isActive, "Partner does not exist");
        
        partners[partnerAddress].name = name;
        partners[partnerAddress].feeShare = feeShare;
        partners[partnerAddress].probabilityBoost = probabilityBoost;
        
        emit PartnerUpdated(partnerAddress, name, feeShare, probabilityBoost);
    }
    
    /**
     * @dev Update an existing partner's details with default probability boost
     * @param partnerAddress Address of the partner
     * @param name New name of the partner
     * @param feeShare New fee share in basis points
     */
    function updatePartnerWithDefaultBoost(
        address partnerAddress,
        string memory name,
        uint256 feeShare
    ) external onlyOwner {
        updatePartner(partnerAddress, name, feeShare, defaultProbabilityBoost);
    }
    
    /**
     * @dev Deactivate a partner
     * @param partnerAddress Address of the partner to deactivate
     */
    function deactivatePartner(address partnerAddress) external onlyOwner {
        require(partners[partnerAddress].isActive, "Partner not active");
        
        partners[partnerAddress].isActive = false;
        
        emit PartnerDeactivated(partnerAddress);
    }
    
    /**
     * @dev Set authorization for a distributor
     * @param distributor Address of the distributor
     * @param authorized Whether the distributor is authorized
     */
    function setDistributorAuthorization(address distributor, bool authorized) external onlyOwner {
        require(distributor != address(0), "Distributor address cannot be zero");
        
        authorizedDistributors[distributor] = authorized;
        
        emit DistributorAuthorized(distributor, authorized);
    }
    
    /**
     * @dev Check if a partner is active
     * @param partnerAddress Address of the partner
     * @return True if partner is active
     */
    function isPartnerActive(address partnerAddress) external view returns (bool) {
        return partners[partnerAddress].isActive;
    }
    
    /**
     * @dev Get partner details
     * @param partnerAddress Address of the partner
     * @return name Name of the partner
     * @return feeShare Fee share in basis points
     * @return probabilityBoost Probability boost in basis points
     * @return isActive Whether the partner is active
     */
    function getPartnerDetails(address partnerAddress) external view returns (
        string memory name,
        uint256 feeShare,
        uint256 probabilityBoost,
        bool isActive
    ) {
        Partner storage partner = partners[partnerAddress];
        return (
            partner.name,
            partner.feeShare,
            partner.probabilityBoost,
            partner.isActive
        );
    }
    
    /**
     * @dev Get the total number of partners
     * @return Number of partners
     */
    function getPartnerCount() external view returns (uint256) {
        return partnerList.length;
    }
    
    /**
     * @dev Check if a distributor is authorized
     * @param distributor Address of the distributor
     * @return True if the distributor is authorized
     */
    function isDistributorAuthorized(address distributor) external view returns (bool) {
        return authorizedDistributors[distributor];
    }
} 