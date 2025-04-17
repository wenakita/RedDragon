// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IDragonExchangePair.sol";
import "./Dragon.sol";
import "./interfaces/IBalancerVault.sol";
import "./interfaces/IBalancerPool.sol";

/**
 * @title DragonBeetsAdapter
 * @dev Integration adapter for Dragon token with Beethoven X (Balancer) 69/31 pools
 * Handles the fee distribution during swaps according to the defined tokenomics
 */
contract DragonBeetsAdapter is IDragonExchangePair, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Tokens
    IERC20 public wsToken;
    Dragon public dragonToken;
    
    // Balancer/Beets integration
    IBalancerVault public balancerVault;
    IBalancerPool public poolToken;
    bytes32 public poolId;
    
    // Jackpot and ve6931 addresses for fee distribution
    address public jackpotAddress;
    address public ve6931Address;
    
    // 69/31 pool weights (normalized to 1e18 scale)
    uint256 public constant DRAGON_WEIGHT = 690000000000000000; // 69%
    uint256 public constant WS_WEIGHT = 310000000000000000; // 31%
    
    // Events
    event Swap(address indexed user, uint256 wsAmount, uint256 dragonAmount, bool isWSForDragon);
    event LiquidityAdded(address indexed user, uint256 wsAmount, uint256 dragonAmount, uint256 liquidity);
    event LiquidityRemoved(address indexed user, uint256 wsAmount, uint256 dragonAmount, uint256 liquidity);
    
    /**
     * @dev Constructor to initialize the Beets/Balancer adapter
     * @param _wsToken Address of the $wS token
     * @param _dragonToken Address of the $DRAGON token
     * @param _balancerVault Address of the Balancer Vault
     * @param _poolId Balancer pool ID for the 69/31 pool (69% DRAGON, 31% wS)
     * @param _poolToken Address of the Balancer Pool Token (BPT)
     * @param _jackpotAddress Address for jackpot fees
     * @param _ve6931Address Address for ve6931 fees
     */
    constructor(
        address _wsToken,
        address _dragonToken,
        address _balancerVault,
        bytes32 _poolId,
        address _poolToken,
        address _jackpotAddress,
        address _ve6931Address
    ) {
        require(_wsToken != address(0), "WS token cannot be zero address");
        require(_dragonToken != address(0), "DRAGON token cannot be zero address");
        require(_balancerVault != address(0), "Balancer vault cannot be zero");
        require(_poolToken != address(0), "Pool token cannot be zero");
        require(_jackpotAddress != address(0), "Jackpot address cannot be zero");
        require(_ve6931Address != address(0), "Ve6931 address cannot be zero");
        
        wsToken = IERC20(_wsToken);
        dragonToken = Dragon(_dragonToken);
        balancerVault = IBalancerVault(_balancerVault);
        poolId = _poolId;
        poolToken = IBalancerPool(_poolToken);
        jackpotAddress = _jackpotAddress;
        ve6931Address = _ve6931Address;
        
        // Set this adapter in the Dragon token
        dragonToken.setExchangePair(address(this));
        
        // Approve tokens for the Balancer Vault
        wsToken.safeApprove(_balancerVault, type(uint256).max);
        IERC20(_dragonToken).approve(_balancerVault, type(uint256).max);
    }
    
    /**
     * @dev Swap $wS tokens for $DRAGON tokens using Beethoven X
     * Implements the complete fee structure through the Dragon token's handler
     */
    function swapWSForDragon(address user, uint256 wsAmount) external override nonReentrant returns (uint256 dragonAmount) {
        require(wsAmount > 0, "WS amount must be greater than zero");
        
        // Take fees from the $wS input (9.31%)
        uint256 wsJackpotFee = (wsAmount * 690) / 10000; // 6.9%
        uint256 wsVe6931Fee = (wsAmount * 241) / 10000;  // 2.41%
        uint256 wsTotalFee = wsJackpotFee + wsVe6931Fee; // 9.31%
        uint256 wsSwapAmount = wsAmount - wsTotalFee;
        
        // Transfer $wS tokens from user to this contract
        wsToken.safeTransferFrom(user, address(this), wsAmount);
        
        // Distribute $wS fees
        if (wsJackpotFee > 0) {
            wsToken.safeTransfer(jackpotAddress, wsJackpotFee);
            
            // Notify lottery if needed
            if (address(dragonToken.lotteryAddress()) != address(0)) {
                try IDragonLotterySwap(dragonToken.lotteryAddress()).addToJackpot(wsJackpotFee) {} catch {}
            }
        }
        
        if (wsVe6931Fee > 0) {
            wsToken.safeTransfer(ve6931Address, wsVe6931Fee);
        }
        
        // Set up Balancer swap
        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: address(wsToken),
            assetOut: address(dragonToken),
            amount: wsSwapAmount,
            userData: bytes("")
        });
        
        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });
        
        // Minimum amount out (1% slippage)
        uint256 minOutAmount = estimateWSForDragonAmount(wsSwapAmount) * 99 / 100;
        
        // Execute the swap
        dragonAmount = balancerVault.swap(
            singleSwap,
            funds,
            minOutAmount,
            block.timestamp + 300
        );
        
        // Apply burn fee (0.69%)
        uint256 burnAmount = (dragonAmount * 69) / 10000;
        uint256 userAmount = dragonAmount - burnAmount;
        
        // Burn DRAGON tokens
        dragonToken.burn(burnAmount);
        
        // Transfer remaining DRAGON to user
        dragonToken.transfer(user, userAmount);
        
        // Handle lottery entry for user if needed
        if (address(dragonToken.lotteryAddress()) != address(0) && user == tx.origin) {
            try IDragonLotterySwap(dragonToken.lotteryAddress()).processBuy(user, wsAmount) {} catch {}
        }
        
        emit Swap(user, wsAmount, userAmount, true);
        return userAmount;
    }
    
    /**
     * @dev Swap $DRAGON tokens for $wS tokens using Beethoven X
     * Implements the complete fee structure through the Dragon token's handler
     */
    function swapDragonForWS(address user, uint256 dragonAmount) external override nonReentrant returns (uint256 wsAmount) {
        require(dragonAmount > 0, "DRAGON amount must be greater than zero");
        
        // Apply burn fee first (0.69%)
        uint256 burnAmount = (dragonAmount * 69) / 10000;
        uint256 swapAmount = dragonAmount - burnAmount;
        
        // Transfer DRAGON tokens from user to this contract
        dragonToken.transferFrom(user, address(this), dragonAmount);
        
        // Burn DRAGON tokens
        dragonToken.burn(burnAmount);
        
        // Set up Balancer swap
        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: address(dragonToken),
            assetOut: address(wsToken),
            amount: swapAmount,
            userData: bytes("")
        });
        
        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });
        
        // Minimum amount out (1% slippage)
        uint256 minOutAmount = estimateDragonForWSAmount(swapAmount) * 99 / 100;
        
        // Execute the swap
        wsAmount = balancerVault.swap(
            singleSwap,
            funds,
            minOutAmount,
            block.timestamp + 300
        );
        
        // Calculate $wS fees from the swap result (9.31%)
        uint256 wsJackpotFee = (wsAmount * 690) / 10000; // 6.9%
        uint256 wsVe6931Fee = (wsAmount * 241) / 10000;  // 2.41%
        uint256 wsTotalFee = wsJackpotFee + wsVe6931Fee; // 9.31%
        uint256 userWsAmount = wsAmount - wsTotalFee;
        
        // Distribute $wS fees
        if (wsJackpotFee > 0) {
            wsToken.safeTransfer(jackpotAddress, wsJackpotFee);
            
            // Notify lottery if needed
            if (address(dragonToken.lotteryAddress()) != address(0)) {
                try IDragonLotterySwap(dragonToken.lotteryAddress()).addToJackpot(wsJackpotFee) {} catch {}
            }
        }
        
        if (wsVe6931Fee > 0) {
            wsToken.safeTransfer(ve6931Address, wsVe6931Fee);
        }
        
        // Transfer remaining $wS to user
        wsToken.safeTransfer(user, userWsAmount);
        
        // Handle lottery sell event if needed
        if (address(dragonToken.lotteryAddress()) != address(0) && user == tx.origin) {
            try IDragonLotterySwap(dragonToken.lotteryAddress()).processSell(user, wsAmount) {} catch {}
        }
        
        emit Swap(user, userWsAmount, dragonAmount, false);
        return userWsAmount;
    }
    
    /**
     * @dev Add liquidity to the Balancer 69/31 pool
     */
    function addLiquidity(
        uint256 wsAmount, 
        uint256 dragonAmount, 
        address user
    ) external override nonReentrant returns (uint256 liquidity) {
        require(wsAmount > 0 && dragonAmount > 0, "Amounts must be greater than zero");
        
        // Transfer tokens from user to this contract
        wsToken.safeTransferFrom(user, address(this), wsAmount);
        dragonToken.transferFrom(user, address(this), dragonAmount);
        
        // Set up the max amounts array for join
        (address[] memory tokens, , ) = balancerVault.getPoolTokens(poolId);
        uint256[] memory maxAmountsIn = new uint256[](tokens.length);
        
        // Match token addresses to the right positions in the array
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(wsToken)) {
                maxAmountsIn[i] = wsAmount;
            } else if (tokens[i] == address(dragonToken)) {
                maxAmountsIn[i] = dragonAmount;
            }
        }
        
        // Calculate amount of BPT to mint (Beethoven X exact tokens in for BPT out)
        bytes memory userData = abi.encode(
            IBalancerVault.JoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT,
            maxAmountsIn,
            0 // minBPTOut - will be calculated later
        );
        
        IBalancerVault.JoinPoolRequest memory request = IBalancerVault.JoinPoolRequest({
            assets: tokens,
            maxAmountsIn: maxAmountsIn,
            userData: userData,
            fromInternalBalance: false
        });
        
        // Get initial BPT balance
        uint256 bptBefore = IERC20(address(poolToken)).balanceOf(address(this));
        
        // Execute the join
        balancerVault.joinPool(
            poolId,
            address(this),
            address(this),
            request
        );
        
        // Calculate how much BPT we received
        uint256 bptAfter = IERC20(address(poolToken)).balanceOf(address(this));
        liquidity = bptAfter - bptBefore;
        
        // Transfer BPT tokens to user
        IERC20(address(poolToken)).transfer(user, liquidity);
        
        emit LiquidityAdded(user, wsAmount, dragonAmount, liquidity);
        return liquidity;
    }
    
    /**
     * @dev Remove liquidity from the Balancer 69/31 pool
     */
    function removeLiquidity(
        uint256 liquidity, 
        address user
    ) external override nonReentrant returns (uint256 wsAmount, uint256 dragonAmount) {
        require(liquidity > 0, "Liquidity must be greater than zero");
        
        // Transfer BPT tokens from user to this contract
        IERC20(address(poolToken)).transferFrom(user, address(this), liquidity);
        
        // Get tokens in the pool
        (address[] memory tokens, , ) = balancerVault.getPoolTokens(poolId);
        
        // Set up the min amounts out array for exit
        uint256[] memory minAmountsOut = new uint256[](tokens.length);
        
        // We'll calculate proper min amounts in a real implementation
        // Here using 0 for simplicity
        
        // BPT in for exact tokens out (proportional exit)
        bytes memory userData = abi.encode(
            IBalancerVault.ExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT,
            liquidity
        );
        
        IBalancerVault.ExitPoolRequest memory request = IBalancerVault.ExitPoolRequest({
            assets: tokens,
            minAmountsOut: minAmountsOut,
            userData: userData,
            toInternalBalance: false
        });
        
        // Get initial token balances
        uint256 wsBefore = wsToken.balanceOf(address(this));
        uint256 dragonBefore = dragonToken.balanceOf(address(this));
        
        // Execute the exit
        balancerVault.exitPool(
            poolId,
            address(this),
            payable(address(this)),
            request
        );
        
        // Calculate how much of each token we received
        wsAmount = wsToken.balanceOf(address(this)) - wsBefore;
        dragonAmount = dragonToken.balanceOf(address(this)) - dragonBefore;
        
        // Transfer tokens to user
        wsToken.safeTransfer(user, wsAmount);
        dragonToken.transfer(user, dragonAmount);
        
        emit LiquidityRemoved(user, wsAmount, dragonAmount, liquidity);
        return (wsAmount, dragonAmount);
    }
    
    /**
     * @dev Get the current reserves of the pair
     */
    function getReserves() external view override returns (uint256 wsReserve, uint256 dragonReserve) {
        (address[] memory tokens, uint256[] memory balances, ) = balancerVault.getPoolTokens(poolId);
        
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
     */
    function getTokens() external view override returns (address, address) {
        return (address(wsToken), address(dragonToken));
    }
    
    /**
     * @dev Estimate the amount of $DRAGON tokens for a given amount of $wS tokens
     * Using Balancer weighted pool formula for 69/31 (69% DRAGON, 31% wS)
     */
    function estimateWSForDragonAmount(uint256 wsAmount) public view returns (uint256) {
        (uint256 wsReserve, uint256 dragonReserve) = this.getReserves();
        require(wsReserve > 0 && dragonReserve > 0, "Insufficient reserves");
        
        // Using Balancer spot price formula adjusted for weighted pools
        // For a weighted pool, spot price = (tokenOut / weightOut) / (tokenIn / weightIn)
        // For wS → DRAGON: spotPrice = (dragonReserve / DRAGON_WEIGHT) / (wsReserve / WS_WEIGHT)
        
        uint256 numerator = dragonReserve * WS_WEIGHT;
        uint256 denominator = wsReserve * DRAGON_WEIGHT;
        uint256 spotPrice = numerator * 1e18 / denominator;
        
        // Apply the spot price (with some adjustment for slippage)
        // This is simplified and would need to use the actual Balancer math for production
        return wsAmount * spotPrice / 1e18;
    }
    
    /**
     * @dev Estimate the amount of $wS tokens for a given amount of $DRAGON tokens
     * Using Balancer weighted pool formula for 69/31 (69% DRAGON, 31% wS)
     */
    function estimateDragonForWSAmount(uint256 dragonAmount) public view returns (uint256) {
        (uint256 wsReserve, uint256 dragonReserve) = this.getReserves();
        require(wsReserve > 0 && dragonReserve > 0, "Insufficient reserves");
        
        // Using Balancer spot price formula adjusted for weighted pools
        // For a weighted pool, spot price = (tokenOut / weightOut) / (tokenIn / weightIn)
        // For DRAGON → wS: spotPrice = (wsReserve / WS_WEIGHT) / (dragonReserve / DRAGON_WEIGHT)
        
        uint256 numerator = wsReserve * DRAGON_WEIGHT;
        uint256 denominator = dragonReserve * WS_WEIGHT;
        uint256 spotPrice = numerator * 1e18 / denominator;
        
        // Apply the spot price (with some adjustment for slippage)
        // This is simplified and would need to use the actual Balancer math for production
        return dragonAmount * spotPrice / 1e18;
    }
    
    /**
     * @dev Update the jackpot address
     */
    function setJackpotAddress(address _jackpotAddress) external onlyOwner {
        require(_jackpotAddress != address(0), "Jackpot address cannot be zero");
        jackpotAddress = _jackpotAddress;
    }
    
    /**
     * @dev Update the ve6931 address
     */
    function setVe6931Address(address _ve6931Address) external onlyOwner {
        require(_ve6931Address != address(0), "Ve6931 address cannot be zero");
        ve6931Address = _ve6931Address;
    }
    
    /**
     * @dev Rescue tokens that might get stuck in the contract
     */
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
} 