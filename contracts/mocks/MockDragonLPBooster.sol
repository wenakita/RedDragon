// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IDragonLPBooster.sol";

/**
 * @title MockDragonLPBooster
 * @dev Mock implementation of the LP booster for testing
 */
contract MockDragonLPBooster is Ownable, IDragonLPBooster {
    uint256 private _boostAmount;
    address private _lpToken;
    uint256 private _minLpAmount;
    bool private _useTiers;
    
    constructor(uint256 boostAmount, address lpToken, uint256 minLpAmount, bool useTiers) {
        _boostAmount = boostAmount;
        _lpToken = lpToken;
        _minLpAmount = minLpAmount;
        _useTiers = useTiers;
    }
    
    /**
     * @dev Return a fixed boost amount for testing
     */
    function calculateBoost(address user) external view override returns (uint256) {
        // Simplified implementation that just returns the set amount
        return _boostAmount;
    }
    
    /**
     * @dev Set the boost amount for testing
     */
    function setBoostAmount(uint256 boostAmount) external onlyOwner {
        _boostAmount = boostAmount;
    }
    
    /**
     * @dev Get the LP token address
     */
    function lpToken() external view override returns (address) {
        return _lpToken;
    }
    
    /**
     * @dev Get minimum LP amount for eligibility
     */
    function minLpAmount() external view override returns (uint256) {
        return _minLpAmount;
    }
    
    /**
     * @dev Check if using tiered boost system
     */
    function useTiers() external view override returns (bool) {
        return _useTiers;
    }
} 