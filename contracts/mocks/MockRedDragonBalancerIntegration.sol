// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title IBalancerVault
 * @dev Interface for interacting with Balancer/Beets Vault
 */
interface IBalancerVault {
    enum JoinKind { INIT, EXACT_TOKENS_IN_FOR_BPT_OUT, TOKEN_IN_FOR_EXACT_BPT_OUT }
    enum ExitKind { EXACT_BPT_IN_FOR_ONE_TOKEN_OUT, EXACT_BPT_IN_FOR_TOKENS_OUT, BPT_IN_FOR_EXACT_TOKENS_OUT }
    
    function joinPool(
        bytes32 poolId,
        address sender,
        address recipient,
        JoinPoolRequest memory request
    ) external payable;
    
    function exitPool(
        bytes32 poolId,
        address sender,
        address recipient,
        ExitPoolRequest memory request
    ) external;
    
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
    
    function getPoolTokens(bytes32 poolId) external view returns (
        address[] memory tokens,
        uint256[] memory balances,
        uint256 lastChangeBlock
    );
}

/**
 * @title IBalancerWeightedPoolFactory
 * @dev Interface for creating Balancer/Beets weighted pools
 */
interface IBalancerWeightedPoolFactory {
    function create(
        string memory name,
        string memory symbol,
        address[] memory tokens,
        uint256[] memory weights,
        uint256 swapFeePercentage,
        address owner
    ) external returns (address);
}

/**
 * @title IRedDragonLPBurner
 * @dev Interface for the RedDragonLPBurner contract
 */
interface IRedDragonLPBurner {
    function splitAndBurnLPTokens(address lpToken, uint256 amount) external returns (uint256 burnAmount, uint256 feeCollectorAmount);
    function burnLPTokens(address lpToken, uint256 amount) external returns (bool);
    function directBurnLPTokens(address lpToken, uint256 amount) external returns (bool);
}

/**
 * @title MockRedDragonBalancerIntegration
 * @dev Simplified version of RedDragonBalancerIntegration for testing
 */
contract MockRedDragonBalancerIntegration is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Balancer/Beets contracts
    address public balancerVault;
    address public weightedPoolFactory;
    
    // Pool information
    bytes32 public poolId;
    address public poolAddress;
    address public dragonToken;
    address public pairedToken; // Usually a stablecoin or wSONC
    
    // LP Burner contract
    address public lpBurner;
    
    // Events
    event PoolCreated(address poolAddress, bytes32 poolId);
    event LiquidityAdded(uint256 dragonAmount, uint256 pairedTokenAmount, uint256 lpAmount);
    event LiquidityRemoved(uint256 dragonAmount, uint256 pairedTokenAmount, uint256 lpAmount);
    event PoolFeeUpdated(uint256 newFee);
    event PoolBurned(uint256 burnAmount, uint256 feeCollectorAmount);
    
    /**
     * @dev Constructor
     * @param _balancerVault Address of Balancer/Beets Vault
     * @param _weightedPoolFactory Address of Weighted Pool Factory
     * @param _dragonToken Address of DRAGON token
     * @param _pairedToken Address of paired token (stablecoin or wSONC)
     * @param _lpBurner Address of LP Burner contract
     */
    constructor(
        address _balancerVault,
        address _weightedPoolFactory,
        address _dragonToken,
        address _pairedToken,
        address _lpBurner
    ) {
        require(_balancerVault != address(0), "Invalid Vault address");
        require(_weightedPoolFactory != address(0), "Invalid Factory address");
        require(_dragonToken != address(0), "Invalid DRAGON token address");
        require(_pairedToken != address(0), "Invalid paired token address");
        require(_lpBurner != address(0), "Invalid LP Burner address");
        
        balancerVault = _balancerVault;
        weightedPoolFactory = _weightedPoolFactory;
        dragonToken = _dragonToken;
        pairedToken = _pairedToken;
        lpBurner = _lpBurner;
    }
    
    /**
     * @dev Create a new 80/20 weighted pool for DRAGON token
     * @param swapFeePercentage The swap fee percentage (in basis points, 100 = 1%)
     * @return poolAddr The address of the created pool
     */
    function createPool(uint256 swapFeePercentage) external onlyOwner returns (address poolAddr) {
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
        
        // Create the pool
        poolAddress = IBalancerWeightedPoolFactory(weightedPoolFactory).create(
            "80DRAGON-20PAIRED", // Name
            "80DRAGON-20PAIRED", // Symbol
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
     * @return bptAmount The amount of BPT (Balancer Pool Tokens) received
     */
    function addInitialLiquidity(uint256 dragonAmount, uint256 pairedTokenAmount) external onlyOwner nonReentrant returns (uint256 bptAmount) {
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
        bptAmount = IERC20(poolAddress).balanceOf(address(this));
        
        emit LiquidityAdded(dragonAmount, pairedTokenAmount, bptAmount);
        return bptAmount;
    }
    
    /**
     * @dev Add liquidity to the existing 80/20 pool
     * @param dragonAmount Amount of DRAGON tokens to add
     * @param pairedTokenAmount Amount of paired tokens to add
     * @return bptReceived The amount of BPT (Balancer Pool Tokens) received
     */
    function addLiquidity(uint256 dragonAmount, uint256 pairedTokenAmount) external nonReentrant returns (uint256 bptReceived) {
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
        bptReceived = bptAfter - bptBefore;
        
        // Transfer BPT to sender
        IERC20(poolAddress).transfer(msg.sender, bptReceived);
        
        emit LiquidityAdded(dragonAmount, pairedTokenAmount, bptReceived);
        return bptReceived;
    }
    
    /**
     * @dev Remove liquidity from the pool
     * @param bptAmount Amount of BPT tokens to burn
     * @return amountsOut The amounts of tokens received
     */
    function removeLiquidity(uint256 bptAmount) external nonReentrant returns (uint256[] memory amountsOut) {
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
            address(this),
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
        
        amountsOut = new uint256[](2);
        amountsOut[0] = pairedTokenReceived;
        amountsOut[1] = dragonReceived;
        
        emit LiquidityRemoved(dragonReceived, pairedTokenReceived, bptAmount);
        return amountsOut;
    }
    
    /**
     * @dev Burns pool tokens and sends a portion to fee collector according to LP Burner settings
     * @param bptAmount Amount of BPT to process
     * @return burnAmount Amount of BPT sent to dead address
     * @return feeCollectorAmount Amount of BPT sent to fee collector
     */
    function burnPoolTokens(uint256 bptAmount) external nonReentrant returns (uint256 burnAmount, uint256 feeCollectorAmount) {
        require(poolAddress != address(0), "Pool not created");
        require(bptAmount > 0, "Zero amount");
        
        // Transfer BPT to this contract
        IERC20(poolAddress).safeTransferFrom(msg.sender, address(this), bptAmount);
        
        // Approve BPT to LP Burner
        IERC20(poolAddress).safeApprove(lpBurner, bptAmount);
        
        // Use the LP Burner to split and burn the tokens
        // This will burn a percentage and send the rest to the fee collector
        (burnAmount, feeCollectorAmount) = IRedDragonLPBurner(lpBurner).splitAndBurnLPTokens(poolAddress, bptAmount);
        
        emit PoolBurned(burnAmount, feeCollectorAmount);
        return (burnAmount, feeCollectorAmount);
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
    }
} 