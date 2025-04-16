// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IBalancerVault.sol";
import "./interfaces/IBalancerWeightedPoolFactory.sol";

/**
 * @title DragonBalancerIntegration
 * @dev Contract for creating and managing 80/20 Balancer/Beets liquidity pools for DRAGON token
 */
contract DragonBalancerIntegration is Ownable, ReentrancyGuard {
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
    
    /**
     * @dev Constructor
     * @param _balancerVault Address of Balancer/Beets Vault
     * @param _weightedPoolFactory Address of Weighted Pool Factory
     * @param _dragonToken Address of DRAGON token
     * @param _pairedToken Address of paired token (stablecoin or wSONC)
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
    }
    
    /**
     * @dev Create a new 80/20 weighted pool for DRAGON token
     * @param swapFeePercentage The swap fee percentage (in basis points, 100 = 1%)
     * @return The address of the created pool
     */
    function createPool(uint256 swapFeePercentage) external onlyOwner returns (address) {
        require(poolAddress == address(0), "Pool already created");
        require(swapFeePercentage <= 300, "Fee too high"); // Max 3%
        
        // Prepare tokens and weights for 80/20 pool
        address[] memory tokens = new address[](2);
        tokens[0] = pairedToken; // Paired token (20%)
        tokens[1] = dragonToken; // DRAGON token (80%)
        
        // Calculate normalized weights (must sum to 1e18)
        uint256[] memory weights = new uint256[](2);
        weights[0] = 2e17; // 20% weight
        weights[1] = 8e17; // 80% weight
        
        // Convert fee to Balancer format (100 basis points = 0.01e18)
        uint256 balancerFormatFee = (swapFeePercentage * 1e16);
        
        // Create the pool using the fixed pool name and symbol
        poolAddress = IBalancerWeightedPoolFactory(weightedPoolFactory).create(
            poolName,
            poolSymbol,
            tokens,
            weights,
            balancerFormatFee,
            address(this) // This contract is the pool owner
        );
        
        // Get the poolId from the Vault
        poolId = bytes32(uint256(uint160(poolAddress)) << 96);
        
        emit PoolCreated(poolAddress, poolId);
        return poolAddress;
    }
    
    /**
     * @dev Add initial liquidity to the 80/20 pool
     * @param dragonAmount Amount of DRAGON tokens to add
     * @param pairedTokenAmount Amount of paired tokens to add
     * @return The amount of BPT (Balancer Pool Tokens) received
     */
    function addInitialLiquidity(uint256 dragonAmount, uint256 pairedTokenAmount) external onlyOwner nonReentrant returns (uint256) {
        require(poolAddress != address(0), "Pool not created");
        require(dragonAmount > 0 && pairedTokenAmount > 0, "Zero amounts");
        
        // Transfer tokens to this contract
        IERC20(dragonToken).safeTransferFrom(msg.sender, address(this), dragonAmount);
        IERC20(pairedToken).safeTransferFrom(msg.sender, address(this), pairedTokenAmount);
        
        // Approve tokens to Vault
        IERC20(dragonToken).safeApprove(balancerVault, dragonAmount);
        IERC20(pairedToken).safeApprove(balancerVault, pairedTokenAmount);
        
        // Prepare join request
        address[] memory assets = new address[](2);
        assets[0] = pairedToken;
        assets[1] = dragonToken;
        
        uint256[] memory maxAmountsIn = new uint256[](2);
        maxAmountsIn[0] = pairedTokenAmount;
        maxAmountsIn[1] = dragonAmount;
        
        bytes memory userData = abi.encode(IBalancerVault.JoinKind.INIT, maxAmountsIn);
        
        IBalancerVault.JoinPoolRequest memory request = IBalancerVault.JoinPoolRequest({
            assets: assets,
            maxAmountsIn: maxAmountsIn,
            userData: userData,
            fromInternalBalance: false
        });
        
        // Join the pool
        IBalancerVault(balancerVault).joinPool(
            poolId,
            address(this),
            address(this),
            request
        );
        
        // Get BPT balance
        uint256 bptAmount = IERC20(poolAddress).balanceOf(address(this));
        
        emit LiquidityAdded(dragonAmount, pairedTokenAmount, bptAmount);
        return bptAmount;
    }
    
    /**
     * @dev Add liquidity to the existing 80/20 pool
     * @param dragonAmount Amount of DRAGON tokens to add
     * @param pairedTokenAmount Amount of paired tokens to add
     * @return The amount of BPT (Balancer Pool Tokens) received
     */
    function addLiquidity(uint256 dragonAmount, uint256 pairedTokenAmount) external nonReentrant returns (uint256) {
        require(poolAddress != address(0), "Pool not created");
        require(dragonAmount > 0 && pairedTokenAmount > 0, "Zero amounts");
        
        // Transfer tokens to this contract
        IERC20(dragonToken).safeTransferFrom(msg.sender, address(this), dragonAmount);
        IERC20(pairedToken).safeTransferFrom(msg.sender, address(this), pairedTokenAmount);
        
        // Approve tokens to Vault
        IERC20(dragonToken).safeApprove(balancerVault, dragonAmount);
        IERC20(pairedToken).safeApprove(balancerVault, pairedTokenAmount);
        
        // Prepare join request
        address[] memory assets = new address[](2);
        assets[0] = pairedToken;
        assets[1] = dragonToken;
        
        uint256[] memory maxAmountsIn = new uint256[](2);
        maxAmountsIn[0] = pairedTokenAmount;
        maxAmountsIn[1] = dragonAmount;
        
        bytes memory userData = abi.encode(IBalancerVault.JoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT, maxAmountsIn, 0);
        
        IBalancerVault.JoinPoolRequest memory request = IBalancerVault.JoinPoolRequest({
            assets: assets,
            maxAmountsIn: maxAmountsIn,
            userData: userData,
            fromInternalBalance: false
        });
        
        // Get BPT balance before
        uint256 bptBefore = IERC20(poolAddress).balanceOf(address(this));
        
        // Join the pool
        IBalancerVault(balancerVault).joinPool(
            poolId,
            address(this),
            address(this),
            request
        );
        
        // Get BPT balance after
        uint256 bptAfter = IERC20(poolAddress).balanceOf(address(this));
        uint256 bptReceived = bptAfter - bptBefore;
        
        // Transfer BPT to sender
        IERC20(poolAddress).transfer(msg.sender, bptReceived);
        
        emit LiquidityAdded(dragonAmount, pairedTokenAmount, bptReceived);
        return bptReceived;
    }
    
    /**
     * @dev Remove liquidity from the pool
     * @param bptAmount Amount of BPT tokens to burn
     * @return The amounts of tokens received
     */
    function removeLiquidity(uint256 bptAmount) external nonReentrant returns (uint256[] memory) {
        require(poolAddress != address(0), "Pool not created");
        require(bptAmount > 0, "Zero amount");
        
        // Transfer BPT to this contract
        IERC20(poolAddress).safeTransferFrom(msg.sender, address(this), bptAmount);
        
        // Approve BPT to Vault
        IERC20(poolAddress).safeApprove(balancerVault, bptAmount);
        
        // Prepare exit request
        address[] memory assets = new address[](2);
        assets[0] = pairedToken;
        assets[1] = dragonToken;
        
        uint256[] memory minAmountsOut = new uint256[](2);
        minAmountsOut[0] = 0;
        minAmountsOut[1] = 0;
        
        bytes memory userData = abi.encode(IBalancerVault.ExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT, bptAmount);
        
        IBalancerVault.ExitPoolRequest memory request = IBalancerVault.ExitPoolRequest({
            assets: assets,
            minAmountsOut: minAmountsOut,
            userData: userData,
            toInternalBalance: false
        });
        
        // Get token balances before
        uint256 pairedTokenBefore = IERC20(pairedToken).balanceOf(address(this));
        uint256 dragonBefore = IERC20(dragonToken).balanceOf(address(this));
        
        // Exit the pool
        IBalancerVault(balancerVault).exitPool(
            poolId,
            address(this),
            payable(address(this)),
            request
        );
        
        // Get token balances after
        uint256 pairedTokenAfter = IERC20(pairedToken).balanceOf(address(this));
        uint256 dragonAfter = IERC20(dragonToken).balanceOf(address(this));
        
        // Calculate amounts received
        uint256 pairedTokenReceived = pairedTokenAfter - pairedTokenBefore;
        uint256 dragonReceived = dragonAfter - dragonBefore;
        
        // Transfer tokens to sender
        IERC20(pairedToken).transfer(msg.sender, pairedTokenReceived);
        IERC20(dragonToken).transfer(msg.sender, dragonReceived);
        
        uint256[] memory amountsOut = new uint256[](2);
        amountsOut[0] = pairedTokenReceived;
        amountsOut[1] = dragonReceived;
        
        emit LiquidityRemoved(dragonReceived, pairedTokenReceived, bptAmount);
        return amountsOut;
    }
    
    /**
     * @dev Update the pool's swap fee
     * @param newFeePercentage The new swap fee percentage (in basis points, 100 = 1%)
     */
    function updatePoolFee(uint256 newFeePercentage) external onlyOwner {
        require(poolAddress != address(0), "Pool not created");
        require(newFeePercentage <= 300, "Fee too high"); // Max 3%
        
        // Convert fee to Balancer format (100 basis points = 0.01e18)
        uint256 balancerFormatFee = (newFeePercentage * 1e16);
        
        // Update the pool fee (assuming pool has a setSwapFeePercentage function)
        // This would depend on the specific implementation of the Balancer pool
        // (bool success, ) = poolAddress.call(abi.encodeWithSignature("setSwapFeePercentage(uint256)", balancerFormatFee));
        // require(success, "Fee update failed");
        
        emit PoolFeeUpdated(newFeePercentage);
    }
    
    /**
     * @dev Get the current balance of the pool
     * @return tokens The tokens in the pool
     * @return balances The balances of each token in the pool
     */
    function getPoolBalances() external view returns (address[] memory tokens, uint256[] memory balances) {
        require(poolAddress != address(0), "Pool not created");
        
        uint256 lastChangeBlock;
        (tokens, balances, lastChangeBlock) = IBalancerVault(balancerVault).getPoolTokens(poolId);
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