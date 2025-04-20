// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockWeightedPool
 * @dev Mock implementation of Balancer's WeightedPool for testing
 */
contract MockWeightedPool is ERC20, Ownable {
    using SafeERC20 for IERC20;
    
    // Pool configuration
    address[] public tokens;
    uint256[] public weights;
    uint256 public swapFeePercentage;
    address public balancerVault;
    
    // Pool ID (used for Balancer Vault interactions)
    bytes32 public poolId;
    
    /**
     * @dev Constructor
     * @param name Pool name
     * @param symbol Pool symbol
     * @param _tokens Array of token addresses
     * @param _weights Array of token weights
     * @param _swapFeePercentage Swap fee percentage
     * @param owner Pool owner
     * @param _balancerVault Balancer Vault address
     */
    constructor(
        string memory name,
        string memory symbol,
        address[] memory _tokens,
        uint256[] memory _weights,
        uint256 _swapFeePercentage,
        address owner,
        address _balancerVault
    ) ERC20(name, symbol) {
        require(_tokens.length == _weights.length, "Tokens and weights length mismatch");
        require(_tokens.length >= 2, "At least two tokens required");
        
        tokens = _tokens;
        weights = _weights;
        swapFeePercentage = _swapFeePercentage;
        balancerVault = _balancerVault;
        
        // Generate poolId based on the pool's address
        poolId = bytes32(uint256(uint160(address(this))) << 96);
        
        // Transfer ownership to specified owner
        _transferOwnership(owner);
    }
    
    /**
     * @dev Update swap fee percentage
     * @param newFeePercentage New swap fee percentage
     */
    function setSwapFeePercentage(uint256 newFeePercentage) external onlyOwner {
        swapFeePercentage = newFeePercentage;
    }
    
    /**
     * @dev Mock function to mint tokens (called by MockBalancerVault)
     * @param to Address to mint tokens to
     * @param amount Amount to mint
     */
    function mockMint(address to, uint256 amount) external {
        require(msg.sender == balancerVault, "Only Vault can mint");
        _mint(to, amount);
    }
    
    /**
     * @dev Mock function to burn tokens (called by MockBalancerVault)
     * @param from Address to burn tokens from
     * @param amount Amount to burn
     */
    function mockBurn(address from, uint256 amount) external {
        require(msg.sender == balancerVault, "Only Vault can burn");
        _burn(from, amount);
    }
    
    /**
     * @dev Get pool ID
     * @return The pool ID
     */
    function getPoolId() external view returns (bytes32) {
        return poolId;
    }
    
    /**
     * @dev Get normalized weights
     * @return The normalized weights
     */
    function getNormalizedWeights() external view returns (uint256[] memory) {
        return weights;
    }
    
    /**
     * @dev Get tokens in the pool
     * @return The tokens in the pool
     */
    function getTokens() external view returns (address[] memory) {
        return tokens;
    }
} 