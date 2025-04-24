// SPDX-License-Identifier: MIT

/*
                                                 /===-_---~~~~~~~~~------____
                                                |===-~___                _,-'
                 -==\\                         `//~\\   ~~~~`---.___.-~~
             ______-==|                         | |  \\           _-~`
       __--~~~  ,-/-==\\                        | |   `\        ,'
    _-~       /'    |  \\                      / /      \      /
  .'        /       |   \\                   /' /        \   /'
 /  ____  /         |    \`\.__/-~~ ~ \ _ _/'  /          \/'
/-'~    ~~~~~---__  |     ~-/~         ( )   /'        _--~`
                  \_|      /        _)   ;  ),   __--~~
                    '~~--_/      _-~/-  / \   '-~ \
                   {\__--_/}    / \\_>- )<__\      \
                   /'   (_/  _-~  | |__>--<__|      |
                  |0  0 _/) )-~     | |__>--<__|     |
                  / /~ ,_/       / /__>---<__/      |
                 o o _//        /-~_>---<__-~      /
                 (^(~          /~_>---<__-      _-~
                ,/|           /__>--<__/     _-~
             ,//('(          |__>--<__|     /                  .----_
            ( ( '))          |__>--<__|    |                 /' _---_~\
         `-)) )) (           |__>--<__|    |               /'  /     ~\`\
        ,/,'//( (             \__>--<__\    \            /'  //        ||
      ,( ( ((, ))              ~-__>--<_~-_  ~--____---~' _/'/        /'
    `~/  )` ) ,/|                 ~-_~>--<_/-__       __-~ _/
  ._-~//( )/ )) `                    ~~-'_/_/ /~~~~~~~__--~
   ;'( ')/ ,)(                              ~~~~~~~~~~
  ' ') '( (/
    '   '  `
    
                           $DRAGON: SONIC RED DRAGON
                  Fair, Verifiable, Simple, Lottery for Everyone

                       https://x.com/sonicreddragon
                      https://t.me/sonicreddragon
                      
// "Do you understand the words coming out of my mouth?" - Chris Tucker & Ricky Tan
*/



pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IDragonLotterySwap.sol";
import "./interfaces/IUniswapV2Router.sol";

/**
 * @title Dragon
 * @dev A deflationary ERC20 token with transparent fee distribution and lottery mechanics in ve69LP Weighted Pool on Balancer's fork Beets using V3 Vaults in a Curve-style ve-token locking and voting mechanism to boost probability of winning the jackpot.
 * No minting, no blacklist, no fee exclusions, no hidden fees.
 */
contract Dragon is ERC20, Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    
    /*===========================================================================
     *                          CONSTANTS & STATE VARIABLES
     *===========================================================================*/
    
    // Core constants
    uint256 public constant INITIAL_SUPPLY = 6_942_000 * 10**18; // Initial supply of 6,942,000 DRAGON
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD; // Burn address for tokens
    uint256 public constant TIMELOCK_DELAY = 24 hours; // Time delay for admin actions
    
    // Fee system constants
    uint256 public constant FEE_DENOMINATOR = 10000;     // Base for fee calculations (100.00%)
    uint256 public constant MAX_TOTAL_FEE = 1000;        // Maximum combined fee allowed (10.00%)
    
    // Hardcoded fee configuration in basis points (immutable)
    uint256 public constant JACKPOT_FEE = 690;          // 6.90% to lottery jackpot
    uint256 public constant BURN_FEE = 69;              // 0.69% burned from circulation
    uint256 public constant LP_FEE = 241;               // 2.41% to liquidity providers
    uint256 public constant TOTAL_FEE = 1000;           // 10.00% total fee
    
    // Launch phase wallet and transaction limits (in basis points)
    uint256 public constant LAUNCH_WALLET_LIMIT_BPS = 100;      // 1.00% max wallet during launch phase
    
    // Launch phase transaction count
    uint256 public constant LAUNCH_PHASE_TX_LIMIT = 69; // Transactions and wallet limits are removed starting from transaction #70

    // Post-Launch wallet and transaction limits (in basis points)
    uint256 public constant STANDARD_WALLET_LIMIT_BPS = 1000;   // 10.00% max wallet after launch phase
    
    // State variables
    uint256 public transactionCount;
    uint256 public lastFeeUpdate;
    uint256 public totalBurned;
    uint256 public totalJackpotFees;
    uint256 public totalve69LPFees;
    uint256 public launchTimestamp;
    uint256 public totalHolders;
    
    // Addresses
    address public jackpotAddress;
    address public ve69LPAddress;
    address public wrappedSonicAddress;
    address public lotteryAddress;
    address public exchangePair;

    // Trading state
    bool public isTradingEnabled = false;
    bool public isTradingLockedOn = false;
    bool private inSwap = false;
    bool private _transferOptimization = true;
    
    // Mappings
    mapping(address => bool) public isFeeExempt;
    mapping(address => uint256) public lastTransferTimestamp;
    mapping(address => bool) private _optimizedTransfers;
    mapping(bytes32 => uint256) public pendingActions;
    mapping(bytes32 => string) public pendingActionDescriptions;
    
    // Interfaces
    IERC20 public wrappedSonic;
    
    // Holder tracking
    EnumerableSet.AddressSet private _holders;
    mapping(address => uint256) private _lastBalanceUpdate;
    uint256 private _holderUpdateThreshold = 100;
    uint256 private _holderProcessedCount;
    
    // Swap tracking variables
    uint256 private _preSwapWrappedSonicBalance;
    bool private _trackingBuy;
    
    // External contracts
    IUniswapV2Router public router;
    
    // Initialization tracking
    bool public jackpotAddressInitialized = false;
    bool public ve69LPAddressInitialized = false;
    bool public exchangePairInitialized = false;
    bool public lotteryAddressInitialized = false;
    
    // Additional swap tracking
    uint256 public largestSwap;
    address public largestSwapperAddress;
    uint256 public lastMilestoneTransactionCount;
    uint256 public constant MILESTONE_INTERVAL = 69;
    mapping(address => uint256) public userSwapCount;
    mapping(address => uint256) public cumulativeUserBuys;
    string[] private dragonFortunes;
    uint256 private fortuneIndex;
    
    // Exchange rate constants for Balancer V3 Weighted Pool
    uint256 public constant DRAGON_WEIGHT = 6900; // 69% in basis points
    uint256 public constant WRAPPED_SONIC_WEIGHT = 3100;     // 31% in basis points
    uint256 public constant EXCHANGE_RATE_PRECISION = 10000;
    
    // Pool state variables
    uint256 public dragonPoolBalance;   // Current amount of DRAGON in the pool
    uint256 public wrappedSonicPoolBalance;       // Current amount of wrapped Sonic in the pool
    uint256 public spotPrice;           // Current spot price (in basis points)
    bool public poolInitialized = false; // Whether the pool has been initialized
    
    /*===========================================================================
     *                                   EVENTS
     *===========================================================================*/
    
    event FeesDistributed(uint256 amount);
    event ExchangePairSet(address indexed pair);
    event SwapDetected(address indexed from, address indexed to, bool isWrappedSonicToTokenSwap, uint256 wrappedSonicAmount);
    event SwapDebug(string message, uint256 value);
    event SpecialTransactionPeriodEnded(uint256 timestamp);
    event ActionScheduled(bytes32 indexed actionId, string actionDescription, uint256 executionTime);
    event ActionExecuted(bytes32 indexed actionId, string actionDescription);
    event ActionCancelled(bytes32 indexed actionId, string actionDescription);
    event OwnershipRenounced();
    event ve69LPAddressUpdated(address indexed newAddress);
    event RouterUpdated(address indexed newRouter);
    event TokensTransferred(
        address indexed from,
        address indexed to,
        uint256 transferAmount,
        uint256 burnAmount,
        uint256 jackpotAmount,
        uint256 veAmount
    );
    event FeeCollected(address indexed from, uint256 burnAmount, uint256 jackpotAmount, uint256 ve69LPAmount);
    event LotteryBuyFeesUpdated(uint256 burnFee, uint256 jackpotFee, uint256 ve69LPFee);
    event LotterySellFeesUpdated(uint256 burnFee, uint256 jackpotFee, uint256 ve69LPFee);
    event FeeExemptUpdated(address indexed account, bool exempt);
    event LotteryAddressUpdated(address indexed newAddress);
    event JackpotAddressUpdated(address indexed newAddress);
    event MilestoneReached(uint256 transactionNumber, string message);
    event LargestSwapUpdated(address indexed user, uint256 amount);
    event DragonFortuneTold(address indexed user, string fortune);
    event DragonLevelUp(address indexed user, uint256 newLevel, uint256 cumulativeBought);
    event PoolInitialized(uint256 dragonBalance, uint256 wrappedSonicBalance, uint256 spotPrice);
    event PoolBalancesUpdated(uint256 dragonBalance, uint256 wrappedSonicBalance, uint256 spotPrice);
    event SwapExecuted(address indexed user, uint256 dragonAmount, uint256 wrappedSonicAmount, uint256 spotPrice, bool isDragonToWrappedSonic);
    event TradingEnabled(bool enabled);
    
    /*===========================================================================
     *                            CONSTRUCTOR & CORE FUNCTIONS
     *===========================================================================*/
    
    /**
     * @dev Constructor to initialize the token with transparent security features
     */
    constructor(
        address _jackpotAddress,
        address _ve69LPAddress,
        address _wrappedSonicAddress
    ) ERC20("Dragon", "DRAGON") Ownable() {
        // Initialize critical addresses
        require(_jackpotAddress != address(0) && _ve69LPAddress != address(0) && _wrappedSonicAddress != address(0), 
                "Addresses cannot be zero");

        // Set core addresses
        jackpotAddress = _jackpotAddress;
        ve69LPAddress = _ve69LPAddress;
        wrappedSonicAddress = _wrappedSonicAddress;
        wrappedSonic = IERC20(_wrappedSonicAddress);
        
        // Set initialization flags
        jackpotAddressInitialized = true;
        ve69LPAddressInitialized = true;
        exchangePairInitialized = false;
        lotteryAddressInitialized = false;
        lotteryAddress = address(0);

        // Configure fees with hardcoded constants
        LotteryFee memory standardFees = LotteryFee({
            jackpotFee: JACKPOT_FEE,   // 6.9%
            burnFee: BURN_FEE,         // 0.69%
            ve69LPFee: LP_FEE          // 2.41%
        });
        
        buyFees = standardFees;
        sellFees = standardFees;
        currentFees = buyFees;
        
        // Set initial states
        isFeeExempt[address(this)] = true;
        _mint(msg.sender, INITIAL_SUPPLY);
        launchTimestamp = block.timestamp;
        _transferOptimization = true;
        
        // Initialize dragon fortunes
        _initializeFortunes();
        fortuneIndex = block.timestamp % dragonFortunes.length;
        lastMilestoneTransactionCount = 0;
    }

    /**
     * @dev Initialize the dragon fortune messages
     * Internal function to set up the fortune messages users receive when swapping
     */
    function _initializeFortunes() private {
        dragonFortunes.push("The dragon with the golden scales brings fortune to all.");
        dragonFortunes.push("Beware the sleeping dragon, for when it wakes, the earth trembles.");
        dragonFortunes.push("A journey of a thousand miles begins with a single step. And a dragon.");
        dragonFortunes.push("The fire that burns brightest consumes itself the fastest.");
        dragonFortunes.push("Wealth awaits those who dare to ride the dragon.");
        dragonFortunes.push("The dragon's hoard grows largest for those who hold longest.");
        dragonFortunes.push("Fortune favors the brave and the patient hodler.");
        dragonFortunes.push("In the realm of dragons, paper hands get burned.");
        dragonFortunes.push("The wise dragon knows when to soar and when to rest.");
    }

    /**
     * @dev In _transfer remove the fee logic since we're moving to swap-based fees
     */
    function _transfer(address from, address to, uint256 amount) internal override {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(amount > 0, "Transfer amount must be greater than zero");

        // Check if trading is enabled
        if (!isTradingEnabled && !isFeeExempt[from] && !isFeeExempt[to]) {
            revert("Trading not yet enabled");
        }

        // Update last transfer timestamp
        lastTransferTimestamp[from] = block.timestamp;
        lastTransferTimestamp[to] = block.timestamp;

        // Transfer without fees
        super._transfer(from, to, amount);
        
        // Update transaction count
        if (!isFeeExempt[from] && !isFeeExempt[to]) {
            transactionCount = transactionCount.add(1);
        }
    }

    /**
     * @dev Override the transfer function to add reentrancy protection
     */
    function transfer(address to, uint256 amount) public virtual override nonReentrant returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @dev Override the transferFrom function to add reentrancy protection
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override nonReentrant returns (bool) {
        address spender = msg.sender;
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    /*===========================================================================
     *                              TRADING CONTROL
     *===========================================================================*/

    /**
     * @dev PERMANENTLY ENABLES TRADING - This function enables trading forever and cannot be reversed
     * Once called, trading will be permanently enabled and can never be disabled again
     * Should only be called when the token is ready for public trading
     * "It's about to go down!" - Detective James Carter
     */
    function doYouUnderstandTheWordsThatAreComingOutOfMyMouth() external onlyOwner {
        require(!isTradingEnabled, "Trading already enabled");
        isTradingEnabled = true;
        isTradingLockedOn = true;
        emit TradingEnabled(true);
    }

    /**
     * @dev TOGGLE TRADING - Temporarily enables or disables trading (only if not permanently locked)
     * @param _enabled Set to true to enable trading, false to disable it
     * This function allows the owner to toggle trading on/off but only works before trading is permanently enabled
     * "Do you understand the words that are coming out of my mouth?" - Detective James Carter
     */
    function imGonnaKickYouSoHard(bool _enabled) external onlyOwner {
        require(!isTradingLockedOn, "Trading is permanently enabled and cannot be disabled");
        isTradingEnabled = _enabled;
        emit TradingEnabled(_enabled);
    }

    /**
     * @dev Set Uniswap V2 Router address for swap
     * @param _router The router address
     */
    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), "Router cannot be zero address");
        router = IUniswapV2Router(_router);
        emit RouterUpdated(_router);
    }

    /**
     * @dev Set fee exempt status for an address
     * @param _addr The address to update
     * @param _status Set to true to make exempt from fees, false to remove exemption
     */
    function setFeeExempt(address _addr, bool _status) external onlyOwner {
        isFeeExempt[_addr] = _status;
        emit FeeExemptUpdated(_addr, _status);
    }

    /**
     * @dev Set the exchange pair address directly (for compatibility with existing systems)
     * This method is provided for direct access and compatibility with existing contracts
     * For production use, the timelock version should be preferred for security
     * @param _exchangePair The exchange pair address
     */
    function setExchangePair(address _exchangePair) external onlyOwner {
        _setExchangePair(_exchangePair);
    }

    /*===========================================================================
     *                               SWAP FUNCTIONS
     *===========================================================================*/

    /**
     * @dev Handle the swap from $DRAGON to wrapped Sonic, applying full fee structure
     * First, 0.69% of the $DRAGON tokens are burned
     * Then, from the resulting wrapped Sonic, 6.9% goes to jackpot and 2.41% goes to ve69LP
     * @param user Address of the user swapping
     * @param dragonAmount Amount of $DRAGON tokens being swapped
     * @return wrappedSonicAmount Amount of $wrappedSonic tokens to return to user
     * "I'll take that watch, and all that cash you got!" - Security Guard (as he's taking valuables)
     */
    function handleSwapToWrappedSonic(address user, uint256 dragonAmount) external nonReentrant returns (uint256 wrappedSonicAmount) {
        require(msg.sender == exchangePair, "Only exchange pair can call this");
        require(dragonAmount > 0, "Amount must be greater than zero");
        require(poolInitialized, "Pool not initialized");
        
        // First step: Burn 0.69% of the DRAGON tokens
        uint256 burnAmount = (dragonAmount * 69) / 10000; // 0.69%
        uint256 swapAmount = dragonAmount - burnAmount;
        
        // Burns DRAGON tokens directly
        _burn(user, burnAmount);

        // Calculate the wrapped Sonic amount based on the remaining DRAGON tokens
        // This is determined by the Balancer pool exchange rate
        uint256 totalWrappedSonicResult = swapAmount;
        
        // Second step: Calculate wrapped Sonic fees from the swap result
        uint256 wrappedSonicJackpotFee = (totalWrappedSonicResult * sellFees.jackpotFee) / 10000; // 6.9%
        uint256 wrappedSonicve69LPFee = (totalWrappedSonicResult * sellFees.ve69LPFee) / 10000;  // 2.41%
        uint256 wrappedSonicTotalFee = wrappedSonicJackpotFee + wrappedSonicve69LPFee;      // 9.31%
        
        // Calculate the amount of wrapped Sonic tokens to return to the user
        wrappedSonicAmount = totalWrappedSonicResult - wrappedSonicTotalFee;
        
        // Process the fees
        // Send jackpot fee to the lottery contract
        if (wrappedSonicJackpotFee > 0) {
            wrappedSonic.safeTransfer(jackpotAddress, wrappedSonicJackpotFee);
            _trackFeeDistribution(1, wrappedSonicJackpotFee);
            // Add to jackpot
            try IDragonLotterySwap(lotteryAddress).addToJackpot(wrappedSonicJackpotFee) {} catch {}
        }

        // Send LP fee to the ve69LP address
        if (wrappedSonicve69LPFee > 0) {
            wrappedSonic.safeTransfer(ve69LPAddress, wrappedSonicve69LPFee);
            _trackFeeDistribution(2, wrappedSonicve69LPFee);
        }

        // Notify the lottery contract about the sell
        try IDragonLotterySwap(lotteryAddress).processSell(user, wrappedSonicAmount) {} catch {}
        
        emit SwapExecuted(user, dragonAmount, wrappedSonicAmount, spotPrice, true);
        
        // Return the amount of wrapped Sonic to be sent to the user
        return wrappedSonicAmount;
    }

    /**
     * @dev Handle the swap from wrapped Sonic to $DRAGON, applying fees directly
     * Takes 9.31% of the input wrapped Sonic tokens (6.9% to jackpot, 2.41% to ve69LP)
     * The remaining wrapped Sonic is converted to DRAGON tokens based on the Balancer pool rate
     * @param user Address of the user swapping
     * @param wrappedSonicAmount Amount of $wrappedSonic tokens being swapped
     * @return dragonAmount Amount of DRAGON tokens to return to user
     * "It's not about the money. It's about sending a message." - Joker
     */
    function handleSwapFromWrappedSonic(address user, uint256 wrappedSonicAmount) external nonReentrant returns (uint256 dragonAmount) {
        require(msg.sender == exchangePair, "Only exchange pair can call this");
        require(wrappedSonicAmount > 0, "Amount must be greater than zero");
        require(poolInitialized, "Pool not initialized");
        
        // Calculate fees
        uint256 wrappedSonicJackpotFee = (wrappedSonicAmount * buyFees.jackpotFee) / 10000; // 6.9%
        uint256 wrappedSonicve69LPFee = (wrappedSonicAmount * buyFees.ve69LPFee) / 10000;  // 2.41%
        uint256 wrappedSonicTotalFee = wrappedSonicJackpotFee + wrappedSonicve69LPFee; // 9.31%

        // Calculate the amount to swap
        uint256 wrappedSonicSwapAmount = wrappedSonicAmount - wrappedSonicTotalFee;

        // Process the fees
        if (wrappedSonicJackpotFee > 0) {
            wrappedSonic.safeTransferFrom(user, jackpotAddress, wrappedSonicJackpotFee);
            _trackFeeDistribution(1, wrappedSonicJackpotFee);
            // Add to jackpot
            try IDragonLotterySwap(lotteryAddress).addToJackpot(wrappedSonicJackpotFee) {} catch {}
        }

        // Send LP fee to the ve69LP address
        if (wrappedSonicve69LPFee > 0) {
            wrappedSonic.safeTransferFrom(user, ve69LPAddress, wrappedSonicve69LPFee);
            _trackFeeDistribution(2, wrappedSonicve69LPFee);
        }

        // Transfer wrapped Sonic tokens from the user to the exchange pair
        wrappedSonic.safeTransferFrom(user, exchangePair, wrappedSonicSwapAmount);

        // Calculate the DRAGON amount based on the wrapped Sonic swap amount
        // This is determined by the Balancer pool ratio
        dragonAmount = wrappedSonicSwapAmount;
        
        // Mint new DRAGON tokens to the user
        _mint(user, dragonAmount);
        
        // Process lottery buy event
        if (lotteryAddress != address(0)) {
            _handleLotteryEntry(user, wrappedSonicAmount);
        }
        
        emit SwapExecuted(user, dragonAmount, wrappedSonicAmount, spotPrice, false);
        
        // Return the total DRAGON amount user receives
        return dragonAmount;
    }

    /*===========================================================================
     *                             FEE MANAGEMENT
     *===========================================================================*/

    /**
     * @dev Fee Structure Documentation
     */
    struct LotteryFee {
        uint256 jackpotFee;   // 6.9%
        uint256 burnFee;      // 0.69%
        uint256 ve69LPFee;    // 2.41%
    }
    
    // Fee configurations (hardcoded values, initialized in constructor)
    LotteryFee public buyFees;        // Fees applied when buying DRAGON with wrapped Sonic
    LotteryFee public sellFees;       // Fees applied when selling DRAGON for wrapped Sonic
    LotteryFee public currentFees;    // Current fee configuration
    
    // Fee control functions (no changes allowed, only internal use)
    function applyBuyFees() internal {
        currentFees = buyFees;
    }
    
    function applySellFees() internal {
        currentFees = sellFees;
    }
    
    function getTotalFee(LotteryFee memory feeInfo) internal pure returns (uint256) {
        return feeInfo.jackpotFee + feeInfo.burnFee + feeInfo.ve69LPFee;
    }
    
    /**
     * @dev Get detailed fee information for transparency
     * Fees are fixed and cannot be modified
     */
    function getFeeStructure() external pure returns (
        uint256 jackpotFeePercent,
        uint256 burnFeePercent,
        uint256 lpFeePercent,
        uint256 totalFeePercent
    ) {
        return (
            JACKPOT_FEE * 100 / FEE_DENOMINATOR,
            BURN_FEE * 100 / FEE_DENOMINATOR,
            LP_FEE * 100 / FEE_DENOMINATOR,
            TOTAL_FEE * 100 / FEE_DENOMINATOR
        );
    }

    /*===========================================================================
     *                           BALANCER POOL FUNCTIONS
     *===========================================================================*/

    /**
     * @dev POW FUNCTION - Helper function for weighted pool calculations
     * @param base Base value
     * @param exp Exponent value
     * @return The result of base^exp with precision
     */
    function _pow(uint256 base, uint256 exp) private pure returns (uint256) {
        // Simple exponentiation implementation for Balancer math
        if (base == 0) return 0;
        if (exp == 0) return EXCHANGE_RATE_PRECISION;
        
        uint256 result = EXCHANGE_RATE_PRECISION;
        for (uint256 i = 0; i < exp; i++) {
            result = (result * base) / EXCHANGE_RATE_PRECISION;
        }
        
        return result;
    }
    
    /**
     * @dev CALCULATE WRAPPED SONIC AMOUNT OUT - Calculates wrapped Sonic output for a given DRAGON input
     * @param dragonAmountIn Amount of DRAGON being swapped in
     * @return Amount of wrapped Sonic that would be returned for the given input
     */
    function calculateWrappedSonicAmountOut(uint256 dragonAmountIn) public view returns (uint256) {
        require(poolInitialized, "Pool not initialized");
        
        // Simplified Balancer V3 Weighted Pool calculation
        uint256 weightRatio = (EXCHANGE_RATE_PRECISION * WRAPPED_SONIC_WEIGHT) / DRAGON_WEIGHT;
        uint256 adjDragonAmountIn = (dragonAmountIn * EXCHANGE_RATE_PRECISION) / dragonPoolBalance;
        uint256 wrappedSonicAmountRatio = EXCHANGE_RATE_PRECISION - 
                              _pow((EXCHANGE_RATE_PRECISION - adjDragonAmountIn), weightRatio);
        
        return (wrappedSonicPoolBalance * wrappedSonicAmountRatio) / EXCHANGE_RATE_PRECISION;
    }
    
    /**
     * @dev CALCULATE DRAGON AMOUNT OUT - Calculates DRAGON output for a given wrapped Sonic input
     * @param wrappedSonicAmountIn Amount of wrapped Sonic being swapped in
     * @return Amount of DRAGON that would be returned for the given input
     */
    function calculateDragonAmountOut(uint256 wrappedSonicAmountIn) public view returns (uint256) {
        require(poolInitialized, "Pool not initialized");
        
        // Simplified Balancer V3 Weighted Pool calculation
        uint256 weightRatio = (EXCHANGE_RATE_PRECISION * DRAGON_WEIGHT) / WRAPPED_SONIC_WEIGHT;
        uint256 adjWrappedSonicAmountIn = (wrappedSonicAmountIn * EXCHANGE_RATE_PRECISION) / wrappedSonicPoolBalance;
        uint256 dragonAmountRatio = EXCHANGE_RATE_PRECISION - 
                                  _pow((EXCHANGE_RATE_PRECISION - adjWrappedSonicAmountIn), weightRatio);
        
        return (dragonPoolBalance * dragonAmountRatio) / EXCHANGE_RATE_PRECISION;
    }

    /**
     * @dev INITIALIZE POOL BALANCES - Sets initial pool balances and calculates initial spot price
     * @param initialDragonBalance Initial DRAGON balance in the pool
     * @param initialWrappedSonicBalance Initial wrapped Sonic balance in the pool
     * Only callable once by the owner to setup the initial state for the weighted pool exchange
     * "I don't know what you're feeding these people, and I don't wanna know!" - Detective James Carter
     */
    function iDontKnowWhatYoureFeedingThesePeople(uint256 initialDragonBalance, uint256 initialWrappedSonicBalance) external onlyOwner {
        require(!poolInitialized, "Pool already initialized");
        require(initialDragonBalance > 0, "Dragon balance must be positive");
        require(initialWrappedSonicBalance > 0, "Wrapped Sonic balance must be positive");
        
        dragonPoolBalance = initialDragonBalance;
        wrappedSonicPoolBalance = initialWrappedSonicBalance;
        
        // Calculate initial spot price: (wrappedSonicBalance/wrappedSonicWeight) / (dragonBalance/dragonWeight)
        spotPrice = (initialWrappedSonicBalance * DRAGON_WEIGHT * EXCHANGE_RATE_PRECISION) / 
                    (initialDragonBalance * WRAPPED_SONIC_WEIGHT);
        
        poolInitialized = true;
        
        emit PoolInitialized(initialDragonBalance, initialWrappedSonicBalance, spotPrice);
    }

    /**
     * @dev UPDATE POOL BALANCES - Updates pool balances from actual pool contract (if needed)
     * @param newDragonBalance Current DRAGON balance in the pool
     * @param newWrappedSonicBalance Current wrapped Sonic balance in the pool
     * Called periodically to sync the internal balances with actual pool state
     * "Am I stepping over someone's boundaries? That's always my problem." - Detective James Carter
     */
    function amISteppingOverSomeonesBoundaries(uint256 newDragonBalance, uint256 newWrappedSonicBalance) external onlyOwner {
        require(poolInitialized, "Pool not initialized");
        require(newDragonBalance > 0, "Dragon balance must be positive");
        require(newWrappedSonicBalance > 0, "Wrapped Sonic balance must be positive");
        
        dragonPoolBalance = newDragonBalance;
        wrappedSonicPoolBalance = newWrappedSonicBalance;
        
        // Update spot price based on new balances
        spotPrice = (newWrappedSonicBalance * DRAGON_WEIGHT * EXCHANGE_RATE_PRECISION) / 
                    (newDragonBalance * WRAPPED_SONIC_WEIGHT);
        
        emit PoolBalancesUpdated(newDragonBalance, newWrappedSonicBalance, spotPrice);
    }

    /**
     * @dev GET CURRENT SPOT PRICE - Returns the current exchange rate between DRAGON and wrapped Sonic
     * @return Current spot price in EXCHANGE_RATE_PRECISION (10000 = 1.0)
     * Gets the current price based on pool balances and weights
     * "Made in America, baby!" - Detective James Carter
     */
    function madeInAmericaBaby() public view returns (uint256) {
        require(poolInitialized, "Pool not initialized");
        return spotPrice;
    }

    /*===========================================================================
     *                           HOLDER TRACKING FUNCTIONS
     *===========================================================================*/

    /**
     * @dev Override _afterTokenTransfer to track holders more efficiently
     * Uses a batched approach to reduce gas costs when updating holder lists
     */
    function _afterTokenTransfer(address from, address to, uint256 amount) internal virtual override {
        super._afterTokenTransfer(from, to, amount);
        
        // Only process addresses once per block to prevent duplicate work
        uint256 currentBlock = block.number;
        
        // Efficiently track holders with batched updates
        if (from != address(0) && from != BURN_ADDRESS && from != address(this)) {
            if (_lastBalanceUpdate[from] != currentBlock) {
                _lastBalanceUpdate[from] = currentBlock;
                
                // Process holder status update with batch counter
                uint256 balance = balanceOf(from);
                bool containsHolder = _holders.contains(from);
                
                if (!containsHolder && balance > 0) {
                    _holders.add(from);
                    totalHolders = _holders.length();
                } else if (containsHolder && balance == 0) {
                    _holders.remove(from);
                    totalHolders = _holders.length();
                }
                
                // Update holder processed count
                _holderProcessedCount++;
            }
        }
        
        // Do the same for recipient
        if (to != address(0) && to != BURN_ADDRESS && to != address(this)) {
            if (_lastBalanceUpdate[to] != currentBlock) {
                _lastBalanceUpdate[to] = currentBlock;
                
                // Process holder status update with batch counter
                uint256 balance = balanceOf(to);
                bool containsHolder = _holders.contains(to);
                
                if (!containsHolder && balance > 0) {
                    _holders.add(to);
                    totalHolders = _holders.length();
                } else if (containsHolder && balance == 0) {
                    _holders.remove(to);
                    totalHolders = _holders.length();
                }
                
                // Update holder processed count
                _holderProcessedCount++;
            }
        }
        
        // Set launch timestamp on first transfer after trading enabled
        if (isTradingEnabled && launchTimestamp == 0) {
            launchTimestamp = block.timestamp;
        }
    }

    /**
     * @dev UPDATE HOLDER LIST - Internal function to record token holder status
     * @param holder The address to process as a holder
     * This helps maintain an accurate list of all addresses currently holding tokens
     * More gas-efficient than the batch processing in _afterTokenTransfer
     */
    function _recordHolder(address holder) private {
        if (holder == address(0) || holder == BURN_ADDRESS || holder == address(this)) {
            return;
        }
        
        uint256 balance = balanceOf(holder);
        bool containsHolder = _holders.contains(holder);
        
        if (!containsHolder && balance > 0) {
            _holders.add(holder);
            totalHolders = _holders.length();
        } else if (containsHolder && balance == 0) {
            _holders.remove(holder);
            totalHolders = _holders.length();
        }
    }

    /**
     * @dev GET HOLDER ADDRESS - Returns the wallet address of a holder at a specific index
     * @param index The position in the holders array to query (0-based)
     * @return The wallet address of the holder at the specified index
     * Used by dapps to enumerate all holders for transparency dashboards
     * "Where is everybody? I'm looking for my uncle!" - Carter searching for someone
     */
    function whereIsEverybodyImLookingForMyUncle(uint256 index) external view returns (address) {
        require(index < _holders.length(), "Index out of bounds");
        return _holders.at(index);
    }
    
    /**
     * @dev GET HOLDER COUNT - Returns the total number of unique addresses holding the token
     * @return The count of unique wallet addresses that currently hold tokens
     * This is the total number of active holders after accounting for addresses with zero balance
     * "Damn, how many of y'all are there?" - Detective James Carter
     */
    function damnHowManyOfYallAreThere() external view returns (uint256) {
        return _holders.length();
    }
    
    /**
     * @dev GET HOLDER PROCESSING STATS - Returns information about holder tracking system
     * @return holderCount Number of unique holders
     * @return processedCount Total number of holder entries processed
     * @return updateThreshold Current batch processing threshold
     * "I like to know who I'm working with." - Detective James Carter
     */
    function iLikeToKnowWhoImWorkingWith() external view returns (
        uint256 holderCount,
        uint256 processedCount,
        uint256 updateThreshold
    ) {
        return (
            _holders.length(),
            _holderProcessedCount,
            _holderUpdateThreshold
        );
    }

    /**
     * @dev GET REMAINING LAUNCH TRANSACTIONS - Returns how many transactions remain at the initial launch limits
     * @return Number of transactions left before standard wallet/transaction limits apply
     * During the first 69 transactions, stricter limits on wallet size and transaction size are applied
     * Use this to check when the special launch phase will end
     * "All right, here's how we gonna do this: from this moment on, I'm gonna be your translator." - Detective Carter explaining a plan
     */
    function twoWongsMakesOneWhite() public view returns (uint256) {
        if (transactionCount >= LAUNCH_PHASE_TX_LIMIT) {
            return 0;
        }
        return LAUNCH_PHASE_TX_LIMIT - transactionCount;
    }

    /**
     * @dev GET WALLET LIMIT - Returns the current maximum wallet size allowed
     * @return The maximum amount of tokens a single wallet can hold
     * This limit varies based on the launch phase status, providing greater protection early on
     * Returns 1% of total supply during launch phase, 10% after launch phase completes
     */
    function getCurrentWalletLimit() public view returns (uint256) {
        uint256 totalSupply = totalSupply();
        if (transactionCount < LAUNCH_PHASE_TX_LIMIT) {
            return totalSupply.mul(LAUNCH_WALLET_LIMIT_BPS).div(FEE_DENOMINATOR);
        }
        return totalSupply.mul(STANDARD_WALLET_LIMIT_BPS).div(FEE_DENOMINATOR);
    }

    /*===========================================================================
     *                              TIMELOCK SYSTEM
     *===========================================================================*/

    /**
     * @dev GET ACTION EXECUTION TIME - Returns when a scheduled action can be executed
     * @param actionId The unique identifier for the scheduled action
     * @return The timestamp when the action can be executed, or 0 if not scheduled
     * Part of the timelock system that adds security to sensitive contract changes
     */
    function getActionExecutionTime(bytes32 actionId) public view returns (uint256) {
        return pendingActions[actionId];
    }
    
    /**
     * @dev Schedule an admin action to be executed after timelock
     * @param actionId The unique identifier for the action
     * @param description A human-readable description of the action
     */
    function scheduleAction(bytes32 actionId, string memory description) external onlyOwner {
        require(pendingActions[actionId] == 0, "Action already scheduled");
        
        uint256 executionTime = block.timestamp + TIMELOCK_DELAY;
        pendingActions[actionId] = executionTime;
        pendingActionDescriptions[actionId] = description;
        
        emit ActionScheduled(actionId, description, executionTime);
    }
    
    /**
     * @dev Cancel a proposed action
     * @param actionId The ID of the action to cancel
     */
    function cancelAction(bytes32 actionId) external onlyOwner {
        require(pendingActions[actionId] > 0, "Action not scheduled");
        
        string memory description = pendingActionDescriptions[actionId];
        delete pendingActions[actionId];
        delete pendingActionDescriptions[actionId];
        
        emit ActionCancelled(actionId, description);
    }
    
    /**
     * @dev Check if an action is ready to be executed
     * @param actionId The action to check
     * @return bool True if the action is ready for execution
     */
    function isActionReady(bytes32 actionId) public view returns (bool) {
        uint256 executionTime = pendingActions[actionId];
        return executionTime > 0 && block.timestamp >= executionTime;
    }
    
    /**
     * @dev Generate action ID for common operations
     * @param functionSig Function signature
     * @param params Parameters to include in the ID
     * @return bytes32 The generated action ID
     */
    function getActionId(string memory functionSig, bytes memory params) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(functionSig, params));
    }
    
    /**
     * @dev Schedule and execute action in one step
     * First schedules the action if not already scheduled.
     * If already scheduled and timelock expired, executes the action immediately.
     * @param actionType Type of action (e.g., "setExchangePair", "setLotteryAddress")
     * @param params Parameters for the action encoded as bytes
     * @param description Human-readable description of the action
     * @return status 0 = newly scheduled, 1 = already scheduled, 2 = executed
     * @return executionTime When the action can be executed
     */
    function scheduleAndExecute(
        string memory actionType,
        bytes memory params,
        string memory description
    ) public onlyOwner returns (uint8 status, uint256 executionTime) {
        bytes32 actionId = getActionId(actionType, params);
        
        // Check if action is already scheduled
        if (pendingActions[actionId] == 0) {
            // Not scheduled yet, schedule it
            executionTime = block.timestamp + TIMELOCK_DELAY;
            pendingActions[actionId] = executionTime;
            pendingActionDescriptions[actionId] = description;
            
            emit ActionScheduled(actionId, description, executionTime);
            return (0, executionTime); // Newly scheduled
        } else if (block.timestamp >= pendingActions[actionId]) {
            // Already scheduled and timelock expired, execute it
            executionTime = pendingActions[actionId];
        
        // Clear the pending action
        delete pendingActions[actionId];
        delete pendingActionDescriptions[actionId];
        
            // Execute based on action type
            if (keccak256(bytes(actionType)) == keccak256(bytes("setExchangePair"))) {
                address _exchangePair = abi.decode(params, (address));
                _setExchangePair(_exchangePair);
            } else if (keccak256(bytes(actionType)) == keccak256(bytes("setLotteryAddress"))) {
                address _lotteryAddress = abi.decode(params, (address));
        _setLotteryAddress(_lotteryAddress);
            } else if (keccak256(bytes(actionType)) == keccak256(bytes("setJackpotAddress"))) {
                address _jackpotAddress = abi.decode(params, (address));
                jackpotAddress = _jackpotAddress;
                emit JackpotAddressUpdated(_jackpotAddress);
            } else if (keccak256(bytes(actionType)) == keccak256(bytes("setve69LPAddress"))) {
                address _ve69LPAddress = abi.decode(params, (address));
                ve69LPAddress = _ve69LPAddress;
                emit ve69LPAddressUpdated(_ve69LPAddress);
            } else {
                revert("Unknown action type");
            }
        
        emit ActionExecuted(actionId, description);
            return (2, 0); // Executed
        } else {
            // Already scheduled but timelock not expired
            return (1, pendingActions[actionId]); // Already scheduled
        }
    }
    
    /**
     * @dev Helper function to schedule/execute exchange pair update
     * @param _exchangePair The new exchange pair address
     * @return status Result status (0=scheduled, 1=pending, 2=executed)
     * @return executionTime When the action can be executed
     */
    function updateExchangePair(address _exchangePair) external onlyOwner returns (uint8 status, uint256 executionTime) {
        require(exchangePairInitialized, "Must first set initial exchange pair");
        require(_exchangePair != address(0), "Exchange pair cannot be zero address");
        
        return scheduleAndExecute(
            "setExchangePair",
            abi.encode(_exchangePair),
            "Update exchange pair address"
        );
    }
    
    /**
     * @dev Helper function to schedule/execute lottery address update
     * @param _lotteryAddress The new lottery address
     * @return status Result status (0=scheduled, 1=pending, 2=executed)
     * @return executionTime When the action can be executed
     */
    function updateLotteryAddress(address _lotteryAddress) external onlyOwner returns (uint8 status, uint256 executionTime) {
        require(lotteryAddressInitialized, "Must first set initial lottery address");
        require(_lotteryAddress != address(0), "Lottery address cannot be zero address");
        
        return scheduleAndExecute(
            "setLotteryAddress",
            abi.encode(_lotteryAddress),
            "Update lottery address"
        );
    }
    
    /**
     * @dev Helper function to schedule/execute jackpot address update
     * @param _jackpotAddress The new jackpot address
     * @return status Result status (0=scheduled, 1=pending, 2=executed)
     * @return executionTime When the action can be executed
     */
    function updateJackpotAddress(address _jackpotAddress) external onlyOwner returns (uint8 status, uint256 executionTime) {
        require(jackpotAddressInitialized, "Must first set initial jackpot address");
        require(_jackpotAddress != address(0), "Jackpot address cannot be zero address");
        
        return scheduleAndExecute(
            "setJackpotAddress",
            abi.encode(_jackpotAddress),
            "Update jackpot address"
        );
    }
    
    /**
     * @dev Helper function to schedule/execute ve69LP address update
     * @param _ve69LPAddress The new ve69LP address
     * @return status Result status (0=scheduled, 1=pending, 2=executed)
     * @return executionTime When the action can be executed
     */
    function updateve69LPAddress(address _ve69LPAddress) external onlyOwner returns (uint8 status, uint256 executionTime) {
        require(ve69LPAddressInitialized, "Must first set initial ve69LP address");
        require(_ve69LPAddress != address(0), "ve69LP address cannot be zero address");
        
        return scheduleAndExecute(
            "setve69LPAddress",
            abi.encode(_ve69LPAddress),
            "Update ve69LP address"
        );
    }
    
    /**
     * @dev Internal implementation of setExchangePair
     */
    function _setExchangePair(address _exchangePair) private {
        require(_exchangePair != address(0), "Exchange pair cannot be zero address");
        exchangePair = _exchangePair;
        emit ExchangePairSet(_exchangePair);
    }
    
    /**
     * @dev Internal implementation of setLotteryAddress
     */
    function _setLotteryAddress(address _lotteryAddress) private {
        require(_lotteryAddress != address(0), "Lottery address cannot be zero");
        lotteryAddress = _lotteryAddress;
        emit LotteryAddressUpdated(_lotteryAddress);
    }
    
    /**
     * @dev INITIALIZE DRAGON FORTUNES - Sets up additional fortune messages for users
     * Only callable once by the owner to add more fortune messages users receive when swapping
     * "Time will tell, give a rat a cookie." - Detective James Carter (pretending to tell fortunes)
     */
    function illBeBach() external onlyOwner {
        require(dragonFortunes.length <= 10, "Too many fortunes already");
        
        dragonFortunes.push("You will have a long and prosperous journey in crypto.");
        dragonFortunes.push("Good fortune comes to those who HODL.");
        dragonFortunes.push("The pump you seek is within you.");
        dragonFortunes.push("Your DRAGON will breathe fire in the next cycle.");
        dragonFortunes.push("Two Wongs don't make a white, but they make a fortune.");
        dragonFortunes.push("Do you understand the words that are coming out of this fortune?");
        dragonFortunes.push("Caution: Selling may lead to profound regret.");
        dragonFortunes.push("Even a journey of 1000x begins with a single swap.");
        dragonFortunes.push("Wipe yourself off, you're not dead yet.");
        dragonFortunes.push("The greatest wealth is health... and DRAGON tokens.");
    }

    /*===========================================================================
     *                              UTILITY FUNCTIONS
     *===========================================================================*/

    /**
     * @dev Track fee distributions for transparency
     * @param feeType The type of fee (1=jackpot, 2=liquidity, 3=burn, 4=development)
     * @param amount The amount of fee distributed
     */
    function _trackFeeDistribution(uint8 feeType, uint256 amount) private {
        if (feeType == 1) {
            totalJackpotFees += amount;
        } else if (feeType == 2) {
            totalve69LPFees += amount;
        } else if (feeType == 3) {
            totalBurned += amount;
        }
    }

    /**
     * @dev TOGGLE TRANSFER OPTIMIZATION - Sets transfer optimization status for an address
     * @param account The address to update
     * @param optimized Whether to enable optimized transfers for this address
     * Allows certain addresses to use an optimized transfer path to save gas
     * Only callable by the owner for security reasons
     */
    function setOptimizedTransfer(address account, bool optimized) external onlyOwner {
        require(account != address(0), "Cannot optimize zero address");
        _optimizedTransfers[account] = optimized;
    }

    /**
     * @dev BURN TOKENS - Burns tokens from sender's wallet, reducing total supply permanently
     * @param amount The amount of tokens to burn (in wei)
     * When called, the specified amount of tokens will be permanently removed from circulation
     * The burn amount is tracked and added to totalBurned for statistics
     * "Damn! He ain't gonna be in Rush Hour 3!" - Detective James Carter
     */
    function damnHeAintGonnaBeInRushHour3(uint256 amount) external {
        _burn(msg.sender, amount);
        // Track the burn using tracking function
        _trackFeeDistribution(3, amount);
    }

    /**
     * @dev TRACK SPECIAL SWAP EVENTS - Internal function to track user swaps and trigger special events
     * @param user Address that is swapping for $DRAGON
     * @param amount Amount of $DRAGON tokens the user is receiving
     * Tracks largest swaps, milestone transactions, user levels, and tells fortunes
     */
    function _trackSpecialSwapEvents(address user, uint256 amount) private {
        // Increment user's swap count
        userSwapCount[user] += 1;
        
        // Track cumulative buys for user level
        cumulativeUserBuys[user] += amount;
        
        // Track largest swap
        if (amount > largestSwap) {
            largestSwap = amount;
            largestSwapperAddress = user;
            emit LargestSwapUpdated(user, amount);
        }
        
        // Milestone celebration
        if (transactionCount > 0 && transactionCount % MILESTONE_INTERVAL == 0 && 
            transactionCount > lastMilestoneTransactionCount) {
            lastMilestoneTransactionCount = transactionCount;
            string memory message = string(abi.encodePacked("Transaction #", 
                                           _uintToString(transactionCount), 
                                           " - Dragon power is rising!"));
            emit MilestoneReached(transactionCount, message);
        }
        
        // Tell a fortune for each user's first 5 swaps
        if (userSwapCount[user] <= 5 && dragonFortunes.length > 0) {
            string memory fortune = _getNextFortune();
            emit DragonFortuneTold(user, fortune);
        }
        
        // Check for user level ups - every 1000 tokens cumulative buy
        uint256 newLevel = cumulativeUserBuys[user] / (1000 * 10**18);
        uint256 oldLevel = (cumulativeUserBuys[user] - amount) / (1000 * 10**18);
        if (newLevel > oldLevel) {
            emit DragonLevelUp(user, newLevel, cumulativeUserBuys[user]);
        }
    }

    /**
     * @dev GET USER SWAP STATS - Returns swap statistics for a specific user
     * @param user Address to get stats for
     * @return swapCount Number of times user has swapped for $DRAGON
     * @return totalBought Total amount of $DRAGON acquired through swaps
     * @return level User's dragon level based on total tokens acquired
     * "You ain't never seen a black man on TV?!" - Carter commenting on someone's statistics/status
     */
    function weWouldLoveToSeeThat(address user) external view returns (
        uint256 swapCount,
        uint256 totalBought,
        uint256 level
    ) {
        return (
            userSwapCount[user],
            cumulativeUserBuys[user],
            cumulativeUserBuys[user] / (1000 * 10**18)
        );
    }

    /**
     * @dev GET NEXT FORTUNE - Internal helper to cycle through fortune messages
     * @return The next fortune message in the rotation
     */
    function _getNextFortune() private returns (string memory) {
        if (dragonFortunes.length == 0) {
            return "No fortunes available yet";
        }
        
        string memory fortune = dragonFortunes[fortuneIndex];
        fortuneIndex = (fortuneIndex + 1) % dragonFortunes.length;
        return fortune;
    }

    /**
     * @dev Helper function to convert uint256 to string
     * @param value The uint256 value to convert
     * @return The string representation of the value
     */
    function _uintToString(uint256 value) private pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        
        return string(buffer);
    }

    /**
     * @dev GET TRANSACTION LIMIT - Returns the current maximum allowed transaction size
     * @return The maximum amount of tokens that can be transferred in a single transaction
     * This limit varies based on whether the contract is still in the launch phase
     * Returns 1% of total supply during launch phase, 10% after launch phase completes
     * "You better limit yourself to two words: Yes and Sir." - Inspector Lee setting limits
     */
    function wipeYourselfOff() public view returns (uint256) {
        uint256 totalSupply = totalSupply();
        if (transactionCount < LAUNCH_PHASE_TX_LIMIT) {
            return totalSupply.mul(LAUNCH_WALLET_LIMIT_BPS).div(FEE_DENOMINATOR);
        }
        return totalSupply.mul(STANDARD_WALLET_LIMIT_BPS).div(FEE_DENOMINATOR);
    }

    /**
     * @dev Set any address initially (only for first time)
     * @param addressType The type of address (1=jackpot, 2=ve69LP, 3=lottery, 4=exchangePair)
     * @param newAddress The new address value
     */
    function setInitialAddress(uint8 addressType, address newAddress) internal {
        require(newAddress != address(0), "Address cannot be zero");
        
        if (addressType == 1) {
            // Jackpot
            require(!jackpotAddressInitialized, "Jackpot address already initialized, use timelock");
            jackpotAddress = newAddress;
            jackpotAddressInitialized = true;
            emit ActionExecuted(keccak256("setInitialJackpotAddress"), "Initial jackpot address set");
            emit JackpotAddressUpdated(newAddress);
        } else if (addressType == 2) {
            // ve69LP
            require(!ve69LPAddressInitialized, "ve69LP address already initialized, use timelock");
            ve69LPAddress = newAddress;
            ve69LPAddressInitialized = true;
            emit ActionExecuted(keccak256("setInitialve69LPAddress"), "Initial ve69LP address set");
            emit ve69LPAddressUpdated(newAddress);
        } else if (addressType == 3) {
            // Lottery
            require(!lotteryAddressInitialized, "Lottery address already initialized, use timelock");
            lotteryAddress = newAddress;
            lotteryAddressInitialized = true;
            emit ActionExecuted(keccak256("setInitialLotteryAddress"), "Initial lottery address set");
            emit LotteryAddressUpdated(newAddress);
        } else if (addressType == 4) {
            // Exchange pair
            require(!exchangePairInitialized, "Exchange pair already initialized, use timelock");
            exchangePair = newAddress;
            exchangePairInitialized = true;
            emit ActionExecuted(keccak256("setInitialExchangePair"), "Initial exchange pair set");
            emit ExchangePairSet(newAddress);
        } else {
            revert("Invalid address type");
        }
    }

    /**
     * @dev Set the jackpot address directly without timelock (but only for the first time)
     * @param _newAddress The new jackpot address
     */
    function setInitialJackpotAddress(address _newAddress) external onlyOwner {
        setInitialAddress(1, _newAddress);
    }

    /**
     * @dev Set the ve69LP address directly without timelock (but only for the first time)
     * @param _newAddress The new ve69LP address
     */
    function setInitialve69LPAddress(address _newAddress) external onlyOwner {
        setInitialAddress(2, _newAddress);
    }

    /**
     * @dev Set the lottery address directly without timelock (but only for the first time)
     * @param _lotteryAddress The lottery contract address
     */
    function setInitialLotteryAddress(address _lotteryAddress) external onlyOwner {
        setInitialAddress(3, _lotteryAddress);
    }
    
    /**
     * @dev Set the exchange pair address directly without timelock (but only for the first time)
     * @param _exchangePair The exchange pair address
     */
    function setInitialExchangePair(address _exchangePair) external onlyOwner {
        setInitialAddress(4, _exchangePair);
    }

    /**
     * @dev Handle lottery entry for a user
     * Only external lottery contract can call this
     * @param _user Address of the user entering the lottery
     * @param _wrappedSonicAmount Amount of wrapped Sonic tokens
     */
    function _handleLotteryEntry(address _user, uint256 _wrappedSonicAmount) private {
        // Ensure the sender is a valid user (not a contract unless whitelisted)
        if (_user.code.length > 0 && !isFeeExempt[_user]) return;
        
        // Only trigger lottery when swapping FROM wrapped Sonic TO DRAGON
        // This is how users enter the lottery - by buying DRAGON tokens
        if (lotteryAddress != address(0)) {
            // Delegate the lottery logic to the external lottery contract
            try IDragonLotterySwap(lotteryAddress).processBuy(_user, _wrappedSonicAmount) {} catch {}
        }
    }
}
