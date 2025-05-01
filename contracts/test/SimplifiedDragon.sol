// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IVRFConsumer.sol";

/**
 * @title SimplifiedDragon
 * @dev Simplified Dragon token for testing purposes
 */
contract SimplifiedDragon is ERC20, ERC20Burnable, Ownable {
    // Addresses
    address public wrappedSonicAddress;
    
    // For tests
    address public vrfConsumer;
    
    constructor(
        uint256 initialSupply,
        address _wrappedSonicAddress
    ) ERC20("Dragon Test", "DRAGONTEST") Ownable() {
        if (_wrappedSonicAddress != address(0)) {
            wrappedSonicAddress = _wrappedSonicAddress;
        }
        _mint(msg.sender, initialSupply);
    }
    
    /**
     * @dev Sets the wrapped Sonic address
     * @param _wrappedSonicAddress New wrapped Sonic address
     */
    function setWrappedSonicAddress(address _wrappedSonicAddress) external onlyOwner {
        require(_wrappedSonicAddress != address(0), "wS address cannot be zero");
        wrappedSonicAddress = _wrappedSonicAddress;
    }
    
    /**
     * @dev Set VRF consumer address
     * @param _vrfConsumer New VRF consumer address
     */
    function setVRFConsumer(address _vrfConsumer) external onlyOwner {
        vrfConsumer = _vrfConsumer;
    }
    
    /**
     * @dev Mints new tokens to a specified address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Test function for requesting randomness
     * @param user User to request randomness for
     * @return requestId The request ID
     */
    function testRequestRandomness(address user) external returns (uint256) {
        require(vrfConsumer != address(0), "VRF consumer not set");
        return IVRFConsumer(vrfConsumer).requestRandomness(user);
    }
    
    /**
     * @dev Implementation of processRandomness from IVRFConsumer
     * @param requestId Request ID
     * @param user User address
     * @param randomness Random value
     */
    function processRandomness(uint64 requestId, address user, uint256 randomness) external {
        // Simply a mock implementation for testing
        // In reality, this would process the randomness
        emit RandomnessProcessed(requestId, user, randomness);
    }
    
    // Events
    event RandomnessProcessed(uint64 requestId, address user, uint256 randomness);
} 