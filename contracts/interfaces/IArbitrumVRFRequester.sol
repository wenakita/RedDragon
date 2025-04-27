// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title IArbitrumVRFRequester
 * @notice Interface for the Arbitrum VRF Requester contract
 */
interface IArbitrumVRFRequester {
    /**
     * @notice Requests randomness from Chainlink VRF
     * @param sourceChainId ID of the source chain
     * @param sender Address of the sender on the source chain
     * @param requestId ID of the request from the source chain
     * @return requestId The Chainlink VRF request ID
     */
    function requestRandomness(uint64 sourceChainId, address sender, uint256 requestId) external returns (uint256);
    
    /**
     * @notice Sets the endpoint for a specific chain
     * @param chainId The chain ID to set the endpoint for
     * @param endpoint The endpoint address
     */
    function setEndpoint(uint64 chainId, address endpoint) external;
} 