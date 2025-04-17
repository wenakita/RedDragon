// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IDragonPaintSwapVRF.sol";
import "../interfaces/IVRFConsumer.sol";

/**
 * @title MockDragonPaintSwapVRF
 * @dev Mock implementation of the DragonPaintSwapVRF interface for testing
 */
contract MockDragonPaintSwapVRF is IDragonPaintSwapVRF {
    // Tracks number of requests made for testing
    uint256 public requestCount;
    
    // Controls whether requests should fail
    bool public shouldFail;
    
    // Tracks the last consumer
    address public lastConsumer;
    
    // VRF configuration
    address public vrfCoordinator;
    bytes32 public keyHash;
    uint64 public subscriptionId;
    
    // Tracks whether VRF is enabled
    bool public isEnabled;
    
    /**
     * @dev Constructor
     * @param _coordinator The VRF coordinator address to return from getVRFConfiguration
     * @param _isValid Whether to return valid configuration values
     */
    constructor(address _coordinator, bool _isValid) {
        vrfCoordinator = _coordinator;
        keyHash = keccak256(abi.encodePacked("MockDragonPaintSwapVRF"));
        subscriptionId = _isValid ? 123456 : 0; // Valid configs have non-zero subscription ID
        isEnabled = true;
    }
    
    /**
     * @dev Set whether requests should fail
     * @param _shouldFail Whether requests should fail
     */
    function setShouldFail(bool _shouldFail) external {
        shouldFail = _shouldFail;
    }
    
    /**
     * @dev Set VRF enabled state
     * @param _isEnabled Whether VRF is enabled
     */
    function setVrfEnabled(bool _isEnabled) external {
        isEnabled = _isEnabled;
    }
    
    /**
     * @dev Request a random number
     * @return requestId A request ID
     */
    function requestRandomness() external override returns (bytes32 requestId) {
        if (shouldFail) {
            revert("VRF request failed");
        }
        
        requestCount++;
        lastConsumer = msg.sender;
        requestId = keccak256(abi.encodePacked(block.timestamp, msg.sender, requestCount));
        
        // For testing, we can immediately fulfill the request
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = uint256(requestId);
        
        // Use safer approach to call fulfillRandomWords
        // Instead of using IVRFConsumer, which might not have the function,
        // use a low-level call which won't fail if the function doesn't exist
        (bool success, ) = msg.sender.call(
            abi.encodeWithSignature("fulfillRandomWords(uint256,uint256[])", 1, randomWords)
        );
        
        return requestId;
    }
    
    /**
     * @dev Not implemented for the mock
     */
    function randomnessToRange(bytes32 requestId, uint256 range) external view override returns (uint256) {
        return uint256(requestId) % range;
    }
    
    /**
     * @dev Not implemented for the mock
     */
    function checkThreshold(bytes32 requestId, uint256 denominator, uint256 threshold) external view override returns (bool) {
        return uint256(requestId) % denominator < threshold;
    }
    
    /**
     * @dev Fulfill random words - not actually needed for mock as we fulfill immediately in requestRandomness
     */
    function fulfillRandomWords(bytes32 requestId, uint256[] memory randomWords) external override {
        // No-op in mock
    }
    
    /**
     * @dev Get the VRF configuration
     * @return vrfCoordinator_ VRF coordinator address
     * @return keyHash_ Key hash
     * @return subscriptionId_ Subscription ID
     */
    function getVRFConfiguration() external view override returns (
        address vrfCoordinator_,
        bytes32 keyHash_,
        uint64 subscriptionId_
    ) {
        return (vrfCoordinator, keyHash, subscriptionId);
    }
    
    /**
     * @dev Check if VRF is enabled
     * @return enabled Whether VRF is enabled
     */
    function isVrfEnabled() external view override returns (bool enabled) {
        return isEnabled;
    }
} 