// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IBalancerVault.sol";
import "./interfaces/IBalancerPool.sol";
import "./interfaces/IDragonExchangePair.sol";
import "./Dragon.sol";

/**
 * @title DragonExchangeAdapter
 * @dev Unified adapter for Dragon token swaps using Balancer/Beets pools
 * Handles fee distribution according to Dragon tokenomics:
 * - 0.69% burn fee
 * - 6.9% to jackpot
 * - 2.41% to ve69LP
 */
contract DragonExchangeAdapter is IDragonExchangePair, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Tokens and contracts
    IERC20 public immutable wsToken;
    Dragon public immutable dragonToken;
    IBalancerVault public immutable vault;
    bytes32 public immutable poolId;
    IERC20 public immutable bptToken;
    address public jackpotAddress;
    address public ve69LPAddress;
    address public immutable burnAddress;
    
    // Constants
    uint256 private constant FEE_DENOMINATOR = 10000;
    uint256 private constant BURN_FEE = 69;       // 0.69%
    uint256 private constant JACKPOT_FEE = 690;   // 6.9%
    uint256 private constant VE69LP_FEE = 241;    // 2.41%
    
    // 69/31 pool weights (normalized to 1e18 scale)
    uint256 public constant DRAGON_WEIGHT = 690000000000000000; // 69%
    uint256 public constant WS_WEIGHT = 310000000000000000; // 31%
    
    // Events
    event WSSwappedForDragon(address indexed user, uint256 wsAmount, uint256 dragonAmount);
    event DragonSwappedForWS(address indexed user, uint256 dragonAmount, uint256 wsAmount);
    event LiquidityAdded(address indexed user, uint256 wsAmount, uint256 dragonAmount, uint256 bptAmount);
    event LiquidityRemoved(address indexed user, uint256 bptAmount, uint256 wsAmount, uint256 dragonAmount);
    event JackpotAddressUpdated(address newAddress);
    event ve69LPAddressUpdated(address newAddress);
    
    /**
     * @dev Constructor
     * @param _wsToken Address of the Wrapped Sonic token
     * @param _dragonToken Address of the DRAGON token
     * @param _vault Address of the Balancer Vault
     * @param _poolId Bytes32 pool ID of the DRAGON/wS pool
     * @param _bptToken Address of the Balancer Pool Token (BPT)
     * @param _jackpotAddress Address to receive jackpot fees
     * @param _ve69LPAddress Address to receive ve69LP fees
     * @param _setAsExchangePair Whether to set this as the official exchange pair for Dragon token
     */
    constructor(
        address _wsToken,
        address _dragonToken,
        address _vault,
        bytes32 _poolId,
        address _bptToken,
        address _jackpotAddress,
        address _ve69LPAddress,
        bool _setAsExchangePair
    ) {
        require(_wsToken != address(0), "WS token cannot be zero address");
        require(_dragonToken != address(0), "DRAGON token cannot be zero address");
        require(_vault != address(0), "Vault cannot be zero address");
        require(_bptToken != address(0), "BPT token cannot be zero address");
        require(_jackpotAddress != address(0), "Jackpot address cannot be zero");
        require(_ve69LPAddress != address(0), "ve69LP address cannot be zero");
        
        wsToken = IERC20(_wsToken);
        dragonToken = Dragon(_dragonToken);
        vault = IBalancerVault(_vault);
        poolId = _poolId;
        bptToken = IERC20(_bptToken);
        jackpotAddress = _jackpotAddress;
        ve69LPAddress = _ve69LPAddress;
        burnAddress = address(0x000000000000000000000000000000000000dEaD);
        
        // Set this adapter as the exchange pair for Dragon token if requested
        if (_setAsExchangePair) {
            dragonToken.setExchangePair(address(this));
        }
        
        // Approve vault to use tokens
        wsToken.safeApprove(_vault, type(uint256).max);
        IERC20(_dragonToken).approve(_vault, type(uint256).max);
    }
    
    /**
     * @dev Swap wrapped Sonic tokens for $DRAGON tokens
     * Applies the fee structure:
     * - 9.31% of input wrapped Sonic taken as fees (6.9% to jackpot, 2.41% to ve69LP)
     * - 0.69% of output $DRAGON tokens burned
     * @param user Address of the user swapping
     * @param wrappedSonicAmount Amount of wrapped Sonic tokens being swapped
     * @return dragonAmount Amount of $DRAGON tokens returned to user
     */
    function swapWrappedSonicForDragon(address user, uint256 wrappedSonicAmount) external override nonReentrant returns (uint256 dragonAmount) {
        require(wrappedSonicAmount > 0, "Amount must be greater than zero");
        
        // Transfer wS tokens from user to this contract
        wsToken.safeTransferFrom(user, address(this), wrappedSonicAmount);
        
        // Calculate fee amounts
        uint256 jackpotFeeAmount = (wrappedSonicAmount * JACKPOT_FEE) / FEE_DENOMINATOR;
        uint256 ve69LPFeeAmount = (wrappedSonicAmount * VE69LP_FEE) / FEE_DENOMINATOR;
        uint256 totalFeeAmount = jackpotFeeAmount + ve69LPFeeAmount;
        uint256 swapAmount = wrappedSonicAmount - totalFeeAmount;
        
        // Send fee amounts to their respective addresses
        wsToken.safeTransfer(jackpotAddress, jackpotFeeAmount);
        wsToken.safeTransfer(ve69LPAddress, ve69LPFeeAmount);
        
        // Create swap parameters
        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: address(wsToken),
            assetOut: address(dragonToken),
            amount: swapAmount,
            userData: ""
        });
        
        // Create fund management parameters
        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });
        
        // Minimum amount out (1% slippage)
        uint256 minOutAmount = estimateWSForDragonAmount(swapAmount) * 99 / 100;
        
        // Execute the swap
        uint256 dragonsReceived = vault.swap(
            singleSwap,
            funds,
            minOutAmount,
            block.timestamp + 300
        );
        
        // Calculate and burn DRAGON tokens (0.69% of output)
        uint256 burnAmount = (dragonsReceived * BURN_FEE) / FEE_DENOMINATOR;
        uint256 userAmount = dragonsReceived - burnAmount;
        
        // Send DRAGON tokens to burn address
        dragonToken.transfer(burnAddress, burnAmount);
        
        // Transfer remaining DRAGON tokens to user
        dragonToken.transfer(user, userAmount);
        
        // Notify lottery if needed
        if (address(dragonToken.lotteryAddress()) != address(0) && user == tx.origin) {
            try IDragonLotterySwap(dragonToken.lotteryAddress()).processBuy(user, wrappedSonicAmount) {} catch {}
        }
        
        emit WSSwappedForDragon(user, wrappedSonicAmount, userAmount);
        return userAmount;
    }
    
    /**
     * @dev Swap $DRAGON tokens for wrapped Sonic tokens
     * Applies the fee structure:
     * - 0.69% of input $DRAGON tokens burned
     * - 9.31% of resulting wrapped Sonic taken as fees (6.9% to jackpot, 2.41% to ve69LP)
     * @param user Address of the user swapping
     * @param dragonAmount Amount of $DRAGON tokens being swapped
     * @return wrappedSonicAmount Amount of wrapped Sonic tokens returned to user
     */
    function swapDragonForWrappedSonic(address user, uint256 dragonAmount) external override nonReentrant returns (uint256 wrappedSonicAmount) {
        require(dragonAmount > 0, "DRAGON amount must be greater than zero");
        
        // Transfer DRAGON tokens from user to this contract
        dragonToken.transferFrom(user, address(this), dragonAmount);
        
        // Calculate and handle burn fee (0.69%)
        uint256 burnAmount = (dragonAmount * BURN_FEE) / FEE_DENOMINATOR;
        uint256 swapAmount = dragonAmount - burnAmount;
        
        // Send DRAGON tokens to burn address
        dragonToken.transfer(burnAddress, burnAmount);
        
        // Create swap parameters
        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: address(dragonToken),
            assetOut: address(wsToken),
            amount: swapAmount,
            userData: ""
        });
        
        // Create fund management parameters
        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });
        
        // Minimum amount out (1% slippage)
        uint256 minOutAmount = estimateDragonForWSAmount(swapAmount) * 99 / 100;
        
        // Execute the swap
        uint256 wsReceived = vault.swap(
            singleSwap,
            funds,
            minOutAmount,
            block.timestamp + 300
        );
        
        // Calculate fee amounts (9.31% of output)
        uint256 jackpotFeeAmount = (wsReceived * JACKPOT_FEE) / FEE_DENOMINATOR;
        uint256 ve69LPFeeAmount = (wsReceived * VE69LP_FEE) / FEE_DENOMINATOR;
        uint256 totalFeeAmount = jackpotFeeAmount + ve69LPFeeAmount;
        uint256 userAmount = wsReceived - totalFeeAmount;
        
        // Send fee amounts to their respective addresses
        wsToken.safeTransfer(jackpotAddress, jackpotFeeAmount);
        wsToken.safeTransfer(ve69LPAddress, ve69LPFeeAmount);
        
        // Transfer remaining wS tokens to user
        wsToken.safeTransfer(user, userAmount);
        
        // Notify lottery if needed
        if (address(dragonToken.lotteryAddress()) != address(0) && user == tx.origin) {
            try IDragonLotterySwap(dragonToken.lotteryAddress()).processSell(user, wsReceived) {} catch {}
        }
        
        emit DragonSwappedForWS(user, dragonAmount, userAmount);
        return userAmount;
    }
    
    /**
     * @dev Add liquidity to the exchange pair
     * @param wrappedSonicAmount Amount of wrapped Sonic tokens to add
     * @param dragonAmount Amount of $DRAGON tokens to add
     * @return lpAmount Amount of LP tokens minted to user
     */
    function addLiquidity(uint256 wrappedSonicAmount, uint256 dragonAmount) external override nonReentrant returns (uint256 lpAmount) {
        require(wrappedSonicAmount > 0 && dragonAmount > 0, "Amounts must be greater than zero");
        
        // Transfer tokens from user to this contract
        wsToken.safeTransferFrom(msg.sender, address(this), wrappedSonicAmount);
        dragonToken.transferFrom(msg.sender, address(this), dragonAmount);
        
        // Get pool tokens
        (address[] memory tokens, , ) = vault.getPoolTokens(poolId);
        
        // Create amounts array
        uint256[] memory amountsIn = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(wsToken)) {
                amountsIn[i] = wrappedSonicAmount;
            } else if (tokens[i] == address(dragonToken)) {
                amountsIn[i] = dragonAmount;
            }
        }
        
        // Create join pool request
        IBalancerVault.JoinPoolRequest memory request = IBalancerVault.JoinPoolRequest({
            assets: tokens,
            maxAmountsIn: amountsIn,
            userData: abi.encode(1, amountsIn, 0), // 1 = JOIN_KIND_EXACT_TOKENS_IN_FOR_BPT_OUT
            fromInternalBalance: false
        });
        
        // Get BPT balance before join
        uint256 balanceBefore = bptToken.balanceOf(address(this));
        
        // Join pool
        vault.joinPool(
            poolId,
            address(this),
            address(this),
            request
        );
        
        // Calculate BPT received
        uint256 balanceAfter = bptToken.balanceOf(address(this));
        lpAmount = balanceAfter - balanceBefore;
        
        // Transfer BPT to user
        bptToken.safeTransfer(msg.sender, lpAmount);
        
        emit LiquidityAdded(msg.sender, wrappedSonicAmount, dragonAmount, lpAmount);
        return lpAmount;
    }
    
    /**
     * @dev Remove liquidity from the exchange pair
     * @param lpAmount Amount of LP tokens to burn
     * @return dragonAmount Amount of $DRAGON tokens returned
     * @return wrappedSonicAmount Amount of wrapped Sonic tokens returned
     */
    function removeLiquidity(uint256 lpAmount) external override nonReentrant returns (uint256 dragonAmount, uint256 wrappedSonicAmount) {
        require(lpAmount > 0, "Liquidity must be greater than zero");
        
        // Transfer BPT tokens from user
        bptToken.safeTransferFrom(msg.sender, address(this), lpAmount);
        
        // Approve vault to use BPT
        bptToken.safeApprove(address(vault), lpAmount);
        
        // Get pool tokens
        (address[] memory tokens, , ) = vault.getPoolTokens(poolId);
        
        // Create exit pool request
        IBalancerVault.ExitPoolRequest memory request = IBalancerVault.ExitPoolRequest({
            assets: tokens,
            minAmountsOut: new uint256[](tokens.length),
            userData: abi.encode(1, lpAmount), // 1 = EXIT_KIND_EXACT_BPT_IN_FOR_TOKENS_OUT
            toInternalBalance: false
        });
        
        // Get balances before exit
        uint256 wsBalanceBefore = wsToken.balanceOf(address(this));
        uint256 dragonBalanceBefore = dragonToken.balanceOf(address(this));
        
        // Exit pool
        vault.exitPool(
            poolId,
            address(this),
            payable(address(this)),
            request
        );
        
        // Calculate tokens received
        wrappedSonicAmount = wsToken.balanceOf(address(this)) - wsBalanceBefore;
        dragonAmount = dragonToken.balanceOf(address(this)) - dragonBalanceBefore;
        
        // Transfer tokens to user
        wsToken.safeTransfer(msg.sender, wrappedSonicAmount);
        dragonToken.transfer(msg.sender, dragonAmount);
        
        emit LiquidityRemoved(msg.sender, lpAmount, wrappedSonicAmount, dragonAmount);
        return (dragonAmount, wrappedSonicAmount);
    }
    
    /**
     * @dev Get the current reserves of the pair
     * @return wsReserve Amount of wS tokens in the pool
     * @return dragonReserve Amount of DRAGON tokens in the pool
     */
    function getReserves() external view override returns (uint256 wsReserve, uint256 dragonReserve) {
        (address[] memory tokens, uint256[] memory balances, ) = vault.getPoolTokens(poolId);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(wsToken)) {
                wsReserve = balances[i];
            } else if (tokens[i] == address(dragonToken)) {
                dragonReserve = balances[i];
            }
        }
        
        return (wsReserve, dragonReserve);
    }
    
    /**
     * @dev Get the token addresses
     * @return wsAddress Address of the wS token
     * @return dragonAddress Address of the DRAGON token
     */
    function getTokens() external view override returns (address wsAddress, address dragonAddress) {
        return (address(wsToken), address(dragonToken));
    }
    
    /**
     * @dev Estimate the amount of DRAGON tokens for a given amount of wS tokens
     * @param wsAmount Amount of wS tokens to swap
     * @return dragonAmount Estimated amount of DRAGON tokens to receive
     */
    function estimateWSForDragonAmount(uint256 wsAmount) public view returns (uint256 dragonAmount) {
        if (wsAmount == 0) return 0;
        
        (uint256 wsReserve, uint256 dragonReserve) = this.getReserves();
        if (wsReserve == 0 || dragonReserve == 0) return 0;
        
        // Using weighted pool formula
        uint256 numerator = dragonReserve * WS_WEIGHT;
        uint256 denominator = wsReserve * DRAGON_WEIGHT;
        uint256 spotPrice = numerator * 1e18 / denominator;
        
        return wsAmount * spotPrice / 1e18;
    }
    
    /**
     * @dev Estimate the amount of wS tokens for a given amount of DRAGON tokens
     * @param dragonAmount Amount of DRAGON tokens to swap
     * @return wsAmount Estimated amount of wS tokens to receive
     */
    function estimateDragonForWSAmount(uint256 dragonAmount) public view returns (uint256 wsAmount) {
        if (dragonAmount == 0) return 0;
        
        (uint256 wsReserve, uint256 dragonReserve) = this.getReserves();
        if (wsReserve == 0 || dragonReserve == 0) return 0;
        
        // Using weighted pool formula
        uint256 numerator = wsReserve * DRAGON_WEIGHT;
        uint256 denominator = dragonReserve * WS_WEIGHT;
        uint256 spotPrice = numerator * 1e18 / denominator;
        
        return dragonAmount * spotPrice / 1e18;
    }
    
    /**
     * @dev Set this contract as the exchange pair for the Dragon token
     * This allows the contract to handle swaps for the DRAGON token
     */
    function setAsExchangePair() external onlyOwner {
        dragonToken.setExchangePair(address(this));
    }
    
    /**
     * @dev Update the jackpot address
     * @param _jackpotAddress New jackpot address
     */
    function setJackpotAddress(address _jackpotAddress) external onlyOwner {
        require(_jackpotAddress != address(0), "Jackpot address cannot be zero");
        jackpotAddress = _jackpotAddress;
        emit JackpotAddressUpdated(_jackpotAddress);
    }
    
    /**
     * @dev Update the ve69LP address
     * @param _ve69LPAddress New ve69LP address
     */
    function setve69LPAddress(address _ve69LPAddress) external onlyOwner {
        require(_ve69LPAddress != address(0), "ve69LP address cannot be zero");
        ve69LPAddress = _ve69LPAddress;
        emit ve69LPAddressUpdated(_ve69LPAddress);
    }
    
    /**
     * @dev Rescue tokens that might get stuck in this contract
     * @param token Address of the token to rescue
     * @param amount Amount of tokens to rescue
     */
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
} 