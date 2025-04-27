// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Client
 * @dev Library for Chainlink CCIP message structures
 * This is a simplified version for demonstration purposes
 */
library Client {
    struct EVMTokenAmount {
        address token; // The token address
        uint256 amount; // The token amount
    }
    
    struct EVM2AnyMessage {
        bytes receiver; // The receiver address as bytes
        bytes data; // The data to send
        EVMTokenAmount[] tokenAmounts; // The tokens to transfer
        bytes extraArgs; // Additional arguments
        address feeToken; // The token used for paying fees (address(0) for native)
    }
    
    struct Any2EVMMessage {
        bytes sender; // The sender address as bytes
        uint64 sourceChainSelector; // The source chain selector
        bytes data; // The data received
        EVMTokenAmount[] tokenAmounts; // The tokens received
    }
    
    struct EVMExtraArgsV1 {
        uint256 gasLimit; // The gas limit for the destination chain execution
    }
    
    /**
     * @dev Converts EVMExtraArgsV1 to bytes
     * @param extraArgs The extra arguments to convert
     * @return The extra arguments as bytes
     */
    function _argsToBytes(EVMExtraArgsV1 memory extraArgs) internal pure returns (bytes memory) {
        return abi.encode(extraArgs);
    }
} 