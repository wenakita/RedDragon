// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
   ================================
        VRF CONSUMER BASE
   ================================
    Abstract Base VRF Integration
    Secure Randomness Foundation
   Cross-Chain Randomness Standard
   ================================

   🎲 Verifiable Random Function
   🔗 Cross-Chain Compatible
   🔒 Secure Randomness Protocol
*/

/**
 * @title VRFConsumerBase
 * @dev Abstract base contract for VRF consumers
 * Provides foundation for requesting and receiving randomness
 */
abstract contract VRFConsumerBase {
    // Request tracking
    mapping(uint256 => address) internal _requestToUser;
    uint256 internal _nonce;
    
    // Events
    event RandomnessRequested(uint256 indexed requestId, address indexed user);
    event RandomnessReceived(uint256 indexed requestId, uint256 randomness);
    
    /**
     * @dev Empty constructor
     */
    constructor() {}
    
    /**
     * @notice Generate a unique request ID
     * @return requestId Unique request ID
     */
    function _getNextRequestId() internal returns (uint256) {
        return _nonce++;
    }
    
    /**
     * @notice Associate a request ID with a user
     * @param requestId Request ID
     * @param user User address
     */
    function _storeRequestUser(uint256 requestId, address user) internal {
        _requestToUser[requestId] = user;
    }
    
    /**
     * @notice Clear a request after processing
     * @param requestId Request ID to clear
     */
    function _clearRequest(uint256 requestId) internal {
        delete _requestToUser[requestId];
    }
    
    /**
     * @notice Get the user associated with a request
     * @param requestId Request ID
     * @return User address
     */
    function _getRequestUser(uint256 requestId) internal view returns (address) {
        return _requestToUser[requestId];
    }
    
    /**
     * @notice Request randomness from VRF
     * @param user The user requesting randomness
     * @return requestId The request ID for tracking
     */
    function _requestRandomness(address user) internal virtual returns (uint256 requestId);
    
    /**
     * @notice Process received randomness
     * @param requestId The request ID
     * @param randomness The random value
     */
    function _fulfillRandomness(uint256 requestId, uint256 randomness) internal virtual;
    
    /**
     * @dev Calculate random value within a range
     * @param randomValue The input random value
     * @param min The minimum value (inclusive)
     * @param max The maximum value (inclusive)
     * @return result Random value between min and max (inclusive)
     */
    function _getRandomInRange(uint256 randomValue, uint256 min, uint256 max) internal pure returns (uint256 result) {
        require(max >= min, "Max must be >= min");
        
        // Handle the case where min == max
        if (min == max) {
            return min;
        }
        
        // Make sure the range is inclusive of max
        uint256 range = max - min + 1;
        
        // Ensure we don't have modulo bias
        uint256 secureRandomness = uint256(keccak256(abi.encode(randomValue)));
        
        // Calculate random number within range [min, max]
        result = min + (secureRandomness % range);
        
        return result;
    }
    
    /**
     * @dev Generate multiple random values from a single seed
     * @param randomValue Base random value to derive from
     * @param count Number of random values to generate
     * @return randomValues Array of derived random values
     */
    function _expandRandomness(uint256 randomValue, uint256 count) internal pure returns (uint256[] memory randomValues) {
        randomValues = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            randomValues[i] = uint256(keccak256(abi.encode(randomValue, i)));
        }
        
        return randomValues;
    }
} 