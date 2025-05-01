// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockDragonToken
 * @dev Mock implementation of DRAGON token for testing
 */
contract MockDragonToken is ERC20, Ownable {
    // Event for swap detection
    event SwapWSToDragon(address indexed user, uint256 amount);
    
    constructor() ERC20("Dragon", "DRAGON") Ownable() {
        // Initial supply for testing
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    /**
     * @dev Mint tokens to a specific address
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens from a specific address
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
    
    /**
     * @dev Simulate a swap from wS to DRAGON
     * @param user User address
     * @param amount Amount of wS swapped
     */
    function simulateSwapWSToDragon(address user, uint256 amount) external {
        emit SwapWSToDragon(user, amount);
    }
} 