// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IBalancerVault.sol";

/**
 * @title MockBalancerVault
 * @dev Mock Balancer Vault for testing
 */
contract MockBalancerVault is Ownable {
    using SafeERC20 for IERC20;
    
    struct PoolInfo {
        address[] tokens;
        uint256[] balances;
        address poolToken;
        bool exists;
    }
    
    // Pool information
    mapping(bytes32 => PoolInfo) private pools;
    
    // Swap rates for tokens (tokenA => tokenB => rate)
    // Rate is multiplied by 100 (100 = 1:1, 80 = 0.8:1, 120 = 1.2:1)
    mapping(address => mapping(address => uint256)) private swapRates;
    
    // Tokens to return when exiting a pool
    mapping(address => uint256) private tokensToReturn;
    
    // Amount of BPT to mint when joining a pool
    uint256 private bptAmountToMint;
    
    /**
     * @dev Sets up a mock pool
     */
    function setupPool(
        bytes32 poolId,
        address[] memory tokens,
        uint256[] memory balances,
        address poolToken
    ) external {
        require(tokens.length == balances.length, "Lengths don't match");
        
        pools[poolId] = PoolInfo({
            tokens: tokens,
            balances: balances,
            poolToken: poolToken,
            exists: true
        });
    }
    
    /**
     * @dev Set the swap rate between two tokens
     */
    function setSwapRate(address tokenIn, address tokenOut, uint256 rate) external {
        swapRates[tokenIn][tokenOut] = rate;
    }
    
    /**
     * @dev Set the amount of tokens to return when exiting a pool
     */
    function setTokensToReturn(address token, uint256 amount) external {
        tokensToReturn[token] = amount;
    }
    
    /**
     * @dev Set the amount of BPT to mint when joining a pool
     */
    function setBptAmountToMint(uint256 amount) external {
        bptAmountToMint = amount;
    }
    
    /**
     * @dev Get pool tokens and balances
     */
    function getPoolTokens(bytes32 poolId) external view returns (
        address[] memory tokens,
        uint256[] memory balances,
        uint256 lastChangeBlock
    ) {
        require(pools[poolId].exists, "Pool doesn't exist");
        return (pools[poolId].tokens, pools[poolId].balances, block.number);
    }
    
    /**
     * @dev Swap tokens
     */
    function swap(
        IBalancerVault.SingleSwap memory singleSwap,
        IBalancerVault.FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256) {
        require(pools[singleSwap.poolId].exists, "Pool doesn't exist");
        require(deadline >= block.timestamp, "Deadline expired");
        
        // Get the swap rate
        uint256 rate = swapRates[singleSwap.assetIn][singleSwap.assetOut];
        require(rate > 0, "Swap rate not set");
        
        // Calculate the output amount
        uint256 outputAmount = (singleSwap.amount * rate) / 100;
        
        // Check limit
        if (singleSwap.kind == IBalancerVault.SwapKind.GIVEN_IN) {
            require(outputAmount >= limit, "Output amount too low");
        } else {
            require(outputAmount <= limit, "Input amount too high");
        }
        
        // Transfer tokens
        IERC20(singleSwap.assetIn).safeTransferFrom(
            funds.sender,
            address(this),
            singleSwap.amount
        );
        
        IERC20(singleSwap.assetOut).safeTransfer(
            funds.recipient,
            outputAmount
        );
        
        return outputAmount;
    }
    
    /**
     * @dev Join a pool
     */
    function joinPool(
        bytes32 poolId,
        address sender,
        address recipient,
        IBalancerVault.JoinPoolRequest memory request
    ) external payable {
        require(pools[poolId].exists, "Pool doesn't exist");
        
        // Transfer tokens from sender to this contract
        for (uint256 i = 0; i < request.assets.length; i++) {
            if (request.maxAmountsIn[i] > 0) {
                IERC20(request.assets[i]).safeTransferFrom(
                    sender,
                    address(this),
                    request.maxAmountsIn[i]
                );
            }
        }
        
        // Transfer BPT tokens to recipient
        IERC20(pools[poolId].poolToken).safeTransfer(recipient, bptAmountToMint);
    }
    
    /**
     * @dev Exit a pool
     */
    function exitPool(
        bytes32 poolId,
        address sender,
        address payable recipient,
        IBalancerVault.ExitPoolRequest memory request
    ) external {
        require(pools[poolId].exists, "Pool doesn't exist");
        
        // Get the token amounts from userData
        uint256 bptIn = abi.decode(request.userData, (uint256));
        
        // Transfer BPT tokens from sender to this contract
        IERC20(pools[poolId].poolToken).safeTransferFrom(
            sender,
            address(this),
            bptIn
        );
        
        // Transfer tokens to recipient based on the tokensToReturn mapping
        for (uint256 i = 0; i < request.assets.length; i++) {
            uint256 amount = tokensToReturn[request.assets[i]];
            if (amount > 0) {
                IERC20(request.assets[i]).safeTransfer(recipient, amount);
            }
        }
    }
} 