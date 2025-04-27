// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "./interfaces/IDragon.sol";
import "./interfaces/IDragonLotterySwap.sol";
import "./interfaces/IPromotionalItem.sol";
import "./interfaces/IDragonJackpotVault.sol";
import "./interfaces/Ive69LPFeeDistributor.sol";
import "./interfaces/IShadowUniswapV3Pool.sol";
import "./config/DragonConfig.sol";

/**
 * @title Dragon
 * @dev Implementation of the Dragon token with fee mechanics
 * - 10% fee on buys (6.9% to jackpot, 2.41% to ve69LPfeedistributor)
 * - 10% fee on sells (6.9% to jackpot, 2.41% to ve69LPfeedistributor)
 * - BeetsLP/Partner pairing on Shadow's Uniswap V3 fork: 6.9% fee (69% to jackpot, 31% to ve69LP)
 * - 0.69% burn on all transfers
 * 
 * Lottery System:
 * - Lottery is triggered only when a user swaps wS for DRAGON
 * - Win chance scales linearly from 0.0004% at 1 wS to 4% at 10,000 wS
 * - ve69LP holders receive up to 2.5x probability boost
 * - Partners receive additional probability boost (up to 6.9%) based on voting
 * - Only the actual user (tx.origin) is eligible for jackpot, not contracts/aggregators
 */
contract Dragon is ERC20, Ownable, ReentrancyGuard, IDragon, ERC20Burnable {
    using SafeERC20 for IERC20;

    // ======== Storage Variables ========
    // Token reference - single variable reference for $DRAGON
    IERC20 public dragonToken;

    // Addresses
    address public immutable jackpotVault;
    address public immutable ve69LPFeeDistributor;
    address public immutable wrappedSonicAddress;
    address public lotteryAddress;
    address public exchangePair;
    address public goldScratcherAddress;
    address public multisigAddress;

    // Token instance
    IERC20 public wrappedSonic;

    // EXCHANGE CONSTANTS
    uint256 private constant EXCHANGE_RATE_PRECISION = 1e18;
    uint256 private constant DRAGON_WEIGHT = 50;
    uint256 private constant WRAPPED_SONIC_WEIGHT = 50;
    uint256 private _preSwapWrappedSonicBalance;

    // Shadow Uniswap V3 fork pools
    mapping(address => bool) public isShadowV3Pool;
    address[] public shadowV3Pools;

    // Fee structure
    struct Fees {
        uint256 jackpotFee; // Fee for jackpot (basis points)
        uint256 ve69LPFee;  // Fee for ve69LP (basis points)
        uint256 burnFee;    // Fee for burning (basis points)
        uint256 totalFee;   // Total fee (basis points)
    }

    // BeetsLP concentrated liquidity pool fee structure
    struct BeetsLPFees {
        uint256 jackpotFee; // Fee for jackpot (basis points)
        uint256 ve69LPFee;  // Fee for ve69LP (basis points)
        uint256 totalFee;   // Total fee (basis points)
    }

    // Fixed fee values according to tokenomics
    Fees public buyFees = Fees(690, 241, 69, 1000);  
    // 10% total - 6.9% to jackpot, 2.41% to ve69LPfeedistributor, 0.69% burn
    Fees public sellFees = Fees(690, 241, 69, 1000); 
    // 10% total - 6.9% to jackpot, 2.41% to ve69LPfeedistributor, 0.69% burn
    BeetsLPFees public beetsLPFees = BeetsLPFees(476, 214, 690);
    // 6.9% total - 4.76% to jackpot (69% of 6.9%), 2.14% to ve69LP (31% of 6.9%)
    
    // Pool state
    uint256 public spotPrice; // Current spot price
    uint256 public dragonPoolBalance;     // Current amount of Dragon in the pool
    uint256 public wrappedSonicPoolBalance;  // Current amount of wS in the pool
    uint256 public weightRatio;          // Ratio of Dragon weight to wS weight

    // Fee tracking
    mapping(address => bool) public isExcludedFromFees;
    
    // Action timelock
    mapping(bytes32 => uint256) public pendingActions;
    uint256 public constant ACTION_DELAY = 7 days;
    
    // Initialize flags
    bool public jackpotAddressInitialized = false;
    bool public ve69LPFeeDistributorInitialized = false;
    bool public wrappedSonicAddressInitialized = false;
    bool public goldScratcherInitialized = false;
    bool public multisigAddressInitialized = false;

    // Winning scratcher registry
    mapping(uint256 => bool) public winningScratcherIds;

    // ======== Events ========
    event FeesUpdated(string feeType, uint256 jackpotFee, uint256 ve69LPFee, uint256 burnFee, uint256 totalFee);
    event BeetsLPFeesUpdated(uint256 jackpotFee, uint256 ve69LPFee, uint256 totalFee);
    event FeeDistributed(uint256 feeType, uint256 amount);
    event ExcludedFromFees(address indexed account, bool isExcluded);
    event ActionQueued(bytes32 actionId, string actionType, uint256 executionTime);
    event ActionCancelled(bytes32 actionId, string reason);
    event ActionExecuted(bytes32 actionId, string actionType);
    event JackpotAddressUpdated(address indexed newAddress);
    event Ve69LPFeeDistributorUpdated(address indexed newAddress);
    event WrappedSonicAddressUpdated(address indexed newAddress);
    event LotteryAddressUpdated(address indexed newAddress);
    event ExchangePairUpdated(address indexed newAddress);
    event GoldScratcherAddressUpdated(address indexed newAddress);
    event MultisigAddressUpdated(address indexed newAddress);
    event ShadowV3PoolAdded(address indexed pool);
    event ShadowV3PoolRemoved(address indexed pool);
    event SwapDetected(
        address indexed from, 
        address indexed to, 
        bool isWrappedSonicToTokenSwap, 
        uint256 wrappedSonicAmount
    );
    event PoolInitialized(uint256 dragonBalance, uint256 wrappedSonicBalance, uint256 spotPrice);
    event PoolBalancesUpdated(uint256 dragonBalance, uint256 wrappedSonicBalance, uint256 spotPrice);
    event SwapExecuted(
        address indexed user, 
        uint256 dragonAmount, 
        uint256 wrappedSonicAmount, 
        uint256 spotPrice, 
        bool isDragonToWrappedSonic
    );
    event WinningScratcherRegistered(uint256 indexed scratcherId);
    event PoolAdded(address indexed pool);
    event PoolRemoved(address indexed pool);
    event FeeTransferred(address indexed recipient, uint256 amount, string feeType);
    event TokensBurned(uint256 amount);

    /**
     * @dev Constructor
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param _jackpotVault Address of the jackpot vault
     * @param _ve69LPFeeDistributor Address of the ve69LP fee distributor
     * @param _wrappedSonicAddress Address of the wrapped Sonic token
     * @param _multisigAddress Address of the multisig wallet
     */
    constructor(
        string memory name_,
        string memory symbol_,
        address _jackpotVault,
        address _ve69LPFeeDistributor,
        address _wrappedSonicAddress,
        address _multisigAddress
    ) ERC20(name_, symbol_) Ownable() {
        require(_jackpotVault != address(0), "Jackpot vault cannot be zero address");
        require(_ve69LPFeeDistributor != address(0), "ve69LP fee distributor cannot be zero address");
        require(_wrappedSonicAddress != address(0), "Wrapped Sonic address cannot be zero address");
        require(_multisigAddress != address(0), "Multisig address cannot be zero address");

        // Set addresses
        jackpotVault = _jackpotVault;
        ve69LPFeeDistributor = _ve69LPFeeDistributor;
        wrappedSonicAddress = _wrappedSonicAddress;
        multisigAddress = _multisigAddress;
        wrappedSonic = IERC20(_wrappedSonicAddress);
        dragonToken = IERC20(address(this));

        // Exclude from fees
        _excludeFromFees(address(this), true);
        _excludeFromFees(msg.sender, true);
        _excludeFromFees(_jackpotVault, true);
        _excludeFromFees(_ve69LPFeeDistributor, true);
        _excludeFromFees(_multisigAddress, true);
        
        // Initialize flags
        jackpotAddressInitialized = true;
        ve69LPFeeDistributorInitialized = true;
        wrappedSonicAddressInitialized = true;
        multisigAddressInitialized = true;
        
        // Set the weight ratio
        weightRatio = DRAGON_WEIGHT * EXCHANGE_RATE_PRECISION / WRAPPED_SONIC_WEIGHT;
    }

    /**
     * @dev Registers a winning scratcher - only callable by goldScratcher
     * @param scratcherId ID of the winning scratcher
     */
    function registerWinningScratcher(uint256 scratcherId) external {
        require(msg.sender == goldScratcherAddress, "Only Gold Scratcher contract can register winning scratchers");
        winningScratcherIds[scratcherId] = true;
        emit WinningScratcherRegistered(scratcherId);
    }

    /**
     * @dev Sets the gold scratcher address
     * @param _goldScratcherAddress Address of the Gold Scratcher contract
     */
    function setGoldScratcherAddress(address _goldScratcherAddress) external onlyOwner {
        require(_goldScratcherAddress != address(0), "Gold Scratcher address cannot be zero");
        goldScratcherAddress = _goldScratcherAddress;
        goldScratcherInitialized = true;
        emit GoldScratcherAddressUpdated(_goldScratcherAddress);
    }

    /**
     * @dev Sets the exchange pair address
     * @param _exchangePair Address of the exchange pair
     */
    function setExchangePair(address _exchangePair) external onlyOwner {
        require(_exchangePair != address(0), "Exchange pair cannot be zero address");
        exchangePair = _exchangePair;
        emit ExchangePairUpdated(_exchangePair);
    }

    /**
     * @dev Sets the lottery address
     * @param _lotteryAddress Address of the lottery contract
     */
    function setLotteryAddress(address _lotteryAddress) external onlyOwner {
        require(_lotteryAddress != address(0), "Lottery address cannot be zero address");
        lotteryAddress = _lotteryAddress;
        emit LotteryAddressUpdated(_lotteryAddress);
    }

    /**
     * @dev Excludes an account from fees
     * @param account Address to exclude
     * @param excluded Whether to exclude or include
     */
    function excludeFromFees(address account, bool excluded) external onlyOwner {
        _excludeFromFees(account, excluded);
    }

    /**
     * @dev Internal function to exclude an account from fees
     * @param account Address to exclude from fees
     * @param excluded Boolean indicating if the account should be excluded
     */
    function _excludeFromFees(address account, bool excluded) internal {
        isExcludedFromFees[account] = excluded;
        emit ExcludedFromFees(account, excluded);
    }

    /**
     * @dev Sets the buy fees
     * @param _jackpotFee Fee to jackpot
     * @param _ve69LPFee Fee to ve69LP
     * @param _burnFee Fee to burn
     */
    function setBuyFees(
        uint256 _jackpotFee,
        uint256 _ve69LPFee,
        uint256 _burnFee
    ) external override onlyOwner {
        require(_jackpotFee + _ve69LPFee + _burnFee <= 2000, "Total fee cannot exceed 20%");
        
        buyFees.jackpotFee = _jackpotFee;
        buyFees.ve69LPFee = _ve69LPFee;
        buyFees.burnFee = _burnFee;
        buyFees.totalFee = _jackpotFee + _ve69LPFee + _burnFee;
        
        emit FeesUpdated("Buy", _jackpotFee, _ve69LPFee, _burnFee, buyFees.totalFee);
    }

    /**
     * @dev Sets the sell fees
     * @param _jackpotFee Fee to jackpot
     * @param _ve69LPFee Fee to ve69LP
     * @param _burnFee Fee to burn
     */
    function setSellFees(
        uint256 _jackpotFee,
        uint256 _ve69LPFee,
        uint256 _burnFee
    ) external override onlyOwner {
        require(_jackpotFee + _ve69LPFee + _burnFee <= 2000, "Total fee cannot exceed 20%");
        
        sellFees.jackpotFee = _jackpotFee;
        sellFees.ve69LPFee = _ve69LPFee;
        sellFees.burnFee = _burnFee;
        sellFees.totalFee = _jackpotFee + _ve69LPFee + _burnFee;
        
        emit FeesUpdated("Sell", _jackpotFee, _ve69LPFee, _burnFee, sellFees.totalFee);
    }

    /**
     * @dev Gets the buy fees
     * @return jackpotFee Fee to jackpot
     * @return ve69LPFee Fee to ve69LP
     * @return burnFee Fee to burn
     * @return totalFee Total fee
     */
    function getBuyFees() external view override returns (
        uint256 jackpotFee,
        uint256 ve69LPFee,
        uint256 burnFee,
        uint256 totalFee
    ) {
        return (buyFees.jackpotFee, buyFees.ve69LPFee, buyFees.burnFee, buyFees.totalFee);
    }

    /**
     * @dev Gets the sell fees
     * @return jackpotFee Fee to jackpot
     * @return ve69LPFee Fee to ve69LP
     * @return burnFee Fee to burn
     * @return totalFee Total fee
     */
    function getSellFees() external view override returns (
        uint256 jackpotFee,
        uint256 ve69LPFee,
        uint256 burnFee,
        uint256 totalFee
    ) {
        return (sellFees.jackpotFee, sellFees.ve69LPFee, sellFees.burnFee, sellFees.totalFee);
    }

    /**
     * @dev Override of the ERC20 transfer function to add fee mechanics
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return success Whether the transfer was successful
     */
    function transfer(address to, uint256 amount) public override(ERC20, IERC20) returns (bool) {
        return _transferWithFees(msg.sender, to, amount);
    }

    /**
     * @dev Override of the ERC20 transferFrom function to add fee mechanics
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return success Whether the transfer was successful
     */
    function transferFrom(address from, address to, uint256 amount) public override(ERC20, IERC20) returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        return _transferWithFees(from, to, amount);
    }

    /**
     * @dev Internal function to handle transfers with fees
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return success Whether the transfer was successful
     */
    function _transferWithFees(address from, address to, uint256 amount) internal returns (bool) {
        require(from != address(0), "Transfer from the zero address");
        require(to != address(0), "Transfer to the zero address");
        
        // Detect swaps for lottery potential
        if ((from == exchangePair || to == exchangePair) && exchangePair != address(0)) {
            bool isWrappedSonicToTokenSwap = to != exchangePair; // If to is not exchange, it's a buy
            uint256 wrappedSonicAmount = 0; // Amount would be set in production
            
            emit SwapDetected(from, to, isWrappedSonicToTokenSwap, wrappedSonicAmount);
        }
        
        // No fees for excluded accounts
        if (isExcludedFromFees[from] || isExcludedFromFees[to]) {
            _transfer(from, to, amount);
            return true;
        }
        
        // Standard 0.69% burn on all transfers
        uint256 burnAmount = (amount * 69) / 10000; // 0.69% burn
        
        if (burnAmount > 0) {
            super._burn(from, burnAmount);
        }
        
        // Transfer remaining amount
        _transfer(from, to, amount - burnAmount);
        return true;
    }

    /**
     * @dev Owner can mint new tokens (for pool seeding, etc.)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external override onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Implement burn function from IDragon interface
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override(ERC20Burnable, IDragon) {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Queue a new action with timelock
     * @param actionType Type of the action
     * @param data Data for the action
     * @return actionId ID of the queued action
     */
    function queueAction(string memory actionType, bytes memory data) external onlyOwner returns (bytes32) {
        bytes32 actionId = keccak256(abi.encodePacked(actionType, data, block.timestamp));
        pendingActions[actionId] = block.timestamp + ACTION_DELAY;
        
        emit ActionQueued(actionId, actionType, block.timestamp + ACTION_DELAY);
        return actionId;
    }
    
    /**
     * @dev Cancel a queued action
     * @param actionId ID of the action to cancel
     * @param reason Reason for cancellation
     */
    function cancelAction(bytes32 actionId, string memory reason) external onlyOwner {
        require(pendingActions[actionId] > 0, "Action not queued");
        require(pendingActions[actionId] > block.timestamp, "Action already executed");
        
        delete pendingActions[actionId];
        emit ActionCancelled(actionId, reason);
    }
    
    /**
     * @dev Check if an action is ready to be executed
     * @param actionId ID of the action
     * @return True if action can be executed
     */
    function canExecuteAction(bytes32 actionId) public view returns (bool) {
        return pendingActions[actionId] > 0 && 
               pendingActions[actionId] <= block.timestamp;
    }

    /**
     * @dev Set jackpot address, without timelock for first setup
     * @param _jackpotVault New jackpot vault address
     */
    function setJackpotVault(address _jackpotVault) external onlyOwner {
        require(_jackpotVault != address(0), "Jackpot vault cannot be zero address");
        
        // First-time setup bypasses timelock
        if (!jackpotAddressInitialized) {
            jackpotVault = _jackpotVault;
            jackpotAddressInitialized = true;
            emit JackpotAddressUpdated(_jackpotVault);
            return;
        }
        
        // For subsequent changes, we need to queue it
        bytes32 actionId = keccak256(abi.encodePacked("setJackpotVault", _jackpotVault, block.timestamp));
        pendingActions[actionId] = block.timestamp + ACTION_DELAY;
        emit ActionQueued(actionId, "Set Jackpot Vault Address", block.timestamp + ACTION_DELAY);
    }
    
    /**
     * @dev Execute jackpot vault change after timelock
     * @param actionId ID of the queued action
     * @param _jackpotVault New jackpot vault address
     */
    function executeJackpotVaultChange(bytes32 actionId, address _jackpotVault) external onlyOwner {
        require(canExecuteAction(actionId), "Action cannot be executed yet");
        require(_jackpotVault != address(0), "Jackpot vault cannot be zero");
        
        delete pendingActions[actionId];
        jackpotVault = _jackpotVault;
        
        emit JackpotAddressUpdated(_jackpotVault);
        emit ActionExecuted(actionId, "Set Jackpot Vault Address");
    }

    /**
     * @dev Set ve69LP fee distributor address, without timelock for first setup
     * @param _ve69LPFeeDistributor New ve69LP fee distributor address
     */
    function setVe69LPFeeDistributor(address _ve69LPFeeDistributor) external onlyOwner {
        require(_ve69LPFeeDistributor != address(0), "ve69LP fee distributor address cannot be zero");
        
        // First-time setup bypasses timelock
        if (!ve69LPFeeDistributorInitialized) {
            ve69LPFeeDistributor = _ve69LPFeeDistributor;
            ve69LPFeeDistributorInitialized = true;
            emit Ve69LPFeeDistributorUpdated(_ve69LPFeeDistributor);
            return;
        }
        
        // For subsequent changes, we need to queue it
        bytes32 actionId = keccak256(abi.encodePacked(
            "setVe69LPFeeDistributor", 
            _ve69LPFeeDistributor, 
            block.timestamp
        ));
        pendingActions[actionId] = block.timestamp + ACTION_DELAY;
        emit ActionQueued(actionId, "Set ve69LP Fee Distributor Address", block.timestamp + ACTION_DELAY);
    }
    
    /**
     * @dev Execute ve69LP fee distributor address change after timelock
     * @param actionId ID of the queued action
     * @param _ve69LPFeeDistributor New ve69LP fee distributor address
     */
    function executeVe69LPFeeDistributorChange(bytes32 actionId, address _ve69LPFeeDistributor) external onlyOwner {
        require(canExecuteAction(actionId), "Action cannot be executed yet");
        require(_ve69LPFeeDistributor != address(0), "ve69LP fee distributor address cannot be zero");
        
        delete pendingActions[actionId];
        ve69LPFeeDistributor = _ve69LPFeeDistributor;
        
        emit Ve69LPFeeDistributorUpdated(_ve69LPFeeDistributor);
        emit ActionExecuted(actionId, "Set ve69LP Fee Distributor Address");
    }
    
    /**
     * @dev Set wrapped Sonic address, without timelock for first setup
     * @param _wrappedSonicAddress New wrapped Sonic address
     */
    function setWrappedSonicAddress(address _wrappedSonicAddress) external onlyOwner {
        require(_wrappedSonicAddress != address(0), "wS address cannot be zero");
        
        // First-time setup bypasses timelock
        if (!wrappedSonicAddressInitialized) {
            wrappedSonicAddress = _wrappedSonicAddress;
            wrappedSonic = IERC20(_wrappedSonicAddress);
            wrappedSonicAddressInitialized = true;
            emit WrappedSonicAddressUpdated(_wrappedSonicAddress);
            return;
        }
        
        // For subsequent changes, we need to queue it
        bytes32 actionId = keccak256(abi.encodePacked("setWrappedSonicAddress", _wrappedSonicAddress, block.timestamp));
        pendingActions[actionId] = block.timestamp + ACTION_DELAY;
        emit ActionQueued(actionId, "Set wS Address", block.timestamp + ACTION_DELAY);
    }
    
    /**
     * @dev Execute wrapped Sonic address change after timelock
     * @param actionId ID of the queued action
     * @param _wrappedSonicAddress New wrapped Sonic address
     */
    function executeWrappedSonicAddressChange(bytes32 actionId, address _wrappedSonicAddress) external onlyOwner {
        require(canExecuteAction(actionId), "Action cannot be executed yet");
        require(_wrappedSonicAddress != address(0), "wS address cannot be zero");
        
        delete pendingActions[actionId];
        wrappedSonicAddress = _wrappedSonicAddress;
        wrappedSonic = IERC20(_wrappedSonicAddress);
        
        emit WrappedSonicAddressUpdated(_wrappedSonicAddress);
        emit ActionExecuted(actionId, "Set wS Address");
    }

    /**
     * @dev Check if critical addresses are initialized
     * @return True if all critical addresses are initialized
     */
    function areAddressesInitialized() public view returns (bool) {
        return jackpotAddressInitialized && 
               ve69LPFeeDistributorInitialized && 
               wrappedSonicAddressInitialized;
    }

    /**
     * @dev Processes a buy transaction (internal function)
     * @param user User address
     * @param wrappedSonicAmount wS amount
     */
    function processBuy(address user, uint256 wrappedSonicAmount) internal {
        if (lotteryAddress != address(0) && user == tx.origin) {
            // Only trigger lottery on valid swaps and for actual user (not contracts)
            IDragonLotterySwap lottery = IDragonLotterySwap(lotteryAddress);
            lottery.secureProcessBuy(user, wrappedSonicAmount);
        }
    }

    /**
     * @dev Processes a swap with a scratcher (internal function)
     * @param user User address
     * @param wrappedSonicAmount wS amount
     * @param scratcherId Scratcher ID
     */
    function processSwapWithScratcher(address user, uint256 wrappedSonicAmount, uint256 scratcherId) internal {
        // Check if scratcher is valid and apply boost if appropriate
        if (goldScratcherAddress != address(0) && scratcherId > 0) {
            // Apply scratcher boost logic would go here
        }
        
        // Process base buy after scratcher logic
        processBuy(user, wrappedSonicAmount);
    }

    /**
     * @dev Processes a swap with a promotion (internal function)
     * @param user User address
     * @param wrappedSonicAmount wS amount
     * @param promotionalItem Promotional item interface
     * @param itemId Item ID
     */
    function processSwapWithPromotion(
        address user,
        uint256 wrappedSonicAmount,
        IPromotionalItem promotionalItem,
        uint256 itemId
    ) internal {
        // Apply promotional item boost if valid
        if (address(promotionalItem) != address(0) && itemId > 0) {
            // Apply promotion boost logic here
            (bool success, uint256 boostedAmount) = promotionalItem.applyItem(itemId, user, wrappedSonicAmount);
            if (success) {
                // Use boosted amount for lottery entry
                wrappedSonicAmount = boostedAmount;
            }
        }
        
        // Process base buy after promotion logic
        processBuy(user, wrappedSonicAmount);
    }

    /**
     * @dev Processes an entry (internal function)
     * @param user User address
     * @param wrappedSonicAmount wS amount
     * @param scratcherId Scratcher ID
     * @param promotionalItem Promotional item interface
     * @param itemId Item ID
     */
    function processEntry(
        address user,
        uint256 wrappedSonicAmount,
        uint256 scratcherId,
        IPromotionalItem promotionalItem,
        uint256 itemId
    ) internal {
        // Apply both scratcher and promotional item if available
        uint256 effectiveAmount = wrappedSonicAmount;
        
        // Apply scratcher boost
        if (goldScratcherAddress != address(0) && scratcherId > 0) {
            // Scratcher logic would go here
        }
        
        // Apply promotional item boost
        if (address(promotionalItem) != address(0) && itemId > 0) {
            (bool success, uint256 boostedAmount) = promotionalItem.applyItem(itemId, user, effectiveAmount);
            if (success) {
                effectiveAmount = boostedAmount;
            }
        }
        
        // Process with final boosted amount
        processBuy(user, effectiveAmount);
    }

    /**
     * @dev Sets an address as a liquidity pool
     * @param poolAddress Address of the liquidity pool
     * @param isPool Boolean indicating if the address is a pool
     */
    function setLiquidityPool(address poolAddress, bool isPool) external onlyOwner {
        require(poolAddress != address(0), "Pool address cannot be zero address");
        isExcludedFromFees[poolAddress] = isPool;
        
        if (isPool) {
            emit PoolAdded(poolAddress);
        } else {
            emit PoolRemoved(poolAddress);
        }
    }

    /**
     * @dev Sets a pool as a Shadow's Uniswap V3 fork pool
     * @param poolAddress Address of the Shadow V3 pool
     * @param isV3Pool Boolean indicating if the address is a Shadow V3 pool
     */
    function setShadowV3Pool(address poolAddress, bool isV3Pool) external onlyOwner {
        require(poolAddress != address(0), "Pool address cannot be zero address");
        
        if (isV3Pool && !isShadowV3Pool[poolAddress]) {
            isShadowV3Pool[poolAddress] = true;
            shadowV3Pools.push(poolAddress);
            emit ShadowV3PoolAdded(poolAddress);
        } else if (!isV3Pool && isShadowV3Pool[poolAddress]) {
            isShadowV3Pool[poolAddress] = false;
            
            // Remove from array
            for (uint i = 0; i < shadowV3Pools.length; i++) {
                if (shadowV3Pools[i] == poolAddress) {
                    shadowV3Pools[i] = shadowV3Pools[shadowV3Pools.length - 1];
                    shadowV3Pools.pop();
                    break;
                }
            }
            
            emit ShadowV3PoolRemoved(poolAddress);
        }
    }

    /**
     * @dev Sets BeetsLP fees for Shadow's Uniswap V3 fork pools
     * @param _jackpotFee Fee to jackpot (basis points)
     * @param _ve69LPFee Fee to ve69LP (basis points)
     */
    function setBeetsLPFees(
        uint256 _jackpotFee,
        uint256 _ve69LPFee
    ) external onlyOwner {
        require(_jackpotFee + _ve69LPFee <= 1000, "Total fee cannot exceed 10%");
        
        beetsLPFees.jackpotFee = _jackpotFee;
        beetsLPFees.ve69LPFee = _ve69LPFee;
        beetsLPFees.totalFee = _jackpotFee + _ve69LPFee;
        
        emit BeetsLPFeesUpdated(_jackpotFee, _ve69LPFee, beetsLPFees.totalFee);
    }

    /**
     * @dev Gets the BeetsLP fees
     * @return jackpotFee Fee to jackpot
     * @return ve69LPFee Fee to ve69LP
     * @return totalFee Total fee
     */
    function getBeetsLPFees() external view returns (
        uint256 jackpotFee,
        uint256 ve69LPFee,
        uint256 totalFee
    ) {
        return (beetsLPFees.jackpotFee, beetsLPFees.ve69LPFee, beetsLPFees.totalFee);
    }

    /**
     * @dev Override the _update function to apply fees on transfers
     */
    function _update(
        address from, 
        address to, 
        uint256 amount
    ) internal override {
        if (
            amount == 0 ||
            isExcludedFromFees[from] || 
            isExcludedFromFees[to]
        ) {
            super._update(from, to, amount);
            return;
        }
        
        // Determine fee type
        if (isExcludedFromFees[from]) {
            // This is a buy transaction
            _handleBuyFees(from, to, amount);
        } else if (isExcludedFromFees[to]) {
            // This is a sell transaction
            _handleSellFees(from, to, amount);
        } else {
            // This is a regular transfer
            _handleTransferFees(from, to, amount);
        }
    }
    
    /**
     * @dev Handles fees for buy transactions
     * @param from Address tokens are coming from (the pool)
     * @param to Address tokens are going to (the buyer)
     * @param amount Amount of tokens being transferred
     */
    function _handleBuyFees(address from, address to, uint256 amount) internal {
        // Check if the transaction is from a Shadow V3 pool
        if (isShadowV3Pool[from]) {
            _handleBeetsLPFees(from, to, amount, true);
            return;
        }
        
        // Standard buy fees
        uint256 jackpotFee = (amount * buyFees.jackpotFee) / 10000;
        uint256 ve69LPFee = (amount * buyFees.ve69LPFee) / 10000;
        uint256 netAmount = amount - jackpotFee - ve69LPFee;
        
        // Transfer tokens to the recipient with fees deducted
        super._update(from, to, netAmount);
        
        // Process jackpot fee
        if (jackpotFee > 0) {
            super._update(from, jackpotVault, jackpotFee);
            emit FeeTransferred(jackpotVault, jackpotFee, "BUY_JACKPOT");
        }
        
        // Process ve69LP fee
        if (ve69LPFee > 0) {
            super._update(from, ve69LPFeeDistributor, ve69LPFee);
            emit FeeTransferred(ve69LPFeeDistributor, ve69LPFee, "BUY_VE69LP");
        }
    }
    
    /**
     * @dev Handles fees for sell transactions
     * @param from Address tokens are coming from (the seller)
     * @param to Address tokens are going to (the pool)
     * @param amount Amount of tokens being transferred
     */
    function _handleSellFees(address from, address to, uint256 amount) internal {
        // Check if the transaction is to a Shadow V3 pool
        if (isShadowV3Pool[to]) {
            _handleBeetsLPFees(from, to, amount, false);
            return;
        }
        
        // Standard sell fees
        uint256 jackpotFee = (amount * sellFees.jackpotFee) / 10000;
        uint256 ve69LPFee = (amount * sellFees.ve69LPFee) / 10000;
        uint256 netAmount = amount - jackpotFee - ve69LPFee;
        
        // Transfer tokens to the recipient with fees deducted
        super._update(from, to, netAmount);
        
        // Process jackpot fee
        if (jackpotFee > 0) {
            super._update(from, jackpotVault, jackpotFee);
            emit FeeTransferred(jackpotVault, jackpotFee, "SELL_JACKPOT");
        }
        
        // Process ve69LP fee
        if (ve69LPFee > 0) {
            super._update(from, ve69LPFeeDistributor, ve69LPFee);
            emit FeeTransferred(ve69LPFeeDistributor, ve69LPFee, "SELL_VE69LP");
        }
    }
    
    /**
     * @dev Handles fees for BeetsLP transactions (Shadow's Uniswap V3 fork pools)
     * @param from Address tokens are coming from
     * @param to Address tokens are going to
     * @param amount Amount of tokens being transferred
     * @param isBuy Whether the transaction is a buy or sell
     */
    function _handleBeetsLPFees(address from, address to, uint256 amount, bool isBuy) internal {
        // Calculate fees using BeetsLP fee structure (6.9% total)
        uint256 jackpotFee = (amount * beetsLPFees.jackpotFee) / 10000;
        uint256 ve69LPFee = (amount * beetsLPFees.ve69LPFee) / 10000;
        uint256 netAmount = amount - jackpotFee - ve69LPFee;
        
        // Transfer tokens to the recipient with fees deducted
        super._update(from, to, netAmount);
        
        // Process jackpot fee
        if (jackpotFee > 0) {
            super._update(from, jackpotVault, jackpotFee);
            emit FeeTransferred(jackpotVault, jackpotFee, isBuy ? "BEETSV3_BUY_JACKPOT" : "BEETSV3_SELL_JACKPOT");
        }
        
        // Process ve69LP fee
        if (ve69LPFee > 0) {
            super._update(from, ve69LPFeeDistributor, ve69LPFee);
            emit FeeTransferred(ve69LPFeeDistributor, ve69LPFee, isBuy ? "BEETSV3_BUY_VE69LP" : "BEETSV3_SELL_VE69LP");
        }
    }
    
    /**
     * @dev Handles fees for regular transfer transactions
     * @param from Address tokens are coming from
     * @param to Address tokens are going to
     * @param amount Amount of tokens being transferred
     */
    function _handleTransferFees(address from, address to, uint256 amount) internal {
        // Calculate burn fee
        uint256 burnAmount = (amount * buyFees.burnFee) / 10000;
        uint256 netAmount = amount - burnAmount;
        
        // Transfer tokens to the recipient with fees deducted
        super._update(from, to, netAmount);
        
        // Burn the fee
        if (burnAmount > 0) {
            super._update(from, address(0), burnAmount);
            emit TokensBurned(burnAmount);
        }
    }

    // Implementation of IDragon interface functions

    /**
     * @dev Hook to be called after a swap to trigger the lottery
     * @param from The address that sent the tokens
     * @param to The address that received the tokens
     * @param amount The amount of tokens transferred
     */
    function afterSwap(address from, address to, uint256 amount) external override {
        // Implementation would go here
    }
    
    /**
     * @dev Add the VRF connector to handle lottery requests
     * @param vrfConnector The address of the VRF connector
     */
    function setVRFConnector(address vrfConnector) external override onlyOwner {
        // Implementation would go here
    }
    
    /**
     * @dev Add to the jackpot balance
     * @param amount The amount to add to the jackpot
     */
    function addToJackpot(uint256 amount) external override {
        // Implementation would go here
    }
}
