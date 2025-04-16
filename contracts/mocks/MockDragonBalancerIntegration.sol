// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IBalancerVault.sol";
import "../interfaces/IBalancerWeightedPoolFactory.sol";

/**
 * @title MockDragonBalancerIntegration
 * @dev Mock implementation of the Balancer integration for testing
 */
contract MockDragonBalancerIntegration is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Balancer/Beets contracts
    address public balancerVault;
    address public weightedPoolFactory;
    
    // Pool information
    bytes32 public poolId;
    address public poolAddress;
    address public dragonToken;
    address public pairedToken; // Usually a stablecoin or wSONC
    
    // Fixed pool name and symbol - cannot be changed
    string public constant poolName = "DRAGON 80/20 Pool";
    string public constant poolSymbol = "D80-S20";
    
    // Events
    event PoolCreated(address poolAddress, bytes32 poolId);
    event LiquidityAdded(uint256 dragonAmount, uint256 pairedTokenAmount, uint256 lpAmount);
    event LiquidityRemoved(uint256 dragonAmount, uint256 pairedTokenAmount, uint256 lpAmount);
    event PoolFeeUpdated(uint256 newFee);
    event EmergencyWithdrawal(address token, uint256 amount);
    
    // For mock functionality
    bool public poolCreated;
    uint256 public mockLpAmount;
    
    /**
     * @dev Constructor
     */
    constructor(
        address _balancerVault,
        address _weightedPoolFactory,
        address _dragonToken,
        address _pairedToken
    ) {
        require(_balancerVault != address(0), "Invalid Vault address");
        require(_weightedPoolFactory != address(0), "Invalid Factory address");
        require(_dragonToken != address(0), "Invalid DRAGON token address");
        require(_pairedToken != address(0), "Invalid paired token address");
        
        balancerVault = _balancerVault;
        weightedPoolFactory = _weightedPoolFactory;
        dragonToken = _dragonToken;
        pairedToken = _pairedToken;
        poolCreated = false;
        mockLpAmount = 1e18; // Default mock LP amount
    }
    
    /**
     * @dev Set the mock LP amount for testing
     */
    function setMockLpAmount(uint256 amount) external onlyOwner {
        mockLpAmount = amount;
    }
    
    /**
     * @dev Create a new 80/20 weighted pool for DRAGON token (mock)
     * @param swapFeePercentage The swap fee percentage (in basis points, 100 = 1%)
     * @return The address of the created pool
     */
    function createPool(uint256 swapFeePercentage) external onlyOwner returns (address) {
        require(!poolCreated, "Pool already created");
        require(swapFeePercentage <= 300, "Fee too high"); // Max 3%
        
        // Mock implementation - just set some values
        poolAddress = address(uint160(uint256(keccak256("mockPool")))); // Deterministic mock address
        poolId = keccak256(abi.encodePacked(poolAddress));
        poolCreated = true;
        
        emit PoolCreated(poolAddress, poolId);
        return poolAddress;
    }
    
    /**
     * @dev Add initial liquidity to the 80/20 pool (mock)
     * @param dragonAmount Amount of DRAGON tokens to add
     * @param pairedTokenAmount Amount of paired tokens to add
     * @return The amount of BPT (Balancer Pool Tokens) received
     */
    function addInitialLiquidity(uint256 dragonAmount, uint256 pairedTokenAmount) external onlyOwner nonReentrant returns (uint256) {
        require(poolCreated, "Pool not created");
        require(dragonAmount > 0 && pairedTokenAmount > 0, "Zero amounts");
        
        // Mock implementation - transfer tokens and return mockLpAmount
        IERC20(dragonToken).safeTransferFrom(msg.sender, address(this), dragonAmount);
        IERC20(pairedToken).safeTransferFrom(msg.sender, address(this), pairedTokenAmount);
        
        emit LiquidityAdded(dragonAmount, pairedTokenAmount, mockLpAmount);
        return mockLpAmount;
    }
    
    /**
     * @dev Add liquidity to the existing 80/20 pool (mock)
     * @param dragonAmount Amount of DRAGON tokens to add
     * @param pairedTokenAmount Amount of paired tokens to add
     * @return The amount of BPT (Balancer Pool Tokens) received
     */
    function addLiquidity(uint256 dragonAmount, uint256 pairedTokenAmount) external nonReentrant returns (uint256) {
        require(poolCreated, "Pool not created");
        require(dragonAmount > 0 && pairedTokenAmount > 0, "Zero amounts");
        
        // Mock implementation - transfer tokens and return mockLpAmount
        IERC20(dragonToken).safeTransferFrom(msg.sender, address(this), dragonAmount);
        IERC20(pairedToken).safeTransferFrom(msg.sender, address(this), pairedTokenAmount);
        
        emit LiquidityAdded(dragonAmount, pairedTokenAmount, mockLpAmount);
        
        // Just transfer the mockLpAmount in LP tokens (assuming this contract owns them)
        IERC20(poolAddress).transfer(msg.sender, mockLpAmount);
        
        return mockLpAmount;
    }
    
    /**
     * @dev Remove liquidity from the pool (mock)
     * @param bptAmount Amount of BPT tokens to burn
     * @return The amounts of tokens received
     */
    function removeLiquidity(uint256 bptAmount) external nonReentrant returns (uint256[] memory) {
        require(poolCreated, "Pool not created");
        require(bptAmount > 0, "Zero amount");
        
        // Mock implementation - transfer LP tokens from user
        IERC20(poolAddress).safeTransferFrom(msg.sender, address(this), bptAmount);
        
        // Calculate token amounts based on 80/20 ratio
        uint256 dragonAmount = (bptAmount * 80) / 100;
        uint256 pairedAmount = (bptAmount * 20) / 100;
        
        // Transfer tokens to user
        IERC20(dragonToken).transfer(msg.sender, dragonAmount);
        IERC20(pairedToken).transfer(msg.sender, pairedAmount);
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = pairedAmount;
        amounts[1] = dragonAmount;
        
        emit LiquidityRemoved(dragonAmount, pairedAmount, bptAmount);
        return amounts;
    }
    
    /**
     * @dev Update the pool's swap fee (mock)
     * @param newFeePercentage The new swap fee percentage (in basis points, 100 = 1%)
     */
    function updatePoolFee(uint256 newFeePercentage) external onlyOwner {
        require(poolCreated, "Pool not created");
        require(newFeePercentage <= 300, "Fee too high"); // Max 3%
        
        // Mock implementation - just emit event
        emit PoolFeeUpdated(newFeePercentage);
    }
    
    /**
     * @dev Get the current balance of the pool (mock)
     * @return tokens The tokens in the pool
     * @return balances The balances of each token in the pool
     */
    function getPoolBalances() external view returns (address[] memory tokens, uint256[] memory balances) {
        require(poolCreated, "Pool not created");
        
        // Mock implementation - return dummy values
        tokens = new address[](2);
        tokens[0] = pairedToken;
        tokens[1] = dragonToken;
        
        balances = new uint256[](2);
        balances[0] = 1000 * 1e18; // 1000 paired tokens
        balances[1] = 4000 * 1e18; // 4000 DRAGON tokens (80/20 ratio)
        
        return (tokens, balances);
    }
    
    /**
     * @dev Emergency function to recover tokens accidentally sent to this contract
     * @param token The token to recover
     * @param amount The amount to recover
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(amount > 0, "Zero amount");
        
        IERC20(token).transfer(owner(), amount);
        emit EmergencyWithdrawal(token, amount);
    }
} 