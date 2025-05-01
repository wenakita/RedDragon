// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBalancerVault
 * @dev Interface for Balancer Vault V3 for integration with Dragon token
 */
interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    enum JoinKind { INIT, EXACT_TOKENS_IN_FOR_BPT_OUT, TOKEN_IN_FOR_EXACT_BPT_OUT, ALL_TOKENS_IN_FOR_EXACT_BPT_OUT }
    enum ExitKind { EXACT_BPT_IN_FOR_ONE_TOKEN_OUT, EXACT_BPT_IN_FOR_TOKENS_OUT, BPT_IN_FOR_EXACT_TOKENS_OUT }

    /**
     * @dev Data for a single swap
     */
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }

    /**
     * @dev Data for funding a swap
     */
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }

    /**
     * @dev Executes a swap between two tokens
     */
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);

    /**
     * @dev Join a Balancer/Beets pool
     * @param poolId The ID of the pool to join
     * @param sender The address sending the tokens
     * @param recipient The address that will receive the BPT tokens
     * @param request Join pool request parameters
     */
    function joinPool(
        bytes32 poolId,
        address sender,
        address recipient,
        JoinPoolRequest memory request
    ) external payable;

    /**
     * @dev Exit a Balancer/Beets pool
     * @param poolId The ID of the pool to exit
     * @param sender The address redeeming the BPT tokens
     * @param recipient The address that will receive the underlying tokens
     * @param request Exit pool request parameters
     */
    function exitPool(
        bytes32 poolId,
        address sender,
        address recipient,
        ExitPoolRequest memory request
    ) external;

    /**
     * @dev Get the pool tokens and balances
     * @param poolId The ID of the pool to query
     * @return tokens The addresses of the tokens in the pool
     * @return balances The balances of each token in the pool
     * @return lastChangeBlock The block when the pool was last modified
     */
    function getPoolTokens(bytes32 poolId) external view returns (
        address[] memory tokens,
        uint256[] memory balances,
        uint256 lastChangeBlock
    );

    /**
     * @dev Structure for join pool requests
     */
    struct JoinPoolRequest {
        address[] assets;
        uint256[] maxAmountsIn;
        bytes userData;
        bool fromInternalBalance;
    }

    /**
     * @dev Structure for exit pool requests
     */
    struct ExitPoolRequest {
        address[] assets;
        uint256[] minAmountsOut;
        bytes userData;
        bool toInternalBalance;
    }
} 