// SPDX-License-Identifier: MIT
// Interface for PaintSwap VRF Subscription Manager

pragma solidity ^0.8.20;

/**
 * @title ISubscriptionManager
 * @dev Interface for the PaintSwap VRF Subscription Manager
 * @notice Contains basic methods for creating and managing VRF subscriptions
 */
interface ISubscriptionManager {
    /**
     * @dev Creates a new subscription
     * @return subscriptionId The ID of the created subscription
     */
    function createSubscription() external returns (uint64 subscriptionId);
    
    /**
     * @dev Funds a subscription with tokens
     * @param subscriptionId The ID of the subscription to fund
     * @param amount The amount of tokens to add to the subscription
     */
    function fundSubscription(uint64 subscriptionId, uint256 amount) external;
    
    /**
     * @dev Adds a consumer to a subscription
     * @param subscriptionId The ID of the subscription
     * @param consumer The address of the consumer to add
     */
    function addConsumer(uint64 subscriptionId, address consumer) external;
} 