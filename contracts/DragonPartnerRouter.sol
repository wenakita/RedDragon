// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IJackpot.sol";
import "./interfaces/Ive69LPBoost.sol";
import "./interfaces/IDragonPartnerAdapter.sol";
import "./DragonPartnerRegistry.sol";

/**
 * @title DragonPartnerRouter
 * @dev Routes trades through partners with fee sharing
 * Integrates with DragonShadowV3Swapper for UniV3-style swaps
 */
contract DragonPartnerRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Partner registry
    DragonPartnerRegistry public partnerRegistry;
    
    // Swap Contracts
    address public shadowSwapper; // DragonShadowV3Swapper
    address public jackpot;       // Jackpot address for fee distribution

    // Tokens
    IERC20 public beetsLpToken;
    IERC20 public x33Token;
    
    // Fee calculation constants
    uint256 public constant FEE_DENOMINATOR = 10000; // 100% in basis points
    uint256 public constant BASE_FEE = 69; // 0.69% base fee (in basis points of 10000)
    
    // Events
    event PartnerSwap(
        address indexed partner,
        address indexed user,
        uint256 partnerId,
        uint256 x33Amount,
        uint256 partnerFeeAmount,
        uint256 beetsLpReceived
    );
    event DirectSwap(
        address indexed user,
        uint256 x33Amount,
        uint256 beetsLpReceived
    );
    event ContractsSet(
        address shadowSwapper,
        address jackpot
    );
    
    /**
     * @dev Constructor
     * @param _partnerRegistry Registry of partners
     * @param _shadowSwapper ShadowDex swapper contract
     * @param _jackpot Jackpot address
     * @param _beetsLpToken BeetsLP token address
     * @param _x33Token x33 token address
     */
    constructor(
        address _partnerRegistry,
        address _shadowSwapper,
        address _jackpot,
        address _beetsLpToken,
        address _x33Token
    ) {
        partnerRegistry = DragonPartnerRegistry(_partnerRegistry);
        shadowSwapper = _shadowSwapper;
        jackpot = _jackpot;
        beetsLpToken = IERC20(_beetsLpToken);
        x33Token = IERC20(_x33Token);
        
        // Approve tokens
        x33Token.safeApprove(_shadowSwapper, type(uint256).max);
    }
    
    /**
     * @dev Swap x33 tokens for BeetsLP through a partner
     * @param x33Amount Amount of x33 tokens to swap
     * @param minBeetsLpOut Minimum BeetsLP to receive (slippage protection)
     * @param deadline Transaction deadline
     * @param partnerId ID of the partner in the registry
     * @return beetsLpReceived Amount of BeetsLP tokens received
     */
    function swapX33ForBeetsLPWithPartner(
        uint256 x33Amount,
        uint256 minBeetsLpOut,
        uint256 deadline,
        uint256 partnerId
    ) external nonReentrant returns (uint256 beetsLpReceived) {
        // Get partner info
        (address partnerAddress, , uint256 feeShare, bool isActive, ) = partnerRegistry.getPartner(partnerId);
        require(partnerAddress != address(0), "Partner does not exist");
        require(isActive, "Partner is not active");
        
        // Transfer x33 from user to this contract
        x33Token.safeTransferFrom(msg.sender, address(this), x33Amount);
        
        // Calculate partner fee (partner gets their share of the 0.69% base fee)
        uint256 totalFeeAmount = (x33Amount * BASE_FEE) / FEE_DENOMINATOR;
        uint256 partnerFeeAmount = (totalFeeAmount * feeShare) / FEE_DENOMINATOR;
        uint256 remainingAmount = x33Amount - partnerFeeAmount;
        
        // Send partner fee if non-zero
        if (partnerFeeAmount > 0) {
            x33Token.safeTransfer(partnerAddress, partnerFeeAmount);
            partnerRegistry.recordFeeDistribution(partnerId, address(x33Token), partnerFeeAmount);
        }
        
        // Delegate remaining amount to the ShadowSwapper
        if (remainingAmount > 0) {
            // Use interface to call the swapper
            beetsLpReceived = IDragonShadowV3Swapper(shadowSwapper).partnerSwapX33ForBeetsLPWithJackpot(
                msg.sender,  // Original user is the recipient
                remainingAmount,
                minBeetsLpOut,
                deadline
            );
        }
        
        emit PartnerSwap(
            partnerAddress,
            msg.sender,
            partnerId,
            x33Amount,
            partnerFeeAmount,
            beetsLpReceived
        );
        
        return beetsLpReceived;
    }
    
    /**
     * @dev Direct swap without partner
     * @param x33Amount Amount of x33 tokens to swap
     * @param minBeetsLpOut Minimum BeetsLP to receive (slippage protection)
     * @param deadline Transaction deadline
     * @return beetsLpReceived Amount of BeetsLP tokens received
     */
    function swapX33ForBeetsLP(
        uint256 x33Amount,
        uint256 minBeetsLpOut,
        uint256 deadline
    ) external nonReentrant returns (uint256 beetsLpReceived) {
        // Transfer x33 from user to this contract
        x33Token.safeTransferFrom(msg.sender, address(this), x33Amount);
        
        // Use the swapper directly
        beetsLpReceived = IDragonShadowV3Swapper(shadowSwapper).partnerSwapX33ForBeetsLPWithJackpot(
            msg.sender, // Original user
            x33Amount,
            minBeetsLpOut,
            deadline
        );
        
        emit DirectSwap(
            msg.sender,
            x33Amount,
            beetsLpReceived
        );
        
        return beetsLpReceived;
    }
    
    /**
     * @dev Update contract addresses
     * @param _shadowSwapper New ShadowDex swapper address
     * @param _jackpot New jackpot address
     */
    function setContracts(
        address _shadowSwapper,
        address _jackpot
    ) external onlyOwner {
        require(_shadowSwapper != address(0), "Shadow swapper cannot be zero");
        require(_jackpot != address(0), "Jackpot cannot be zero");
        
        // If swapper changes, update approvals
        if (_shadowSwapper != shadowSwapper) {
            // Revoke previous approval
            x33Token.safeApprove(shadowSwapper, 0);
            // Add new approval
            x33Token.safeApprove(_shadowSwapper, type(uint256).max);
        }
        
        shadowSwapper = _shadowSwapper;
        jackpot = _jackpot;
        
        emit ContractsSet(_shadowSwapper, _jackpot);
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
 * @dev Interface for DragonShadowV3Swapper
 */
interface IDragonShadowV3Swapper {
    function partnerSwapX33ForBeetsLPWithJackpot(
        address user,
        uint256 x33Amount,
        uint256 minBeetsLpOut,
        uint256 deadline
    ) external returns (uint256 beetsLpReceived);
} 