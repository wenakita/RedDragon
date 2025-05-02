// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockWrappedSonic
 * @dev Mock implementation of Wrapped Sonic (wS) token for testing
 */
contract MockWrappedSonic is ERC20 {
    constructor() ERC20("Wrapped Sonic", "wS") {
        _mint(msg.sender, 1000000 ether); // Initial supply of 1 million wS
    }
    
    /**
     * @notice Deposit native tokens to receive wrapped tokens
     */
    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }
    
    /**
     * @notice Withdraw native tokens by burning wrapped tokens
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "wS: transfer failed");
    }
    
    /**
     * @notice Mint tokens for testing
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
} 