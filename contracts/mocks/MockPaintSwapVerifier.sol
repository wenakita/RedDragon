// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IDragonPaintSwapVRF.sol";
import "../interfaces/IVRFConsumer.sol";

/**
 * @title MockPaintSwapVerifier
 * @dev Simple mock verifier for testing
 */
contract MockPaintSwapVerifier is IDragonPaintSwapVRF {
    bytes32 public lastRequestId;
    bool public vrfEnabled = true;
    mapping(bytes32 => uint256[]) public randomValues;
    
    /**
     * @dev Set VRF enabled state
     */
    function setVrfEnabled(bool _enabled) external {
        vrfEnabled = _enabled;
    }
    
    /**
     * @dev Check if VRF is enabled
     */
    function isVrfEnabled() external view override returns (bool) {
        return vrfEnabled;
    }
    
    /**
     * @dev Request random number
     */
    function requestRandomness() external override returns (bytes32) {
        bytes32 requestId = keccak256(abi.encodePacked(block.timestamp, msg.sender));
        lastRequestId = requestId;
        return requestId;
    }
    
    /**
     * @dev Get VRF configuration
     */
    function getVRFConfiguration() external pure override returns (
        address vrfCoordinator,
        bytes32 keyHash,
        uint64 subscriptionId
    ) {
        return (address(0), bytes32(0), 0);
    }
    
    /**
     * @dev Convert randomness to a range
     */
    function randomnessToRange(bytes32 requestId, uint256 range) external view override returns (uint256) {
        if (randomValues[requestId].length == 0) {
            return 0;
        }
        return randomValues[requestId][0] % range;
    }
    
    /**
     * @dev Check if random value is below threshold
     */
    function checkThreshold(bytes32 requestId, uint256 denominator, uint256 threshold) external view override returns (bool) {
        if (randomValues[requestId].length == 0) {
            return false;
        }
        return (randomValues[requestId][0] % denominator) < threshold;
    }
    
    /**
     * @dev Fulfill random words
     */
    function fulfillRandomWords(bytes32 requestId, uint256[] memory randomWords) external override {
        randomValues[requestId] = randomWords;
    }
    
    /**
     * @dev Manually fulfill randomness for testing
     */
    function fulfillRandomnessMock(bytes32 requestId, uint256[] memory randomWords, address consumer) external {
        // Store the values first
        randomValues[requestId] = randomWords;
        
        // Call the consumer's fulfillRandomness function
        IVRFConsumer(consumer).fulfillRandomness(requestId, randomWords);
    }
} 