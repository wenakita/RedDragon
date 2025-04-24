// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
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
contract RedEnvelope is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {
    // Constants for boost calculations
    uint256 private constant BOOST_PRECISION = 10000; // For 0.01% precision
    uint256 private constant MAX_BOOST = 1000; // Maximum 10% boost per envelope
    uint256 private constant BASE_BOOST = 100; // Base 1x boost (100%)
    uint256 private constant RARITY_BOOST_MULTIPLIER = 50; // 50% boost per rarity level
    
    // Token metadata
    string private _baseTokenURI;
    
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
        0xD2AfB6Acb56f35AFB861114c74703c53Fe6217bd,
        0x7e021Ec4c9aaaA433402683B4faFc0699179796b,
        0x9D59D329Cf88f58a6d7E8860Db3f72b287a74471
    ];
    
    // Events
    event EnvelopeMinted(address indexed to, uint256 tokenId, uint256 rarity);
    event CommunityContribution(address indexed user, uint256 amount);
    event BoostCalculated(address indexed user, uint256 boostAmount);
    event SpecialEnvelopesMinted(address[] recipients, uint256 rarity);
    
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
     * @dev Mint a new red envelope
     * @param to Recipient address
     * @param rarity Rarity level (1-5)
     */
    function mint(address to, uint256 rarity) external onlyOwner {
        require(rarity >= 1 && rarity <= 5, "Invalid rarity");
        require(to != address(0), "Cannot mint to zero address");
        
        uint256 tokenId = _nextTokenId;
        _safeMint(to, tokenId);
        
        envelopeProperties[tokenId] = EnvelopeProperties({
            rarity: rarity,
            mintTimestamp: block.timestamp,
            communityScore: 0,
            isEarlyAdopter: false,
            usageCount: 0
        });
        
        _nextTokenId++;
        
        emit EnvelopeMinted(to, tokenId, rarity);
    }
    
    /**
     * @dev Mint a new red envelope with early adopter status
     * @param to Recipient address
     * @param rarity Rarity level (1-5)
     * @param isEarlyAdopter Whether the recipient is an early adopter
     */
    function mintWithEarlyAdopter(address to, uint256 rarity, bool isEarlyAdopter) external onlyOwner {
        require(rarity >= 1 && rarity <= 5, "Invalid rarity");
        require(to != address(0), "Cannot mint to zero address");
        
        uint256 tokenId = _nextTokenId;
        _safeMint(to, tokenId);
        
        envelopeProperties[tokenId] = EnvelopeProperties({
            rarity: rarity,
            mintTimestamp: block.timestamp,
            communityScore: 0,
            isEarlyAdopter: isEarlyAdopter,
            usageCount: 0
        });
        
        _nextTokenId++;
        
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
     * @dev Calculate boost amount for a user based on their red envelope rarity
     * @param _user Address of the user to calculate boost for
     * @return boostAmount The boost amount in percentage (100 = 1x)
     */
    function calculateBoost(address _user) external view returns (uint256) {
        if (balanceOf(_user) == 0) {
            return BASE_BOOST; // Return base boost (100) for non-holders
        }

        // Get the first token ID owned by the user
        uint256 tokenId = tokenOfOwnerByIndex(_user, 0);
        EnvelopeProperties memory props = envelopeProperties[tokenId];
        
        // Calculate boost based on rarity: 1.5x for Common (rarity 1), 1.75x for rarity 2, etc.
        uint256 boost = BASE_BOOST + (props.rarity * 25);
        
        // Add early adopter bonus if applicable
        if (props.isEarlyAdopter) {
            boost += 50; // Additional 50% boost for early adopters
        }
        
        return boost;
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
     * @param rarity Rarity level (1-5) for the envelopes
     */
    function mintSpecialEnvelopes(uint256 rarity) external onlyOwner {
        require(rarity >= 1 && rarity <= 5, "Invalid rarity");
        
        for (uint256 i = 0; i < specialRecipients.length; i++) {
            address recipient = specialRecipients[i];
            uint256 tokenId = _nextTokenId;
            _safeMint(recipient, tokenId);
            
            envelopeProperties[tokenId] = EnvelopeProperties({
                rarity: rarity,
                mintTimestamp: block.timestamp,
                communityScore: 0,
                isEarlyAdopter: true, // Special recipients are considered early adopters
                usageCount: 0
            });
            
            _nextTokenId++;
            
            emit EnvelopeMinted(recipient, tokenId, rarity);
        }
        
        emit SpecialEnvelopesMinted(specialRecipients, rarity);
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