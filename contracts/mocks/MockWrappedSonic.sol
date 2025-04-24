// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockWrappedSonic
 * @dev A mock version of WrappedSonic token for testing purposes
 */
contract MockWrappedSonic is ERC20 {
    constructor() ERC20("Mock Wrapped Sonic", "wSONIC") {
        // Mint 1,000 wSONIC to the deployer for testing
        _mint(msg.sender, 1000 * 10**18);
    }
    
    // Function to mint more tokens for testing
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
} 