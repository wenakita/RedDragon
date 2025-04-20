// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IDragonPaintSwapVRF.sol";

contract MockDragonPaintSwapVRF is IDragonPaintSwapVRF {
    address public vrfCoordinator;
    bytes32 public keyHash;
    uint64 public subscriptionId;
    bool public shouldFail;
    bool public isVrfEnabled;
    uint256 public requestCount;
    address public lastConsumer;

    constructor(address _vrfCoordinator, bool _isVrfEnabled) {
        vrfCoordinator = _vrfCoordinator;
        keyHash = keccak256(abi.encodePacked("MockDragonPaintSwapVRF"));
        subscriptionId = _isVrfEnabled ? 123456 : 0;
        isVrfEnabled = _isVrfEnabled;
    }

    function setShouldFail(bool _shouldFail) external {
        shouldFail = _shouldFail;
    }

    function setVrfEnabled(bool _isVrfEnabled) external {
        isVrfEnabled = _isVrfEnabled;
        if(!_isVrfEnabled){
            subscriptionId = 0;
        } else {
            subscriptionId = 123456;
        }
    }

    function requestRandomness() external returns (bytes32 requestId) {
        require(!shouldFail, "VRF request failed");
        requestCount++;
        lastConsumer = msg.sender;
        requestId = keccak256(abi.encodePacked(block.timestamp, msg.sender, requestCount));
        return requestId;
    }

    function randomnessToRange(bytes32 requestId, uint256 range) external pure returns (uint256) {
        return uint256(requestId) % range;
    }

    function checkThreshold(bytes32 requestId, uint256 denominator, uint256 threshold) external pure returns (bool) {
        return uint256(requestId) % denominator < threshold;
    }

    function fulfillRandomWords(bytes32, uint256[] memory) external {}

    function getVRFConfiguration() external view returns (address, bytes32, uint64) {
        return (vrfCoordinator, keyHash, subscriptionId);
    }
}
