// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBalancerWeightedPoolFactory
 * @dev Interface for creating Balancer/Beethoven X weighted pools
 */
interface IBalancerWeightedPoolFactory {
    /**
     * @dev Create a new weighted pool
     * @param name The name of the pool
     * @param symbol The symbol of the pool
     * @param tokens Array of token addresses in the pool
     * @param weights Array of weights for each token (normalized to 1e18)
     * @param swapFeePercentage The fee percentage (in 1e18 format, 0.01e18 = 1%)
     * @param owner The owner of the pool
     * @return The address of the newly created pool
     */
    function create(
        string memory name,
        string memory symbol,
        address[] memory tokens,
        uint256[] memory weights,
        uint256 swapFeePercentage,
        address owner
    ) external returns (address);
} 