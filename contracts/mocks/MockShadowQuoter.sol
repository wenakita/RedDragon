// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockShadowQuoter {
    // Simple mock that returns a fixed output amount
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external pure returns (uint256 amountOut) {
        // Simple 1:1 quote for testing
        return amountIn;
    }
} 