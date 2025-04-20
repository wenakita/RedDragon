// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev Implementation of the ERC20 standard token for testing purposes.
 */
contract MockERC20 is ERC20 {
    /**
     * @dev Constructor that gives the caller all existing tokens.
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        // No initial supply
    }
    
    /**
     * @dev Function to mint tokens
     * @param to The address that will receive the minted tokens.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
    
    /**
     * @dev Function to burn tokens
     * @param from The address that will lose the tokens.
     * @param amount The amount of tokens to burn.
     */
    function burn(address from, uint256 amount) public {
        _burn(from, amount);
    }
} 