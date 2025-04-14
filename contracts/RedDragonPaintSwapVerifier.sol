// SPDX-License-Identifier: MIT
// Fair, Verifiable, Simple: Ape the Dragon
// https://x.com/sonicreddragon
// https://t.me/sonicreddragon

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./interfaces/IVRFCoordinator.sol";
import "./interfaces/IVRFConsumer.sol";

/**
 * @title RedDragonPaintSwapVerifier
 * @dev Verifies PaintSwap VRF randomness proofs for the RedDragonPaintSwap contract
 * @notice This contract implements verification logic for PaintSwap VRF randomness
 */
contract RedDragonPaintSwapVerifier is Ownable, Pausable, ReentrancyGuard, IVRFConsumer {
    // Circuit breaker
    bool public isPaused;
    
    // Timelock for critical operations
    mapping(bytes32 => uint256) private timelockExpirations;
    uint256 private constant TIMELOCK_PERIOD = 2 days;

    // VRF configuration
    address public vrfCoordinator;
    uint64 public subscriptionId;
    bytes32 public gasLane;
    uint32 public callbackGasLimit;
    uint16 public requestConfirmations;

    // Request tracking
    mapping(bytes32 => uint256) private randomResults;
    mapping(bytes32 => bool) private requestFulfilled;
    mapping(address => bytes32) private latestRequestId;

    // Events
    event VRFConfigUpdated(address indexed vrfCoordinator, uint64 subscriptionId, bytes32 gasLane);
    event PauseStateChanged(bool isPaused);
    event TimelockOperationProposed(bytes32 indexed operationId, string operation, uint256 expirationTime);
    event TimelockOperationExecuted(bytes32 indexed operationId, string operation);
    event TimelockOperationCancelled(bytes32 indexed operationId, string operation);

    /**
     * @dev Circuit breaker modifier
     */
    modifier whenNotPaused() override {
        require(!isPaused, "Contract is paused");
        _;
    }

    constructor() {
        vrfCoordinator = address(0); // Set in initialize
        subscriptionId = 0;
        gasLane = 0;
        callbackGasLimit = 0;
        requestConfirmations = 0;
        isPaused = false;
    }

    function initialize(
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _gasLane,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations
    ) external onlyOwner {
        require(vrfCoordinator == address(0), "Already initialized");
        vrfCoordinator = _vrfCoordinator;
        subscriptionId = _subscriptionId;
        gasLane = _gasLane;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        
        emit VRFConfigUpdated(_vrfCoordinator, _subscriptionId, _gasLane);
    }

    /**
     * @dev Requests randomness from PaintSwap VRF
     * @return requestId The ID of the randomness request
     */
    function requestRandomness() external whenNotPaused returns (bytes32) {
        // EOA SECURITY CHECKS
        require(tx.origin == msg.sender, "Only EOAs can call directly");
        require(msg.sender.code.length == 0, "Only EOAs allowed");

        // Call the actual PaintSwap VRF coordinator
        bytes32 requestId;
        
        if (vrfCoordinator != address(0)) {
            // In production: Request randomness from the PaintSwap VRF coordinator
            requestId = IVRFCoordinator(vrfCoordinator).requestRandomness();
            requestFulfilled[requestId] = false;
            latestRequestId[msg.sender] = requestId;
        } else {
            // UNSAFE: We should not provide a fallback that can be exploited
            // Instead, revert the transaction if VRF is not initialized
            revert("VRF coordinator not initialized");
        }
        
        emit IVRFConsumer.RandomnessRequested(requestId);
        return requestId;
    }

    /**
     * @dev Callback function called by PaintSwap VRF Coordinator when randomness is fulfilled
     * @param requestId The ID of the randomness request
     * @param randomWords The random values generated
     */
    function fulfillRandomWords(bytes32 requestId, uint256[] memory randomWords) external whenNotPaused {
        require(msg.sender == vrfCoordinator, "Only VRF coordinator");
        require(!requestFulfilled[requestId], "Request already fulfilled");
        require(randomWords.length > 0, "No random words");

        randomResults[requestId] = randomWords[0];
        requestFulfilled[requestId] = true;
    }

    function getRandomResult(bytes32 requestId) external view returns (uint256) {
        require(requestFulfilled[requestId], "Request not fulfilled");
        return randomResults[requestId];
    }

    function isRequestFulfilled(bytes32 requestId) external view returns (bool) {
        return requestFulfilled[requestId];
    }

    function getLatestRequestId(address user) external view returns (bytes32) {
        return latestRequestId[user];
    }

    function randomnessToRange(bytes32 requestId, uint256 range) external view returns (uint256) {
        require(requestFulfilled[requestId], "Request not fulfilled");
        require(range > 0, "Range must be greater than 0");
        return randomResults[requestId] % range;
    }

    function checkThreshold(bytes32 requestId, uint256 denominator, uint256 threshold) external view returns (bool) {
        require(requestFulfilled[requestId], "Request not fulfilled");
        require(denominator > 0, "Denominator must be greater than 0");
        require(threshold <= denominator, "Threshold must be less than or equal to denominator");
        return (randomResults[requestId] % denominator) < threshold;
    }

    /**
     * @dev Propose VRF config update (timelocked)
     */
    function proposeVRFConfigUpdate(
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _gasLane,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations
    ) external onlyOwner {
        require(_vrfCoordinator != address(0), "VRF coordinator cannot be zero address");
        
        bytes32 operationId = keccak256(abi.encode(
            "updateVRFConfig", 
            _vrfCoordinator, 
            _subscriptionId, 
            _gasLane, 
            _callbackGasLimit, 
            _requestConfirmations
        ));
        
        timelockExpirations[operationId] = block.timestamp + TIMELOCK_PERIOD;
        
        emit TimelockOperationProposed(operationId, "updateVRFConfig", timelockExpirations[operationId]);
    }
    
    /**
     * @dev Execute VRF config update after timelock period
     */
    function executeVRFConfigUpdate(
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _gasLane,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations
    ) external onlyOwner {
        bytes32 operationId = keccak256(abi.encode(
            "updateVRFConfig", 
            _vrfCoordinator, 
            _subscriptionId, 
            _gasLane, 
            _callbackGasLimit, 
            _requestConfirmations
        ));
        
        require(timelockExpirations[operationId] > 0, "Operation not proposed");
        require(block.timestamp >= timelockExpirations[operationId], "Timelock not expired");
        
        delete timelockExpirations[operationId];
        
        vrfCoordinator = _vrfCoordinator;
        subscriptionId = _subscriptionId;
        gasLane = _gasLane;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        
        emit VRFConfigUpdated(_vrfCoordinator, _subscriptionId, _gasLane);
        emit TimelockOperationExecuted(operationId, "updateVRFConfig");
    }
    
    /**
     * @dev Cancel a proposed timelock operation
     * @param operationId ID of the operation to cancel
     */
    function cancelTimelockOperation(bytes32 operationId) external onlyOwner {
        require(timelockExpirations[operationId] > 0, "Operation not proposed");
        
        delete timelockExpirations[operationId];
        emit TimelockOperationCancelled(operationId, "cancelled");
    }
    
    /**
     * @dev Enable or disable the circuit breaker
     * @param _isPaused New pause state
     */
    function setPaused(bool _isPaused) external onlyOwner {
        isPaused = _isPaused;
        emit PauseStateChanged(_isPaused);
    }

    /**
     * @dev Implement the fulfillRandomness method required by IVRFConsumer
     * @param requestId The request ID of the randomness request
     * @param randomWords The random values generated
     */
    function fulfillRandomness(bytes32 requestId, uint256[] memory randomWords) external override whenNotPaused {
        // Direct implementation instead of calling another method
        require(msg.sender == vrfCoordinator, "Only VRF coordinator");
        require(!requestFulfilled[requestId], "Request already fulfilled");
        require(randomWords.length > 0, "No random words");

        randomResults[requestId] = randomWords[0];
        requestFulfilled[requestId] = true;

        emit IVRFConsumer.RandomnessFulfilled(requestId, randomWords[0]);
    }

    /**
     * @dev Get the VRF configuration
     * @return vrfCoordinatorAddress Address of the VRF coordinator
     * @return keyHash VRF key hash
     * @return subscriptionId VRF subscription ID
     */
    function getVRFConfiguration() external view override returns (
        address vrfCoordinatorAddress,
        bytes32 keyHash,
        uint64 subscriptionId
    ) {
        return (vrfCoordinator, gasLane, subscriptionId);
    }

    /**
     * @dev Check if VRF is enabled for this contract
     * @return True if VRF is enabled
     */
    function isVrfEnabled() external view override returns (bool) {
        return vrfCoordinator != address(0);
    }
} 