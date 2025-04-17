// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title IBalancerPool
 * @dev Interface for Balancer Pool token (BPT) used by Beethoven X
 */
interface IBalancerPool {
    /**
     * @dev Returns the pool's ID
     */
    function getPoolId() external view returns (bytes32);
    
    /**
     * @dev Returns the normalized weights of the tokens in the pool
     */
    function getNormalizedWeights() external view returns (uint256[] memory);
    
    /**
     * @dev Returns the total supply of pool tokens
     */
    function totalSupply() external view returns (uint256);
    
    /**
     * @dev Returns the balance of pool tokens for an account
     */
    function balanceOf(address account) external view returns (uint256);
    
    /**
     * @dev Transfers pool tokens between accounts
     */
    function transfer(address recipient, uint256 amount) external returns (bool);
    
    /**
     * @dev Returns the allowance of a spender over an owner's tokens
     */
    function allowance(address owner, address spender) external view returns (uint256);
    
    /**
     * @dev Approves a spender to spend tokens on behalf of the caller
     */
    function approve(address spender, uint256 amount) external returns (bool);
    
    /**
     * @dev Transfers tokens from one account to another
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
} 