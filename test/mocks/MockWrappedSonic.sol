// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockWrappedSonic
 * @dev This contract is a mock wS token for testing
 */
contract MockWrappedSonic is ERC20, Ownable {
    constructor() ERC20("Wrapped Sonic", "wS") Ownable() {}
    
    /**
     * @dev Mint tokens to an address
     * @param to The address to mint to
     * @param amount The amount to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens from an address
     * @param from The address to burn from
     * @param amount The amount to burn
     */
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
} 