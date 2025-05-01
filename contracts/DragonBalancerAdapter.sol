// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IDragon.sol";
import "./interfaces/IBalancerVault.sol";

/**
 * @title DragonBalancerAdapter
 * @dev Custom adapter for integrating Dragon token with Balancer V3 Vault
 * This adapter handles fee processing for swaps that involve Dragon token
 */
contract DragonBalancerAdapter is Ownable {
    using SafeERC20 for IERC20;

    // Balancer Vault contracts
    IBalancerVault public immutable balancerVault;
    
    // Dragon token contract
    IDragon public immutable dragonToken;
    
    // Wrapped Sonic token (wS) contract
    IERC20 public immutable wrappedSonic;
    
    // Fee handler contracts for jackpot and LP distributions
    address public jackpotVault;
    address public ve69LPFeeDistributor;
    
    // Balancer poolId for the DRAGON/wS pool
    bytes32 public dragonWSPoolId;
    
    // Constants for fee percentages
    uint256 public constant BUY_FEE_JACKPOT = 690; // 6.9%
    uint256 public constant BUY_FEE_VE69LP = 241; // 2.41%
    uint256 public constant SELL_FEE_JACKPOT = 690; // 6.9%
    uint256 public constant SELL_FEE_VE69LP = 241; // 2.41%
    uint256 public constant BURN_PERCENTAGE = 69; // 0.69%
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // Events
    event FeeAddressesUpdated(address jackpotVault, address ve69LPFeeDistributor);
    event PoolIdUpdated(bytes32 poolId);
    event FeesCollected(bool isBuy, uint256 jackpotAmount, uint256 ve69LPAmount, uint256 burnAmount);
    event SwapExecuted(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    
    /**
     * @dev Constructor
     * @param _balancerVault Address of the Balancer Vault
     * @param _dragonToken Address of the Dragon token
     * @param _wrappedSonic Address of the Wrapped Sonic token
     * @param _jackpotVault Initial jackpot vault address
     * @param _ve69LPFeeDistributor Initial ve69LP fee distributor address
     * @param _dragonWSPoolId Initial pool ID for the DRAGON/wS pool
     */
    constructor(
        address _balancerVault,
        address _dragonToken,
        address _wrappedSonic,
        address _jackpotVault,
        address _ve69LPFeeDistributor,
        bytes32 _dragonWSPoolId
    ) Ownable() {
        require(_balancerVault != address(0), "Invalid Balancer Vault");
        require(_dragonToken != address(0), "Invalid Dragon token");
        require(_wrappedSonic != address(0), "Invalid wS token");
        require(_jackpotVault != address(0), "Invalid jackpot vault");
        require(_ve69LPFeeDistributor != address(0), "Invalid ve69LP fee distributor");
        
        balancerVault = IBalancerVault(_balancerVault);
        dragonToken = IDragon(_dragonToken);
        wrappedSonic = IERC20(_wrappedSonic);
        jackpotVault = _jackpotVault;
        ve69LPFeeDistributor = _ve69LPFeeDistributor;
        dragonWSPoolId = _dragonWSPoolId;
    }
    
    /**
     * @notice Swap Wrapped Sonic (wS) to Dragon token with fee handling
     * @param _amountIn Amount of wS to swap
     * @param _minAmountOut Minimum amount of Dragon to receive
     * @param _deadline Deadline for the swap execution
     * @return amountOut Actual amount of Dragon received
     */
    function swapWSForDragon(
        uint256 _amountIn,
        uint256 _minAmountOut,
        uint256 _deadline
    ) external returns (uint256 amountOut) {
        require(block.timestamp <= _deadline, "Deadline expired");
        
        // Transfer wS tokens from the user to this contract
        wrappedSonic.safeTransferFrom(msg.sender, address(this), _amountIn);
        
        // Approve Balancer Vault to spend wS tokens
        wrappedSonic.safeApprove(address(balancerVault), _amountIn);
        
        // Get pool tokens and prepare swap
        (address[] memory tokens, , ) = balancerVault.getPoolTokens(dragonWSPoolId);
        address tokenIn = address(wrappedSonic);
        address tokenOut = address(dragonToken);
        
        // Ensure tokens are in the expected order
        uint8 indexIn = tokenIn == tokens[0] ? 0 : 1;
        uint8 indexOut = tokenOut == tokens[0] ? 0 : 1;
        
        // Prepare Balancer single swap params
        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: dragonWSPoolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: tokenOut,
            amount: _amountIn,
            userData: ""
        });
        
        // Prepare fund management params
        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });
        
        // Execute the swap
        uint256 returnAmount = balancerVault.swap(
            singleSwap,
            funds,
            _minAmountOut,
            _deadline
        );
        
        // Handle Dragon token buy fees
        uint256 jackpotFee = (returnAmount * BUY_FEE_JACKPOT) / FEE_DENOMINATOR;
        uint256 ve69lpFee = (returnAmount * BUY_FEE_VE69LP) / FEE_DENOMINATOR;
        uint256 burnAmount = (returnAmount * BURN_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 finalAmount = returnAmount - jackpotFee - ve69lpFee - burnAmount;
        
        // Transfer fee to jackpot vault
        if (jackpotFee > 0) {
            IERC20(tokenOut).safeTransfer(jackpotVault, jackpotFee);
        }
        
        // Transfer fee to ve69LP fee distributor
        if (ve69lpFee > 0) {
            IERC20(tokenOut).safeTransfer(ve69LPFeeDistributor, ve69lpFee);
        }
        
        // Burn tokens
        if (burnAmount > 0) {
            dragonToken.burn(burnAmount);
        }
        
        // Transfer remaining tokens to user
        IERC20(tokenOut).safeTransfer(msg.sender, finalAmount);
        
        emit FeesCollected(true, jackpotFee, ve69lpFee, burnAmount);
        emit SwapExecuted(msg.sender, tokenIn, tokenOut, _amountIn, finalAmount);
        
        return finalAmount;
    }
    
    /**
     * @notice Swap Dragon token to Wrapped Sonic (wS) with fee handling
     * @param _amountIn Amount of Dragon to swap
     * @param _minAmountOut Minimum amount of wS to receive
     * @param _deadline Deadline for the swap execution
     * @return amountOut Actual amount of wS received
     */
    function swapDragonForWS(
        uint256 _amountIn,
        uint256 _minAmountOut,
        uint256 _deadline
    ) external returns (uint256 amountOut) {
        require(block.timestamp <= _deadline, "Deadline expired");
        
        // Handle Dragon token sell fees upfront
        uint256 jackpotFee = (_amountIn * SELL_FEE_JACKPOT) / FEE_DENOMINATOR;
        uint256 ve69lpFee = (_amountIn * SELL_FEE_VE69LP) / FEE_DENOMINATOR;
        uint256 burnAmount = (_amountIn * BURN_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 swapAmount = _amountIn - jackpotFee - ve69lpFee - burnAmount;
        
        // Transfer Dragon tokens from the user to this contract
        dragonToken.transferFrom(msg.sender, address(this), _amountIn);
        
        // Distribute fees
        if (jackpotFee > 0) {
            IERC20(address(dragonToken)).safeTransfer(jackpotVault, jackpotFee);
        }
        
        if (ve69lpFee > 0) {
            IERC20(address(dragonToken)).safeTransfer(ve69LPFeeDistributor, ve69lpFee);
        }
        
        if (burnAmount > 0) {
            dragonToken.burn(burnAmount);
        }
        
        // Approve Balancer Vault to spend Dragon tokens
        IERC20(address(dragonToken)).safeApprove(address(balancerVault), swapAmount);
        
        // Get pool tokens and prepare swap
        (address[] memory tokens, , ) = balancerVault.getPoolTokens(dragonWSPoolId);
        address tokenIn = address(dragonToken);
        address tokenOut = address(wrappedSonic);
        
        // Ensure tokens are in the expected order
        uint8 indexIn = tokenIn == tokens[0] ? 0 : 1;
        uint8 indexOut = tokenOut == tokens[0] ? 0 : 1;
        
        // Prepare Balancer single swap params
        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: dragonWSPoolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: tokenOut,
            amount: swapAmount,
            userData: ""
        });
        
        // Prepare fund management params
        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });
        
        // Execute the swap
        uint256 returnAmount = balancerVault.swap(
            singleSwap,
            funds,
            _minAmountOut,
            _deadline
        );
        
        // Transfer wS tokens to user
        wrappedSonic.safeTransfer(msg.sender, returnAmount);
        
        emit FeesCollected(false, jackpotFee, ve69lpFee, burnAmount);
        emit SwapExecuted(msg.sender, tokenIn, tokenOut, _amountIn, returnAmount);
        
        return returnAmount;
    }
    
    /**
     * @notice Update the fee recipient addresses
     * @param _jackpotVault New jackpot vault address
     * @param _ve69LPFeeDistributor New ve69LP fee distributor address
     */
    function updateFeeAddresses(
        address _jackpotVault,
        address _ve69LPFeeDistributor
    ) external onlyOwner {
        require(_jackpotVault != address(0), "Invalid jackpot vault");
        require(_ve69LPFeeDistributor != address(0), "Invalid ve69LP fee distributor");
        
        jackpotVault = _jackpotVault;
        ve69LPFeeDistributor = _ve69LPFeeDistributor;
        
        emit FeeAddressesUpdated(_jackpotVault, _ve69LPFeeDistributor);
    }
    
    /**
     * @notice Update the DRAGON/wS pool ID
     * @param _dragonWSPoolId New pool ID
     */
    function updatePoolId(bytes32 _dragonWSPoolId) external onlyOwner {
        dragonWSPoolId = _dragonWSPoolId;
        
        emit PoolIdUpdated(_dragonWSPoolId);
    }
    
    /**
     * @notice Rescue tokens accidentally sent to the contract
     * @param _token Address of the token to rescue
     * @param _amount Amount to rescue
     */
    function rescueTokens(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
} 