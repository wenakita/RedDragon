// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleThankYouToken
 * @dev A simplified version of the thank you token for testing
 */
contract SimpleThankYouToken is ERC721, Ownable {
    // Boost parameters
    uint256 public constant THANK_YOU_BOOST = 69; // 0.69% boost (69/10000)
    uint256 public constant BOOST_PRECISION = 10000;
    
    // The recipient of the thank you token
    address public constant RECIPIENT = 0x3291B1aE6B74d59a4334bBA0257873Dda5d18115;
    
    // Token metadata
    string public baseURI;
    string public thankYouMessage;
    
    // Store method signatures (4-byte selectors) instead of transaction hashes
    // These represent the VRF methods used in the integration
    bytes4[] public commemoratedMethodSignatures;
    
    // Token tracking
    uint256 private _nextTokenId;
    bool public hasMinted;
    
    /**
     * @dev Constructor
     * @param _message Thank you message to include with the token
     * @param _methodSignatures Array of method signatures (4-byte selectors) to commemorate
     */
    constructor(string memory _message, bytes4[] memory _methodSignatures) 
        ERC721("SimpleThankYou", "THANKS") {
        thankYouMessage = _message;
        commemoratedMethodSignatures = _methodSignatures;
        hasMinted = false;
    }
    
    /**
     * @dev Set the base URI for token metadata
     * @param _baseURI New base URI
     */
    function setBaseURI(string memory _baseURI) external onlyOwner {
        baseURI = _baseURI;
    }
    
    /**
     * @dev Mint the thank you token directly (for testing)
     */
    function mint() external onlyOwner {
        require(!hasMinted, "Token already minted");
        hasMinted = true;
        
        // Mint the token
        uint256 tokenId = _nextTokenId++;
        _safeMint(RECIPIENT, tokenId);
    }
    
    /**
     * @dev Get the number of commemorated method signatures
     * @return The number of commemorated method signatures
     */
    function getCommemorationCount() external view returns (uint256) {
        return commemoratedMethodSignatures.length;
    }
    
    /**
     * @dev Check if an address owns any thank you tokens
     * @param user Address to check
     * @return True if the user owns at least one token
     */
    function hasThankYouToken(address user) public view returns (bool) {
        return balanceOf(user) > 0;
    }
    
    /**
     * @dev Calculate the boost for a user based on token ownership
     * @param user Address to calculate boost for
     * @return Boost amount in lottery probability units
     */
    function calculateBoost(address user) public view returns (uint256) {
        if (hasThankYouToken(user)) {
            return THANK_YOU_BOOST;
        }
        return 0;
    }
} 