// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Interface for ShadowDEX Router
interface IRouter {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
}

/**
 * @title RedDragonLiquidityVault
 * @dev A dedicated vault for collecting and managing liquidity fees
 */
contract RedDragonLiquidityVault is Ownable {
    using SafeERC20 for IERC20;
    
    // State variables
    IERC20 public wrappedSonic;
    IERC20 public redDragonToken;
    IRouter public router;
    
    // Liquidity configuration
    uint256 public minTokensToLiquidity = 1000 * 10**18; // 1000 tokens min before adding liquidity
    uint256 public autoLiquidityFrequency = 1 days; // Frequency of automated liquidity additions
    uint256 public lastLiquidityAddition;
    
    // Statistics for transparency
    uint256 public totalLiquidityAdded;
    uint256 public totalRedDragonLiquidity;
    uint256 public totalWrappedSonicLiquidity;
    
    // Events
    event TokensReceived(address indexed from, uint256 amount);
    event LiquidityAdded(uint256 redDragonAmount, uint256 wrappedSonicAmount, uint256 liquidityTokens);
    event RouterUpdated(address indexed newRouter);
    event TokenAddressUpdated(address indexed newAddress);
    event MinTokensToLiquidityUpdated(uint256 newAmount);
    event EmergencyWithdrawal(address indexed to, uint256 amount, address token);
    event AutoLiquidityFrequencyUpdated(uint256 newFrequency);
    
    /**
     * @dev Constructor to initialize the vault
     * @param _wrappedSonic Address of the wS token
     * @param _router Address of the router for liquidity addition
     * @param _owner Address of the owner (typically a multisig)
     */
    constructor(address _wrappedSonic, address _router, address _owner) {
        require(_wrappedSonic != address(0), "wS address cannot be zero");
        require(_router != address(0), "Router address cannot be zero");
        require(_owner != address(0), "Owner address cannot be zero");
        
        wrappedSonic = IERC20(_wrappedSonic);
        router = IRouter(_router);
        
        // Transfer ownership to the specified owner (multisig)
        transferOwnership(_owner);
    }
    
    /**
     * @dev Sets the address of the RedDragon token
     * @param _redDragonToken Address of the RedDragon token
     */
    function setTokenAddress(address _redDragonToken) external onlyOwner {
        require(_redDragonToken != address(0), "Token address cannot be zero");
        redDragonToken = IERC20(_redDragonToken);
        emit TokenAddressUpdated(_redDragonToken);
    }
    
    /**
     * @dev Sets the router address
     * @param _router Address of the new router
     */
    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), "Router address cannot be zero");
        router = IRouter(_router);
        emit RouterUpdated(_router);
    }
    
    /**
     * @dev Sets the minimum amount of tokens required to add liquidity
     * @param _minTokensToLiquidity Minimum amount of tokens
     */
    function setMinTokensToLiquidity(uint256 _minTokensToLiquidity) external onlyOwner {
        minTokensToLiquidity = _minTokensToLiquidity;
        emit MinTokensToLiquidityUpdated(_minTokensToLiquidity);
    }
    
    /**
     * @dev Sets the frequency for automatic liquidity additions
     * @param _frequency Frequency in seconds
     */
    function setAutoLiquidityFrequency(uint256 _frequency) external onlyOwner {
        autoLiquidityFrequency = _frequency;
        emit AutoLiquidityFrequencyUpdated(_frequency);
    }
    
    /**
     * @dev Check if liquidity addition criteria are met
     * @return Whether liquidity should be added
     */
    function shouldAddLiquidity() public view returns (bool) {
        // Check token balance
        uint256 redDragonBalance = redDragonToken.balanceOf(address(this));
        if (redDragonBalance < minTokensToLiquidity) {
            return false;
        }
        
        // Check time-based criteria
        if (block.timestamp < lastLiquidityAddition + autoLiquidityFrequency) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Add liquidity to the DEX if criteria are met
     * Can be triggered by anyone
     */
    function addLiquidityIfNeeded() external {
        if (shouldAddLiquidity()) {
            _addLiquidity();
        }
    }
    
    /**
     * @dev Manually trigger liquidity addition
     * Only callable by owner
     */
    function triggerLiquidityAddition() external onlyOwner {
        _addLiquidity();
    }
    
    /**
     * @dev Implementation of liquidity addition
     * Adds liquidity to the DEX using accumulated tokens
     */
    function _addLiquidity() internal {
        require(address(redDragonToken) != address(0), "Token address not set");
        
        uint256 redDragonBalance = redDragonToken.balanceOf(address(this));
        require(redDragonBalance > 0, "No RedDragon tokens to add liquidity");
        
        // Calculate how much wS to use - typical implementation would get the fair value
        // For simplicity, we'll use an equal value approach
        uint256 wrappedSonicBalance = wrappedSonic.balanceOf(address(this));
        require(wrappedSonicBalance > 0, "No wS tokens to add liquidity");
        
        // Approve tokens for router
        redDragonToken.safeApprove(address(router), redDragonBalance);
        wrappedSonic.safeApprove(address(router), wrappedSonicBalance);
        
        // Add liquidity to DEX pair
        (uint256 redDragonAdded, uint256 wrappedSonicAdded, uint256 liquidityTokens) = router.addLiquidity(
            address(redDragonToken),
            address(wrappedSonic),
            redDragonBalance,
            wrappedSonicBalance,
            0, // Accept any amount of RedDragon
            0, // Accept any amount of wS
            owner(), // Send LP tokens to owner (multisig)
            block.timestamp + 600 // 10 minute deadline
        );
        
        // Update statistics
        totalLiquidityAdded += liquidityTokens;
        totalRedDragonLiquidity += redDragonAdded;
        totalWrappedSonicLiquidity += wrappedSonicAdded;
        lastLiquidityAddition = block.timestamp;
        
        emit LiquidityAdded(redDragonAdded, wrappedSonicAdded, liquidityTokens);
        
        // Clear any remaining approval
        redDragonToken.safeApprove(address(router), 0);
        wrappedSonic.safeApprove(address(router), 0);
    }
    
    /**
     * @dev Emergency withdrawal in case of issues
     * Only callable by owner
     */
    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot withdraw to zero address");
        require(token != address(0), "Token address cannot be zero");
        
        IERC20 tokenContract = IERC20(token);
        uint256 balance = tokenContract.balanceOf(address(this));
        uint256 withdrawAmount = amount > 0 && amount <= balance ? amount : balance;
        
        tokenContract.safeTransfer(to, withdrawAmount);
        emit EmergencyWithdrawal(to, withdrawAmount, token);
    }
    
    /**
     * @dev Fallback function to receive ETH 
     */
    receive() external payable {
        emit TokensReceived(msg.sender, msg.value);
    }
} 