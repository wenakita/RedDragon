// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDragonAdaptiveFeeManager
 * @dev Interface for the DragonAdaptiveFeeManager contract
 * Used by OmniDragon to access fee calculations
 */
interface IDragonAdaptiveFeeManager {
    /**
     * @notice Calculate the optimal fee allocation based on current conditions
     * @param _jackpotSize Current jackpot size
     * @param _dailyVolume Approximate daily volume
     * @return _jackpotFee Calculated jackpot fee percentage (scaled by 1e4)
     * @return _liquidityFee Calculated liquidity fee percentage (scaled by 1e4)
     */
    function calculateAdaptiveFees(
        uint256 _jackpotSize,
        uint256 _dailyVolume
    ) external view returns (
        uint256 _jackpotFee,
        uint256 _liquidityFee
    );
    
    /**
     * @notice Update jackpot size (called when jackpot changes)
     * @param _newJackpotSize Current jackpot size
     */
    function updateJackpotSize(uint256 _newJackpotSize) external;
    
    /**
     * @notice Add transaction volume
     * @param _volumeAmount Amount to add to volume tracking
     */
    function addVolume(uint256 _volumeAmount) external;
    
    /**
     * @notice Execute a fee update based on current market conditions
     */
    function executeFeeUpdate() external;
    
    /**
     * @notice Check if conditions for fee update are met and update if needed
     */
    function checkAndUpdateFees() external;
    
    /**
     * @notice Get current fee percentages
     * @return _jackpotFee Current jackpot fee
     * @return _liquidityFee Current liquidity provider fee
     * @return _burnFee Current burn fee
     * @return _totalFee Total fee
     */
    function getFees() external view returns (
        uint256 _jackpotFee,
        uint256 _liquidityFee,
        uint256 _burnFee,
        uint256 _totalFee
    );
} 