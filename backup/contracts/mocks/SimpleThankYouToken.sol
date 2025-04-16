// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleRedEnvelope
 * @dev A simple mock red envelope contract for testing
 */
contract SimpleRedEnvelope is ERC721, Ownable {
    // Token ID counter
    uint256 private _tokenIdCounter;

    // Mapping from address to token ID
    mapping(address => uint256) private _userTokens;

    // Mapping from token ID to rarity level
    mapping(uint256 => uint256) private _tokenRarities;

    // Base URI for token metadata
    string private _baseTokenURI;

    constructor() ERC721("RedDragon Red Envelope", "RDENV") {
        _tokenIdCounter = 0;
    }

    /**
     * @dev Mint a new red envelope to the specified address
     * @param to The address to mint the token to
     * @param rarity The rarity level of the token
     */
    function mint(address to, uint256 rarity) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(_userTokens[to] == 0, "User already has a red envelope");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);
        _userTokens[to] = tokenId;
        _tokenRarities[tokenId] = rarity;
    }

    /**
     * @dev Set the base URI for token metadata
     * @param baseURI The new base URI
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Get the base URI for token metadata
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Check if a user has a red envelope
     * @param user The address to check
     * @return bool Whether the user has a red envelope
     */
    function hasRedEnvelope(address user) public view returns (bool) {
        return _userTokens[user] != 0;
    }

    /**
     * @dev Calculate the boost for a user based on their red envelope
     * @param user The address to calculate the boost for
     * @return uint256 The boost percentage (in basis points)
     */
    function calculateBoost(address user) public view returns (uint256) {
        if (hasRedEnvelope(user)) {
            uint256 tokenId = _userTokens[user];
            uint256 rarity = _tokenRarities[tokenId];
            // Simple boost calculation: rarity * 10 basis points
            return rarity * 10;
        }
        return 0;
    }
} 