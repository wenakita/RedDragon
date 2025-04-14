// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../RedDragonSwapLottery.sol";

/**
 * @title TestRedDragonSwapLottery
 * @dev Test implementation of RedDragonSwapLottery with exposed internal functions
 */
abstract contract TestRedDragonSwapLottery is RedDragonSwapLottery {
    constructor(address _wrappedSonic, address _verifier) RedDragonSwapLottery(_wrappedSonic, _verifier) {}

    /**
     * @dev Expose the internal processLotteryResult function for testing
     */
    function testProcessLotteryResult(
        bytes32 requestId,
        PendingRequest memory request,
        bool isWinner
    ) external {
        processLotteryResult(requestId, request, isWinner);
    }

    /**
     * @dev Expose the internal isSecureContext function for testing
     */
    function testIsSecureContext(address user) external view returns (bool) {
        return isSecureContext(user);
    }
} 