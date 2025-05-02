// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IBalancerVault.sol";

/**
 * @title MockBalancerVault
 * @dev Mock implementation of Balancer Vault for testing purposes
 */
abstract contract MockBalancerVault is IBalancerVault {
    using SafeERC20 for IERC20;
    
    // Pool data
    struct PoolData {
        address[] tokens;
        uint256[] balances;
        uint256 lastChangeBlock;
    }
    
    // Storage
    mapping(bytes32 => PoolData) private pools;
    uint256 private mockReturnAmount;
    
    // Setup a mock pool with tokens and balances
    function setupPool(
        bytes32 poolId,
        address[] memory tokens,
        uint256[] memory balances,
        uint256 lastChangeBlock
    ) external {
        PoolData storage pool = pools[poolId];
        pool.tokens = tokens;
        pool.balances = balances;
        pool.lastChangeBlock = lastChangeBlock;
    }
    
    // Set the mock return amount for swaps
    function mockSetReturnAmount(uint256 amount) external {
        mockReturnAmount = amount;
    }
    
    /**
     * @notice Gets a pool's registered tokens
     * @param poolId The ID of the pool
     * @return tokens An array of the token addresses
     * @return balances An array of the token balances
     * @return lastChangeBlock The block in which the balance was last changed
     */
    function getPoolTokens(bytes32 poolId) external view override returns (
        address[] memory tokens,
        uint256[] memory balances,
        uint256 lastChangeBlock
    ) {
        PoolData storage pool = pools[poolId];
        return (pool.tokens, pool.balances, pool.lastChangeBlock);
    }
    
    /**
     * @notice Mock swap implementation for testing
     * @dev Always returns the mockReturnAmount value
     */
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable override returns (uint256) {
        // Transfer tokens from sender to this contract
        IERC20(singleSwap.assetIn).safeTransferFrom(funds.sender, address(this), singleSwap.amount);
        
        // Transfer return tokens to recipient
        IERC20(singleSwap.assetOut).safeTransfer(funds.recipient, mockReturnAmount);
        
        return mockReturnAmount;
    }
    
    /**
     * @notice Mock implementation of joinPool
     * @dev Required by IBalancerVault interface
     */
    function joinPool(
        bytes32 poolId,
        address sender,
        address recipient,
        JoinPoolRequest memory request
    ) external payable override {
        // In this mock, we simply transfer tokens from sender to the pool
        // and record the balances without any complex logic
        PoolData storage pool = pools[poolId];
        
        if (pool.tokens.length == 0) {
            return; // No tokens in pool
        }
        
        // Process token transfers in
        for (uint256 i = 0; i < pool.tokens.length; i++) {
            address token = pool.tokens[i];
            uint256 amount = request.maxAmountsIn[i];
            
            if (amount > 0) {
                IERC20(token).safeTransferFrom(sender, address(this), amount);
                pool.balances[i] += amount;
            }
        }
        
        // Update last change block
        pool.lastChangeBlock = block.number;
    }
    
    /**
     * @notice Mock implementation of exitPool
     * @dev Required by IBalancerVault interface
     */
    function exitPool(
        bytes32 poolId,
        address sender,
        address payable recipient,
        ExitPoolRequest memory request
    ) external {
        // In this mock, we simply transfer tokens from the pool to the recipient
        // and record the balances without any complex logic
        PoolData storage pool = pools[poolId];
        
        if (pool.tokens.length == 0) {
            return; // No tokens in pool
        }
        
        // Process token transfers out
        for (uint256 i = 0; i < pool.tokens.length; i++) {
            address token = pool.tokens[i];
            uint256 amount = request.minAmountsOut[i];
            
            if (amount > 0 && pool.balances[i] >= amount) {
                IERC20(token).safeTransfer(recipient, amount);
                pool.balances[i] -= amount;
            }
        }
        
        // Update last change block
        pool.lastChangeBlock = block.number;
    }
} 