// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Client.sol";

/**
 * @title IRouterClient
 * @dev Interface for Chainlink CCIP Router Client
 * This is a simplified version for demonstration purposes
 */
interface IRouterClient {
    /**
     * @dev Sends a message to another chain
     * @param destinationChainSelector The selector of the destination chain
     * @param message The message to send
     * @return messageId The ID of the message
     */
    function ccipSend(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage calldata message
    ) external payable returns (bytes32 messageId);
} 