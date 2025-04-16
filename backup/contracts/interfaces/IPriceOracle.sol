// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPriceOracle
 * @dev Interface for the enhanced wSonic/USD price oracle with TWAP support
 */
interface IPriceOracle {
    /**
     * @dev Get current wSonic price in USD (6 decimals)
     */
    function wSonicPriceUSD() external view returns (uint256);
    
    /**
     * @dev Get last price update timestamp
     */
    function lastUpdateTimestamp() external view returns (uint256);
    
    /**
     * @dev Get the time-weighted average price
     */
    function getTWAP() external view returns (uint256);
    
    /**
     * @dev Check if the price is valid and not stale
     */
    function isPriceValid() external view returns (bool);
    
    /**
     * @dev Report a price from an authorized source
     * @param price Price in USD with 6 decimals
     * @param confidence Confidence level 0-100
     */
    function reportPrice(uint256 price, uint256 confidence) external;
    
    /**
     * @dev Update price in emergency (owner only)
     * @param newPrice New wSonic price in USD with 6 decimals
     */
    function emergencyUpdatePrice(uint256 newPrice) external;
    
    /**
     * @dev Convert USD amount to wSonic
     * @param usdAmount USD amount with 6 decimals
     * @return wSonic amount in wei (18 decimals)
     */
    function usdToWSonic(uint256 usdAmount) external view returns (uint256);
    
    /**
     * @dev Convert wSonic amount to USD
     * @param wSonicAmount wSonic amount in wei (18 decimals)
     * @return USD amount with 6 decimals
     */
    function wSonicToUSD(uint256 wSonicAmount) external view returns (uint256);
    
    /**
     * @dev Add an authorized price source
     * @param source Address allowed to report prices
     */
    function addPriceSource(address source) external;
    
    /**
     * @dev Remove a price source
     * @param source Address to remove
     */
    function removePriceSource(address source) external;
    
    /**
     * @dev Update safety parameters
     * @param maxDeviation Maximum allowed deviation between updates (percentage)
     * @param minConfidence Minimum confidence required for valid price
     * @param minSources Minimum number of sources required
     */
    function updateSafetyParams(
        uint256 maxDeviation,
        uint256 minConfidence,
        uint256 minSources
    ) external;
} 