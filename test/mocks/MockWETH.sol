// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockWETH
 * @dev Mock implementation of Wrapped ETH (WETH) with deposit/withdraw functionality
 * Used to simulate wrapped native tokens like wS, WETH, wAVAX, etc.
 */
contract MockWETH is ERC20 {
    
    /**
     * @dev Constructor for the mock WETH token
     * @param name_ Token name
     * @param symbol_ Token symbol 
     */
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}
    
    /**
     * @dev Convert ETH to WETH
     */
    function deposit() public payable {
        _mint(msg.sender, msg.value);
    }
    
    /**
     * @dev Convert WETH to ETH
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "MockWETH: insufficient balance");
        _burn(msg.sender, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "MockWETH: ETH transfer failed");
    }
    
    /**
     * @dev Allow contract to receive ETH and automatically wrap it
     */
    receive() external payable {
        deposit();
    }
} 