// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMockPair {
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external;
    function token0() external view returns (address);
    function token1() external view returns (address);
}

contract MockRouter {
    mapping(address => mapping(address => address)) public pairs;

    function setPair(address tokenA, address tokenB, address pair) external {
        pairs[tokenA][tokenB] = pair;
        pairs[tokenB][tokenA] = pair;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(path.length == 2, "Invalid path");
        
        address pair = pairs[path[0]][path[1]];
        require(pair != address(0), "Pair not found");
        
        // Transfer input tokens from sender to pair
        IERC20(path[0]).transferFrom(msg.sender, pair, amountIn);
        
        // Calculate output amount (1:1 for testing)
        uint256 amountOut = amountIn;
        
        // Determine which token is token0 in the pair
        address token0 = IMockPair(pair).token0();
        bool isToken0 = path[1] == token0;
        
        // Simulate pair swap
        if (isToken0) {
            IMockPair(pair).swap(amountOut, 0, to);
        } else {
            IMockPair(pair).swap(0, amountOut, to);
        }
        
        // Return amounts
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;
        return amounts;
    }
} 