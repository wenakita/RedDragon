// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IWETH.sol";

/**
 * @title MockWETH
 * @dev Mock implementation of Wrapped ETH (WETH) with deposit/withdraw functionality
 */
contract MockWETH is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
    
    function deposit() public payable {
        _mint(msg.sender, msg.value);
    }
    
    function withdraw(uint256 value) external {
        require(balanceOf(msg.sender) >= value, "MockWETH: Insufficient balance");
        _burn(msg.sender, value);
        (bool success, ) = msg.sender.call{value: value}("");
        require(success, "MockWETH: ETH transfer failed");
    }
    
    receive() external payable {
        deposit();
    }
} 