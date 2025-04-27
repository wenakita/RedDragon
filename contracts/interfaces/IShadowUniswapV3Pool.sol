// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IShadowUniswapV3Pool
 * @dev Interface for Shadow's Uniswap V3 fork concentrated liquidity pools
 */
interface IShadowUniswapV3Pool {
    /**
     * @dev Emitted when liquidity is added to the pool
     * @param sender The address that initiated the liquidity change
     * @param owner The owner of the position and recipient of fees
     * @param tickLower The lower tick boundary of the position
     * @param tickUpper The upper tick boundary of the position
     * @param amount The amount of liquidity added to the position
     * @param amount0 The amount of token0 added as liquidity
     * @param amount1 The amount of token1 added as liquidity
     */
    event IncreaseLiquidity(
        address indexed sender,
        address indexed owner,
        int24 tickLower,
        int24 tickUpper,
        uint128 amount,
        uint256 amount0,
        uint256 amount1
    );

    /**
     * @dev Emitted when liquidity is removed from the pool
     * @param sender The address that initiated the liquidity change
     * @param owner The owner of the position and recipient of fees
     * @param tickLower The lower tick boundary of the position
     * @param tickUpper The upper tick boundary of the position
     * @param amount The amount of liquidity removed from the position
     * @param amount0 The amount of token0 withdrawn from the position
     * @param amount1 The amount of token1 withdrawn from the position
     */
    event DecreaseLiquidity(
        address indexed sender,
        address indexed owner,
        int24 tickLower,
        int24 tickUpper,
        uint128 amount,
        uint256 amount0,
        uint256 amount1
    );

    /**
     * @dev Emitted when fees are collected by the owner of a position
     * @param sender The address that initiated the fee collection
     * @param recipient The address that received the fees
     * @param tickLower The lower tick boundary of the position
     * @param tickUpper The upper tick boundary of the position
     * @param amount0 The amount of token0 fees collected
     * @param amount1 The amount of token1 fees collected
     */
    event Collect(
        address indexed sender,
        address indexed recipient,
        int24 tickLower,
        int24 tickUpper,
        uint128 amount0,
        uint128 amount1
    );

    /**
     * @dev Returns the current price of the pool as a sqrt(token1/token0) Q64.96 value
     * @return sqrtPriceX96 The current price as a Q64.96 sqrt value
     * @return tick The current tick
     * @return observationIndex The current observation index
     * @return observationCardinality The current observation cardinality
     * @return observationCardinalityNext The next observation cardinality
     * @return feeProtocol The current protocol fee
     * @return unlocked Whether the pool is currently unlocked
     */
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );

    /**
     * @dev Returns the current liquidity in the pool
     * @return The total liquidity in the pool
     */
    function liquidity() external view returns (uint128);

    /**
     * @dev Returns the addresses of the tokens in the pool
     * @return token0 The address of the token0 for the pool
     * @return token1 The address of the token1 for the pool
     */
    function tokens() external view returns (address token0, address token1);

    /**
     * @dev Returns the fee tier of the pool
     * @return The fee tier, denominated in hundredths of a bip (i.e. 1e-6)
     */
    function fee() external view returns (uint24);

    /**
     * @dev Returns the tick spacing of the pool
     * @return The tick spacing
     */
    function tickSpacing() external view returns (int24);

    /**
     * @dev Returns the position information associated with a given position key
     * @param key The position key, typically computed as keccak256(owner, tickLower, tickUpper)
     * @return liquidity The amount of liquidity in the position
     * @return feeGrowthInside0LastX128 The fee growth of token0 inside the position as of the last action on the individual position
     * @return feeGrowthInside1LastX128 The fee growth of token1 inside the position as of the last action on the individual position
     * @return tokensOwed0 The uncollected amount of token0 owed to the position as of the last computation
     * @return tokensOwed1 The uncollected amount of token1 owed to the position as of the last computation
     */
    function positions(
        bytes32 key
    )
        external
        view
        returns (
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );

    /**
     * @dev Returns data about a specific tick
     * @param tick The tick to load
     * @return liquidityGross The total amount of position liquidity that uses the tick
     * @return liquidityNet How much liquidity changes when the tick is crossed
     * @return feeGrowthOutside0X128 The fee growth on the other side of the tick from the current tick
     * @return feeGrowthOutside1X128 The fee growth on the other side of the tick from the current tick
     * @return tickCumulativeOutside The cumulative tick value on the other side of the tick from the current tick
     * @return secondsPerLiquidityOutsideX128 The seconds spent per liquidity on the other side of the tick from the current tick
     * @return secondsOutside The seconds spent on the other side of the tick from the current tick
     * @return initialized Set to true if the tick is initialized
     */
    function ticks(
        int24 tick
    )
        external
        view
        returns (
            uint128 liquidityGross,
            int128 liquidityNet,
            uint256 feeGrowthOutside0X128,
            uint256 feeGrowthOutside1X128,
            int56 tickCumulativeOutside,
            uint160 secondsPerLiquidityOutsideX128,
            uint32 secondsOutside,
            bool initialized
        );
} 