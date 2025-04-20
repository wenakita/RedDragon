// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IVRFConsumer.sol";
import "../interfaces/IDragonPaintSwapVRF.sol";

/**
 * @title MockPaintSwapVRF
 * @dev A mock implementation of PaintSwap's VRF for testing
 */
contract MockPaintSwapVRF is IDragonPaintSwapVRF {
    // Mapping to store callback contracts for each request
    mapping(bytes32 => address) public callbacks;
    mapping(bytes32 => uint256[]) public randomValues;
    
    // Request counter
    uint256 private nonce;
    
    bytes32 public lastRequestId;
    address public vrfCoordinator;
    bytes32 public keyHash;
    uint64 public subscriptionId;
    uint256[] public randomWords;
    bool public verificationResult;
    
    /**
     * @dev Request randomness from the VRF provider
     * @return requestId The request ID
     */
    function requestRandomness() external override returns (bytes32) {
        bytes32 requestId = keccak256(abi.encodePacked(block.timestamp, msg.sender));
        callbacks[requestId] = msg.sender;
        lastRequestId = requestId;
        return requestId;
    }
    
    /**
     * @dev Convert randomness to a range
     */
    function randomnessToRange(bytes32 requestId, uint256 range) external view override returns (uint256) {
        require(range > 0, "Range must be greater than 0");
        uint256[] memory values = randomValues[requestId];
        require(values.length > 0, "No random values for request");
        return values[0] % range;
    }

    /**
     * @dev Check if random value is below threshold
     */
    function checkThreshold(bytes32 requestId, uint256 denominator, uint256 threshold) external view override returns (bool) {
        require(denominator > 0, "Denominator must be greater than 0");
        require(threshold <= denominator, "Threshold must be less than or equal to denominator");
        uint256[] memory values = randomValues[requestId];
        require(values.length > 0, "No random values for request");
        return values[0] % denominator < threshold;
    }

    /**
     * @dev Fulfill random words
     */
    function fulfillRandomWords(bytes32 requestId, uint256[] memory _randomWords) external override {
        randomValues[requestId] = _randomWords;
        address callback = callbacks[requestId];
        require(callback != address(0), "Request not found");
        
        // Call the callback function on the consumer contract
        IVRFConsumer(callback).fulfillRandomness(requestId, _randomWords);
        
        // Clean up
        delete callbacks[requestId];
    }

    function getVRFConfiguration() external view override returns (
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId
    ) {
        return (vrfCoordinator, keyHash, subscriptionId);
    }

    /**
     * @dev Check if VRF is enabled for this contract
     * @return True if VRF is enabled
     */
    function isVrfEnabled() external view returns (bool) {
        return vrfCoordinator != address(0);
    }

    function setVRFConfiguration(
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId
    ) external {
        vrfCoordinator = _vrfCoordinator;
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
    }

    function setVerificationResult(bool _result) external {
        verificationResult = _result;
    }

    function verify() external view returns (bool) {
        return verificationResult;
    }
} 