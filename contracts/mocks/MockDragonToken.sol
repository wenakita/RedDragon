// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockDragonToken
 * @dev A mock implementation of the Dragon Token for testing
 */
contract MockDragonToken is ERC20 {
    constructor() ERC20("Mock Dragon Token", "DRAGON") {
        // Mint 1,000,000 DRAGON to the deployer for testing
        _mint(msg.sender, 1_000_000 * 10**18);
    }
    
    // Function to mint more tokens for testing
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    // Mock function to simulate token burning
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
} 