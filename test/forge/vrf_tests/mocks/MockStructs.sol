// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockStructs
 * @dev Helper structs and types for VRF tests
 */

// LayerZero Origin struct for cross-chain messages
struct Origin {
    uint32 srcEid;
    bytes32 sender;
    uint64 nonce;
}

// VRF Request status for tracking VRF requests
struct RequestStatus {
    uint64 sonicRequestId;
    address user;
    bool fulfilled;
    uint256 randomness;
} 