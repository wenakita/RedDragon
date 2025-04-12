// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev A simple ERC20 token implementation for testing
 */
contract MockERC20 is ERC20 {
    uint8 private _decimals = 18;
    
    /**
     * @dev Constructor
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply in wei
     */
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }
    
    /**
     * @dev Returns the number of decimals used for user representation
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Mints tokens to a specified address (for testing)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
} 