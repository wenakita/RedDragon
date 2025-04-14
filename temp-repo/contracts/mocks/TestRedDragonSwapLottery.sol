// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../RedDragonSwapLottery.sol";

/**
 * @title TestRedDragonSwapLottery
 * @dev Modified lottery contract for testing automatic jackpot distribution
 */
contract TestRedDragonSwapLottery is RedDragonSwapLottery {
    
    constructor(address _rewardToken, address _verifier) 
        RedDragonSwapLottery(_rewardToken, _verifier) 
    {}
    
    /**
     * @dev Override isSecureContext to always return true for testing
     */
    function isSecureContext(address user) public pure override returns (bool) {
        return true;
    }
    
    /**
     * @dev Testing function to bypass security checks
     */
    function testProcessLottery(address user, uint256 wsAmount) external {
        // Request randomness directly
        bytes32 requestId = verifier.requestRandomness();
        
        // Calculate probability
        uint256 baseProbability = calculateBaseProbability(wsAmount);
        uint256 probability = applyPityBoost(baseProbability);
        
        // Store request
        pendingRequests[requestId] = PendingRequest({
            user: user,
            wsAmount: wsAmount,
            probability: probability
        });
        
        emit RandomnessRequested(requestId, user, wsAmount);
    }
} 