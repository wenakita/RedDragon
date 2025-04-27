// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface for DragonShadowV3Swapper
 */
interface IDragonShadowV3Swapper {
    function partnerSwapX33ForBeetsLPWithJackpot(
        address user,
        uint256 x33Amount,
        uint256 minBeetsLpOut,
        uint256 deadline
    ) external returns (uint256 beetsLpReceived);
} 