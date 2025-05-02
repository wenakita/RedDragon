// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReadCodecV1
 * @dev Mock implementation of LayerZero ReadCodecV1 for testing purposes
 */
library ReadCodecV1 {
    /**
     * @notice Encode a set of EVM call requests into a byte array
     * @param _appVersion Application version
     * @param _readRequests Array of EVM call requests
     * @return Encoded byte array
     */
    function encode(
        uint32 _appVersion,
        EVMCallRequestV1[] memory _readRequests
    ) internal pure returns (bytes memory) {
        bytes memory result = abi.encode(_appVersion, _readRequests);
        return result;
    }
    
    /**
     * @notice Decode a byte array into a set of response bytes and request labels
     * @param _appVersion Application version
     * @param _message Encoded message to decode
     * @return responses Array of response bytes
     * @return appRequestLabels Array of request labels
     */
    function decode(
        uint32 _appVersion,
        bytes calldata _message
    ) internal pure returns (bytes[] memory responses, uint[] memory appRequestLabels) {
        // In a real implementation this would decode the message
        // For testing, we'll just create dummy responses
        responses = new bytes[](4);
        appRequestLabels = new uint[](4);
        
        // Mock responses for each expected call
        responses[0] = abi.encode(uint64(123456)); // Subscription ID
        responses[1] = abi.encode(bytes32(uint256(123456789))); // Key hash
        responses[2] = abi.encode(uint16(3)); // Confirmations
        responses[3] = abi.encode(uint32(500000)); // Callback gas limit
        
        // Mock request labels
        appRequestLabels[0] = 1;
        appRequestLabels[1] = 2;
        appRequestLabels[2] = 3;
        appRequestLabels[3] = 4;
        
        return (responses, appRequestLabels);
    }
}

/**
 * @dev Structure representing an EVM call request
 */
struct EVMCallRequestV1 {
    uint appRequestLabel;
    uint32 targetEid;
    bool isBlockNum;
    uint64 blockNumOrTimestamp;
    uint16 confirmations;
    address to;
    bytes callData;
} 