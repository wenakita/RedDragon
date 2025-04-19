// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/Ive69LP.sol";
import "./interfaces/IJackpot.sol";
import "./interfaces/Ive69LPBoost.sol";
import "./interfaces/Ive69LPPoolVoting.sol";

// Interface for xSHADOW token
interface IXShadow is IERC20 {
    function SHADOW() external view returns (address);
    function convertEmissionsToken(uint256 amount) external;
    function ratio() external view returns (uint256); // Gets xSHADOW:SHADOW ratio
}

// Interface for x33 token (ERC4626 vault for xSHADOW)
interface IX33 is IERC20 {
    function ratio() external view returns (uint256); // x33:xSHADOW ratio that increases over time
    function totalAssets() external view returns (uint256);
    function asset() external view returns (address); // Returns the xSHADOW address
    function isUnlocked() external view returns (bool); // Check if x33 is currently unlocked for operations
    function isCooldownActive() external view returns (bool); // Check if redemption cooldown is active
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

/**
 * @title DragonShadowV3Swapper
 * @dev Contract for swapping x33 to BeetsLP and entering jackpot via Shadow's Uniswap V3 style swaps
 * Includes 6.9% fee to match the 69% DRAGON component of BeetsLP
 * Uses accurate conversion from x33 to wS via contract ratios and DEX prices
 * Uses ve69LPBoost for calculating boost multipliers
 * Supports partner integrations with customizable fee sharing
 * Integrates with ve69LPPoolVoting for probability boosts based on votes
 */
contract DragonShadowV3Swapper is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Shadow contracts
    IShadowSwapRouter public immutable router;
    IShadowQuoter public immutable quoter;
    
    // Tokens
    address public immutable shadowToken;
    IXShadow public immutable xShadowToken;
    IX33 public immutable x33Token;
    IERC20 public immutable beetsLpToken;
    IERC20 public immutable wsToken;
    IERC20 public immutable usdcToken;
    
    // Boost contract
    Ive69LPBoost public booster;
    
    // Known pools for price fetching
    address public constant X33_USDC_POOL = 0xE8b696fB500c2a3B1FAa5e0fce4d53D6ad26765F;
    address public constant X33_SHADOW_POOL = 0xE076ACF0C028Ac2bA1Ec4807D592bfB2C524fDb0;
    address public constant SHADOW_WS_POOL = 0xF19748a0E269c6965a84f8C98ca8C47A064D4dd0;
    
    // Price calculation method enum
    enum PriceMethod {
        MANUAL,                  // Use manual ratio
        DIRECT_QUOTE,            // Direct x33 to wS quote
        X33_SHADOW_WS,           // Route through x33->SHADOW->wS
        X33_USDC_WS,             // Route through x33->USDC->wS
        CONTRACT_RATIOS,         // Use contract's internal ratio functions
        MULTI_ROUTE              // Average of multiple routes
    }
    
    // Current price method
    PriceMethod public priceMethod = PriceMethod.CONTRACT_RATIOS; // Default to most accurate method
    
    // Fee settings
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public constant SHADOW_FEE = 69; // 6.9% fee
    
    // Probability adjustment to account for reduced fee (6.9% vs 10%)
    uint256 public constant PROBABILITY_NUMERATOR = 69;
    uint256 public constant PROBABILITY_DENOMINATOR = 100;
    
    // Fee distribution constants (matches DRAGON/wS ratio in BeetsLP)
    uint256 public constant JACKPOT_SHARE = 69; // 69% to jackpot
    uint256 public constant VE69LP_SHARE = 31;  // 31% to ve69LP
    uint256 public constant DISTRIBUTION_DENOMINATOR = 100; // Denominator for share calculation
    
    // Standard pool fee
    uint24 public constant POOL_FEE = 3000;
    
    // Fee destinations
    address public jackpot;
    address public ve69LP;
    
    // Manual ratio (used as fallback)
    uint256 public manualRatio = 1e18; // 1:1 default
    
    // Partner support
    address public partnerRegistry;
    mapping(address => bool) public authorizedPartners;
    
    // Pool voting contract
    Ive69LPPoolVoting public poolVoting;
    
    // Boost cap to protect against excessive boosts
    uint256 public maxBoostBasisPoints = 690; // 6.9% max boost
    
    // Events
    event SwapWithJackpotEntry(
        address indexed user,
        uint256 x33Amount,
        uint256 beetsLpReceived,
        uint256 wsEquivalent,
        uint256 boost,
        uint256 feeAmount
    );
    event ManualRatioUpdated(uint256 newRatio);
    event PriceMethodUpdated(PriceMethod method);
    event FeeDistributed(uint256 jackpotAmount, uint256 ve69LPAmount);
    event SwapBlocked(string reason);
    event BoosterUpdated(address newBooster);
    event PartnerAuthorized(address partner, bool isAuthorized);
    event PartnerRegistrySet(address registry);
    event PartnerSwap(address indexed partner, address indexed user, uint256 x33Amount, uint256 partnerFee);
    event PoolVotingContractUpdated(address newPoolVoting);
    event MaxBoostUpdated(uint256 newMaxBoost);
    event ProbabilityBoosted(address indexed partner, uint256 boost, uint256 wsEquivalent);
    
    constructor(
        address _router,
        address _quoter,
        address _x33Token,
        address _beetsLpToken,
        address _wsToken,
        address _usdcToken,
        address _jackpot,
        address _ve69LP,
        address _booster
    ) {
        router = IShadowSwapRouter(_router);
        quoter = IShadowQuoter(_quoter);
        
        // Initialize token references
        x33Token = IX33(_x33Token);
        xShadowToken = IXShadow(IX33(_x33Token).asset()); // Get xSHADOW from x33's asset
        shadowToken = xShadowToken.SHADOW(); // Get SHADOW from xSHADOW
        
        beetsLpToken = IERC20(_beetsLpToken);
        wsToken = IERC20(_wsToken);
        usdcToken = IERC20(_usdcToken);
        jackpot = _jackpot;
        ve69LP = _ve69LP;
        booster = Ive69LPBoost(_booster);
        
        // Approve router to spend tokens
        IERC20(_x33Token).safeApprove(_router, type(uint256).max);
    }
    
    /**
     * @dev Modifier to check if caller is authorized (owner or partner)
     */
    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || 
            authorizedPartners[msg.sender] || 
            (partnerRegistry != address(0) && IPartnerRegistry(partnerRegistry).isApprovedPartner(msg.sender)),
            "Not authorized"
        );
        _;
    }
    
    /**
     * @dev Allows users to swap x33 for BeetsLP and enter the jackpot
     * Takes 6.9% fee to match the 69% DRAGON component of BeetsLP
     * Adjusts jackpot probability proportionally to fee reduction
     * Applies ve69LP boost with cubic root normalization via booster contract
     * @param x33Amount Amount of x33 to swap
     * @param minBeetsLpOut Minimum BeetsLP to receive (slippage protection)
     * @param deadline Transaction deadline
     * @return beetsLpReceived Amount of BeetsLP tokens received
     */
    function swapX33ForBeetsLPWithJackpot(
        uint256 x33Amount,
        uint256 minBeetsLpOut,
        uint256 deadline
    ) external nonReentrant returns (uint256 beetsLpReceived) {
        return _swapX33ForBeetsLPWithJackpot(msg.sender, x33Amount, minBeetsLpOut, deadline, 0);
    }
    
    /**
     * @dev Version of swap function that can be called by authorized partners
     * @param user User address (the actual user, not the partner)
     * @param x33Amount Amount of x33 to swap
     * @param minBeetsLpOut Minimum BeetsLP to receive (slippage protection)
     * @param deadline Transaction deadline
     * @return beetsLpReceived Amount of BeetsLP tokens received
     */
    function partnerSwapX33ForBeetsLPWithJackpot(
        address user,
        uint256 x33Amount,
        uint256 minBeetsLpOut,
        uint256 deadline
    ) external nonReentrant onlyAuthorized returns (uint256 beetsLpReceived) {
        uint256 partnerFee = 0;
        
        // Calculate partner probability boost if pool voting is enabled
        uint256 probabilityBoost = 0;
        if (address(poolVoting) != address(0)) {
            probabilityBoost = poolVoting.getPartnerProbabilityBoostByAddress(msg.sender);
            
            // Cap the boost at the maximum allowed value
            if (probabilityBoost > maxBoostBasisPoints) {
                probabilityBoost = maxBoostBasisPoints;
            }
        }
        
        emit PartnerSwap(msg.sender, user, x33Amount, partnerFee);
        return _swapX33ForBeetsLPWithJackpot(user, x33Amount, minBeetsLpOut, deadline, probabilityBoost);
    }
    
    /**
     * @dev Internal implementation of swap logic
     * @param probabilityBoost Additional probability boost in basis points (0-690)
     */
    function _swapX33ForBeetsLPWithJackpot(
        address user,
        uint256 x33Amount,
        uint256 minBeetsLpOut,
        uint256 deadline,
        uint256 probabilityBoost
    ) internal returns (uint256 beetsLpReceived) {
        // Check if x33 is unlocked for operations
        if (!x33Token.isUnlocked()) {
            emit SwapBlocked("x33 is currently locked");
            revert("x33 is currently locked");
        }
        
        // Transfer x33 from user to contract if caller is the user
        // Otherwise, assume the caller (partner) already transferred tokens
        if (msg.sender == user) {
            IERC20(address(x33Token)).safeTransferFrom(user, address(this), x33Amount);
        }
        
        // Calculate fee (6.9% of x33 amount)
        uint256 feeAmount = (x33Amount * SHADOW_FEE) / FEE_DENOMINATOR;
        
        // Amount to swap after fee
        uint256 swapAmount = x33Amount - feeAmount;
        
        // Create swap params
        IShadowSwapRouter.ExactInputSingleParams memory params = IShadowSwapRouter.ExactInputSingleParams({
            tokenIn: address(x33Token),
            tokenOut: address(beetsLpToken),
            fee: POOL_FEE,
            recipient: user, // Send BeetsLP directly to user
            deadline: deadline,
            amountIn: swapAmount,
            amountOutMinimum: minBeetsLpOut,
            sqrtPriceLimitX96: 0 // No price limit
        });
        
        // Execute swap
        beetsLpReceived = router.exactInputSingle(params);
        
        // Handle fees and boosted jackpot entry
        _handleFeesAndJackpotEntry(user, x33Amount, feeAmount, probabilityBoost);
        
        return beetsLpReceived;
    }
    
    /**
     * @dev Helper function to distribute fees and handle jackpot entry
     * Separated to avoid "stack too deep" errors
     */
    function _handleFeesAndJackpotEntry(
        address user,
        uint256 x33Amount,
        uint256 feeAmount,
        uint256 probabilityBoost
    ) internal {
        // Distribute fees - 69% to jackpot, 31% to ve69LP (matching BeetsLP composition)
        uint256 jackpotAmount = (feeAmount * JACKPOT_SHARE) / DISTRIBUTION_DENOMINATOR;
        uint256 ve69LPAmount = feeAmount - jackpotAmount; // Remainder goes to ve69LP
        
        // Transfer fees
        IERC20(address(x33Token)).safeTransfer(jackpot, jackpotAmount);
        IERC20(address(x33Token)).safeTransfer(ve69LP, ve69LPAmount);
        
        // Calculate wS equivalent for jackpot entry using full x33 amount
        uint256 wsEquivalent = calculateWSEquivalent(x33Amount);
        
        // Adjust probability - since we're taking 6.9% fee instead of 10%,
        // we adjust the jackpot entry by the same proportion (69/100)
        wsEquivalent = (wsEquivalent * PROBABILITY_NUMERATOR) / PROBABILITY_DENOMINATOR;
        
        // Get boost from ve69LPBoost contract
        uint256 ve69LPBoostMultiplier = 10000; // Default to 100% (no boost)
        
        if (address(booster) != address(0)) {
            // Use booster contract if available
            ve69LPBoostMultiplier = booster.calculateBoost(user);
        }
        
        // Apply ve69LP boost to the base amount
        uint256 ve69LPBoostedAmount = (wsEquivalent * ve69LPBoostMultiplier) / 10000;
        
        // Apply additional probability boost from voting as a separate component
        uint256 partnerBoostedAmount = 0;
        if (probabilityBoost > 0) {
            // Calculate additional boost amount (e.g., if boost is 100 basis points, add 1%)
            partnerBoostedAmount = (wsEquivalent * probabilityBoost) / 10000;
            emit ProbabilityBoosted(msg.sender, probabilityBoost, partnerBoostedAmount);
        }
        
        // Combine the two boost components (additive, not multiplicative)
        uint256 totalBoostedAmount = ve69LPBoostedAmount + partnerBoostedAmount;
        
        // Enter jackpot with combined boosted amount
        IJackpot(jackpot).enterJackpotWithWS(user, totalBoostedAmount);
        
        emit SwapWithJackpotEntry(
            user, 
            x33Amount, 
            0, // beetsLpReceived is not available in this context
            totalBoostedAmount, 
            ve69LPBoostMultiplier, // Still report the ve69LP boost multiplier for consistency
            feeAmount
        );
        emit FeeDistributed(jackpotAmount, ve69LPAmount);
    }
    
    /**
     * @dev Get an estimate of how much BeetsLP will be received for x33 after fees
     * Also estimates the boosted wS equivalent for jackpot entry
     * @param x33Amount Amount of x33 tokens
     * @param user Address of the user (for boost calculation)
     * @param partner Address of the partner (for probability boost calculation)
     * @return beetsLpAmount Estimated BeetsLP amount
     * @return wsEquivalentForJackpot Estimated wS equivalent for jackpot entry (with boost)
     * @return boostMultiplier The calculated boost multiplier
     */
    function estimateOutputsWithBoostAndPartner(
        uint256 x33Amount,
        address user,
        address partner
    ) external view returns (
        uint256 beetsLpAmount, 
        uint256 wsEquivalentForJackpot,
        uint256 boostMultiplier
    ) {
        // Check if x33 is unlocked for operations
        if (!x33Token.isUnlocked()) {
            return (0, 0, 10000); // 100% = no boost
        }
        
        // Calculate fee (6.9% of x33 amount)
        uint256 feeAmount = (x33Amount * SHADOW_FEE) / FEE_DENOMINATOR;
        
        // Amount to swap after fee
        uint256 swapAmount = x33Amount - feeAmount;
        
        // Get estimated BeetsLP output
        try quoter.quoteExactInputSingle(
            address(x33Token),
            address(beetsLpToken),
            POOL_FEE,
            swapAmount,
            0 // No price limit
        ) returns (uint256 output) {
            beetsLpAmount = output;
        } catch {
            // Fallback to a simple estimate if quote fails
            beetsLpAmount = swapAmount; // 1:1 approximation
        }
        
        // Calculate wS equivalent with fee adjustment
        uint256 wsEquivalent = calculateWSEquivalent(x33Amount);
        wsEquivalent = (wsEquivalent * PROBABILITY_NUMERATOR) / PROBABILITY_DENOMINATOR;
        
        // Get boost from booster contract if available
        boostMultiplier = 10000; // Default to 100% (no boost)
        if (address(booster) != address(0)) {
            boostMultiplier = booster.calculateBoost(user);
        }
        
        // Apply ve69LP boost to the base amount
        uint256 ve69LPBoostedAmount = (wsEquivalent * boostMultiplier) / 10000;
        
        // Apply probability boost if partner is specified as a separate component
        uint256 partnerBoostedAmount = 0;
        if (partner != address(0) && address(poolVoting) != address(0)) {
            uint256 probabilityBoost = poolVoting.getPartnerProbabilityBoostByAddress(partner);
            
            // Cap the boost at the maximum allowed value
            if (probabilityBoost > maxBoostBasisPoints) {
                probabilityBoost = maxBoostBasisPoints;
            }
            
            if (probabilityBoost > 0) {
                // Calculate additional boost amount
                partnerBoostedAmount = (wsEquivalent * probabilityBoost) / 10000;
            }
        }
        
        // Combine the two boost components (additive, not multiplicative)
        wsEquivalentForJackpot = ve69LPBoostedAmount + partnerBoostedAmount;
        
        return (beetsLpAmount, wsEquivalentForJackpot, boostMultiplier);
    }
    
    // Regular estimateOutputsWithBoost remains unchanged for backward compatibility
    // But calls the new method with zero address for partner
    function estimateOutputsWithBoost(
        uint256 x33Amount,
        address user
    ) external view returns (
        uint256 beetsLpAmount, 
        uint256 wsEquivalentForJackpot,
        uint256 boostMultiplier
    ) {
        return this.estimateOutputsWithBoostAndPartner(x33Amount, user, address(0));
    }
    
    // ------- PARTNER MANAGEMENT FUNCTIONS -------
    
    /**
     * @dev Set a partner's authorization status
     * @param partner Partner address
     * @param isAuthorized Whether partner is authorized to call this contract
     */
    function setPartnerAuthorization(address partner, bool isAuthorized) external onlyOwner {
        authorizedPartners[partner] = isAuthorized;
        emit PartnerAuthorized(partner, isAuthorized);
    }
    
    /**
     * @dev Set the partner registry contract address
     * @param _partnerRegistry Partner registry contract address
     */
    function setPartnerRegistry(address _partnerRegistry) external onlyOwner {
        partnerRegistry = _partnerRegistry;
        emit PartnerRegistrySet(_partnerRegistry);
    }
    
    // ------- PARTNER POOL VOTING MANAGEMENT -------
    
    /**
     * @dev Set the pool voting contract
     * @param _poolVoting Address of the ve69LPPoolVoting contract
     */
    function setPoolVoting(address _poolVoting) external onlyOwner {
        poolVoting = Ive69LPPoolVoting(_poolVoting);
        emit PoolVotingContractUpdated(_poolVoting);
    }
    
    /**
     * @dev Set the maximum allowed probability boost
     * @param _maxBoost Maximum boost in basis points (e.g., 690 = 6.9%)
     */
    function setMaxBoost(uint256 _maxBoost) external onlyOwner {
        require(_maxBoost <= 1000, "Max boost cannot exceed 10%");
        maxBoostBasisPoints = _maxBoost;
        emit MaxBoostUpdated(_maxBoost);
    }
    
    // ------- EXISTING ADMIN FUNCTIONS -------
    
    /**
     * @dev Calculate how much wS the x33 is worth using multiple possible routes
     * @param x33Amount Amount of x33 tokens
     * @return wsEquivalent Equivalent wS amount
     */
    function calculateWSEquivalent(uint256 x33Amount) public view returns (uint256) {
        if (priceMethod == PriceMethod.MANUAL) {
            // Use the manually set ratio
            return (x33Amount * manualRatio) / 1e18;
        } 
        else if (priceMethod == PriceMethod.DIRECT_QUOTE) {
            // Try direct x33 to wS quote
            try quoter.quoteExactInputSingle(
                address(x33Token),
                address(wsToken),
                POOL_FEE,
                x33Amount,
                0
            ) returns (uint256 wsAmount) {
                return wsAmount;
            } catch {
                // Fallback to manual ratio
                return (x33Amount * manualRatio) / 1e18;
            }
        }
        else if (priceMethod == PriceMethod.X33_SHADOW_WS) {
            // Try x33->SHADOW->wS route
            try this.getX33ToWSViaShadow(x33Amount) returns (uint256 wsAmount) {
                return wsAmount;
            } catch {
                // Fallback to manual ratio
                return (x33Amount * manualRatio) / 1e18;
            }
        }
        else if (priceMethod == PriceMethod.X33_USDC_WS) {
            // Try x33->USDC->wS route
            try this.getX33ToWSViaUSDC(x33Amount) returns (uint256 wsAmount) {
                return wsAmount;
            } catch {
                // Fallback to manual ratio
                return (x33Amount * manualRatio) / 1e18;
            }
        }
        else if (priceMethod == PriceMethod.CONTRACT_RATIOS) {
            // Use contract's ratio functions for accurate conversion
            try this.getX33ToWSViaContractRatios(x33Amount) returns (uint256 wsAmount) {
                return wsAmount;
            } catch {
                // Fallback to manual ratio
                return (x33Amount * manualRatio) / 1e18;
            }
        }
        else if (priceMethod == PriceMethod.MULTI_ROUTE) {
            // Try multiple routes and average the results
            uint256 totalRoutes = 0;
            uint256 totalAmount = 0;
            
            // Try direct quote
            try quoter.quoteExactInputSingle(
                address(x33Token),
                address(wsToken),
                POOL_FEE,
                x33Amount,
                0
            ) returns (uint256 wsAmount) {
                totalAmount += wsAmount;
                totalRoutes++;
            } catch {}
            
            // Try x33->SHADOW->wS route
            try this.getX33ToWSViaShadow(x33Amount) returns (uint256 wsAmount) {
                totalAmount += wsAmount;
                totalRoutes++;
            } catch {}
            
            // Try x33->USDC->wS route
            try this.getX33ToWSViaUSDC(x33Amount) returns (uint256 wsAmount) {
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
     * @dev Calculate x33 to wS conversion by routing through Shadow token
     * @param x33Amount Amount of x33 tokens
     * @return wsAmount Equivalent wS amount
     */
    function getX33ToWSViaShadow(uint256 x33Amount) external view returns (uint256 wsAmount) {
        // Step 1: Get x33 to Shadow conversion
        uint256 shadowAmount;
        try quoter.quoteExactInputSingle(
            address(x33Token),
            shadowToken,
            POOL_FEE,
            x33Amount,
            0
        ) returns (uint256 amount) {
            shadowAmount = amount;
        } catch {
            revert("Cannot get x33 to Shadow price");
        }
        
        // Step 2: Get Shadow to wS conversion
        try quoter.quoteExactInputSingle(
            shadowToken,
            address(wsToken),
            POOL_FEE,
            shadowAmount,
            0
        ) returns (uint256 amount) {
            wsAmount = amount;
        } catch {
            revert("Cannot get Shadow to wS price");
        }
        
        return wsAmount;
    }
    
    /**
     * @dev Calculate x33 to wS conversion by routing through USDC
     * @param x33Amount Amount of x33 tokens
     * @return wsAmount Equivalent wS amount
     */
    function getX33ToWSViaUSDC(uint256 x33Amount) external view returns (uint256 wsAmount) {
        // Step 1: Get x33 to USDC conversion
        uint256 usdcAmount;
        try quoter.quoteExactInputSingle(
            address(x33Token),
            address(usdcToken),
            POOL_FEE,
            x33Amount,
            0
        ) returns (uint256 amount) {
            usdcAmount = amount;
        } catch {
            revert("Cannot get x33 to USDC price");
        }
        
        // Step 2: Get USDC to wS conversion
        try quoter.quoteExactInputSingle(
            address(usdcToken),
            address(wsToken),
            POOL_FEE,
            usdcAmount,
            0
        ) returns (uint256 amount) {
            wsAmount = amount;
        } catch {
            revert("Cannot get USDC to wS price");
        }
        
        return wsAmount;
    }
    
    /**
     * @dev Calculate x33 to wS conversion using contract ratio functions
     * @param x33Amount Amount of x33 tokens
     * @return wsAmount Equivalent wS amount
     */
    function getX33ToWSViaContractRatios(uint256 x33Amount) external view returns (uint256 wsAmount) {
        // Step 1: Calculate how much xSHADOW the x33 represents
        // x33 is ERC4626 and ratio() returns the x33:xSHADOW ratio (which INCREASES over time)
        uint256 x33ToXShadowRatio = x33Token.ratio();
        uint256 xShadowAmount = (x33Amount * x33ToXShadowRatio) / 1e18;
        
        // Step 2: Calculate how much SHADOW the xSHADOW represents
        // xSHADOW.ratio() returns the xSHADOW:SHADOW ratio
        // Note: Converting xSHADOW to SHADOW would incur a 50% penalty, but we're not doing the conversion
        // We only need to know the equivalent value without penalty for pricing 
        uint256 xShadowToShadowRatio = xShadowToken.ratio();
        uint256 shadowAmount = (xShadowAmount * xShadowToShadowRatio) / 1e18;
        
        // Step 3: Calculate SHADOW to wS conversion using DEX prices
        try quoter.quoteExactInputSingle(
            shadowToken,
            address(wsToken),
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
    
    /**
     * @dev Update the manual x33 to wS conversion ratio (only owner)
     * @param _newRatio New conversion ratio (in 1e18 format)
     */
    function updateManualRatio(uint256 _newRatio) external onlyOwner {
        require(_newRatio > 0, "Ratio must be greater than 0");
        manualRatio = _newRatio;
        emit ManualRatioUpdated(_newRatio);
    }
    
    /**
     * @dev Set the price calculation method
     * @param _method The price method to use
     */
    function setPriceMethod(PriceMethod _method) external onlyOwner {
        priceMethod = _method;
        emit PriceMethodUpdated(_method);
    }
    
    /**
     * @dev Update jackpot and ve69LP addresses (only owner)
     * @param _jackpot New jackpot address
     * @param _ve69LP New ve69LP address
     */
    function updateFeeRecipients(address _jackpot, address _ve69LP) external onlyOwner {
        jackpot = _jackpot;
        ve69LP = _ve69LP;
    }
    
    /**
     * @dev Update the booster contract (only owner)
     * @param _booster New booster contract address
     */
    function updateBooster(address _booster) external onlyOwner {
        booster = Ive69LPBoost(_booster);
        emit BoosterUpdated(_booster);
    }
    
    /**
     * @dev Emergency withdrawal of tokens (only owner)
     * @param token Token address to withdraw
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

// Partner Registry Interface
interface IPartnerRegistry {
    function isApprovedPartner(address partner) external view returns (bool);
} 