// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockDragonToken
 * @dev This contract is a mock DRAGON token for testing
 */
contract MockDragonToken is ERC20, Ownable {
    address public exchangePair;
    
    // Event for swap from wS to DRAGON
    event SwapWSToDragon(address indexed user, uint256 amount);
    
    constructor() ERC20("Mock Dragon", "DRAGON") Ownable() {}
    
    /**
     * @dev Set the exchange pair address
     * @param _exchangePair The exchange pair address
     */
    function setExchangePair(address _exchangePair) external onlyOwner {
        exchangePair = _exchangePair;
    }
    
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
    
    /**
     * @dev Simulate a swap from wS to DRAGON
     * @param user The user address
     * @param amount The amount of wS
     */
    function simulateSwapWSToDragon(address user, uint256 amount) external {
        emit SwapWSToDragon(user, amount);
    }
} 