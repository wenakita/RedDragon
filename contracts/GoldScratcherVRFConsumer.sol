// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IVRFConsumer.sol";
import "./interfaces/IDragonChainlinkVRF.sol";

/**
 * @title GoldScratcherVRFConsumer
 * @dev Example implementation of a VRF consumer for Gold Scratcher
 */
contract GoldScratcherVRFConsumer is IVRFConsumer, Ownable {
    // VRF provider
    IDragonChainlinkVRF public vrfProvider;
    
    // Mapping from requestId to randomness result
    mapping(bytes32 => uint256) public randomResults;
    mapping(bytes32 => bool) public requestFulfilled;
    
    // Mapping from scratcher ID to randomness
    mapping(uint256 => uint256) public scratcherRandomness;
    
    // Last request ID
    bytes32 public lastRequestId;
    
    // Pending scratcher IDs waiting for randomness
    mapping(bytes32 => uint256[]) public pendingScratchers;
    
    // Events
    event RandomnessRequested(bytes32 indexed requestId, uint256[] scratcherIds);
    event RandomnessFulfilled(bytes32 indexed requestId, uint256 randomValue);
    event ScratcherRandomnessAssigned(uint256 indexed scratcherId, uint256 randomValue);
    
    /**
     * @dev Constructor
     * @param _vrfProvider Address of the VRF provider
     */
    constructor(address _vrfProvider) Ownable() {
        require(_vrfProvider != address(0), "VRF provider cannot be zero address");
        vrfProvider = IDragonChainlinkVRF(_vrfProvider);
    }
    
    /**
     * @dev Requests randomness for a batch of scratcher IDs
     * @param scratcherIds Array of scratcher IDs to assign randomness to
     * @return requestId The ID of the randomness request
     */
    function requestRandomnessForScratchers(uint256[] calldata scratcherIds) external onlyOwner returns (bytes32) {
        require(scratcherIds.length > 0, "No scratcher IDs provided");
        
        // Request randomness from VRF provider
        bytes32 requestId = vrfProvider.requestRandomness(1); // Request one random word
        
        // Store the scratcher IDs for this request
        pendingScratchers[requestId] = scratcherIds;
        
        // Update last request ID
        lastRequestId = requestId;
        
        emit RandomnessRequested(requestId, scratcherIds);
        return requestId;
    }
    
    /**
     * @dev Fulfill random words callback
     * @param requestId The ID of the randomness request
     * @param randomWords The random values
     */
    function rawFulfillRandomWords(bytes32 requestId, uint256[] memory randomWords) external override {
        require(msg.sender == address(vrfProvider), "Only VRF provider can fulfill");
        require(!requestFulfilled[requestId], "Request already fulfilled");
        require(randomWords.length > 0, "No random words provided");
        
        // Mark request as fulfilled
        requestFulfilled[requestId] = true;
        
        // Store the random value
        uint256 randomValue = randomWords[0];
        randomResults[requestId] = randomValue;
        
        // Process pending scratchers
        uint256[] memory scratcherIds = pendingScratchers[requestId];
        for (uint256 i = 0; i < scratcherIds.length; i++) {
            uint256 scratcherId = scratcherIds[i];
            
            // Generate a unique random value for each scratcher using the provided randomness
            uint256 scratcherRandom = uint256(keccak256(abi.encode(randomValue, scratcherId)));
            
            // Store the randomness for this scratcher
            scratcherRandomness[scratcherId] = scratcherRandom;
            
            emit ScratcherRandomnessAssigned(scratcherId, scratcherRandom);
        }
        
        // Clean up
        delete pendingScratchers[requestId];
        
        emit RandomnessFulfilled(requestId, randomValue);
    }
    
    /**
     * @dev Gets a random number in a range for a scratcher
     * @param scratcherId The ID of the scratcher
     * @param min The minimum value (inclusive)
     * @param max The maximum value (inclusive)
     * @return A random number between min and max
     */
    function getRandomNumberInRange(uint256 scratcherId, uint256 min, uint256 max) external view returns (uint256) {
        require(max >= min, "Max must be >= min");
        require(scratcherRandomness[scratcherId] != 0, "No randomness for this scratcher");
        
        uint256 randomness = scratcherRandomness[scratcherId];
        uint256 range = max - min + 1;
        
        return min + (randomness % range);
    }
    
    /**
     * @dev Checks if a scratcher is a winner based on probability
     * @param scratcherId The ID of the scratcher
     * @param winProbability The probability of winning (1-10000, where 10000 = 100%)
     * @return True if the scratcher is a winner
     */
    function isScratcherWinner(uint256 scratcherId, uint256 winProbability) external view returns (bool) {
        require(winProbability <= 10000, "Probability must be <= 10000");
        require(scratcherRandomness[scratcherId] != 0, "No randomness for this scratcher");
        
        uint256 randomness = scratcherRandomness[scratcherId];
        uint256 scaled = randomness % 10000;
        
        return scaled < winProbability;
    }
    
    /**
     * @dev Updates the VRF provider
     * @param _vrfProvider New VRF provider address
     */
    function setVRFProvider(address _vrfProvider) external onlyOwner {
        require(_vrfProvider != address(0), "VRF provider cannot be zero address");
        vrfProvider = IDragonChainlinkVRF(_vrfProvider);
    }
} 