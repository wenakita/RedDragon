// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReadLib
 * @dev Mock implementation of LayerZero ReadLib for testing purposes
 */
library ReadLib {
    // Libraries can't have state variables, so this is a mock implementation
    // that simply returns true for isReadChannelActive and doesn't store anything
    
    /**
     * @notice Set active status for a read channel
     * @param _channelId Channel ID to set status for
     * @param _active Whether the channel should be active
     */
    function setReadChannel(uint32 _channelId, bool _active) internal pure {
        // Mock implementation, doesn't actually store anything
        // In a real implementation, this would store in some contract's storage
    }
    
    /**
     * @notice Check if a read channel is active
     * @param _channelId Channel ID to check
     * @return Whether the channel is active
     */
    function isReadChannelActive(uint32 _channelId) internal pure returns (bool) {
        // For testing purposes, always return true
        return true;
    }
} 