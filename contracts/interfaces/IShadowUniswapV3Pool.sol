// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IShadowUniswapV3Pool
 * @dev Interface for Shadow's Uniswap V3 pool implementation
 * This only includes methods we need for price calculation
 */
interface IShadowUniswapV3Pool {
    /**
     * @dev Get the current slot0 data from the pool
     * @return sqrtPriceX96 The current price in Q96.96 format
     * @return tick The current tick
     * @return observationIndex The index of the last oracle observation
     * @return observationCardinality The current maximum number of observations stored in the pool
     * @return observationCardinalityNext The next maximum number of observations
     * @return feeProtocol The protocol fee in hundredths of a bip (0.0001)
     * @return unlocked Whether the pool is currently unlocked (reentrancy protection)
     */
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
    
    /**
     * @dev Get ticks at the specified index
     * @param tickIndex The tick index to look up
     * @return liquidityGross All liquidity that uses the tick as either lower or upper tick
     * @return liquidityNet How much liquidity changes when tick is crossed left-to-right
     * @return feeGrowthOutside0X128 The fee growth on the other side of the tick from the current tick in token0
     * @return feeGrowthOutside1X128 The fee growth on the other side of the tick from the current tick in token1
     * @return tickCumulativeOutside The cumulative tick value on the other side of the tick from the current tick
     * @return secondsPerLiquidityOutsideX128 The seconds spent per liquidity on the other side of the tick from the current tick
     * @return secondsOutside The seconds spent on the other side of the tick from the current tick
     * @return initialized Set to true if the tick is initialized
     */
    function ticks(int24 tickIndex) external view returns (
        uint128 liquidityGross,
        int128 liquidityNet,
        uint256 feeGrowthOutside0X128,
        uint256 feeGrowthOutside1X128,
        int56 tickCumulativeOutside,
        uint160 secondsPerLiquidityOutsideX128,
        uint32 secondsOutside,
        bool initialized
    );
    
    /**
     * @dev Get the token0 address
     * @return The token0 address
     */
    function token0() external view returns (address);
    
    /**
     * @dev Get the token1 address
     * @return The token1 address
     */
    function token1() external view returns (address);
    
    /**
     * @dev Get the pool's fee tier
     * @return The fee tier in hundredths of a bip (e.g., 3000 = 0.3%)
     */
    function fee() external view returns (uint24);
} 