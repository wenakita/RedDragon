// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockShadowRouter {
    using SafeERC20 for IERC20;
    
    address public immutable x33Token;
    address public immutable beetsLPToken;
    
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    constructor(address _x33Token, address _beetsLPToken) {
        x33Token = _x33Token;
        beetsLPToken = _beetsLPToken;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external returns (uint256 amountOut) {
        require(params.tokenIn == x33Token, "Invalid input token");
        require(params.tokenOut == beetsLPToken, "Invalid output token");
        
        // Simple 1:1 swap for testing
        uint256 outputAmount = params.amountIn;
        
        // Transfer tokens
        IERC20(x33Token).safeTransferFrom(msg.sender, address(this), params.amountIn);
        IERC20(beetsLPToken).safeTransfer(params.recipient, outputAmount);
        
        return outputAmount;
    }
} 