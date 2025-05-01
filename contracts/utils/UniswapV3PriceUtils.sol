// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title UniswapV3PriceUtils
 * @dev Utility functions for Uniswap V3 price calculations
 * Ported from JavaScript to Solidity for on-chain calculations
 */
library UniswapV3PriceUtils {
    // Constants
    int24 public constant MIN_TICK = -887272;
    int24 public constant MAX_TICK = 887272;
    uint256 public constant TICK_BASE = 1000100000000000000; // 1.0001 in 1e18 format
    uint256 public constant Q96 = 2**96;

    /**
     * @dev Convert tick to price
     * @param tick The tick to convert
     * @return price The price in 1e18 format
     */
    function tickToPrice(int24 tick) internal pure returns (uint256) {
        if (tick < 0) {
            return priceFromNegativeTick(tick);
        } else {
            return priceFromPositiveTick(tick);
        }
    }

    /**
     * @dev Calculate price from positive tick using exponentiation
     * @param tick The positive tick
     * @return price The price in 1e18 format
     */
    function priceFromPositiveTick(int24 tick) internal pure returns (uint256) {
        // Limited implementation for positive ticks
        // For a production implementation, consider using a more robust library
        uint256 price = 1e18; // Start with 1.0
        if (tick > 0) {
            uint256 ratio = TICK_BASE;
            int24 absValue = tick;
            
            // Calculate 1.0001^tick using binary exponentiation
            while (absValue > 0) {
                if (absValue & 1 == 1) {
                    price = (price * ratio) / 1e18;
                }
                absValue = absValue >> 1;
                if (absValue > 0) {
                    ratio = (ratio * ratio) / 1e18;
                }
            }
        }
        return price;
    }

    /**
     * @dev Calculate price from negative tick using exponentiation
     * @param tick The negative tick
     * @return price The price in 1e18 format
     */
    function priceFromNegativeTick(int24 tick) internal pure returns (uint256) {
        // For negative ticks, we calculate 1/(1.0001^|tick|)
        int24 absValue = tick > 0 ? tick : -tick;
        uint256 denominator = priceFromPositiveTick(absValue);
        return (1e36 / denominator); // 1e18 * 1e18 / denominator for precision
    }

    /**
     * @dev Convert sqrtPriceX96 to price
     * @param sqrtPriceX96 The sqrt price in Q96 format from pool
     * @return price The price in 1e18 format
     */
    function sqrtPriceX96ToPrice(uint160 sqrtPriceX96) internal pure returns (uint256) {
        // Convert sqrtPriceX96 to price: (sqrtPriceX96 / 2^96)^2
        uint256 sqrtPriceSquared = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
        return (sqrtPriceSquared * 1e18) / (Q96 * Q96);
    }

    /**
     * @dev Convert tick to sqrtPriceX96
     * @param tick The tick to convert
     * @return sqrtPriceX96 The sqrt price in Q96 format
     */
    function tickToSqrtPriceX96(int24 tick) internal pure returns (uint160) {
        // This is an approximation; a more accurate implementation would use 
        // the exact Uniswap V3 formula: sqrtPriceX96 = √(1.0001^tick) * 2^96
        uint256 price = tickToPrice(tick);
        uint256 sqrtPrice = sqrt(price * 1e18);
        return uint160((sqrtPrice * Q96) / 1e18);
    }

    /**
     * @dev Calculate square root using Newton's method
     * @param x The value to find the square root of
     * @return y The square root of x
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        
        // Starting with an estimate
        uint256 z = (x + 1) / 2;
        y = x;
        
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    /**
     * @dev Calculate token ratios based on sqrtPriceX96
     * @param sqrtPriceX96 Current sqrtPriceX96
     * @param sqrtPriceX96A Lower sqrtPriceX96 bound
     * @param sqrtPriceX96B Upper sqrtPriceX96 bound
     * @return token0Percent Percentage of token0 (0-100)
     * @return token1Percent Percentage of token1 (0-100)
     */
    function calculateTokenRatiosFromSqrtPrice(
        uint160 sqrtPriceX96,
        uint160 sqrtPriceX96A,
        uint160 sqrtPriceX96B
    ) internal pure returns (uint8 token0Percent, uint8 token1Percent) {
        if (sqrtPriceX96 <= sqrtPriceX96A) {
            return (100, 0);
        } else if (sqrtPriceX96 >= sqrtPriceX96B) {
            return (0, 100);
        } else {
            // Calculate current, lower, and upper price
            uint256 currentPrice = sqrtPriceX96ToPrice(sqrtPriceX96);
            uint256 lowerPrice = sqrtPriceX96ToPrice(sqrtPriceX96A);
            uint256 upperPrice = sqrtPriceX96ToPrice(sqrtPriceX96B);
            
            // Calculate position as percentage through the range
            uint256 position = ((currentPrice - lowerPrice) * 100) / (upperPrice - lowerPrice);
            token1Percent = uint8(position > 100 ? 100 : position);
            token0Percent = 100 - token1Percent;
        }
    }

    /**
     * @dev Calculate token ratios based on ticks
     * @param currentTick Current tick
     * @param lowerTick Lower tick bound
     * @param upperTick Upper tick bound
     * @return token0Percent Percentage of token0 (0-100)
     * @return token1Percent Percentage of token1 (0-100)
     */
    function calculateTokenRatios(
        int24 currentTick, 
        int24 lowerTick, 
        int24 upperTick
    ) internal pure returns (uint8 token0Percent, uint8 token1Percent) {
        if (currentTick <= lowerTick) {
            return (100, 0);
        } else if (currentTick >= upperTick) {
            return (0, 100);
        } else {
            // Get sqrtPriceX96 values
            uint160 sqrtPriceX96 = tickToSqrtPriceX96(currentTick);
            uint160 sqrtPriceX96A = tickToSqrtPriceX96(lowerTick);
            uint160 sqrtPriceX96B = tickToSqrtPriceX96(upperTick);
            
            // Use the sqrtPrice-based calculation
            return calculateTokenRatiosFromSqrtPrice(
                sqrtPriceX96,
                sqrtPriceX96A,
                sqrtPriceX96B
            );
        }
    }

    /**
     * @dev Calculate liquidity range percentage
     * @param lowerTick Lower tick bound
     * @param upperTick Upper tick bound
     * @return rangePercentage The percentage range covered (in basis points)
     */
    function calculateLiquidityRange(
        int24 lowerTick, 
        int24 upperTick
    ) internal pure returns (uint256 rangePercentage) {
        uint256 lowerPrice = tickToPrice(lowerTick);
        uint256 upperPrice = tickToPrice(upperTick);
        return ((upperPrice - lowerPrice) * 10000) / lowerPrice; // Returns basis points (100.00%)
    }

    /**
     * @dev Calculate estimated APR based on volume and fee tier
     * @param amountUSD Amount of liquidity in USD (18 decimals)
     * @param dailyVolumeUSD Daily volume in USD (18 decimals)
     * @param feeTier Fee tier in basis points (e.g., 3000 for 0.3%)
     * @return apr Annual percentage rate (in basis points)
     */
    function calculateAPR(
        uint256 amountUSD,
        uint256 dailyVolumeUSD,
        uint24 feeTier
    ) internal pure returns (uint256 apr) {
        if (amountUSD == 0) return 0;
        
        // Calculate daily fees: volume * fee tier / 1000000 (fee tier is in basis points)
        uint256 dailyFees = (dailyVolumeUSD * feeTier) / 1000000;
        
        // Annualize: daily * 365
        uint256 yearlyFees = dailyFees * 365;
        
        // Calculate APR: (yearly fees / amount) * 10000 (to get basis points)
        apr = (yearlyFees * 10000) / amountUSD;
        
        // Cap APR between 0% and 1000%
        if (apr > 10000) apr = 10000;
        
        return apr;
    }
} 