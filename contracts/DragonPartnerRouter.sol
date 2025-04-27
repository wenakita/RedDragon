// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IJackpot.sol";
import "./interfaces/Ive69LPBoost.sol";
import "./interfaces/IDragonPartnerAdapter.sol";
import "./interfaces/IShadowUniswapV3Pool.sol";
import "./interfaces/IShadowQuoter.sol";
import "./interfaces/IShadowSwapRouter.sol";
import "./DragonPartnerRegistry.sol";

/**
 * @title DragonPartnerRouter
 * @dev Unified router for partner integrations with Shadow V3 capabilities built-in
 * Routes trades through partners with fee sharing
 * Handles Shadow UniV3-style swaps directly for redDragon ($RDGS) pairing
 * All partners follow 6.9% fee structure with 69/31 split to jackpot and ve69LP
 *
 * Lottery System:
 * - Base win chance scales linearly from 0.0004% at 1 wS to 4% at 10,000 wS
 * - ve69LP holders can receive up to 2.5x probability boost 
 * - Partners can receive additional probability boost (up to 6.9%) based on registry
 * - When swapping through partners, probability is adjusted by factor of 69/100
 * - Calculations use wrapped Sonic equivalent for determining entry size
 * - Only real users are eligible for jackpot entries, not contracts
 */
contract DragonPartnerRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Partner registry
    DragonPartnerRegistry public partnerRegistry;
    
    // Shadow DEX contracts
    IShadowSwapRouter public router;
    IShadowQuoter public quoter;
    
    // Jackpot and ve69LP 
    address public jackpot;
    address public ve69LP;
    Ive69LPBoost public booster;
    
    // Tokens
    IERC20 public redDragonToken;  // redDragon ($RDGS) token
    IERC20 public partnerToken;    // Example partner token (can be x33 or any other)
    IERC20 public wrappedSonicToken;
    address public shadowToken;
    address public xShadowToken;
    
    // Shadow DEX specific parameters
    uint24 public constant POOL_FEE = 3000; // 0.3%
    
    // Fee structure
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public constant PARTNER_FEE = 69; // 6.9% fee
    uint256 public constant JACKPOT_SHARE = 69; // 69% to jackpot
    uint256 public constant VE69LP_SHARE = 31; // 31% to ve69LP
    
    // Partner fee calculation constants
    uint256 public constant PARTNER_FEE_DENOMINATOR = 10000; // 100% in basis points
    uint256 public constant PARTNER_BASE_FEE = 69; // 0.69% base fee (in basis points of 10000)
    
    // Probability adjustment to account for reduced fee (6.9% vs 10%)
    uint256 public constant PROBABILITY_NUMERATOR = 69;
    uint256 public constant PROBABILITY_DENOMINATOR = 100;
    
    // Price calculation method
    enum PriceMethod {
        MANUAL,
        CONTRACT_RATIOS,
        MULTI_ROUTE
    }
    
    PriceMethod public priceMethod = PriceMethod.CONTRACT_RATIOS;
    uint256 public manualRatio = 1e18; // 1:1 default
    
    // Events
    event PartnerSwap(
        address indexed partner,
        address indexed user,
        uint256 partnerId,
        uint256 partnerTokenAmount,
        uint256 partnerFeeAmount,
        uint256 redDragonReceived
    );
    
    event DirectSwap(
        address indexed user,
        uint256 partnerTokenAmount,
        uint256 redDragonReceived
    );
    
    event ShadowSwap(
        address indexed user,
        uint256 partnerTokenAmount,
        uint256 redDragonReceived,
        uint256 wrappedSonicEquivalent,
        uint256 feeAmount
    );
    
    event FeeDistributed(uint256 jackpotAmount, uint256 ve69LPAmount);
    event PriceMethodUpdated(PriceMethod method);
    event ManualRatioUpdated(uint256 newRatio);
    
    /**
     * @dev Constructor
     * @param _partnerRegistry Registry of partners
     * @param _router Shadow DEX router address
     * @param _quoter Shadow DEX quoter address
     * @param _jackpot Jackpot address
     * @param _ve69LP ve69LP address
     * @param _booster Boost calculator address
     * @param _redDragonToken redDragon ($RDGS) token address
     * @param _partnerToken Initial partner token address
     * @param _wrappedSonicToken wS token address
     */
    constructor(
        address _partnerRegistry,
        address _router,
        address _quoter,
        address _jackpot,
        address _ve69LP,
        address _booster,
        address _redDragonToken,
        address _partnerToken,
        address _wrappedSonicToken
    ) {
        partnerRegistry = DragonPartnerRegistry(_partnerRegistry);
        router = IShadowSwapRouter(_router);
        quoter = IShadowQuoter(_quoter);
        jackpot = _jackpot;
        ve69LP = _ve69LP;
        booster = Ive69LPBoost(_booster);
        redDragonToken = IERC20(_redDragonToken);
        partnerToken = IERC20(_partnerToken);
        wrappedSonicToken = IERC20(_wrappedSonicToken);
        
        // Initialize xSHADOW and SHADOW references if partner token is x33
        // Note: This should be more flexible for other partner tokens
        if (_isX33Token(_partnerToken)) {
            xShadowToken = IX33(_partnerToken).asset(); 
            shadowToken = IXShadow(xShadowToken).SHADOW();
        }
        
        // Approve tokens
        IERC20(_partnerToken).safeApprove(_router, type(uint256).max);
    }
    
    /**
     * @dev Helper to check if a token is x33
     * @param tokenAddress The token address to check
     * @return isX33 Whether the token is x33
     */
    function _isX33Token(address tokenAddress) internal view returns (bool) {
        // Check if token has the x33 interface
        try IX33(tokenAddress).asset() returns (address) {
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Swap partner tokens for redDragon through a partner
     * @param partnerTokenAmount Amount of partner tokens to swap
     * @param minRedDragonOut Minimum redDragon to receive (slippage protection)
     * @param deadline Transaction deadline
     * @param partnerId ID of the partner in the registry
     * @return redDragonReceived Amount of redDragon tokens received
     */
    function swapPartnerTokenForRedDragonWithPartner(
        uint256 partnerTokenAmount,
        uint256 minRedDragonOut,
        uint256 deadline,
        uint256 partnerId
    ) external nonReentrant returns (uint256 redDragonReceived) {
        // Get partner info
        (address partnerAddress, , uint256 feeShare, bool isActive, ) = partnerRegistry.getPartner(partnerId);
        require(partnerAddress != address(0), "Partner does not exist");
        require(isActive, "Partner is not active");
        
        // Transfer partner tokens from user to this contract
        partnerToken.safeTransferFrom(msg.sender, address(this), partnerTokenAmount);
        
        // Calculate partner fee (partner gets their share of the 0.69% base fee)
        uint256 totalFeeAmount = (partnerTokenAmount * PARTNER_BASE_FEE) / PARTNER_FEE_DENOMINATOR;
        uint256 partnerFeeAmount = (totalFeeAmount * feeShare) / PARTNER_FEE_DENOMINATOR;
        uint256 remainingAmount = partnerTokenAmount - partnerFeeAmount;
        
        // Send partner fee if non-zero
        if (partnerFeeAmount > 0) {
            partnerToken.safeTransfer(partnerAddress, partnerFeeAmount);
            partnerRegistry.recordFeeDistribution(partnerId, address(partnerToken), partnerFeeAmount);
        }
        
        // Handle the swap internally
        redDragonReceived = _swapV3ForRedDragonWithJackpot(
            msg.sender,
            remainingAmount,
            minRedDragonOut,
            deadline,
            partnerAddress
        );
        
        emit PartnerSwap(
            partnerAddress,
            msg.sender,
            partnerId,
            partnerTokenAmount,
            partnerFeeAmount,
            redDragonReceived
        );
        
        return redDragonReceived;
    }
    
    /**
     * @dev Direct swap without partner (internal Shadow V3 swap)
     * @param partnerTokenAmount Amount of partner tokens to swap
     * @param minRedDragonOut Minimum redDragon to receive (slippage protection)
     * @param deadline Transaction deadline
     * @return redDragonReceived Amount of redDragon tokens received
     */
    function swapPartnerTokenForRedDragon(
        uint256 partnerTokenAmount,
        uint256 minRedDragonOut,
        uint256 deadline
    ) external nonReentrant returns (uint256 redDragonReceived) {
        // Transfer partner tokens from user to this contract
        partnerToken.safeTransferFrom(msg.sender, address(this), partnerTokenAmount);
        
        // Use the internal swap function
        redDragonReceived = _swapV3ForRedDragonWithJackpot(
            msg.sender,
            partnerTokenAmount,
            minRedDragonOut,
            deadline,
            address(0) // No partner
        );
        
        emit DirectSwap(
            msg.sender,
            partnerTokenAmount,
            redDragonReceived
        );
        
        return redDragonReceived;
    }
    
    /**
     * @dev Internal function to perform the swap and jackpot entry
     * This handles the consolidated Shadow V3 swap functionality for any partner token
     * @param user User address
     * @param partnerTokenAmount Amount of partner tokens
     * @param minRedDragonOut Minimum redDragon expected
     * @param deadline Transaction deadline
     * @param partner Partner address (if applicable, address(0) otherwise)
     * @return redDragonReceived Amount of redDragon received
     */
    function _swapV3ForRedDragonWithJackpot(
        address user,
        uint256 partnerTokenAmount,
        uint256 minRedDragonOut,
        uint256 deadline,
        address partner
    ) internal returns (uint256 redDragonReceived) {
        // Check specific requirements for partner tokens if needed
        // For X33, check if it's unlocked
        if (_isX33Token(address(partnerToken))) {
            require(IX33(address(partnerToken)).isUnlocked(), "x33 is currently locked");
        }
        
        // Calculate fee (6.9% of partner token amount)
        uint256 feeAmount = (partnerTokenAmount * PARTNER_FEE) / FEE_DENOMINATOR;
        
        // Amount to swap after fee
        uint256 swapAmount = partnerTokenAmount - feeAmount;
        
        // Distribute fees - 69% to jackpot, 31% to ve69LP
        uint256 jackpotAmount = (feeAmount * JACKPOT_SHARE) / 100; 
        uint256 ve69LPAmount = feeAmount - jackpotAmount; // Remainder goes to ve69LP
        
        // Transfer fees
        partnerToken.safeTransfer(jackpot, jackpotAmount);
        partnerToken.safeTransfer(ve69LP, ve69LPAmount);
        
        emit FeeDistributed(jackpotAmount, ve69LPAmount);
        
        // Create swap params
        IShadowSwapRouter.ExactInputSingleParams memory params = IShadowSwapRouter.ExactInputSingleParams({
            tokenIn: address(partnerToken),
            tokenOut: address(redDragonToken),
            fee: POOL_FEE,
            recipient: user, // Send redDragon directly to user
            deadline: deadline,
            amountIn: swapAmount,
            amountOutMinimum: minRedDragonOut,
            sqrtPriceLimitX96: 0 // No price limit
        });
        
        // Execute swap
        redDragonReceived = router.exactInputSingle(params);
        
        // Handle jackpot entry - Calculate wS equivalent for jackpot entry
        uint256 wrappedSonicEquivalent = calculateWrappedSonicEquivalent(partnerTokenAmount);
        
        // Adjust probability - since we're taking 6.9% fee instead of 10%,
        // we adjust the jackpot entry by the same proportion (69/100)
        wrappedSonicEquivalent = (wrappedSonicEquivalent * PROBABILITY_NUMERATOR) / PROBABILITY_DENOMINATOR;
        
        // Get boost multiplier if available
        uint256 boostMultiplier = 10000; // Default to 100% (no boost)
        if (address(booster) != address(0)) {
            // Use booster contract if available
            boostMultiplier = booster.calculateBoost(user);
        }
        
        // Apply boost to the base amount
        uint256 boostedAmount = (wrappedSonicEquivalent * boostMultiplier) / 10000;
        
        // Check for partner-specific probability boost
        uint256 partnerBoost = 0;
        if (partner != address(0)) {
            partnerBoost = partnerRegistry.getPartnerProbabilityBoost(partner);
            if (partnerBoost > 0) {
                uint256 partnerBoostedAmount = (wrappedSonicEquivalent * partnerBoost) / 10000;
                boostedAmount += partnerBoostedAmount;
            }
        }
        
        // Enter jackpot with boosted amount
        IJackpot(jackpot).enterJackpotWithWrappedSonic(user, boostedAmount);
        
        emit ShadowSwap(
            user,
            partnerTokenAmount,
            redDragonReceived,
            boostedAmount,
            feeAmount
        );
        
        return redDragonReceived;
    }
    
    /**
     * @dev Update partner token
     * @param _newPartnerToken New partner token address
     */
    function updatePartnerToken(address _newPartnerToken) external onlyOwner {
        require(_newPartnerToken != address(0), "Partner token cannot be zero address");
        
        // Revoke previous approval
        partnerToken.safeApprove(address(router), 0);
        
        // Update token
        partnerToken = IERC20(_newPartnerToken);
        
        // Set new approval
        partnerToken.safeApprove(address(router), type(uint256).max);
        
        // Update shadow references if needed
        if (_isX33Token(_newPartnerToken)) {
            xShadowToken = IX33(_newPartnerToken).asset();
            shadowToken = IXShadow(xShadowToken).SHADOW();
        } else {
            // Clear references if not x33
            xShadowToken = address(0);
            shadowToken = address(0);
        }
    }
    
    /**
     * @dev Calculate how much wrapped Sonic the partner token is worth
     * @param partnerTokenAmount Amount of partner tokens
     * @return wrappedSonicEquivalent Equivalent wrapped Sonic amount
     */
    function calculateWrappedSonicEquivalent(uint256 partnerTokenAmount) public view returns (uint256) {
        if (priceMethod == PriceMethod.MANUAL) {
            // Use manually set ratio
            return (partnerTokenAmount * manualRatio) / 1e18;
        } 
        else if (_isX33Token(address(partnerToken)) && priceMethod == PriceMethod.CONTRACT_RATIOS) {
            // Use contract's ratio functions for accurate conversion (only for x33)
            try this.getPartnerTokenToWrappedSonicViaContractRatios(partnerTokenAmount) returns (uint256 wrappedSonicAmount) {
                return wrappedSonicAmount;
            } catch {
                // Fallback to manual ratio
                return (partnerTokenAmount * manualRatio) / 1e18;
            }
        }
        else if (priceMethod == PriceMethod.MULTI_ROUTE) {
            // Try multiple routes and average the results
            uint256 totalRoutes = 0;
            uint256 totalAmount = 0;
            
            // Try direct quote
            try quoter.quoteExactInputSingle(
                address(partnerToken),
                address(wrappedSonicToken),
                POOL_FEE,
                partnerTokenAmount,
                0
            ) returns (uint256 wrappedSonicAmount) {
                totalAmount += wrappedSonicAmount;
                totalRoutes++;
            } catch {}
            
            // Try contract ratios route if token is x33
            if (_isX33Token(address(partnerToken))) {
                try this.getPartnerTokenToWrappedSonicViaContractRatios(partnerTokenAmount) returns (uint256 wrappedSonicAmount) {
                    totalAmount += wrappedSonicAmount;
                    totalRoutes++;
                } catch {}
            }
            
            // Return average if we have any routes, otherwise fallback to manual
            if (totalRoutes > 0) {
                return totalAmount / totalRoutes;
            } else {
                return (partnerTokenAmount * manualRatio) / 1e18;
            }
        }
        
        // Default fallback to manual ratio
        return (partnerTokenAmount * manualRatio) / 1e18;
    }
    
    /**
     * @dev Calculate partner token to wrapped Sonic conversion using contract ratio functions
     * This method only works with x33 as partner token
     * @param partnerTokenAmount Amount of partner tokens
     * @return wrappedSonicAmount Equivalent wrapped Sonic amount
     */
    function getPartnerTokenToWrappedSonicViaContractRatios(uint256 partnerTokenAmount) external view returns (uint256 wrappedSonicAmount) {
        require(_isX33Token(address(partnerToken)), "This method only works with x33 token");
        
        // Step 1: Calculate how much xSHADOW the x33 represents
        // x33 is ERC4626 and ratio() returns the x33:xSHADOW ratio
        uint256 x33ToXShadowRatio = IX33(address(partnerToken)).ratio();
        uint256 xShadowAmount = (partnerTokenAmount * x33ToXShadowRatio) / 1e18;
        
        // Step 2: Calculate how much SHADOW the xSHADOW represents
        uint256 xShadowToShadowRatio = IXShadow(xShadowToken).ratio();
        uint256 shadowAmount = (xShadowAmount * xShadowToShadowRatio) / 1e18;
        
        // Step 3: Calculate SHADOW to wrapped Sonic conversion using DEX prices
        try quoter.quoteExactInputSingle(
            shadowToken,
            address(wrappedSonicToken),
            POOL_FEE,
            shadowAmount,
            0
        ) returns (uint256 amount) {
            wrappedSonicAmount = amount;
        } catch {
            revert("Cannot get SHADOW to wrapped Sonic price");
        }
        
        return wrappedSonicAmount;
    }
    
    /**
     * @dev Get an estimate of how much redDragon will be received for partner tokens after fees
     * Also estimates the boosted wrapped Sonic equivalent for jackpot entry
     * @param partnerTokenAmount Amount of partner tokens
     * @param user Address of the user (for boost calculation)
     * @param partner Address of the partner (optional, for probability boost calculation)
     * @return redDragonAmount Estimated redDragon amount
     * @return wrappedSonicEquivalentForJackpot Estimated wrapped Sonic equivalent for jackpot entry (with boost)
     * @return boostMultiplier The calculated boost multiplier
     */
    function estimateOutputsWithBoostAndPartner(
        uint256 partnerTokenAmount,
        address user,
        address partner
    ) external view returns (
        uint256 redDragonAmount, 
        uint256 wrappedSonicEquivalentForJackpot,
        uint256 boostMultiplier
    ) {
        // Check specific requirements for partner tokens if needed
        // For X33, check if it's unlocked
        if (_isX33Token(address(partnerToken))) {
            if (!IX33(address(partnerToken)).isUnlocked()) {
                return (0, 0, 10000); // 100% = no boost
            }
        }
        
        // Calculate fee (6.9% of partner token amount)
        uint256 feeAmount = (partnerTokenAmount * PARTNER_FEE) / FEE_DENOMINATOR;
        
        // Amount to swap after fee
        uint256 swapAmount = partnerTokenAmount - feeAmount;
        
        // Get estimated redDragon output
        try quoter.quoteExactInputSingle(
            address(partnerToken),
            address(redDragonToken),
            POOL_FEE,
            swapAmount,
            0
        ) returns (uint256 output) {
            redDragonAmount = output;
        } catch {
            // Fallback to a simple estimate if quote fails
            redDragonAmount = swapAmount; // 1:1 approximation
        }
        
        // Calculate wrapped Sonic equivalent with fee adjustment
        uint256 wrappedSonicEquivalent = calculateWrappedSonicEquivalent(partnerTokenAmount);
        wrappedSonicEquivalent = (wrappedSonicEquivalent * PROBABILITY_NUMERATOR) / PROBABILITY_DENOMINATOR;
        
        // Get boost from booster contract if available
        boostMultiplier = 10000; // Default to 100% (no boost)
        if (address(booster) != address(0)) {
            boostMultiplier = booster.calculateBoost(user);
        }
        
        // Apply ve69LP boost to the base amount
        uint256 ve69LPBoostedAmount = (wrappedSonicEquivalent * boostMultiplier) / 10000;
        
        // Apply probability boost if partner is specified
        uint256 partnerBoostedAmount = 0;
        if (partner != address(0)) {
            uint256 probabilityBoost = partnerRegistry.getPartnerProbabilityBoost(partner);
            
            if (probabilityBoost > 0) {
                // Calculate additional boost amount
                partnerBoostedAmount = (wrappedSonicEquivalent * probabilityBoost) / 10000;
            }
        }
        
        // Combine the two boost components (additive, not multiplicative)
        wrappedSonicEquivalentForJackpot = ve69LPBoostedAmount + partnerBoostedAmount;
        
        return (redDragonAmount, wrappedSonicEquivalentForJackpot, boostMultiplier);
    }
    
    /**
     * @dev Update contract addresses
     * @param _router New ShadowDex router address
     * @param _quoter New ShadowDex quoter address
     * @param _jackpot New jackpot address
     * @param _ve69LP New ve69LP address
     * @param _booster New boost calculator address
     */
    function setContracts(
        address _router,
        address _quoter,
        address _jackpot,
        address _ve69LP,
        address _booster
    ) external onlyOwner {
        require(_router != address(0), "Router cannot be zero");
        require(_quoter != address(0), "Quoter cannot be zero");
        require(_jackpot != address(0), "Jackpot cannot be zero");
        require(_ve69LP != address(0), "ve69LP cannot be zero");
        
        // If router changes, update approvals
        if (_router != address(router)) {
            // Revoke previous approval
            partnerToken.safeApprove(address(router), 0);
            // Add new approval
            partnerToken.safeApprove(_router, type(uint256).max);
        }
        
        router = IShadowSwapRouter(_router);
        quoter = IShadowQuoter(_quoter);
        jackpot = _jackpot;
        ve69LP = _ve69LP;
        booster = Ive69LPBoost(_booster);
    }
    
    /**
     * @dev Update the manual partner token to wrapped Sonic conversion ratio
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
     * @dev Emergency token recovery
     * @param token Token to recover
     * @param amount Amount to recover
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

/**
 * @dev Interface for x33 token
 */
interface IX33 {
    function ratio() external view returns (uint256);
    function isUnlocked() external view returns (bool);
    function asset() external view returns (address);
}

/**
 * @dev Interface for xSHADOW token
 */
interface IXShadow {
    function SHADOW() external view returns (address);
    function ratio() external view returns (uint256);
} 