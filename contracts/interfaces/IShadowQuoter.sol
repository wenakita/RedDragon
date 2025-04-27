// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IShadowQuoter
 * @dev Interface for Shadow DEX's Uniswap V3 style quoter
 */
interface IShadowQuoter {
    /**
     * @dev Returns the amount out received for a given exact input
     * @param tokenIn The token being swapped in
     * @param tokenOut The token being swapped out
     * @param fee The fee tier of the pool
     * @param amountIn The desired input amount
     * @param sqrtPriceLimitX96 The price limit of the pool that cannot be exceeded by the swap
     * @return amountOut The amount of tokenOut that would be received
     */
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external view returns (uint256 amountOut);

    /**
     * @dev Returns the amount out received for a given exact input but for a swap along the path
     * @param path The path of the swap, i.e. each token pair and the pool fee
     * @param amountIn The amount of the first token to swap
     * @return amountOut The amount of the last token that would be received
     */
    function quoteExactInput(
        bytes memory path,
        uint256 amountIn
    ) external view returns (uint256 amountOut);

    /**
     * @dev Returns the amount in required for a given exact output
     * @param tokenIn The token being swapped in
     * @param tokenOut The token being swapped out
     * @param fee The fee tier of the pool
     * @param amountOut The desired output amount
     * @param sqrtPriceLimitX96 The price limit of the pool that cannot be exceeded by the swap
     * @return amountIn The amount required as the input
     */
    function quoteExactOutputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountOut,
        uint160 sqrtPriceLimitX96
    ) external view returns (uint256 amountIn);

    /**
     * @dev Returns the amount in required to receive the given exact output amount but for a swap along the path (reversed)
     * @param path The path of the swap, i.e. each token pair and the pool fee. Path is reversed in this case.
     * @param amountOut The amount of the last token to receive
     * @return amountIn The amount of first token required to spend
     */
    function quoteExactOutput(
        bytes memory path,
        uint256 amountOut
    ) external view returns (uint256 amountIn);
} 