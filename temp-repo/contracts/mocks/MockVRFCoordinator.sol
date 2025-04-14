// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockVRFCoordinator
 * @dev Mock implementation of PaintSwap VRF Coordinator for testing
 */
contract MockVRFCoordinator {
    // Events
    event RandomnessRequested(bytes32 indexed requestId);
    event RandomnessFulfilled(bytes32 indexed requestId, uint256 randomness);
    event FulfillmentError(bytes32 indexed requestId, string error);
    
    // Storage
    mapping(bytes32 => bool) public requests;
    mapping(bytes32 => address) public requesters;
    mapping(bytes32 => bool) public fulfilled;
    mapping(bytes32 => uint256) public randomResults;
    
    /**
     * @dev Request randomness
     * @return requestId The ID for the randomness request
     */
    function requestRandomness() external returns (bytes32) {
        // Create deterministic but unique request ID
        bytes32 requestId = keccak256(abi.encodePacked(block.timestamp, msg.sender, block.prevrandao));
        requests[requestId] = true;
        requesters[requestId] = msg.sender;
        fulfilled[requestId] = false;
        
        // Emit event for test listeners
        emit RandomnessRequested(requestId);
        return requestId;
    }
    
    /**
     * @dev Fulfill a randomness request (for testing)
     * @param requestId The ID of the request to fulfill
     * @param randomWords The random values to return
     */
    function fulfillRandomWords(bytes32 requestId, uint256[] memory randomWords) external {
        require(requests[requestId], "Request does not exist");
        require(!fulfilled[requestId], "Request already fulfilled");
        require(randomWords.length > 0, "No random words provided");
        
        address requester = requesters[requestId];
        require(requester != address(0), "Invalid requester");
        
        // Store the result before making external call (to prevent reentrancy)
        randomResults[requestId] = randomWords[0];
        fulfilled[requestId] = true;
        
        // Call fulfillRandomWords on the requester contract
        (bool success, bytes memory returnData) = requester.call(
            abi.encodeWithSignature(
                "fulfillRandomWords(bytes32,uint256[])", 
                requestId, 
                randomWords
            )
        );
        
        if (!success) {
            string memory errorMsg = "";
            if (returnData.length > 0) {
                // Try to extract error message
                errorMsg = _extractRevertReason(returnData);
            }
            emit FulfillmentError(requestId, errorMsg);
            require(success, "Fulfillment failed");
        }
        
        emit RandomnessFulfilled(requestId, randomWords[0]);
    }
    
    /**
     * @dev Get result for a fulfilled request (for testing)
     * @param requestId The ID of the fulfilled request
     * @return The random result for the request
     */
    function getRandomResult(bytes32 requestId) external view returns (uint256) {
        require(fulfilled[requestId], "Request not fulfilled");
        return randomResults[requestId];
    }
    
    /**
     * @dev Check if a request has been fulfilled (for testing)
     * @param requestId The ID of the request
     * @return Whether the request has been fulfilled
     */
    function isRequestFulfilled(bytes32 requestId) external view returns (bool) {
        return fulfilled[requestId];
    }
    
    /**
     * @dev Extract revert reason from return data
     * @param _returnData The return data from the failed call
     * @return Extracted revert reason
     */
    function _extractRevertReason(bytes memory _returnData) internal pure returns (string memory) {
        // If the _res length is less than 68, then the transaction failed silently
        if (_returnData.length < 68) return "Transaction reverted silently";
        
        // Extract the revert reason from the response
        assembly {
            // Skip the first 4 bytes (function selector) and the offset
            _returnData := add(_returnData, 0x04)
        }
        return abi.decode(_returnData, (string));
    }
} 