// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IDragonPartnerAdapter.sol";

/**
 * @title SimpleShadowAdapter
 * @dev Simplified adapter for Shadow DEX that implements the IDragonPartnerAdapter interface
 */
contract SimpleShadowAdapter is IDragonPartnerAdapter, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Tokens
    address public immutable dragonToken;  // Dragon token ($DRAGON)
    address public immutable beetsLpToken; // Beets LP token (Dragon/wS)
    address public immutable wsToken;      // Wrapped Sonic token
    
    // Fee destinations
    address public jackpot;
    address public ve69LP;
    
    // Fee structure
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public constant SHADOW_FEE = 69; // 6.9% fee
    uint256 public constant JACKPOT_SHARE = 69; // 69% to jackpot
    uint256 public constant VE69LP_SHARE = 31; // 31% to ve69LP
    
    // Events
    event SwapExecuted(
        address indexed user,
        uint256 dragonAmount,
        uint256 beetsLpReceived,
        uint256 wsEquivalent,
        uint256 feeAmount
    );
    event FeeDistributed(uint256 jackpotAmount, uint256 ve69LPAmount);
    
    constructor(
        address _dragonToken,
        address _beetsLpToken,
        address _wsToken,
        address _jackpot,
        address _ve69LP
    ) {
        dragonToken = _dragonToken;
        beetsLpToken = _beetsLpToken;
        wsToken = _wsToken;
        jackpot = _jackpot;
        ve69LP = _ve69LP;
    }
    
    // Implement standardized partner interface
    
    /**
     * @dev Get the partner's name
     * @return The name of the partner
     */
    function getPartnerName() external pure override returns (string memory) {
        return "Shadow DEX";
    }
    
    /**
     * @dev Get tokens supported by this adapter
     * @return An array of token addresses
     */
    function getPartnerTokens() external view override returns (address[] memory) {
        address[] memory tokens = new address[](1);
        tokens[0] = dragonToken;
        return tokens;
    }
    
    /**
     * @dev Get the percentage of fees that go to jackpot
     * @return The jackpot fee percentage in basis points
     */
    function getJackpotFeePercentage() external pure override returns (uint256) {
        return (SHADOW_FEE * JACKPOT_SHARE) / 100; // 4.761% (6.9% * 69%)
    }
    
    /**
     * @dev Get the percentage of fees that go to ve69LP
     * @return The ve69LP fee percentage in basis points
     */
    function getve69LPFeePercentage() external pure override returns (uint256) {
        return (SHADOW_FEE * VE69LP_SHARE) / 100; // 2.139% (6.9% * 31%)
    }
    
    /**
     * @dev Swap tokens and enter jackpot
     * @param tokenIn Address of token to swap
     * @param amountIn Amount of tokens to swap
     * @param minAmountOut Minimum output amount (slippage protection)
     * @param deadline Transaction deadline
     * @param recipient Address to receive output tokens
     * @return amountOut Amount of output tokens received
     * @return wsEquivalent Equivalent wS amount for jackpot entry
     */
    function swapForJackpotEntry(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline,
        address recipient
    ) external override nonReentrant returns (
        uint256 amountOut,
        uint256 wsEquivalent
    ) {
        require(tokenIn == dragonToken, "Only Dragon token supported");
        
        // Transfer Dragon tokens from caller to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Calculate fee
        uint256 feeAmount = (amountIn * SHADOW_FEE) / FEE_DENOMINATOR;
        uint256 swapAmount = amountIn - feeAmount;
        
        // Distribute fees
        uint256 jackpotAmount = (feeAmount * JACKPOT_SHARE) / 100;
        uint256 ve69LPAmount = feeAmount - jackpotAmount;
        
        IERC20(tokenIn).safeTransfer(jackpot, jackpotAmount);
        IERC20(tokenIn).safeTransfer(ve69LP, ve69LPAmount);
        
        emit FeeDistributed(jackpotAmount, ve69LPAmount);
        
        // For the simplified adapter, we'll just transfer the tokens
        // instead of actually swapping them through Shadow DEX
        // In a real scenario, this would be a swap
        IERC20(tokenIn).safeTransfer(recipient, swapAmount);
        
        // For testing purposes, we'll consider the swap amount as the output amount
        amountOut = swapAmount;
        
        // Simplified estimation of wS equivalent
        wsEquivalent = amountIn / 10; // Simple 1:10 ratio for testing
        
        // Adjust probability
        wsEquivalent = (wsEquivalent * 69) / 100;
        
        emit SwapExecuted(
            recipient,
            amountIn,
            amountOut,
            wsEquivalent,
            feeAmount
        );
        
        return (amountOut, wsEquivalent);
    }
    
    /**
     * @dev Estimate the equivalent wS amount for a given input token and amount
     * @param tokenIn The address of the input token
     * @param amountIn Amount of input tokens
     * @return Equivalent wS amount
     */
    function estimateWrappedSonicEquivalent(
        address tokenIn,
        uint256 amountIn
    ) external view override returns (uint256) {
        require(tokenIn == dragonToken, "Only Dragon token supported");
        
        // Simplified calculation
        uint256 wsEquivalent = amountIn / 10; // Simple 1:10 ratio for testing
        
        // Adjust probability
        wsEquivalent = (wsEquivalent * 69) / 100;
        
        return wsEquivalent;
    }
    
    /**
     * @dev Update fee recipient addresses
     * @param _jackpot New jackpot address
     * @param _ve69LP New ve69LP address
     */
    function updateFeeRecipients(address _jackpot, address _ve69LP) external onlyOwner {
        require(_jackpot != address(0), "Jackpot cannot be zero address");
        require(_ve69LP != address(0), "ve69LP cannot be zero address");
        jackpot = _jackpot;
        ve69LP = _ve69LP;
    }
    
    /**
     * @dev Emergency withdraw function
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }
} 