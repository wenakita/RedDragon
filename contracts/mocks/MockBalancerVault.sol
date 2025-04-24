// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./MockBalancerPoolToken.sol";
import "./MockBalancerWeightedPoolV3.sol";

/**
 * @title MockBalancerVault
 * @dev Mock implementation of Balancer Vault for testing
 * Simplified version to test Dragon integration with Balancer
 */
contract MockBalancerVault is Ownable {
    using SafeERC20 for IERC20;

    // Registered pools
    mapping(bytes32 => address) public pools;
    mapping(bytes32 => address[]) public poolTokens;
    mapping(bytes32 => uint256[]) public poolBalances;
    
    // Pool details
    struct PoolInfo {
        bool registered;
        address poolAddress;
        address[] tokens;
    }
    
    mapping(bytes32 => PoolInfo) public poolInfo;
    
    // Events
    event PoolRegistered(bytes32 indexed poolId, address indexed poolAddress, address[] tokens);
    event Swap(bytes32 indexed poolId, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event PoolBalanceChanged(bytes32 indexed poolId, address indexed token, int256 amount);
    event InitialBPTMinted(bytes32 indexed poolId, address indexed recipient, uint256 amount);
    
    constructor() {}
    
    /**
     * @dev Register a new pool in the vault
     * @param poolId The unique identifier for the pool
     * @param poolAddress The address of the pool
     * @param tokens The tokens in the pool
     */
    function registerPool(bytes32 poolId, address poolAddress, address[] memory tokens) external onlyOwner {
        require(!poolInfo[poolId].registered, "Pool already registered");
        
        poolInfo[poolId] = PoolInfo({
            registered: true,
            poolAddress: poolAddress,
            tokens: tokens
        });
        
        pools[poolId] = poolAddress;
        poolTokens[poolId] = tokens;
        poolBalances[poolId] = new uint256[](tokens.length);
        
        emit PoolRegistered(poolId, poolAddress, tokens);
    }
    
    /**
     * @dev Mint initial BPT tokens for a pool (for testing purposes)
     * @param poolId The pool identifier
     * @param recipient The address receiving the BPT tokens
     * @param amount The amount of BPT tokens to mint
     * @return The amount of BPT tokens minted
     */
    function mintInitialBPT(
        bytes32 poolId,
        address recipient,
        uint256 amount
    ) external returns (uint256) {
        require(poolInfo[poolId].registered, "Pool not registered");
        address poolAddress = pools[poolId];
        
        // Get BPT token
        MockBalancerPoolToken bpt = MockBalancerPoolToken(
            MockBalancerWeightedPoolV3(poolAddress).getPoolTokenAddress()
        );
        
        // Mint BPT tokens to recipient
        bpt.mint(recipient, amount);
        
        emit InitialBPTMinted(poolId, recipient, amount);
        
        return amount;
    }
    
    /**
     * @dev Get pool tokens
     * @param poolId The pool identifier
     * @return tokens Array of token addresses in the pool
     * @return balances Array of token balances in the pool
     */
    function getPoolTokens(bytes32 poolId) external view returns (address[] memory tokens, uint256[] memory balances) {
        require(poolInfo[poolId].registered, "Pool not registered");
        return (poolTokens[poolId], poolBalances[poolId]);
    }
    
    /**
     * @dev Join a Balancer pool (simplified mock)
     * @param poolId The pool identifier
     * @param sender The address sending the tokens
     * @param recipient The address receiving the BPT tokens
     * @param request The join pool request with assets and other parameters
     * @return The amount of BPT tokens received
     */
    function joinPool(
        bytes32 poolId,
        address sender,
        address recipient,
        JoinPoolRequest memory request
    ) external returns (uint256) {
        require(poolInfo[poolId].registered, "Pool not registered");
        address poolAddress = pools[poolId];
        
        // Update pool balances
        for (uint256 i = 0; i < request.assets.length; i++) {
            address token = request.assets[i];
            uint256 amount = request.maxAmountsIn[i];
            
            if (amount > 0) {
                // Transfer tokens to this vault
                IERC20(token).safeTransferFrom(sender, address(this), amount);
                
                // Update internal balance tracking
                for (uint256 j = 0; j < poolTokens[poolId].length; j++) {
                    if (poolTokens[poolId][j] == token) {
                        poolBalances[poolId][j] += amount;
                        break;
                    }
                }
                
                emit PoolBalanceChanged(poolId, token, int256(amount));
            }
        }
        
        // Mint BPT tokens to recipient
        // Use a simple 1:1 ratio for minting LP tokens in this mock
        uint256 totalValue = 0;
        for (uint256 i = 0; i < request.maxAmountsIn.length; i++) {
            totalValue += request.maxAmountsIn[i];
        }
        
        MockBalancerPoolToken bpt = MockBalancerPoolToken(
            MockBalancerWeightedPoolV3(poolAddress).getPoolTokenAddress()
        );
        
        // Mint BPT tokens to recipient
        bpt.mint(recipient, totalValue);
        
        return totalValue;
    }
    
    /**
     * @dev Exit a Balancer pool (simplified mock)
     * @param poolId The pool identifier
     * @param sender The address sending the BPT tokens
     * @param recipient The address receiving the tokens
     * @param request The exit pool request
     * @return amountsOut The amounts of each token received
     */
    function exitPool(
        bytes32 poolId,
        address sender,
        address recipient,
        ExitPoolRequest memory request
    ) external returns (uint256[] memory amountsOut) {
        require(poolInfo[poolId].registered, "Pool not registered");
        address poolAddress = pools[poolId];
        
        // Get BPT token
        MockBalancerPoolToken bpt = MockBalancerPoolToken(
            MockBalancerWeightedPoolV3(poolAddress).getPoolTokenAddress()
        );
        
        // Calculate amount to burn based on proportion of total supply
        uint256 bptAmount = request.bptAmountIn;
        uint256 totalBpt = bpt.totalSupply();
        
        // Burn BPT tokens
        bpt.burn(sender, bptAmount);
        
        // Calculate token amounts to return
        amountsOut = new uint256[](poolTokens[poolId].length);
        for (uint256 i = 0; i < poolTokens[poolId].length; i++) {
            // Simple proportional calculation
            amountsOut[i] = (poolBalances[poolId][i] * bptAmount) / totalBpt;
            
            // Update pool balances
            poolBalances[poolId][i] -= amountsOut[i];
            
            // Transfer tokens to recipient
            IERC20(poolTokens[poolId][i]).safeTransfer(recipient, amountsOut[i]);
            
            emit PoolBalanceChanged(poolId, poolTokens[poolId][i], -int256(amountsOut[i]));
        }
        
        return amountsOut;
    }
    
    /**
     * @dev Swap tokens within a pool (simplified mock)
     * @param singleSwap The swap parameters
     * @param funds The funds management parameters
     * @param limit The minimum amount out expected
     * @param deadline The deadline for the swap
     * @return The amount of tokens received
     */
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external returns (uint256) {
        require(block.timestamp <= deadline, "Deadline expired");
        require(poolInfo[singleSwap.poolId].registered, "Pool not registered");
        
        // Find token indices
        uint256 tokenInIndex;
        uint256 tokenOutIndex;
        bool foundIn = false;
        bool foundOut = false;
        
        for (uint256 i = 0; i < poolTokens[singleSwap.poolId].length; i++) {
            if (poolTokens[singleSwap.poolId][i] == singleSwap.assetIn) {
                tokenInIndex = i;
                foundIn = true;
            }
            if (poolTokens[singleSwap.poolId][i] == singleSwap.assetOut) {
                tokenOutIndex = i;
                foundOut = true;
            }
        }
        
        require(foundIn && foundOut, "Token not in pool");
        
        // Get spot price from pool
        address poolAddress = pools[singleSwap.poolId];
        uint256 spotPrice = MockBalancerWeightedPoolV3(poolAddress).getSpotPrice(
            singleSwap.assetIn,
            singleSwap.assetOut
        );
        
        // Calculate amount out (simplified)
        uint256 amountOut = (singleSwap.amount * 1e18) / spotPrice;
        
        // Check limits
        require(amountOut >= limit, "Limit not satisfied");
        
        // Transfer tokens in
        IERC20(singleSwap.assetIn).safeTransferFrom(
            funds.sender,
            address(this),
            singleSwap.amount
        );
        
        // Update pool balances
        poolBalances[singleSwap.poolId][tokenInIndex] += singleSwap.amount;
        poolBalances[singleSwap.poolId][tokenOutIndex] -= amountOut;
        
        // Transfer tokens out
        IERC20(singleSwap.assetOut).safeTransfer(funds.recipient, amountOut);
        
        emit Swap(singleSwap.poolId, singleSwap.assetIn, singleSwap.assetOut, singleSwap.amount, amountOut);
        
        return amountOut;
    }
    
    // Structs for function parameters
    struct JoinPoolRequest {
        address[] assets;
        uint256[] maxAmountsIn;
        bytes userData;
        bool fromInternalBalance;
    }
    
    struct ExitPoolRequest {
        address[] assets;
        uint256[] minAmountsOut;
        bytes userData;
        bool toInternalBalance;
        uint256 bptAmountIn;
    }
    
    struct SingleSwap {
        bytes32 poolId;
        uint8 kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address recipient;
        bool toInternalBalance;
    }
} 