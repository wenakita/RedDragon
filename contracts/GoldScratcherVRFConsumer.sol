// SPDX-License-Identifier: MIT

/**
 *   ===================================
 *      GOLD SCRATCHER VRF CONSUMER
 *   ===================================
 *        Scratcher RNG Generator
 *   ===================================
 *
 * // "I like my women like I like my coffee... I don't like coffee." - Steven Reign (Casino Owner)
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IGoldScratcher.sol";

/**
 * @title GoldScratcherVRFConsumer
 * @dev VRF consumer for the Gold Scratcher contract
 */
contract GoldScratcherVRFConsumer is AccessControl {
    // Constants
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant CALLBACK_ROLE = keccak256("CALLBACK_ROLE");
    
    // Gold Scratcher contract
    IGoldScratcher public goldScratcher;
    
    // Request tracking
    mapping(uint64 => address) public requestIdToUser;
    mapping(uint64 => uint256) public requestIdToScratcherId;
    
    // Events
    event RequestSent(uint64 indexed requestId, address indexed user, uint256 scratcherId);
    event RequestFulfilled(uint64 indexed requestId, uint256[] randomWords);
    event ScratcherRevealed(uint64 indexed requestId, address indexed user, uint256 indexed scratcherId, bool isWinner);
    
    /**
     * @dev Constructor
     * @param _goldScratcher Gold Scratcher contract address
     */
    constructor(address _goldScratcher) {
        require(_goldScratcher != address(0), "Invalid Gold Scratcher address");
        
        goldScratcher = IGoldScratcher(_goldScratcher);
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
    }
    
    /**
     * @notice Request randomness for a scratcher
     * @param user The user who bought the scratcher
     * @param scratcherId The ID of the scratcher
     * @return requestId The ID of the randomness request
     */
    function requestRandomness(address user, uint256 scratcherId) external onlyRole(CALLBACK_ROLE) returns (uint64) {
        require(user != address(0), "Invalid user address");
        
        // Generate a pseudo-random request ID (in a real implementation, this would come from a VRF source)
        uint64 requestId = uint64(uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, user, scratcherId))));
        
        // Track request information
        requestIdToUser[requestId] = user;
        requestIdToScratcherId[requestId] = scratcherId;
        
        emit RequestSent(requestId, user, scratcherId);
        
        return requestId;
    }
    
    /**
     * @notice Process randomness
     * @param requestId The request ID
     * @param randomness The random value
     */
    function processRandomness(uint64 requestId, uint256 randomness) external onlyRole(CALLBACK_ROLE) {
        address user = requestIdToUser[requestId];
        uint256 scratcherId = requestIdToScratcherId[requestId];
        
        require(user != address(0), "Request not found");
        
        // Convert single randomness to array for event
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = randomness;
        
        emit RequestFulfilled(requestId, randomWords);
        
        // Use randomness to determine if the scratcher is a winner (using simple modulo)
        // In a real implementation, this would use a more complex algorithm
        bool isWinner = randomness % 100 < 10; // 10% chance of winning
        
        // Use the scratch function from the IGoldScratcher interface
        bool result = goldScratcher.scratch(scratcherId);
        
        emit ScratcherRevealed(requestId, user, scratcherId, isWinner);
        
        // Clean up
        delete requestIdToUser[requestId];
        delete requestIdToScratcherId[requestId];
    }
    
    /**
     * @notice Set the Gold Scratcher contract address
     * @param _goldScratcher New Gold Scratcher contract address
     */
    function setGoldScratcher(address _goldScratcher) external onlyRole(MANAGER_ROLE) {
        require(_goldScratcher != address(0), "Invalid Gold Scratcher address");
        goldScratcher = IGoldScratcher(_goldScratcher);
    }
    
    /**
     * @notice Check if a request exists for a specific user
     * @param requestId The request ID to check
     * @return exists Whether the request exists
     * @return user The user address
     * @return scratcherId The scratcher ID
     */
    function getRequestDetails(uint64 requestId) external view returns (bool exists, address user, uint256 scratcherId) {
        user = requestIdToUser[requestId];
        exists = user != address(0);
        scratcherId = requestIdToScratcherId[requestId];
    }
} 