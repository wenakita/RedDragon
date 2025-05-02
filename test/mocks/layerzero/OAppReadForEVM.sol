// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ReadCodecV1.sol";

/**
 * @title OAppReadForEVM
 * @dev Mock implementation of OAppReadForEVM interface for testing
 * Simplified version of the LayerZero OAppReadForEVM
 */
contract OAppReadForEVM {
    // Storage for active read channels
    mapping(uint32 => bool) internal _activeReadChannels;
    
    // Storage for configured DVNs
    mapping(uint32 => address[]) internal _dvnsList;
    mapping(uint32 => uint8) internal _thresholds;
    
    /**
     * @notice Constructor
     */
    constructor() {}
    
    /**
     * @notice Set active status for a read channel
     * @param _channelId Channel ID to set status for
     * @param _active Whether the channel should be active
     */
    function setReadChannel(uint32 _channelId, bool _active) external {
        _activeReadChannels[_channelId] = _active;
    }
    
    /**
     * @notice Configure DVNs for a read channel
     * @param _channelId The channel ID
     * @param _dvns Array of DVN addresses
     * @param _threshold Threshold of DVNs required
     */
    function configureDVNs(
        uint32 _channelId,
        address[] memory _dvns,
        uint8 _threshold
    ) external {
        require(_threshold <= _dvns.length, "Threshold exceeds DVN count");
        
        // Clear existing DVNs
        delete _dvnsList[_channelId];
        
        // Add new DVNs
        for (uint256 i = 0; i < _dvns.length; i++) {
            _dvnsList[_channelId].push(_dvns[i]);
        }
        
        _thresholds[_channelId] = _threshold;
    }
    
    /**
     * @notice Check if a read channel is active
     * @param _channelId Channel ID to check
     * @return Whether the channel is active
     */
    function isReadChannelActive(uint32 _channelId) external view returns (bool) {
        return _activeReadChannels[_channelId];
    }
    
    /**
     * @notice Get DVN configuration for a channel
     * @param _channelId Channel ID to get configuration for
     * @return dvns Array of DVN addresses
     * @return threshold Threshold of DVNs required
     */
    function getDVNConfiguration(uint32 _channelId) external view returns (
        address[] memory dvns,
        uint8 threshold
    ) {
        return (_dvnsList[_channelId], _thresholds[_channelId]);
    }
    
    /**
     * @notice Parse read responses
     * @param _responses Array of response bytes
     * @return results Parsed results
     */
    function parseResponses(bytes[] memory _responses) external pure returns (bytes[] memory results) {
        // For the mock, we just return the responses
        return _responses;
    }
} 