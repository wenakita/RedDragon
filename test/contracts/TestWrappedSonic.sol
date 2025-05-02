// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestWrappedSonic
 * @dev A simple test token representing Wrapped Sonic for testing
 */
contract TestWrappedSonic is ERC20, Ownable {
    constructor() ERC20("Wrapped Sonic", "wS") Ownable() {}
    
    /**
     * @dev Mints new tokens to a specified address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
} 