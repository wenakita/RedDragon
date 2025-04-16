// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockBalancerVault
 * @dev A simplified mock of Balancer Vault for testing
 */
contract MockBalancerVault {
    using SafeERC20 for IERC20;
    
    // Pool ID to tokens mapping
    mapping(bytes32 => address[]) public poolTokens;
    mapping(bytes32 => mapping(address => uint256)) public poolBalances;
    
    // Last change block for each pool
    mapping(bytes32 => uint256) public lastChangeBlock;
    
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
    }
    
    enum JoinKind { INIT, EXACT_TOKENS_IN_FOR_BPT_OUT, TOKEN_IN_FOR_EXACT_BPT_OUT }
    enum ExitKind { EXACT_BPT_IN_FOR_ONE_TOKEN_OUT, EXACT_BPT_IN_FOR_TOKENS_OUT, BPT_IN_FOR_EXACT_TOKENS_OUT }
    
    // Register a new pool
    function registerPool(bytes32 poolId, address[] memory tokens) external {
        poolTokens[poolId] = tokens;
        lastChangeBlock[poolId] = block.number;
    }
    
    // Update pool balances
    function updatePoolBalance(bytes32 poolId, address token, uint256 balance) external {
        poolBalances[poolId][token] = balance;
        lastChangeBlock[poolId] = block.number;
    }
    
    // Join pool
    function joinPool(
        bytes32 poolId,
        address sender,
        address recipient,
        JoinPoolRequest memory request
    ) external payable {
        // Decode userData to get join kind
        (uint256 joinKind, uint256[] memory amountsIn) = abi.decode(request.userData, (uint256, uint256[]));
        
        // Transfer tokens from sender to pool
        for (uint256 i = 0; i < request.assets.length; i++) {
            address token = request.assets[i];
            uint256 amount = amountsIn[i];
            
            if (amount > 0) {
                IERC20(token).safeTransferFrom(sender, address(this), amount);
                poolBalances[poolId][token] += amount;
            }
        }
        
        // For testing, we mint LP tokens based on the sum of inputs
        address poolAddress = address(uint160(uint256(poolId) >> 96));
        uint256 lpAmount = 0;
        
        // Calculate LP amount as the sum of inputs (simplified for testing)
        for (uint256 i = 0; i < amountsIn.length; i++) {
            lpAmount += amountsIn[i];
        }
        
        // Mock minting LP tokens
        // Use a mock function to mint tokens to recipient
        (bool success, ) = poolAddress.call(abi.encodeWithSignature("mockMint(address,uint256)", recipient, lpAmount));
        
        // Update last change block
        lastChangeBlock[poolId] = block.number;
    }
    
    // Exit pool
    function exitPool(
        bytes32 poolId,
        address sender,
        address recipient,
        ExitPoolRequest memory request
    ) external {
        // Decode userData to get exit kind and BPT amount
        (uint256 exitKind, uint256 bptAmountIn) = abi.decode(request.userData, (uint256, uint256));
        
        // Burn BPT from sender
        address poolAddress = address(uint160(uint256(poolId) >> 96));
        (bool success, ) = poolAddress.call(abi.encodeWithSignature("mockBurn(address,uint256)", sender, bptAmountIn));
        
        // Transfer proportional amount of tokens to recipient
        for (uint256 i = 0; i < request.assets.length; i++) {
            address token = request.assets[i];
            
            // Simplified calculation: each token gets a proportional amount based on its balance
            uint256 totalTokenBalance = poolBalances[poolId][token];
            uint256 tokenAmount = (totalTokenBalance * bptAmountIn) / 1e18; // Simplified calculation
            
            if (tokenAmount > 0) {
                // Transfer tokens from this contract to recipient
                IERC20(token).safeTransfer(recipient, tokenAmount);
                poolBalances[poolId][token] -= tokenAmount;
            }
        }
        
        // Update last change block
        lastChangeBlock[poolId] = block.number;
    }
    
    // Get pool tokens
    function getPoolTokens(bytes32 poolId) external view returns (
        address[] memory tokens,
        uint256[] memory balances,
        uint256 lastChangeBlockNumber
    ) {
        tokens = poolTokens[poolId];
        balances = new uint256[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            balances[i] = poolBalances[poolId][tokens[i]];
        }
        
        lastChangeBlockNumber = lastChangeBlock[poolId];
        return (tokens, balances, lastChangeBlockNumber);
    }
} 