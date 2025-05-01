// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev Implementation of the ERC20 standard token for testing.
 */
contract MockERC20 is ERC20 {
    uint8 private _decimals;
    
    /**
     * @dev Constructor
     * @param name Name of the token
     * @param symbol Symbol of the token
     * @param decimals_ Decimals of the token
     */
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }
    
    /**
     * @dev Returns the number of decimals used
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Mints tokens to an account
     * @param account The account to mint tokens to
     * @param amount The amount to mint
     */
    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
    
    /**
     * @dev Burns tokens from an account
     * @param amount The amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
} 