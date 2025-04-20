// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IDragonPartnerAdapter.sol";

// Shadow interfaces
interface IShadowSwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external returns (uint256 amountOut);
}

interface IShadowQuoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external view returns (uint256 amountOut);
}

interface IXShadow is IERC20 {
    function SHADOW() external view returns (address);
    function ratio() external view returns (uint256); // Gets xSHADOW:SHADOW ratio
}

interface IX33 is IERC20 {
    function ratio() external view returns (uint256); // x33:xSHADOW ratio that increases over time
    function asset() external view returns (address); // Returns the xSHADOW address
    function isUnlocked() external view returns (bool); // Check if x33 is currently unlocked for operations
}

/**
 * @title ShadowDEXAdapter
 * @dev Adapter for Shadow DEX that implements the IDragonPartnerAdapter interface
 * Enables swapping x33 for BeetsLP while entering the jackpot
 */
contract ShadowDEXAdapter is IDragonPartnerAdapter, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Shadow contracts
    IShadowSwapRouter public immutable router;
    IShadowQuoter public immutable quoter;
    
    // Tokens
    address public immutable shadowToken;
    address public immutable xShadowToken;
    address public immutable x33Token;
    address public immutable beetsLpToken;
    address public immutable wsToken;
    
    // Fee destinations
    address public jackpot;
    address public ve69LP;
    
    // Shadow DEX specific parameters
    uint24 public constant POOL_FEE = 3000; // 0.3%
    
    // Fee structure
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public constant SHADOW_FEE = 69; // 6.9% fee
    uint256 public constant JACKPOT_SHARE = 69; // 69% to jackpot
    uint256 public constant VE69LP_SHARE = 31; // 31% to ve69LP
    
    // Known pools for price fetching
    address public constant X33_USDC_POOL = 0xE8b696fB500c2a3B1FAa5e0fce4d53D6ad26765F;
    address public constant X33_SHADOW_POOL = 0xE076ACF0C028Ac2bA1Ec4807D592bfB2C524fDb0;
    address public constant SHADOW_WS_POOL = 0xF19748a0E269c6965a84f8C98ca8C47A064D4dd0;
    
    // Price calculation method
    enum PriceMethod {
        MANUAL,
        CONTRACT_RATIOS,
        MULTI_ROUTE
    }
    
    PriceMethod public priceMethod = PriceMethod.CONTRACT_RATIOS;
    uint256 public manualRatio = 1e18; // 1:1 default
    
    // Events
    event SwapExecuted(
        address indexed user,
        uint256 x33Amount,
        uint256 beetsLpReceived,
        uint256 wsEquivalent,
        uint256 feeAmount
    );
    event FeeDistributed(uint256 jackpotAmount, uint256 ve69LPAmount);
    
    constructor(
        address _router,
        address _quoter,
        address _x33Token,
        address _beetsLpToken,
        address _wsToken,
        address _jackpot,
        address _ve69LP
    ) {
        router = IShadowSwapRouter(_router);
        quoter = IShadowQuoter(_quoter);
        
        x33Token = _x33Token;
        beetsLpToken = _beetsLpToken;
        wsToken = _wsToken;
        
        // Initialize xSHADOW and SHADOW references
        xShadowToken = IX33(_x33Token).asset(); 
        shadowToken = IXShadow(xShadowToken).SHADOW();
        
        jackpot = _jackpot;
        ve69LP = _ve69LP;
        
        // Approve router to spend tokens
        IERC20(_x33Token).safeApprove(_router, type(uint256).max);
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
        tokens[0] = x33Token;
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
        require(tokenIn == x33Token, "Only x33 token supported");
        require(IX33(x33Token).isUnlocked(), "x33 is currently locked");
        
        // Transfer x33 from caller to this contract
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
        
        // Execute swap
        IShadowSwapRouter.ExactInputSingleParams memory params = IShadowSwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: beetsLpToken,
            fee: POOL_FEE,
            recipient: recipient,
            deadline: deadline,
            amountIn: swapAmount,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0
        });
        
        amountOut = router.exactInputSingle(params);
        
        // Calculate wS equivalent
        wsEquivalent = calculateWSEquivalent(amountIn);
        
        // Adjust probability - since taking 6.9% fee instead of 10%
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
     * @dev Estimate wS equivalent for a given token amount
     * @param tokenIn Address of input token
     * @param amountIn Amount of input tokens
     * @return Equivalent wS amount
     */
    function estimateWSEquivalent(
        address tokenIn,
        uint256 amountIn
    ) external view override returns (uint256) {
        require(tokenIn == x33Token, "Only x33 token supported");
        
        // Calculate wS equivalent
        uint256 wsEquivalent = calculateWSEquivalent(amountIn);
        
        // Adjust probability
        wsEquivalent = (wsEquivalent * 69) / 100;
        
        return wsEquivalent;
    }
    
    // Price calculation functions
    
    /**
     * @dev Calculate how much wS the x33 is worth using various methods
     * @param x33Amount Amount of x33 tokens
     * @return wsEquivalent Equivalent wS amount
     */
    function calculateWSEquivalent(uint256 x33Amount) public view returns (uint256) {
        if (priceMethod == PriceMethod.MANUAL) {
            return (x33Amount * manualRatio) / 1e18;
        }
        else if (priceMethod == PriceMethod.CONTRACT_RATIOS) {
            try this.getX33ToWSViaContractRatios(x33Amount) returns (uint256 wsAmount) {
                return wsAmount;
            } catch {
                return (x33Amount * manualRatio) / 1e18;
            }
        }
        else if (priceMethod == PriceMethod.MULTI_ROUTE) {
            // Try multiple routes and average the results
            uint256 totalRoutes = 0;
            uint256 totalAmount = 0;
            
            // Try direct quote
            try quoter.quoteExactInputSingle(
                x33Token,
                wsToken,
                POOL_FEE,
                x33Amount,
                0
            ) returns (uint256 wsAmount) {
                totalAmount += wsAmount;
                totalRoutes++;
            } catch {}
            
            // Try contract ratios route
            try this.getX33ToWSViaContractRatios(x33Amount) returns (uint256 wsAmount) {
                totalAmount += wsAmount;
                totalRoutes++;
            } catch {}
            
            // Return average if we have any routes, otherwise fallback to manual
            if (totalRoutes > 0) {
                return totalAmount / totalRoutes;
            } else {
                return (x33Amount * manualRatio) / 1e18;
            }
        }
        
        // Default fallback to manual ratio
        return (x33Amount * manualRatio) / 1e18;
    }
    
    /**
     * @dev Calculate x33 to wS conversion using contract ratio functions
     * @param x33Amount Amount of x33 tokens
     * @return wsAmount Equivalent wS amount
     */
    function getX33ToWSViaContractRatios(uint256 x33Amount) external view returns (uint256 wsAmount) {
        // Calculate how much xSHADOW the x33 represents
        uint256 x33ToXShadowRatio = IX33(x33Token).ratio();
        uint256 xShadowAmount = (x33Amount * x33ToXShadowRatio) / 1e18;
        
        // Calculate how much SHADOW the xSHADOW represents
        uint256 xShadowToShadowRatio = IXShadow(xShadowToken).ratio();
        uint256 shadowAmount = (xShadowAmount * xShadowToShadowRatio) / 1e18;
        
        // Calculate SHADOW to wS conversion using DEX prices
        try quoter.quoteExactInputSingle(
            shadowToken,
            wsToken,
            POOL_FEE,
            shadowAmount,
            0
        ) returns (uint256 amount) {
            wsAmount = amount;
        } catch {
            revert("Cannot get SHADOW to wS price");
        }
        
        return wsAmount;
    }
    
    // Admin functions
    
    /**
     * @dev Update the manual ratio for price calculations
     * @param _newRatio New ratio in 1e18 format
     */
    function updateManualRatio(uint256 _newRatio) external onlyOwner {
        require(_newRatio > 0, "Ratio must be greater than 0");
        manualRatio = _newRatio;
    }
    
    /**
     * @dev Update the price calculation method
     * @param _method New price method
     */
    function setPriceMethod(PriceMethod _method) external onlyOwner {
        priceMethod = _method;
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