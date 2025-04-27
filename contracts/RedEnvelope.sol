// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IPromotionalItem.sol";

/**
 * @title RedEnvelope
 * @dev NFT that grants a fixed 0.69% probability boost in the lottery
 * Features:
 * - Fixed 0.69% probability boost for all holders
 * - No variable boosts based on rarity or early adopter status
 * - Permanent boost as long as user holds the envelope
 */
contract RedEnvelope is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard, IPromotionalItem {
    // Constants for boost calculations
    uint256 private constant BOOST_PRECISION = 10000; // For 0.01% precision
    uint256 private constant FIXED_BOOST = 69; // Fixed 0.69% boost for all envelopes
    
    // Token metadata
    string private _baseTokenURI;
    
    // Envelope properties
    struct EnvelopeProperties {
        uint256 mintTimestamp;
        uint256 usageCount; // Track how many times the boost has been used
    }
    
    // Mapping of token ID to properties
    mapping(uint256 => EnvelopeProperties) public envelopeProperties;
    
    // Community contribution tracking
    mapping(address => uint256) public userContributions;
    uint256 public totalCommunityContributions;
    
    // Special recipients
    address[] public specialRecipients = [
        0xD2AfB6Acb56f35AFB861114c74703c53Fe6217bd,
        0x7e021Ec4c9aaaA433402683B4faFc0699179796b,
        0x9D59D329Cf88f58a6d7E8860Db3f72b287a74471
    ];
    
    // Events
    event EnvelopeMinted(address indexed to, uint256 tokenId);
    event CommunityContribution(address indexed user, uint256 amount);
    event BoostCalculated(address indexed user, uint256 boostAmount);
    event SpecialEnvelopesMinted(address[] recipients);
    
    uint256 private _nextTokenId = 1;
    
    /**
     * @dev Constructor
     * @param name Name of the token
     * @param symbol Symbol of the token
     * @param baseTokenURI Base URI for token metadata
     */
    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) {
        _baseTokenURI = baseTokenURI;
    }
    
    /**
     * @dev Implementation of IPromotionalItem.getItemType
     * @return "ENVELOPE" as the item type identifier
     */
    function getItemType() external pure override returns (string memory) {
        return "ENVELOPE";
    }
    
    /**
     * @dev Implementation of IPromotionalItem.getBoostType
     * @return BoostType.PROBABILITY as this is a probability boost
     */
    function getBoostType() external pure override returns (BoostType) {
        return BoostType.PROBABILITY;
    }
    
    /**
     * @dev Implementation of IPromotionalItem.getTransferType
     * @return TransferType.FREELY_TRANSFERABLE as envelopes can be freely transferred
     */
    function getTransferType() external pure override returns (TransferType) {
        return TransferType.FREELY_TRANSFERABLE;
    }
    
    /**
     * @dev Implementation of IPromotionalItem.applyItem
     * Applies the envelope to boost a transaction
     * @param itemId ID of the envelope
     * @param user User address
     * @param amount Base amount (unused for probability boosts)
     * @return isSuccess Whether application was successful
     * @return amount The original amount (unchanged for probability boosts)
     */
    function applyItem(uint256 itemId, address user, uint256 amount) external override returns (bool isSuccess, uint256) {
        // Check if user owns the item
        if (!hasItem(user, itemId)) {
            return (false, amount);
        }
        
        // For probability boosts, we don't modify the amount
        // The boost is applied separately in the lottery contract
        
        // Increment usage count
        envelopeProperties[itemId].usageCount++;
        
        return (true, amount);
    }
    
    /**
     * @dev Implementation of IPromotionalItem.hasItem
     * @param user User address
     * @param itemId ID of the envelope
     * @return True if user owns the item
     */
    function hasItem(address user, uint256 itemId) public view override returns (bool) {
        try this.ownerOf(itemId) returns (address owner) {
            return owner == user;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Implementation of IPromotionalItem.calculateBoost
     * @param user User address
     * @param itemId Item ID (unused, we just check if user owns any envelope)
     * @return The fixed 0.69% boost amount
     */
    function calculateBoost(address user, uint256 itemId) external view override returns (uint256) {
        if (hasItem(user, itemId)) {
            return FIXED_BOOST; // Fixed 0.69% boost
        }
        return 0;
    }
    
    /**
     * @dev Mint a new red envelope
     * @param to Recipient address
     */
    function mint(address to) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        
        uint256 tokenId = _nextTokenId;
        _safeMint(to, tokenId);
        
        envelopeProperties[tokenId] = EnvelopeProperties({
            mintTimestamp: block.timestamp,
            usageCount: 0
        });
        
        _nextTokenId++;
        
        emit EnvelopeMinted(to, tokenId);
    }
    
    /**
     * @dev Record a community contribution
     * @param user User making the contribution
     * @param amount Contribution amount
     */
    function recordContribution(address user, uint256 amount) external onlyOwner {
        userContributions[user] += amount;
        totalCommunityContributions += amount;
        
        emit CommunityContribution(user, amount);
    }
    
    /**
     * @dev Check if a user has a red envelope
     * @param user User to check
     * @return bool True if user has at least one envelope
     */
    function hasRedEnvelope(address user) external view returns (bool) {
        return balanceOf(user) > 0;
    }
    
    /**
     * @dev Calculate boost amount for a user - always returns the fixed 0.69% boost
     * @param _user Address of the user to calculate boost for
     * @return boostAmount The fixed boost amount (69 = 0.69%)
     */
    function calculateBoost(address _user) external view returns (uint256) {
        if (balanceOf(_user) == 0) {
            return 0; // No boost for non-holders
        }

        // Return fixed 0.69% boost
        return FIXED_BOOST;
    }
    
    /**
     * @dev Set the base token URI
     * @param baseTokenURI New base URI
     */
    function setBaseTokenURI(string memory baseTokenURI) external onlyOwner {
        _baseTokenURI = baseTokenURI;
    }
    
    /**
     * @dev Get the base token URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Mint red envelopes to special recipients
     */
    function mintSpecialEnvelopes() external onlyOwner {
        for (uint256 i = 0; i < specialRecipients.length; i++) {
            address recipient = specialRecipients[i];
            uint256 tokenId = _nextTokenId;
            _safeMint(recipient, tokenId);
            
            envelopeProperties[tokenId] = EnvelopeProperties({
                mintTimestamp: block.timestamp,
                usageCount: 0
            });
            
            _nextTokenId++;
            
            emit EnvelopeMinted(recipient, tokenId);
        }
        
        emit SpecialEnvelopesMinted(specialRecipients);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
} 