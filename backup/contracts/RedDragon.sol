// SPDX-License-Identifier: MIT
// Fair, Verifiable, Simple
// https://x.com/sonicreddragon
// https://t.me/sonicreddragon

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/IRedDragonSwapLottery.sol";

/**
 * @title RedDragon
 * @dev A deflationary ERC20 token with transparent fee distribution
 * Fixed 10% total fee on buys and sells:
 * - 6.9% jackpot
 * - 2.41% ve8020
 * - 0.69% burned (sent to dead address)
 * No minting, no blacklist, no fee exclusions, no hidden fees
 */
contract RedDragon is ERC20, Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeMath for uint256;
    
    // Constants
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MAX_LOCK_DURATION = 365 days;
    uint256 public constant MAX_SPECIAL_TRANSACTION_AMOUNT = 1000000 * 10**18;
    uint256 public constant MAX_TRANSACTION_AMOUNT = 10000000 * 10**18;
    uint256 public constant MAX_TOTAL_FEE = 1000; // 10%
    uint256 public constant INITIAL_SUPPLY = 6_942_000 * 10**18;
    uint256 public constant SPECIAL_LIMIT_TRANSACTIONS = 69;
    uint256 public constant SPECIAL_WALLET_LIMIT_PERCENT = 100; // 1%
    uint256 public constant POST_SPECIAL_WALLET_LIMIT_PERCENT = 1000; // 10%
    uint256 public constant FEE_UPDATE_DELAY = 24 hours;
    uint256 public constant ADMIN_ACTION_DELAY = 24 hours;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // State variables
    uint256 public transactionCount;
    uint256 public lastFeeUpdate;
    uint256 public totalBurned;
    uint256 public totalJackpotFees;
    uint256 public totalVe8020Fees;
    uint256 public launchTimestamp;
    uint256 public totalHolders;
    
    // Fee tracking variables for current transaction
    uint256 private _jackpotFee;
    uint256 private _burnFee;
    uint256 private _ve8020Fee;
    uint256 private _totalFee;

    // Buy fees (in basis points, 100 = 1%)
    uint256 public buyBurnFee = 69;        // 0.69% = 69 basis points
    uint256 public buyJackpotFee = 690;    // 6.9% = 690 basis points
    uint256 public buyVe8020Fee = 241;     // 2.41% = 241 basis points
    uint256 public totalFeeBuy = 1000;     // 10% = 1000 basis points
    
    // Sell fees (in basis points, 100 = 1%)
    uint256 public sellBurnFee = 69;       // 0.69% = 69 basis points
    uint256 public sellJackpotFee = 690;   // 6.9% = 690 basis points
    uint256 public sellVe8020Fee = 241;    // 2.41% = 241 basis points
    uint256 public totalFeeSell = 1000;    // 10% = 1000 basis points

    // Regular Fees
    uint256 public jackpotFeeRegular;
    uint256 public burnFeeRegular;
    uint256 public ve8020FeeRegular;
    uint256 public totalFeeRegular;
    
    // Current Fees
    uint256 public jackpotFee;
    uint256 public burnFee;
    uint256 public ve8020Fee;
    uint256 public totalFee;
    
    // Addresses
    address public jackpotAddress;
    address public ve8020Address;
    address public burnAddress;
    address public wrappedSonicAddress;
    address public exchangePair;
    address public lotteryAddress;

    // Trading state
    bool public tradingEnabled = false;
    bool public tradingEnabledPermanently = false;
    bool private inSwap = false;
    bool private _transferOptimization = true;
    bool public ownershipLocked = false;
    
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
    
    // Events
    event FeesDistributed(uint256 amount);
    event TradingEnabled(bool enabled);
    event ExchangePairSet(address indexed pair);
    event SwapDetected(address indexed from, address indexed to, bool isWStoTokenSwap, uint256 wsAmount);
    event SwapDebug(string message, uint256 value);
    event SpecialTransactionPeriodEnded(uint256 timestamp);
    event ActionScheduled(bytes32 indexed actionId, string actionDescription, uint256 executionTime);
    event ActionExecuted(bytes32 indexed actionId, string actionDescription);
    event ActionCancelled(bytes32 indexed actionId, string actionDescription);
    event OwnershipRenounced();
    event Ve8020AddressUpdated(address indexed newAddress);
    event OwnershipLocked(uint256 duration);
    event TokensTransferred(
        address indexed from,
        address indexed to,
        uint256 transferAmount,
        uint256 burnAmount,
        uint256 jackpotAmount,
        uint256 veAmount
    );
    event FeeCollected(address indexed from, uint256 burnAmount, uint256 jackpotAmount, uint256 ve8020Amount);
    event BuyFeesUpdated(uint256 burnFee, uint256 jackpotFee, uint256 ve8020Fee);
    event SellFeesUpdated(uint256 burnFee, uint256 jackpotFee, uint256 ve8020Fee);
    event FeeExemptUpdated(address indexed account, bool exempt);
    
    // Fee structure
    uint256 public constant SPECIAL_WALLET_LIMIT = INITIAL_SUPPLY * 69 / 10000;    // 0.69% of initial supply
    uint256 public constant POST_SPECIAL_WALLET_LIMIT = INITIAL_SUPPLY * 420 / 10000; // 4.20% of initial supply
    uint256 public constant SPECIAL_TRANSACTION_COUNT = 69;  // Number of special transactions
    
    // Track wS balance before and after swap to calculate the exact wS amount used
    uint256 private _preBuyWSBalance;
    bool private _trackingBuy;
    
    /**
     * @dev Constructor to initialize the token with transparent security features
     */
    constructor(
        address _jackpotAddress,
        address _ve8020Address,
        address _burnAddress,
        address _wrappedSonicAddress
    ) ERC20("Red Dragon", "DRAGON") {
        require(_jackpotAddress != address(0), "Jackpot address cannot be zero");
        require(_ve8020Address != address(0), "Ve8020 address cannot be zero");
        require(_burnAddress != address(0), "Burn address cannot be zero");
        require(_wrappedSonicAddress != address(0), "Wrapped Sonic address cannot be zero");

        jackpotAddress = _jackpotAddress;
        ve8020Address = _ve8020Address;
        burnAddress = _burnAddress;
        wrappedSonicAddress = _wrappedSonicAddress;
        wrappedSonic = IERC20(_wrappedSonicAddress);

        // Set initial fee exemptions
        isFeeExempt[address(this)] = true;

        // Initialize exchange pair
        exchangePair = address(0);

        // Initialize buy fees (10% total)
        buyJackpotFee = 690; // 6.9%
        buyBurnFee = 69;     // 0.69%
        buyVe8020Fee = 241;  // 2.41%
        totalFeeBuy = buyJackpotFee + buyBurnFee + buyVe8020Fee;

        // Initialize sell fees (10% total)
        sellJackpotFee = 690; // 6.9%
        sellBurnFee = 69;     // 0.69%
        sellVe8020Fee = 241;  // 2.41%
        totalFeeSell = sellJackpotFee + sellBurnFee + sellVe8020Fee;

        // Initialize regular fees (1% total)
        jackpotFeeRegular = 69;  // 0.69%
        burnFeeRegular = 7;      // 0.07%
        ve8020FeeRegular = 24;   // 0.24%
        totalFeeRegular = 100;   // 1%

        // Set initial fee values
        jackpotFee = jackpotFeeRegular;
        burnFee = burnFeeRegular;
        ve8020Fee = ve8020FeeRegular;
        totalFee = totalFeeRegular;

        // Mint initial supply to owner
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    /**
     * @dev Sets the exchange pair address
     */
    function setExchangePair(address _exchangePair) external onlyOwner {
        require(_exchangePair != address(0), "Exchange pair cannot be zero address");
        exchangePair = _exchangePair;
        emit ExchangePairSet(_exchangePair);
    }
    
    /**
     * @dev Enables trading permanently - can only be called once
     */
    function enableTrading() external onlyOwner {
        require(!tradingEnabled, "Trading already enabled");
        tradingEnabled = true;
        tradingEnabledPermanently = true;
        emit TradingEnabled(true);
    }
    
    /**
     * @dev Swaps accumulated fees for wS tokens
     */
    function swapFeesForWS() public {
        require(!inSwap, "Already swapping");
        inSwap = true;
        
        uint256 tokenBalance = balanceOf(address(this));
        require(tokenBalance > 0, "No tokens to swap");

        // Calculate fee distribution based on total fee percentages
        uint256 jackpotShare = (tokenBalance * jackpotFee) / totalFee;
        uint256 burnShare = (tokenBalance * burnFee) / totalFee;
        uint256 ve8020Share = tokenBalance - jackpotShare - burnShare;

        // Transfer fees to receivers and track distributions
        if (jackpotShare > 0) {
            super._transfer(address(this), jackpotAddress, jackpotShare);
            _trackFeeDistribution(1, jackpotShare);
            if (lotteryAddress != address(0)) {
                try IRedDragonSwapLottery(lotteryAddress).addToJackpot(jackpotShare) {} catch {}
            }
        }
        if (ve8020Share > 0) {
            super._transfer(address(this), ve8020Address, ve8020Share);
            _trackFeeDistribution(2, ve8020Share);
        }
        if (burnShare > 0) {
            super._transfer(address(this), burnAddress, burnShare);
            _trackFeeDistribution(3, burnShare);
        }
        
        emit FeesDistributed(tokenBalance);
        inSwap = false;
    }
    
    /**
     * @dev Override the _transfer function to implement security measures
     */
    function _transfer(address from, address to, uint256 amount) internal virtual override {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(amount > 0, "Transfer amount must be greater than zero");

        // Check wallet limits if neither address is fee exempt
        if (!isFeeExempt[from] && !isFeeExempt[to]) {
            // Check transaction limit based on special period
            uint256 maxTxAmount;
            uint256 maxWalletAmount;
            
            if (transactionCount < SPECIAL_LIMIT_TRANSACTIONS) {
                // Special period - use fixed limits (0.69% of initial supply)
                maxTxAmount = SPECIAL_WALLET_LIMIT;
                maxWalletAmount = SPECIAL_WALLET_LIMIT;
            } else {
                // Regular period - use percentage limits (4.2% of initial supply)
                maxTxAmount = POST_SPECIAL_WALLET_LIMIT;
                maxWalletAmount = POST_SPECIAL_WALLET_LIMIT;
            }
            
            // Enforce transaction amount limit
            require(amount <= maxTxAmount, "Amount exceeds special transaction limit");
            
            // Enforce recipient wallet limit
            require(balanceOf(to).add(amount) <= maxWalletAmount, "Transfer would exceed recipient wallet limit");
        }

        // Determine fees based on transfer type
        uint256 transferBurnFee = 0;
        uint256 transferJackpotFee = 0;
        uint256 transferVe8020Fee = 0;
        uint256 transferTotalFee = 0;

        if (shouldTakeFee(from)) {
            if (from == exchangePair) {
                // Buy fees
                transferBurnFee = amount.mul(buyBurnFee).div(FEE_DENOMINATOR);
                transferJackpotFee = amount.mul(buyJackpotFee).div(FEE_DENOMINATOR);
                transferVe8020Fee = amount.mul(buyVe8020Fee).div(FEE_DENOMINATOR);
            } else if (to == exchangePair) {
                // Sell fees
                transferBurnFee = amount.mul(sellBurnFee).div(FEE_DENOMINATOR);
                transferJackpotFee = amount.mul(sellJackpotFee).div(FEE_DENOMINATOR);
                transferVe8020Fee = amount.mul(sellVe8020Fee).div(FEE_DENOMINATOR);
            } else {
                // Regular transfer fees
                transferBurnFee = amount.mul(burnFeeRegular).div(FEE_DENOMINATOR);
                transferJackpotFee = amount.mul(jackpotFeeRegular).div(FEE_DENOMINATOR);
                transferVe8020Fee = amount.mul(ve8020FeeRegular).div(FEE_DENOMINATOR);
            }
            transferTotalFee = transferBurnFee.add(transferJackpotFee).add(transferVe8020Fee);
        }

        // Transfer fees directly to their destinations
        if (transferTotalFee > 0) {
            // Send burn fee directly to burn address
            if (transferBurnFee > 0) {
                super._transfer(from, burnAddress, transferBurnFee);
            }
            
            // Send jackpot fee directly to jackpot address
            if (transferJackpotFee > 0) {
                super._transfer(from, jackpotAddress, transferJackpotFee);
            }
            
            // Send ve8020 fee directly to ve8020 address
            if (transferVe8020Fee > 0) {
                super._transfer(from, ve8020Address, transferVe8020Fee);
            }
            
            emit FeeCollected(from, transferBurnFee, transferJackpotFee, transferVe8020Fee);
        }

        // Transfer remaining amount
        super._transfer(from, to, amount.sub(transferTotalFee));
        
        // Update transaction count
        if (!isFeeExempt[from] && !isFeeExempt[to]) {
            transactionCount = transactionCount.add(1);
        }

        // Handle lottery entry for a user
        if (from == exchangePair && !isFeeExempt[to]) {
            _handleLotteryEntry(to, amount);
        }
    }

    function _distributeFees(uint256 feeAmount) internal {
        // Calculate fee distribution
        uint256 jackpotShare = (feeAmount * jackpotFee) / totalFee;
        uint256 burnShare = (feeAmount * burnFee) / totalFee;
        uint256 ve8020Share = feeAmount - jackpotShare - burnShare;

        // Distribute fees
        if (jackpotShare > 0) {
            super._transfer(address(this), jackpotAddress, jackpotShare);
            _trackFeeDistribution(1, jackpotShare);
            if (lotteryAddress != address(0)) {
                try IRedDragonSwapLottery(lotteryAddress).addToJackpot(jackpotShare) {} catch {}
            }
        }
        if (ve8020Share > 0) {
            super._transfer(address(this), ve8020Address, ve8020Share);
            _trackFeeDistribution(2, ve8020Share);
        }
        if (burnShare > 0) {
            super._transfer(address(this), burnAddress, burnShare);
            _trackFeeDistribution(3, burnShare);
        }

        emit FeesDistributed(feeAmount);
    }

    function buyFees() internal {
        jackpotFee = buyJackpotFee;
        burnFee = buyBurnFee;
        ve8020Fee = buyVe8020Fee;
        totalFee = totalFeeBuy;
    }

    function sellFees() internal {
        jackpotFee = sellJackpotFee;
        burnFee = sellBurnFee;
        ve8020Fee = sellVe8020Fee;
        totalFee = totalFeeSell;
    }

    function regularFees() internal {
        jackpotFee = jackpotFeeRegular;
        burnFee = burnFeeRegular;
        ve8020Fee = ve8020FeeRegular;
        totalFee = totalFeeRegular;
    }

    function shouldTakeFee(address sender) internal view returns (bool) {
        return !isFeeExempt[sender] && tradingEnabled && !inSwap;
    }

    // Admin functions to update fees
    function setBuyFees(uint256 burnFee_, uint256 jackpotFee_, uint256 ve8020Fee_) external onlyOwner {
        require(burnFee_ + jackpotFee_ + ve8020Fee_ <= MAX_TOTAL_FEE, "Total fee too high");
        buyBurnFee = burnFee_;
        buyJackpotFee = jackpotFee_;
        buyVe8020Fee = ve8020Fee_;
        emit BuyFeesUpdated(burnFee_, jackpotFee_, ve8020Fee_);
    }

    function setSellFees(uint256 burnFee_, uint256 jackpotFee_, uint256 ve8020Fee_) external onlyOwner {
        require(burnFee_ + jackpotFee_ + ve8020Fee_ <= MAX_TOTAL_FEE, "Total fee too high");
        sellBurnFee = burnFee_;
        sellJackpotFee = jackpotFee_;
        sellVe8020Fee = ve8020Fee_;
        emit SellFeesUpdated(burnFee_, jackpotFee_, ve8020Fee_);
    }

    function setFeeExempt(address _account, bool _exempt) external onlyOwner {
        isFeeExempt[_account] = _exempt;
        emit FeeExemptUpdated(_account, _exempt);
    }

    /**
     * @dev Override the transfer function to add reentrancy protection
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @dev Override the transferFrom function to add reentrancy protection
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        address spender = msg.sender;
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @dev Sets the inSwap flag - only callable by the pair
     */
    function setInSwap(bool _inSwap) external {
        require(msg.sender == exchangePair, "Only pair can set inSwap");
        inSwap = _inSwap;
    }

    /**
     * @dev Handle lottery entry for a user
     * @param _user Address of the user
     * @param _wsAmount Amount of wS tokens
     */
    function _handleLotteryEntry(address _user, uint256 _wsAmount) private {
        // Ensure lottery contract is set and only allow actual users (not contracts)
        if (lotteryAddress != address(0) && _user == tx.origin && _user.code.length == 0) {
            // Only trigger lottery when swapping FROM wSonic TO DRAGON
            // Check if this transaction is a buy (DRAGON receiving)
            if (exchangePair != address(0) && msg.sender == exchangePair) {
                // Try to process lottery entry
                try IRedDragonSwapLottery(lotteryAddress).processBuy(_user, _wsAmount) {} catch {}
            }
        }
    }
    
    /**
     * @dev Check if an address is a contract
     * @param account Address to check
     * @return bool True if the address is a contract
     */
    function isContract(address account) private view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    // Transfer optimization
    function setTransferOptimization(bool enabled) external onlyOwner {
        _transferOptimization = enabled;
    }
    
    function setOptimizedTransfer(address account, bool enabled) external onlyOwner {
        _optimizedTransfers[account] = enabled;
    }

    function setTradingEnabled(bool _enabled) external onlyOwner {
        require(!tradingEnabledPermanently, "Trading is permanently enabled");
        tradingEnabled = _enabled;
        emit TradingEnabled(_enabled);
    }

    /**
     * @dev Set the lottery contract address
     */
    function setLotteryAddress(address _lotteryAddress) external onlyOwner {
        require(_lotteryAddress != address(0), "Lottery address cannot be zero");
        lotteryAddress = _lotteryAddress;
    }

    /**
     * @dev Get current transaction limit based on transaction count
     * @return The current maximum transaction amount (1% for first 69 tx, 10% after)
     */
    function getCurrentTransactionLimit() public view returns (uint256) {
        if (transactionCount < SPECIAL_LIMIT_TRANSACTIONS) {
            return SPECIAL_WALLET_LIMIT; // 1% during first 69 transactions
        }
        return POST_SPECIAL_WALLET_LIMIT; // 10% after first 69 transactions
    }

    /**
     * @dev Get current wallet limit based on transaction count
     * @return The current maximum wallet amount (1% for first 69 tx, 10% after)
     */
    function getCurrentWalletLimit() public view returns (uint256) {
        uint256 totalSupply = totalSupply();
        if (transactionCount < SPECIAL_LIMIT_TRANSACTIONS) {
            return totalSupply.mul(SPECIAL_WALLET_LIMIT_PERCENT).div(10000); // 1% during first 69 transactions
        }
        return totalSupply.mul(POST_SPECIAL_WALLET_LIMIT_PERCENT).div(10000); // 10% after first 69 transactions
    }

    /**
     * @dev Returns the number of remaining transactions at special limits
     * @return Number of transactions remaining at the 2% special limit
     */
    function getRemainingSpecialTransactions() public view returns (uint256) {
        if (transactionCount >= SPECIAL_LIMIT_TRANSACTIONS) {
            return 0;
        }
        return SPECIAL_LIMIT_TRANSACTIONS - transactionCount;
    }

    // Timelock admin functions
    
    /**
     * @dev Schedule an admin action to be executed after timelock
     * @param actionId The unique identifier for the action
     * @param description A human-readable description of the action
     */
    function scheduleAction(bytes32 actionId, string memory description) external onlyOwner {
        require(pendingActions[actionId] == 0, "Action already scheduled");
        require(!ownershipLocked, "Ownership is locked");
        
        pendingActions[actionId] = block.timestamp + ADMIN_ACTION_DELAY;
        pendingActionDescriptions[actionId] = description;
        
        emit ActionScheduled(actionId, description, pendingActions[actionId]);
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
     * @dev Execute setExchangePair with timelock
     * @param _exchangePair The exchange pair address to set
     */
    function setExchangePairWithTimelock(address _exchangePair) external onlyOwner {
        bytes32 actionId = getActionId("setExchangePair", abi.encodePacked(_exchangePair));
        require(isActionReady(actionId), "Timelock not expired");
        
        // Clear the pending action
        delete pendingActions[actionId];
        string memory description = pendingActionDescriptions[actionId];
        delete pendingActionDescriptions[actionId];
        
        // Execute the actual function
        _setExchangePair(_exchangePair);
        
        emit ActionExecuted(actionId, description);
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
     * @dev Set the lottery address with timelock
     * @param _lotteryAddress The new lottery address
     */
    function setLotteryAddressWithTimelock(address _lotteryAddress) external onlyOwner {
        bytes32 actionId = getActionId("setLotteryAddress", abi.encodePacked(_lotteryAddress));
        require(isActionReady(actionId), "Timelock not expired");
        
        // Clear the pending action
        delete pendingActions[actionId];
        string memory description = pendingActionDescriptions[actionId];
        delete pendingActionDescriptions[actionId];
        
        // Execute the actual function
        _setLotteryAddress(_lotteryAddress);
        
        emit ActionExecuted(actionId, description);
    }
    
    /**
     * @dev Internal implementation of setLotteryAddress
     */
    function _setLotteryAddress(address _lotteryAddress) private {
        require(_lotteryAddress != address(0), "Lottery address cannot be zero");
        lotteryAddress = _lotteryAddress;
    }
    
    /**
     * @dev Set fee exemption status with timelock
     * @param account The account to set exemption for
     * @param exempt Whether the account should be exempt from fees
     */
    function setFeeExemptWithTimelock(address account, bool exempt) external onlyOwner {
        bytes32 actionId = getActionId("setFeeExempt", abi.encodePacked(account, exempt));
        require(isActionReady(actionId), "Timelock not expired");
        
        // Clear the pending action
        delete pendingActions[actionId];
        string memory description = pendingActionDescriptions[actionId];
        delete pendingActionDescriptions[actionId];
        
        // Execute the actual function
        _setFeeExempt(account, exempt);
        
        emit ActionExecuted(actionId, description);
    }
    
    /**
     * @dev Internal implementation of setFeeExempt
     */
    function _setFeeExempt(address account, bool exempt) private {
        require(account != address(0), "Cannot exempt zero address");
        isFeeExempt[account] = exempt;
    }
    
    /**
     * @dev Lock all direct admin functions to enforce timelock usage
     * This enhances security by requiring all admin actions to use timelock
     */
    function lockOwnership(uint256 _lockDuration) external onlyOwner {
        require(!ownershipLocked, "Ownership already locked");
        require(_lockDuration > 0 && _lockDuration <= MAX_LOCK_DURATION, "Invalid lock duration");
        
        ownershipLocked = true;
        emit OwnershipLocked(_lockDuration);
    }
    
    /**
     * @dev Permanently renounce ownership with timelock for maximum security
     * This is irreversible and will remove all admin control over the contract
     */
    function renounceOwnershipWithTimelock() external onlyOwner {
        bytes32 actionId = getActionId("renounceOwnership", "");
        require(isActionReady(actionId), "Timelock not expired");
        
        // Execute ownership renouncement
        _transferOwnership(address(0));
        
        emit OwnershipRenounced();
        emit ActionExecuted(actionId, "Renounce ownership");
    }
    
    // Transparency functions
    
    /**
     * @dev Get detailed fee information for transparency
     * @return jackpotFeeBuy_ Current buy jackpot fee
     * @return burnFeeBuy_ Current buy burn fee
     * @return ve8020FeeBuy_ Current buy ve8020 fee
     * @return totalFeeBuy_ Total buy fee
     * @return jackpotFeeSell_ Current sell jackpot fee
     * @return burnFeeSell_ Current sell burn fee
     * @return ve8020FeeSell_ Current sell ve8020 fee
     * @return totalFeeSell_ Total sell fee
     */
    function getDetailedFeeInfo() external view returns (
        uint256 jackpotFeeBuy_,
        uint256 burnFeeBuy_,
        uint256 ve8020FeeBuy_,
        uint256 totalFeeBuy_,
        uint256 jackpotFeeSell_,
        uint256 burnFeeSell_,
        uint256 ve8020FeeSell_,
        uint256 totalFeeSell_
    ) {
        return (
            buyJackpotFee,
            buyBurnFee,
            buyVe8020Fee,
            totalFeeBuy,
            sellJackpotFee,
            sellBurnFee,
            sellVe8020Fee,
            totalFeeSell
        );
    }
    
    /**
     * @dev Get detailed contract configuration for transparency
     * @return jackpotAddress_ Address receiving jackpot fees
     * @return ve8020Address_ Address receiving liquidity and development fees
     * @return burnAddress_ Address receiving burn fees
     * @return wrappedSonicAddress_ Address of wrapped Sonic token
     * @return lotteryAddress_ Address of lottery contract
     * @return exchangePair_ Address of exchange pair
     * @return tradingEnabled_ Whether trading is enabled
     * @return ownershipLocked_ Whether ownership is locked
     */
    function getContractConfiguration() external view returns (
        address jackpotAddress_,
        address ve8020Address_,
        address burnAddress_,
        address wrappedSonicAddress_,
        address lotteryAddress_,
        address exchangePair_,
        bool tradingEnabled_,
        bool ownershipLocked_
    ) {
        return (
            jackpotAddress,
            ve8020Address,
            burnAddress,
            wrappedSonicAddress,
            lotteryAddress,
            exchangePair,
            tradingEnabled,
            ownershipLocked
        );
    }
    
    /**
     * @dev Get transaction limits information
     * @return currentTxLimit Current maximum transaction amount
     * @return currentWalletLimit Current maximum wallet amount
     * @return specialTxRemaining Number of special transactions remaining
     * @return currentTxCount Current transaction count
     */
    function getLimitsInfo() external view returns (
        uint256 currentTxLimit,
        uint256 currentWalletLimit,
        uint256 specialTxRemaining,
        uint256 currentTxCount
    ) {
        return (
            getCurrentTransactionLimit(),
            getCurrentWalletLimit(),
            getRemainingSpecialTransactions(),
            transactionCount
        );
    }
    
    /**
     * @dev Track fee distributions for transparency
     * @param feeType The type of fee (1=jackpot, 2=liquidity, 3=burn, 4=development)
     * @param amount The amount of fee distributed
     */
    function _trackFeeDistribution(uint8 feeType, uint256 amount) private {
        if (feeType == 1) {
            totalJackpotFees += amount;
        } else if (feeType == 2) {
            totalVe8020Fees += amount;
        } else if (feeType == 3) {
            totalBurned += amount;
        }
    }
    
    /**
     * @dev Get statistics about fee distributions
     * @return totalBurned_ Total tokens burned
     * @return totalJackpotFees_ Total tokens sent to jackpot
     * @return totalVe8020Fees_ Total tokens sent to liquidity and development
     */
    function getFeeStats() external view returns (
        uint256 totalBurned_,
        uint256 totalJackpotFees_,
        uint256 totalVe8020Fees_
    ) {
        return (
            totalBurned,
            totalJackpotFees,
            totalVe8020Fees
        );
    }
    
    /**
     * @dev Record token holder for transparency
     * @param holder The address to track
     */
    function _recordHolder(address holder) private {
        if (holder != address(0) && holder != BURN_ADDRESS && holder != address(this)) {
            if (!_holders.contains(holder) && balanceOf(holder) > 0) {
                _holders.add(holder);
                totalHolders = _holders.length();
            } else if (_holders.contains(holder) && balanceOf(holder) == 0) {
                _holders.remove(holder);
                totalHolders = _holders.length();
            }
        }
    }
    
    /**
     * @dev Override _afterTokenTransfer to track holders
     */
    function _afterTokenTransfer(address from, address to, uint256 amount) internal virtual override {
        super._afterTokenTransfer(from, to, amount);
        
        // Track holders for transparency
        _recordHolder(from);
        _recordHolder(to);
        
        // Set launch timestamp on first transfer after trading enabled
        if (tradingEnabled && launchTimestamp == 0) {
            launchTimestamp = block.timestamp;
        }
    }
    
    /**
     * @dev Get holder at specific index (used for transparency dashboards)
     * @param index The index of the holder to retrieve
     * @return The address of the holder at the specified index
     */
    function getHolderAt(uint256 index) external view returns (address) {
        require(index < _holders.length(), "Index out of bounds");
        return _holders.at(index);
    }
    
    /**
     * @dev Get the total number of addresses holding the token
     * @return The number of unique holders
     */
    function getHolderCount() external view returns (uint256) {
        return _holders.length();
    }

    /**
     * @dev Sets the ve8020Address for the token
     * @param _ve8020Address New address for the ve8020FeeDistributor
     */
    function setVe8020Address(address _ve8020Address) external onlyOwner {
        require(_ve8020Address != address(0), "Ve8020 address cannot be zero");
        ve8020Address = _ve8020Address;
        emit Ve8020AddressUpdated(_ve8020Address);
    }

    /**
     * @dev Schedule an update to the jackpot address
     * @param _newAddress The new jackpot address
     */
    function scheduleJackpotAddressUpdate(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "New address cannot be zero");
        bytes32 actionId = keccak256(abi.encodePacked("updateJackpotAddress", _newAddress));
        pendingActions[actionId] = block.timestamp + ADMIN_ACTION_DELAY;
        pendingActionDescriptions[actionId] = "Update jackpot address";
        emit ActionScheduled(actionId, "Update jackpot address", block.timestamp + ADMIN_ACTION_DELAY);
    }

    /**
     * @dev Execute a scheduled jackpot address update
     * @param _newAddress The new jackpot address
     */
    function executeJackpotAddressUpdate(address _newAddress) external onlyOwner {
        bytes32 actionId = keccak256(abi.encodePacked("updateJackpotAddress", _newAddress));
        require(pendingActions[actionId] > 0 && pendingActions[actionId] <= block.timestamp, "Action not ready or expired");
        jackpotAddress = _newAddress;
        delete pendingActions[actionId];
        emit ActionExecuted(actionId, "Update jackpot address");
    }

    /**
     * @dev Schedule an update to the ve8020 address
     * @param _newAddress The new ve8020 address
     */
    function scheduleVe8020AddressUpdate(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "New address cannot be zero");
        bytes32 actionId = keccak256(abi.encodePacked("updateVe8020Address", _newAddress));
        pendingActions[actionId] = block.timestamp + ADMIN_ACTION_DELAY;
        pendingActionDescriptions[actionId] = "Update ve8020 address";
        emit ActionScheduled(actionId, "Update ve8020 address", block.timestamp + ADMIN_ACTION_DELAY);
    }

    /**
     * @dev Execute a scheduled ve8020 address update
     * @param _newAddress The new ve8020 address
     */
    function executeVe8020AddressUpdate(address _newAddress) external onlyOwner {
        bytes32 actionId = keccak256(abi.encodePacked("updateVe8020Address", _newAddress));
        require(pendingActions[actionId] > 0 && pendingActions[actionId] <= block.timestamp, "Action not ready or expired");
        ve8020Address = _newAddress;
        delete pendingActions[actionId];
        emit ActionExecuted(actionId, "Update ve8020 address");
        emit Ve8020AddressUpdated(_newAddress);
    }

    /**
     * @dev Schedule a fee update
     * @param newJackpotFee New jackpot fee
     * @param newBurnFee New burn fee
     * @param newVe8020Fee New ve8020 fee
     */
    function scheduleFeeUpdate(uint256 newJackpotFee, uint256 newBurnFee, uint256 newVe8020Fee) external onlyOwner {
        uint256 totalNewFee = newJackpotFee + newBurnFee + newVe8020Fee;
        require(totalNewFee <= 1000, "Total fee cannot exceed 10%");
        bytes32 actionId = keccak256(abi.encodePacked("updateFees", newJackpotFee, newBurnFee, newVe8020Fee));
        pendingActions[actionId] = block.timestamp + FEE_UPDATE_DELAY;
        pendingActionDescriptions[actionId] = "Update fees";
        emit ActionScheduled(actionId, "Update fees", block.timestamp + FEE_UPDATE_DELAY);
    }

    /**
     * @dev Execute a scheduled fee update
     * @param newJackpotFee New jackpot fee
     * @param newBurnFee New burn fee
     * @param newVe8020Fee New ve8020 fee
     */
    function executeFeeUpdate(uint256 newJackpotFee, uint256 newBurnFee, uint256 newVe8020Fee) external onlyOwner {
        bytes32 actionId = keccak256(abi.encodePacked("updateFees", newJackpotFee, newBurnFee, newVe8020Fee));
        require(pendingActions[actionId] > 0 && pendingActions[actionId] <= block.timestamp, "Action not ready or expired");
        jackpotFee = newJackpotFee;
        burnFee = newBurnFee;
        ve8020Fee = newVe8020Fee;
        totalFee = newJackpotFee + newBurnFee + newVe8020Fee;
        delete pendingActions[actionId];
        emit ActionExecuted(actionId, "Update fees");
    }
}
