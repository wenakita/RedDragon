// SPDX-License-Identifier: MIT
// Fair, Verifiable, Simple: Ape the Dragon
// https://x.com/sonicreddragon
// https://t.me/sonicreddragon

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IVRFCoordinator.sol";
import "./interfaces/IVRFConsumer.sol";
import "./interfaces/IRedDragonSwapLottery.sol";

/**
 * @title RedDragonPaintSwapVerifier
 * @notice This contract implements verification logic for PaintSwap VRF randomness
 */
contract RedDragonPaintSwapVerifier is Ownable, Pausable, ReentrancyGuard, IVRFConsumer {
    // VRF Coordinator
    address public vrfCoordinator;
    uint64 public subscriptionId;
    bytes32 public keyHash;

    // Lottery contract
    address public redDragonLottery;

    // Request tracking
    mapping(bytes32 => bool) public requestFulfilled;
    mapping(bytes32 => uint256) public randomResults;

    // Events
    event VRFConfigUpdated(address vrfCoordinator, uint64 subscriptionId, bytes32 keyHash);
    event RandomWordsRequested(bytes32 requestId, address user);
    event RandomWordsFulfilled(bytes32 requestId, uint256[] randomWords);
    event SubscriptionIdSet(uint64 subscriptionId);

    modifier onlyVRFCoordinator() {
        require(msg.sender == vrfCoordinator, "Only VRF coordinator");
        _;
    }

    function initialize(
        address _vrfCoordinator,
        address _redDragonLottery,
        uint64 _subscriptionId,
        bytes32 _keyHash
    ) external onlyOwner {
        require(vrfCoordinator == address(0), "Already initialized");
        vrfCoordinator = _vrfCoordinator;
        redDragonLottery = _redDragonLottery;
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        
        emit VRFConfigUpdated(_vrfCoordinator, _subscriptionId, _keyHash);
    }

    function requestRandomness() external override whenNotPaused returns (bytes32) {
        require(msg.sender == redDragonLottery, "Only lottery contract");
        
        bytes32 requestId = IVRFCoordinator(vrfCoordinator).requestRandomness();
        requestFulfilled[requestId] = false;
        
        emit RandomWordsRequested(requestId, msg.sender);
        return requestId;
    }

    function fulfillRandomness(
        bytes32 requestId,
        uint256[] memory randomWords
    ) external override whenNotPaused onlyVRFCoordinator {
        require(!requestFulfilled[requestId], "Request already fulfilled");
        require(randomWords.length > 0, "No random words");

        randomResults[requestId] = randomWords[0];
        requestFulfilled[requestId] = true;

        // Convert bytes32 requestId to uint256 for the lottery contract
        uint256 numericRequestId = uint256(requestId);
        IRedDragonSwapLottery(redDragonLottery).processRandomWords(numericRequestId, randomWords);
        emit RandomWordsFulfilled(requestId, randomWords);
    }

    function getVRFConfiguration() external view override returns (
        address vrfCoordinator_,
        bytes32 keyHash_,
        uint64 subscriptionId_
    ) {
        return (vrfCoordinator, keyHash, subscriptionId);
    }

    function isVrfEnabled() external view override returns (bool) {
        return vrfCoordinator != address(0);
    }

    function setSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
        emit SubscriptionIdSet(_subscriptionId);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
} 