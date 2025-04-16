// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBalancerVault
 * @dev Interface for interacting with Balancer/Beethoven X Vault
 */
interface IBalancerVault {
    enum JoinKind { INIT, EXACT_TOKENS_IN_FOR_BPT_OUT, TOKEN_IN_FOR_EXACT_BPT_OUT }
    enum ExitKind { EXACT_BPT_IN_FOR_ONE_TOKEN_OUT, EXACT_BPT_IN_FOR_TOKENS_OUT, BPT_IN_FOR_EXACT_TOKENS_OUT }
    
    /**
     * @dev Join a Balancer pool
     * @param poolId The ID of the pool to join
     * @param sender The address sending tokens to the pool
     * @param recipient The address receiving the BPT tokens
     * @param request The join request with all details
     */
    function joinPool(
        bytes32 poolId,
        address sender,
        address recipient,
        JoinPoolRequest memory request
    ) external payable;
    
    /**
     * @dev Exit a Balancer pool
     * @param poolId The ID of the pool to exit
     * @param sender The address sending BPT tokens back
     * @param recipient The address receiving the underlying tokens
     * @param request The exit request with all details
     */
    function exitPool(
        bytes32 poolId,
        address sender,
        address recipient,
        ExitPoolRequest memory request
    ) external;
    
    /**
     * @dev Request structure for joining a pool
     */
    struct JoinPoolRequest {
        address[] assets;
        uint256[] maxAmountsIn;
        bytes userData;
        bool fromInternalBalance;
    }
    
    /**
     * @dev Request structure for exiting a pool
     */
    struct ExitPoolRequest {
        address[] assets;
        uint256[] minAmountsOut;
        bytes userData;
        bool toInternalBalance;
    }
    
    /**
     * @dev Get the current state of tokens in a pool
     * @param poolId The ID of the pool to query
     * @return tokens Array of token addresses in the pool
     * @return balances Current balance of each token in the pool
     * @return lastChangeBlock Block number when the pool was last updated
     */
    function getPoolTokens(bytes32 poolId) external view returns (
        address[] memory tokens,
        uint256[] memory balances,
        uint256 lastChangeBlock
    );
} 