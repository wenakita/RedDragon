// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./RedDragonSwapLottery.sol";

/**
 * @dev Interface for PaintSwap's VRF
 */
interface IPaintSwapVRF {
    function requestRandomness() external returns (bytes32);
    function fulfillRandomness(bytes32 requestId, uint256[] memory randomWords) external;
}

/**
 * @title RedDragonThankYouToken
 * @dev A special NFT that grants the holder a 0.69% boost in the RedDragonSwapLottery
 * Created to cryptographically thank contributors on the blockchain
 */
contract RedDragonThankYouTokenMulti is ERC721, Ownable {
    using Strings for uint256;
    
    // Reference to the lottery contract
    RedDragonSwapLottery public lottery;
    
    // Reference to PaintSwap VRF
    IPaintSwapVRF public paintSwapVRF;
    
    // Boost parameters
    uint256 public constant THANK_YOU_BOOST = 69; // 0.69% boost (69/10000)
    uint256 public constant BOOST_PRECISION = 10000;
    
    // Token metadata
    string public baseURI;
    
    // The recipient of the thank you token
    // List of recipients who will receive thank you tokens
    address[] public recipients = [
        0x3291B1aE6B74d59a4334bBA0257873Dda5d18115,
        0xD2AfB6Acb56f35AFB861114c74703c53Fe6217bd
    ];
    
    // Store method signatures (4-byte selectors) instead of transaction hashes
    // These represent the VRF methods used in the integration
    bytes4[] public commemoratedMethodSignatures;
    
    // Token tracking
    uint256 private _nextTokenId;
    
    // Custom token metadata
    string public thankYouMessage;
    
    // Track if the token has been minted
    bool public hasMinted;
    
    // VRF request tracking
    struct PendingMint {
        string message;
    }
    mapping(bytes32 => PendingMint) public pendingMints;
    
    // Events
    event ThankYouTokenMinted(address indexed recipient, uint256 indexed tokenId, bytes4[] methodSignatures);
    event RandomnessRequested(bytes32 indexed requestId);
    event RandomnessReceived(bytes32 indexed requestId, uint256 randomness);
    
    /**
     * @dev Constructor
     * @param _lottery Address of the RedDragonSwapLottery contract
     * @param _vrfProvider Address of the PaintSwap VRF provider
     * @param _methodSignatures Array of method signatures to commemorate
     * @param _message Thank you message to include with the token
     */
    constructor(
        address _lottery, 
        address _vrfProvider, 
        bytes4[] memory _methodSignatures,
        string memory _message
    ) ERC721("RedDragon Thank You Token", "RDTHANKS") {
        require(_lottery != address(0), "Lottery address cannot be zero");
        require(_vrfProvider != address(0), "VRF provider address cannot be zero");
        require(_methodSignatures.length > 0, "Must provide at least one method signature");
        
        lottery = RedDragonSwapLottery(_lottery);
        paintSwapVRF = IPaintSwapVRF(_vrfProvider);
        commemoratedMethodSignatures = _methodSignatures;
        thankYouMessage = _message;
        hasMinted = false;
    }
    
    /**
     * @dev Start the minting process using PaintSwap VRF (can only be called by the owner)
     */
    function startMintWithVRF() external onlyOwner {
        // Can only mint once
        require(!hasMinted, "Token has already been minted");
        
        // Request randomness from PaintSwap VRF
        bytes32 requestId = paintSwapVRF.requestRandomness();
        
        // Store pending mint details
        pendingMints[requestId] = PendingMint({
            message: thankYouMessage
        });
        
        emit RandomnessRequested(requestId);
    }
    
    /**
     * @dev Callback function called by PaintSwap VRF when randomness is ready
     * @param requestId The ID of the randomness request
     * @param randomWords The random values generated
     */
    function fulfillRandomness(bytes32 requestId, uint256[] memory randomWords) external {
        require(msg.sender == address(paintSwapVRF), "Only VRF provider can fulfill");
        require(randomWords.length > 0, "No random values provided");
        
        PendingMint memory pendingMint = pendingMints[requestId];
        require(bytes(pendingMint.message).length > 0, "Request not found");
        
        emit RandomnessReceived(requestId, randomWords[0]);
        
        // Mark as minted
        hasMinted = true;
        
        // Mint the token with randomness influencing the token ID
        uint256 tokenId = _nextTokenId;
        // Mint tokens to all recipients
        for (uint256 i = 0; i < recipients.length; i++) {
            _safeMint(recipients[i], tokenId + i);
        }
        _nextTokenId += recipients.length;
        
        // Clean up
        delete pendingMints[requestId];
        
        for (uint256 i = 0; i < recipients.length; i++) {
            emit ThankYouTokenMinted(recipients[i], tokenId + i, commemoratedMethodSignatures);
        }
    }
    
    /**
     * @dev Manual minting function in case VRF fails (emergency use only)
     * This allows minting without requiring a VRF callback
     * Only callable by the owner
     */
    function manualMintWithoutVRF() external onlyOwner {
        // Can only mint once
        require(!hasMinted, "Token has already been minted");
        
        // Mark as minted
        hasMinted = true;
        
        // Mint tokens to all recipients
        uint256 tokenId = _nextTokenId;
        for (uint256 i = 0; i < recipients.length; i++) {
            _safeMint(recipients[i], tokenId + i);
        }
        _nextTokenId += recipients.length;
        
        // Emit events for each minted token
        for (uint256 i = 0; i < recipients.length; i++) {
            emit ThankYouTokenMinted(recipients[i], tokenId + i, commemoratedMethodSignatures);
        }
    }
    
    /**
     * @dev Set the base URI for token metadata
     * @param _baseURI New base URI
     */
    function setBaseURI(string memory _baseURI) external onlyOwner {
        baseURI = _baseURI;
    }
    
    /**
     * @dev Get token URI
     * @param tokenId Token ID
     * @return URI for the token metadata
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        
        return string(abi.encodePacked(baseURI, tokenId.toString()));
    }
    
    /**
     * @dev Get the thank you message for the token
     * @return Thank you message
     */
    function getThankYouMessage() external view returns (string memory) {
        return thankYouMessage;
    }
    
    /**
     * @dev Get method signatures being commemorated
     * @return Array of VRF method signatures
     */
    function getCommemorationMethodSignatures() external view returns (bytes4[] memory) {
        return commemoratedMethodSignatures;
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
    
    /**
     * @dev Update the PaintSwap VRF provider address
     * @param _vrfProvider New VRF provider address
     */
    function setVrfProvider(address _vrfProvider) external onlyOwner {
        require(_vrfProvider != address(0), "VRF provider cannot be zero address");
        paintSwapVRF = IPaintSwapVRF(_vrfProvider);
    }
    
    /**
     * @dev Internal function to check if a token exists
     * @param tokenId Token ID to check
     * @return True if the token exists
     */
    function _exists(uint256 tokenId) internal view virtual override returns (bool) {
        return tokenId < _nextTokenId && _ownerOf(tokenId) != address(0);
    }
} 