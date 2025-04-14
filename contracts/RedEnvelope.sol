// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title RedEnvelope
 * @dev NFT that grants special boosts in the lottery based on ownership and other factors
 * Features:
 * - Different boost tiers based on envelope rarity
 * - Usage-based boost decrease
 * - Special boosts for early adopters
 * - Community contribution boosts
 */
contract RedEnvelope is ERC721Enumerable, Ownable, ReentrancyGuard {
    // Constants for boost calculations
    uint256 private constant BOOST_PRECISION = 10000; // For 0.01% precision
    uint256 private constant MAX_BOOST = 1000; // Maximum 10% boost per envelope
    
    // Token metadata
    string private baseTokenURI;
    
    // Envelope properties
    struct EnvelopeProperties {
        uint256 rarity; // 1-5 (1 = common, 5 = legendary)
        uint256 mintTimestamp;
        uint256 communityScore;
        bool isEarlyAdopter;
        uint256 usageCount; // Track how many times the boost has been used
    }
    
    // Mapping of token ID to properties
    mapping(uint256 => EnvelopeProperties) public envelopeProperties;
    
    // Community contribution tracking
    mapping(address => uint256) public userContributions;
    uint256 public totalCommunityContributions;
    
    // Special recipients
    address[] public specialRecipients = [
        0x3291B1aE6B74d59a4334bBA0257873Dda5d18115,
        0xD2AfB6Acb56f35AFB861114c74703c53Fe6217bd
    ];
    
    // Events
    event EnvelopeMinted(address indexed to, uint256 tokenId, uint256 rarity);
    event CommunityContribution(address indexed user, uint256 amount);
    event BoostCalculated(address indexed user, uint256 boostAmount);
    event SpecialEnvelopesMinted(address[] recipients, uint256 rarity);
    
    /**
     * @dev Constructor
     * @param _name Name of the token
     * @param _symbol Symbol of the token
     * @param _baseTokenURI Base URI for token metadata
     */
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseTokenURI
    ) ERC721(_name, _symbol) {
        baseTokenURI = _baseTokenURI;
    }
    
    /**
     * @dev Mint a new red envelope
     * @param to Recipient address
     * @param rarity Rarity level (1-5)
     * @param isEarlyAdopter Whether the recipient is an early adopter
     */
    function mint(address to, uint256 rarity, bool isEarlyAdopter) external onlyOwner {
        require(rarity >= 1 && rarity <= 5, "Invalid rarity");
        
        uint256 tokenId = totalSupply() + 1;
        _safeMint(to, tokenId);
        
        envelopeProperties[tokenId] = EnvelopeProperties({
            rarity: rarity,
            mintTimestamp: block.timestamp,
            communityScore: 0,
            isEarlyAdopter: isEarlyAdopter,
            usageCount: 0
        });
        
        emit EnvelopeMinted(to, tokenId, rarity);
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
     * @dev Calculate boost for a user
     * @param user User to calculate boost for
     * @return boostAmount The boost amount in BOOST_PRECISION units
     */
    function calculateBoost(address user) external returns (uint256) {
        uint256 totalBoost = 0;
        uint256 tokenCount = balanceOf(user);
        
        if (tokenCount == 0) {
            return 0;
        }
        
        // Calculate boost from each envelope
        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            EnvelopeProperties storage props = envelopeProperties[tokenId];
            
            // Base boost from rarity (0.2% per rarity level)
            uint256 rarityBoost = props.rarity * 20; // 20 = 0.2% in BOOST_PRECISION
            
            // Usage-based boost decrease (0.01% per use)
            uint256 usageDecrease = props.usageCount * 1; // 1 = 0.01% in BOOST_PRECISION
            
            // Community contribution boost
            uint256 contributionBoost = calculateContributionBoost(user);
            
            // Early adopter bonus
            uint256 earlyAdopterBoost = props.isEarlyAdopter ? 100 : 0; // 1% bonus
            
            // Calculate total boost for this envelope
            uint256 tokenBoost = rarityBoost + contributionBoost + earlyAdopterBoost;
            
            // Apply usage decrease
            if (tokenBoost > usageDecrease) {
                tokenBoost -= usageDecrease;
            } else {
                tokenBoost = 0;
            }
            
            // Cap the boost per envelope
            if (tokenBoost > MAX_BOOST) {
                tokenBoost = MAX_BOOST;
            }
            
            // Increment usage count
            props.usageCount++;
            
            // Add to total boost
            totalBoost += tokenBoost;
        }
        
        emit BoostCalculated(user, totalBoost);
        return totalBoost;
    }
    
    /**
     * @dev Calculate contribution-based boost
     * @param user User to calculate for
     * @return boostAmount Contribution-based boost amount
     */
    function calculateContributionBoost(address user) internal view returns (uint256) {
        if (totalCommunityContributions == 0) {
            return 0;
        }
        
        // Boost is proportional to user's contribution percentage
        // Max 1% boost for top contributors
        uint256 userPercentage = (userContributions[user] * 100) / totalCommunityContributions;
        return userPercentage > 100 ? 100 : userPercentage; // Cap at 1%
    }
    
    /**
     * @dev Set the base token URI
     * @param _baseTokenURI New base URI
     */
    function setBaseTokenURI(string memory _baseTokenURI) external onlyOwner {
        baseTokenURI = _baseTokenURI;
    }
    
    /**
     * @dev Get the base token URI
     */
    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }
    
    /**
     * @dev Mint red envelopes to special recipients
     * @param rarity Rarity level (1-5) for the envelopes
     */
    function mintSpecialEnvelopes(uint256 rarity) external onlyOwner {
        require(rarity >= 1 && rarity <= 5, "Invalid rarity");
        
        for (uint256 i = 0; i < specialRecipients.length; i++) {
            address recipient = specialRecipients[i];
            uint256 tokenId = totalSupply() + 1;
            _safeMint(recipient, tokenId);
            
            envelopeProperties[tokenId] = EnvelopeProperties({
                rarity: rarity,
                mintTimestamp: block.timestamp,
                communityScore: 0,
                isEarlyAdopter: true, // Special recipients are considered early adopters
                usageCount: 0
            });
            
            emit EnvelopeMinted(recipient, tokenId, rarity);
        }
        
        emit SpecialEnvelopesMinted(specialRecipients, rarity);
    }
} 