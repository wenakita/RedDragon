// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IDragonPartnerAdapter
 * @dev Standard interface for partner adapters that integrate with the Dragon swap ecosystem
 * Enables consistent integration with the jackpot system across multiple DEXes and tokens
 */
interface IDragonPartnerAdapter {
    // Required information about the partner
    function getPartnerName() external view returns (string memory);
    function getPartnerTokens() external view returns (address[] memory);
    
    // Swap functionality
    function swapForJackpotEntry(
        address tokenIn,
        uint256 amountIn, 
        uint256 minAmountOut,
        uint256 deadline,
        address recipient
    ) external returns (
        uint256 amountOut,
        uint256 wsEquivalent
    );
    
    // Price estimation
    function estimateWSEquivalent(
        address tokenIn,
        uint256 amountIn
    ) external view returns (uint256);
    
    // Fee structure information
    function getJackpotFeePercentage() external view returns (uint256);
    function getve69LPFeePercentage() external view returns (uint256);
} 