// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockToken
 * @dev Comprehensive Mock ERC20 token for testing
 * This consolidated version combines the functionality from both
 * contracts/mocks/MockToken.sol and contracts/test/MockToken.sol
 */
contract MockToken is ERC20, Ownable {
    /**
     * @dev Constructor with optional initial supply
     * @param name Token name
     * @param symbol Token symbol
     * @param mintInitialSupply Whether to mint initial supply to deployer (defaults to false)
     */
    constructor(
        string memory name,
        string memory symbol,
        bool mintInitialSupply
    ) ERC20(name, symbol) {
        if (mintInitialSupply) {
            _mint(msg.sender, 1000000 * 10**18);
        }
    }
    
    /**
     * @dev Mint tokens to an address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens from an address
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
} 