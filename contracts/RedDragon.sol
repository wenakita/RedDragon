// SPDX-License-Identifier: MIT
// Fair, Verifiable, Simple: Ape the Dragon
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

/// Interface for Shadow DEX Router
interface IShadowRouter {
    function factory() external view returns (address);
    function WETH() external view returns (address);
}

/**
 * @title RedDragon
 * @dev A deflationary ERC20 token with transparent fee distribution
 * Fixed 10% total fee on buys and sells:
 * - 5% jackpot
 * - 3% liquidity
 * - 1% burned (sent to dead address)
 * - 1% development
 * No minting, no blacklist, no fee exclusions, no hidden fees
 */
contract RedDragon is ERC20, Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    
    // Fee structure
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // Buy Fees
    uint256 public jackpotFeeBuy = 690;    // 6.9% = 690 basis points
    uint256 public burnFeeBuy = 69;        // 0.69% = 69 basis points
    uint256 public ve8020FeeBuy = 241;     // 2.41% = 241 basis points (combined liquidity and development)
    uint256 public totalFeeBuy = 1000;     // 10% = 1000 basis points

    // Sell Fees
    uint256 public jackpotFeeSell = 690;   // 6.9% = 690 basis points
    uint256 public burnFeeSell = 69;       // 0.69% = 69 basis points
    uint256 public ve8020FeeSell = 241;    // 2.41% = 241 basis points (combined liquidity and development)
    uint256 public totalFeeSell = 1000;    // 10% = 1000 basis points

    // Regular Fees
    uint256 public jackpotFeeRegular = 690; // 6.9% = 690 basis points
    uint256 public burnFeeRegular = 69;     // 0.69% = 69 basis points
    uint256 public ve8020FeeRegular = 241;  // 2.41% = 241 basis points (combined liquidity and development)
    uint256 public totalFeeRegular = 1000;  // 10% = 1000 basis points

    // Current active fees
    uint256 public jackpotFee;
    uint256 public burnFee;
    uint256 public ve8020Fee;
    uint256 public totalFee;
    
    // Supply and limits
    uint256 public constant INITIAL_SUPPLY = 6_942_000 * 10**18;
    
    // Special transaction period
    uint256 public constant SPECIAL_LIMIT_TRANSACTIONS = 69;
    uint256 public transactionCount = 0; // Tracks number of transactions for special limit purposes
    
    // First 69 transactions: 1% max tx, 2% max wallet
    uint256 public constant SPECIAL_WALLET_LIMIT = (INITIAL_SUPPLY * 200) / 10000; // 2% of total supply
    uint256 public constant POST_SPECIAL_WALLET_LIMIT = (INITIAL_SUPPLY * 1000) / 10000; // 10% of supply
    
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // Trading state
    bool public tradingEnabled = false;
    bool public tradingEnabledPermanently = false;
    bool private inSwap = false;
    address public exchangePair;
    mapping(address => bool) public isFeeExempt;
    
    // Addresses
    address public jackpotAddress;
    address public ve8020Address; // Combined liquidity and development address (fe8020FeeDistributor)
    address public burnAddress;
    address public wrappedSonicAddress;

    // Interfaces
    IERC20 public wrappedSonic;

    // Transfer optimization
    bool private _transferOptimization = true;
    mapping(address => bool) private _optimizedTransfers;
    
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
    
    // Fee update timelock
    uint256 public constant FEE_UPDATE_DELAY = 24 hours;
    uint256 public lastFeeUpdate;
    
    // Admin action timelock
    uint256 public constant ADMIN_ACTION_DELAY = 24 hours;
    mapping(bytes32 => uint256) public pendingActions;
    mapping(bytes32 => string) public pendingActionDescriptions;
    
    // Ownership lock state
    bool public ownershipLocked = false;
    
    // Token stats for transparency
    uint256 public totalBurned;
    uint256 public totalJackpotFees;
    uint256 public totalVe8020Fees;
    uint256 public launchTimestamp;
    
    // Holder tracking
    EnumerableSet.AddressSet private _holders;
    uint256 public totalHolders;
    
    // Lottery interaction
    address public lotteryAddress;

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

        // Initialize fees
        regularFees();

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
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        require(amount > 0, "Transfer amount must be greater than zero");
        
        // Check if trading is enabled
        if (!tradingEnabled) {
            require(isFeeExempt[from] || isFeeExempt[to], "Trading is not enabled");
        }

        // Check transaction limits
        if (transactionCount < SPECIAL_LIMIT_TRANSACTIONS) {
            require(amount <= SPECIAL_WALLET_LIMIT, "Amount exceeds special transaction limit");
            require(balanceOf(to) + amount <= SPECIAL_WALLET_LIMIT, "Balance would exceed special wallet limit");
        } else {
            require(amount <= POST_SPECIAL_WALLET_LIMIT, "Amount exceeds transaction limit");
            require(balanceOf(to) + amount <= POST_SPECIAL_WALLET_LIMIT, "Balance would exceed wallet limit");
        }

        // Increment transaction count before transfer
        transactionCount++;
        
        // Check if this is a swap (buying or selling)
        bool isSwap = (exchangePair != address(0)) && (from == exchangePair || to == exchangePair);
        bool isBuy = isSwap && from == exchangePair;
        bool isSell = isSwap && to == exchangePair;
        
        // Set appropriate fees before any transfers
        if (isSwap && !inSwap) {
            if (isBuy) {
                buyFees();  // Buy fees
            } else if (isSell) {
                sellFees(); // Sell fees
            }
        } else {
            regularFees(); // Regular transfer fees
        }
        
        // Get pre-transfer wS balance for buys (to calculate wS amount used)
        uint256 preBuyWSBalance = 0;
        if (isBuy && !inSwap && lotteryAddress != address(0)) {
            preBuyWSBalance = wrappedSonic.balanceOf(exchangePair);
        }
        
        // Check if fees should be taken
        bool takeFee = !inSwap && !isFeeExempt[from] && !isFeeExempt[to];
        
        if (takeFee) {
            // Calculate fee amounts
            uint256 feeAmount = (amount * totalFee) / FEE_DENOMINATOR;
            uint256 transferAmount = amount - feeAmount;
            
            // Transfer remaining amount to recipient
            super._transfer(from, to, transferAmount);
            
            // Transfer fee amount to contract
            if (feeAmount > 0) {
                super._transfer(from, address(this), feeAmount);
                                
                // Distribute fees immediately
                _distributeFees(feeAmount);
            }
        } else {
            super._transfer(from, to, amount);
        }
        
        // Handle lottery entry for buys after transfer is complete
        if (isBuy && !inSwap && lotteryAddress != address(0)) {
            // Calculate wS used in the swap by checking the balance difference
            uint256 postBuyWSBalance = wrappedSonic.balanceOf(exchangePair);
            if (postBuyWSBalance < preBuyWSBalance) {
                uint256 wsAmount = preBuyWSBalance - postBuyWSBalance;
                // Only enter lottery if minimum wS amount was used
                if (wsAmount > 0) {
                    emit SwapDetected(from, to, true, wsAmount);
                    _handleLotteryEntry(tx.origin, wsAmount);
                }
            }
        }
        
        // Increment transaction counter if not from or to owner/contract
        if (from != owner() && from != address(this) && to != owner() && to != address(this)) {
            // Check if this transaction will end the special period
            if (transactionCount == SPECIAL_LIMIT_TRANSACTIONS - 1) {
                emit SpecialTransactionPeriodEnded(block.timestamp);
            }
            transactionCount++;
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
        jackpotFee = jackpotFeeBuy;
        burnFee = burnFeeBuy;
        ve8020Fee = ve8020FeeBuy;
        totalFee = totalFeeBuy;
    }

    function sellFees() internal {
        jackpotFee = jackpotFeeSell;
        burnFee = burnFeeSell;
        ve8020Fee = ve8020FeeSell;
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
    function setBuyFees(
        uint256 _jackpotFee,
        uint256 _burnFee,
        uint256 _ve8020Fee
    ) external onlyOwner {
        require(block.timestamp >= lastFeeUpdate + FEE_UPDATE_DELAY, "Fee update too soon");
        require(_jackpotFee <= 500, "Jackpot fee too high");
        require(_burnFee <= 100, "Burn fee too high");
        require(_ve8020Fee <= 100, "Ve8020 fee too high");
        
        uint256 newTotalFee = _jackpotFee + _burnFee + _ve8020Fee;
        require(newTotalFee <= 1000, "Total fee too high");
        
        jackpotFeeBuy = _jackpotFee;
        burnFeeBuy = _burnFee;
        ve8020FeeBuy = _ve8020Fee;
        totalFeeBuy = newTotalFee;
        
        lastFeeUpdate = block.timestamp;
    }

    function setSellFees(
        uint256 _jackpotFee,
        uint256 _burnFee,
        uint256 _ve8020Fee
    ) external onlyOwner {
        require(block.timestamp >= lastFeeUpdate + FEE_UPDATE_DELAY, "Fee update too soon");
        require(_jackpotFee <= 500, "Jackpot fee too high");
        require(_burnFee <= 100, "Burn fee too high");
        require(_ve8020Fee <= 100, "Ve8020 fee too high");
        
        uint256 newTotalFee = _jackpotFee + _burnFee + _ve8020Fee;
        require(newTotalFee <= 1000, "Total fee too high");
        
        jackpotFeeSell = _jackpotFee;
        burnFeeSell = _burnFee;
        ve8020FeeSell = _ve8020Fee;
        totalFeeSell = newTotalFee;
        
        lastFeeUpdate = block.timestamp;
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

    function setFeeExempt(address account, bool exempt) external onlyOwner {
        require(account != address(0), "Cannot exempt zero address");
        isFeeExempt[account] = exempt;
    }

    // Lottery interaction
    function _handleLotteryEntry(address user, uint256 wsAmount) private {
        if (lotteryAddress != address(0)) {
            // Always pass tx.origin as the user to ensure jackpot goes to the actual user, not aggregators/bots
            address actualUser = tx.origin;
            require(actualUser != address(0), "Invalid user address");
            require(!isContract(actualUser), "Contracts cannot participate in lottery");
            
            try IRedDragonSwapLottery(lotteryAddress).processBuy(actualUser, wsAmount) {} catch {}
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
     * @return The current maximum transaction amount (1% for first 69 tx, 5% after)
     */
    function getCurrentTransactionLimit() public view returns (uint256) {
        if (transactionCount < SPECIAL_LIMIT_TRANSACTIONS) {
            return SPECIAL_WALLET_LIMIT; // 2% during first 69 transactions
        }
        return POST_SPECIAL_WALLET_LIMIT; // 10% after first 69 transactions
    }

    /**
     * @dev Get current wallet limit based on transaction count
     * @return The current maximum wallet amount (2% for first 69 tx, 10% after)
     */
    function getCurrentWalletLimit() public view returns (uint256) {
        if (transactionCount < SPECIAL_LIMIT_TRANSACTIONS) {
            return SPECIAL_WALLET_LIMIT; // 2% during first 69 transactions
        }
        return POST_SPECIAL_WALLET_LIMIT; // 10% after first 69 transactions
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
    function lockOwnership() external onlyOwner {
        require(!ownershipLocked, "Ownership already locked");
        ownershipLocked = true;
    }
    
    /**
     * @dev Permanently renounce ownership with timelock for maximum security
     * This is irreversible and will remove all admin control over the contract
     */
    function renounceOwnershipWithTimelock() external onlyOwner {
        bytes32 actionId = getActionId("renounceOwnership", "");
        require(isActionReady(actionId), "Timelock not expired");
        
        // Clear the pending action
        delete pendingActions[actionId];
        string memory description = pendingActionDescriptions[actionId];
        delete pendingActionDescriptions[actionId];
        
        // Execute ownership renouncement
        _transferOwnership(address(0));
        
        emit OwnershipRenounced();
        emit ActionExecuted(actionId, description);
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
            jackpotFeeBuy,
            burnFeeBuy,
            ve8020FeeBuy,
            totalFeeBuy,
            jackpotFeeSell,
            burnFeeSell,
            ve8020FeeSell,
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
     * @param _jackpotFee New jackpot fee
     * @param _burnFee New burn fee
     * @param _ve8020Fee New ve8020 fee
     */
    function scheduleFeeUpdate(uint256 _jackpotFee, uint256 _burnFee, uint256 _ve8020Fee) external onlyOwner {
        uint256 totalNewFee = _jackpotFee + _burnFee + _ve8020Fee;
        require(totalNewFee <= 1000, "Total fee cannot exceed 10%");
        bytes32 actionId = keccak256(abi.encodePacked("updateFees", _jackpotFee, _burnFee, _ve8020Fee));
        pendingActions[actionId] = block.timestamp + FEE_UPDATE_DELAY;
        pendingActionDescriptions[actionId] = "Update fees";
        emit ActionScheduled(actionId, "Update fees", block.timestamp + FEE_UPDATE_DELAY);
    }

    /**
     * @dev Execute a scheduled fee update
     * @param _jackpotFee New jackpot fee
     * @param _burnFee New burn fee
     * @param _ve8020Fee New ve8020 fee
     */
    function executeFeeUpdate(uint256 _jackpotFee, uint256 _burnFee, uint256 _ve8020Fee) external onlyOwner {
        bytes32 actionId = keccak256(abi.encodePacked("updateFees", _jackpotFee, _burnFee, _ve8020Fee));
        require(pendingActions[actionId] > 0 && pendingActions[actionId] <= block.timestamp, "Action not ready or expired");
        jackpotFee = _jackpotFee;
        burnFee = _burnFee;
        ve8020Fee = _ve8020Fee;
        totalFee = _jackpotFee + _burnFee + _ve8020Fee;
        delete pendingActions[actionId];
        emit ActionExecuted(actionId, "Update fees");
    }
}
