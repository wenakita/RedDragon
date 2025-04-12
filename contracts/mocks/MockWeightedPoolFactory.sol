// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./MockWeightedPool.sol";

/**
 * @title MockWeightedPoolFactory
 * @dev Mock implementation of Balancer's WeightedPoolFactory for testing
 */
contract MockWeightedPoolFactory {
    address public balancerVault;
    
    event PoolCreated(address indexed pool);
    
    constructor(address _balancerVault) {
        balancerVault = _balancerVault;
    }
    
    /**
     * @dev Create a new weighted pool
     * @param name Pool name
     * @param symbol Pool symbol
     * @param tokens Array of token addresses
     * @param weights Array of token weights
     * @param swapFeePercentage Swap fee percentage
     * @param owner Pool owner
     * @return The address of the newly created pool
     */
    function create(
        string memory name,
        string memory symbol,
        address[] memory tokens,
        uint256[] memory weights,
        uint256 swapFeePercentage,
        address owner
    ) external returns (address) {
        // Create a new weighted pool with the given parameters
        MockWeightedPool pool = new MockWeightedPool(
            name, 
            symbol, 
            tokens, 
            weights, 
            swapFeePercentage, 
            owner,
            balancerVault
        );
        
        // Register the pool with the mock vault
        bytes32 poolId = bytes32(uint256(uint160(address(pool))) << 96);
        
        // Register pool in the vault using a low-level call
        (bool success, ) = balancerVault.call(
            abi.encodeWithSignature("registerPool(bytes32,address[])", poolId, tokens)
        );
        
        emit PoolCreated(address(pool));
        return address(pool);
    }
} 