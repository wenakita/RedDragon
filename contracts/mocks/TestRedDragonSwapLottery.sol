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
        address user,
        uint256 randomness
    ) external {
        processLotteryResult(user, randomness);
    }

    /**
     * @dev Expose the internal isSecureContext function for testing
     */
    function testIsSecureContext(address user) external view returns (bool) {
        return isSecureContext(user);
    }

    function fulfillRandomness(bytes32 requestId, uint256[] memory randomWords) external override {
        require(msg.sender == address(verifier), "Only verifier can fulfill");
        require(randomWords.length > 0, "No random values provided");
        
        PendingRequest memory request = pendingRequests[requestId];
        require(request.user != address(0), "Request not found");
        
        // Calculate if user won based on probability
        uint256 randomValue = randomWords[0];
        
        // Process the result
        processLotteryResult(request.user, randomValue);
        
        emit RandomnessReceived(requestId, randomValue);
    }
} 