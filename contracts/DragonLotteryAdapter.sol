// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ILegacyDragonLotterySwap.sol";
import "./interfaces/IDragonSwapTrigger.sol";

/**
 * @title DragonLotteryAdapter
 * @notice Adapter that makes DragonSwapTrigger compatible with old code expecting DragonLotterySwap
 * This allows for a smooth transition without having to update all dependent contracts immediately
 */
contract DragonLotteryAdapter is ILegacyDragonLotterySwap, Ownable {
    // The new DragonSwapTrigger contract
    IDragonSwapTrigger public dragonSwapTrigger;
    
    /**
     * @notice Constructor
     * @param _dragonSwapTrigger The address of the DragonSwapTrigger contract
     */
    constructor(address _dragonSwapTrigger) Ownable() {
        require(_dragonSwapTrigger != address(0), "Trigger cannot be zero address");
        dragonSwapTrigger = IDragonSwapTrigger(_dragonSwapTrigger);
    }
    
    /**
     * @notice Update the DragonSwapTrigger address
     * @param _dragonSwapTrigger The new address
     */
    function setDragonSwapTrigger(address _dragonSwapTrigger) external onlyOwner {
        require(_dragonSwapTrigger != address(0), "Trigger cannot be zero address");
        dragonSwapTrigger = IDragonSwapTrigger(_dragonSwapTrigger);
    }
    
    /**
     * @notice Add funds to the jackpot
     * @param _amount The amount to add
     */
    function addToJackpot(uint256 _amount) external override {
        dragonSwapTrigger.addToJackpot(_amount);
    }
    
    /**
     * @notice Process a buy transaction for lottery entry
     * @param _user The user address
     * @param _amount The amount of wS
     */
    function processBuy(address _user, uint256 _amount) external override {
        // In the new system, only swaps trigger the lottery, not buys
        // So this is essentially a no-op
    }
    
    /**
     * @notice Process a sell transaction
     * @param _user The user address
     * @param _amount The amount of wS
     */
    function processSell(address _user, uint256 _amount) external override {
        // In the new system, only swaps trigger the lottery, not sells
        // So this is essentially a no-op
    }
    
    /**
     * @notice Get the current jackpot balance
     * @return The jackpot balance
     */
    function jackpotBalance() external view override returns (uint256) {
        return dragonSwapTrigger.jackpotBalance();
    }
} 