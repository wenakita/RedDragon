// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "./interfaces/IVRFConsumer.sol";
import "./interfaces/IWETH.sol";

/**
 * @title DragonSwapTriggerV2
 * @dev Production implementation with dual oracle for price feeds and LayerZero VRF integration
 */
contract DragonSwapTriggerV2 is AccessControl, ReentrancyGuard, Pausable, IVRFConsumer {
    using SafeERC20 for IERC20;
    
    // === Roles ===
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant ORACLE_MANAGER = keccak256("ORACLE_MANAGER");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant VRF_ROLE = keccak256("VRF_ROLE");
    bytes32 public constant TESTING_ROLE = keccak256("TESTING_ROLE");
    
    // === Chain Configuration ===
    enum PayoutMethod { ERC20, UNWRAP_TO_NATIVE }
    PayoutMethod public payoutMethod;
    string public chainName;
    
    // === Tokens ===
    IERC20 public wrappedToken; // Wrapped native token (WETH, WAVAX, wS, etc.)
    IERC20 public dragonToken;
    
    // === Oracle Interfaces ===
    AggregatorV3Interface public chainlinkFeed;
    IPyth public pythOracle;
    bytes32 public pythPriceId;
    
    // === VRF ===
    address public vrfConsumer;
    
    // === Price Oracle Configuration ===
    enum PriceStrategy { CHAINLINK_ONLY, PYTH_ONLY, AVERAGE, MIN_PRICE, MAX_PRICE, CHAINLINK_WITH_PYTH_FALLBACK }
    PriceStrategy public priceStrategy = PriceStrategy.AVERAGE;
    bool public chainlinkEnabled = true;
    bool public pythEnabled = true;
    uint256 public maxPriceDeviation = 10; // 10% maximum deviation between oracles
    uint256 public priceValidTimeframe = 1 hours;
    uint256 public circuitBreakerThreshold = 30; // 30% maximum deviation to trigger circuit breaker
    uint256 public circuitBreakerCooldown = 24 hours;
    uint256 public lastCircuitBreak;
    
    // === Lottery Configuration ===
    uint256 public minSwapAmount;
    uint256 public jackpotBalance;
    
    // Constants for lottery calculations
    uint256 public constant MIN_AMOUNT_USD = 1;         // $1
    uint256 public constant MAX_AMOUNT_USD = 10000;     // $10,000
    uint256 public constant BASE_WIN_PROB_BPS = 4;      // 0.0004% (4 basis points)
    uint256 public constant MAX_WIN_PROB_BPS = 400;     // 4% (400 basis points)
    uint256 public constant BPS_PRECISION = 10000;      // 100% = 10000 basis points
    uint256 public constant JACKPOT_DISTRIBUTION = 69;  // 69% of jackpot is distributed
    
    // === Request tracking ===
    mapping(uint64 => address) public requestToUser;
    mapping(uint64 => uint256) public requestToAmount;
    mapping(uint64 => uint256) public requestToThreshold;
    uint256 public nonce;
    
    // === Winner tracking ===
    address public lastWinner;
    uint256 public lastWinAmount;
    uint256 public totalWinners;
    uint256 public totalPaidOut;
    
    // === Price Cache ===
    uint256 private cachedPrice;
    uint256 private priceTimestamp;
    uint256 private priceCacheDuration = 5 minutes;
    
    // === Events ===
    event PriceOracleUpdated(string indexed oracle, address indexed addr);
    event PythPriceIdUpdated(bytes32 newPriceId);
    event PriceStrategyUpdated(PriceStrategy strategy);
    event PriceDeviationDetected(uint256 chainlinkPrice, uint256 pythPrice, uint256 deviationPercent);
    event CircuitBreakerTriggered(uint256 chainlinkPrice, uint256 pythPrice, uint256 deviation);
    event PriceCalculated(uint256 finalPrice, PriceStrategy strategyUsed, uint256 amount, uint256 amountUSD);
    event SwapDetected(address indexed user, uint256 amount, uint256 amountUSD, uint256 winThreshold);
    event RandomnessRequested(uint64 indexed requestId, address indexed user, uint256 threshold);
    event JackpotWon(address indexed winner, uint256 amount, uint256 remainingJackpot);
    event JackpotIncreased(uint256 amount, uint256 newBalance);
    event WinThresholdCalculated(address indexed user, uint256 amount, uint256 amountUSD, uint256 threshold);
    event MinSwapAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event VRFConsumerUpdated(address oldConsumer, address newConsumer);
    event ConfigChanged(string parameter, uint256 oldValue, uint256 newValue);
    event NativeTokenReceived(address indexed sender, uint256 amount);
    event PayoutMethodUpdated(PayoutMethod oldMethod, PayoutMethod newMethod);
    event ChainConfigUpdated(string chainName, PayoutMethod payoutMethod);
    
    // === Custom Errors ===
    error InvalidAddress();
    error InvalidParameter();
    error InvalidAmount();
    error PriceDeviation(uint256 chainlinkPrice, uint256 pythPrice, uint256 deviation);
    error CircuitBreakerActive(uint256 cooldownEnds);
    error NoPriceAvailable();
    error StalePrice(uint256 timestamp, uint256 currentTime, uint256 maxAge);
    error NegativePrice(int256 price);
    error NotAuthorized();
    error UnknownRequest();
    error NativeTransferFailed();
    error DirectNativeNotSupported();
    
    /**
     * @dev Constructor
     */
    constructor(
        address _wrappedToken,
        address _dragonToken,
        address _vrfConsumer,
        uint256 _minSwapAmount,
        address _chainlinkFeed,
        address _pythOracle,
        bytes32 _pythPriceId,
        address _admin,
        PayoutMethod _payoutMethod,
        string memory _chainName
    ) {
        // Validate addresses
        if (_wrappedToken == address(0) || _dragonToken == address(0) || 
            _vrfConsumer == address(0) || _admin == address(0))
            revert InvalidAddress();
            
        // Set token addresses
        wrappedToken = IERC20(_wrappedToken);
        dragonToken = IERC20(_dragonToken);
        vrfConsumer = _vrfConsumer;
        minSwapAmount = _minSwapAmount;
        payoutMethod = _payoutMethod;
        chainName = _chainName;
        
        // Set oracle addresses
        if (_chainlinkFeed != address(0)) {
            chainlinkFeed = AggregatorV3Interface(_chainlinkFeed);
        } else {
            chainlinkEnabled = false;
        }
        
        if (_pythOracle != address(0)) {
            pythOracle = IPyth(_pythOracle);
            pythPriceId = _pythPriceId;
        } else {
            pythEnabled = false;
        }
        
        // Ensure at least one oracle is enabled
        if (!chainlinkEnabled && !pythEnabled)
            revert InvalidParameter();
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(ORACLE_MANAGER, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        _grantRole(VRF_ROLE, _vrfConsumer);
        _grantRole(TESTING_ROLE, _admin);
        
        emit VRFConsumerUpdated(address(0), _vrfConsumer);
        if (chainlinkEnabled) {
            emit PriceOracleUpdated("Chainlink", _chainlinkFeed);
        }
        if (pythEnabled) {
            emit PriceOracleUpdated("Pyth", _pythOracle);
            emit PythPriceIdUpdated(_pythPriceId);
        }
        emit ChainConfigUpdated(_chainName, _payoutMethod);
    }
    
    /**
     * @notice Get Chainlink price data
     */
    function getChainlinkPrice() public view returns (uint256 price, uint256 updatedAt) {
        if (!chainlinkEnabled)
            revert InvalidParameter();
        
        (
            /* uint80 roundID */,
            int256 answer,
            /* uint startedAt */,
            uint256 timestamp,
            /* uint80 answeredInRound */
        ) = chainlinkFeed.latestRoundData();
        
        if (answer <= 0)
            revert NegativePrice(answer);
            
        if (block.timestamp - timestamp > priceValidTimeframe)
            revert StalePrice(timestamp, block.timestamp, priceValidTimeframe);
        
        // Convert to 18 decimals
        uint8 decimals = chainlinkFeed.decimals();
        price = uint256(answer) * 10**(18 - decimals);
        
        return (price, timestamp);
    }
    
    /**
     * @notice Get Pyth price data
     */
    function getPythPrice() public view returns (uint256 price, uint256 publishTime) {
        if (!pythEnabled)
            revert InvalidParameter();
        
        PythStructs.Price memory priceData = pythOracle.getPriceUnsafe(pythPriceId);
        
        if (priceData.price <= 0)
            revert NegativePrice(priceData.price);
            
        if (block.timestamp - priceData.publishTime > priceValidTimeframe)
            revert StalePrice(priceData.publishTime, block.timestamp, priceValidTimeframe);
        
        // Convert to 18 decimals accounting for exponent
        int32 exponent = priceData.expo;
        
        // Safe conversion of int64 to uint256 (price should be positive)
        uint256 basePrice;
        if (priceData.price > 0) {
            basePrice = uint256(uint64(priceData.price)); // First cast to uint64, then to uint256
        } else {
            basePrice = 0;
        }
        
        if (exponent < 0) {
            // For negative exponents, multiply by 10^(18 + exponent)
            // Convert exponent to positive for calculation (safe conversion)
            uint256 posExponent = uint256(uint32(-exponent)); // Safe conversion to uint32 first
            price = basePrice * 10**(18 - posExponent);
        } else {
            // For positive exponents, divide by 10^exponent after multiplying by 10^18
            uint256 posExponent = uint256(uint32(exponent)); // Safe conversion to uint32 first
            price = basePrice * 10**18 / 10**posExponent;
        }
        
        return (price, priceData.publishTime);
    }
    
    /**
     * @notice Get the final price using configured strategy
     */
    function getFinalPrice() public nonReentrant returns (uint256 finalPrice) {
        // Check if we can use the cached price
        if (block.timestamp - priceTimestamp <= priceCacheDuration) {
            return cachedPrice;
        }
        
        // Check circuit breaker cooldown
        if (lastCircuitBreak > 0 && block.timestamp - lastCircuitBreak < circuitBreakerCooldown) {
            revert CircuitBreakerActive(lastCircuitBreak + circuitBreakerCooldown);
        }
        
        // Get prices from both oracles
        uint256 chainlinkPrice = 0;
        uint256 pythPrice = 0;
        
        if (chainlinkEnabled) {
            try this.getChainlinkPrice() returns (uint256 p, uint256) {
                chainlinkPrice = p;
            } catch {
                // Price retrieval failed, continue with other oracle
            }
        }
        
        if (pythEnabled) {
            try this.getPythPrice() returns (uint256 p, uint256) {
                pythPrice = p;
            } catch {
                // Price retrieval failed, continue with other oracle
            }
        }
        
        // Require at least one valid price
        if (chainlinkPrice == 0 && pythPrice == 0)
            revert NoPriceAvailable();
        
        // Check for price deviation if both prices are available
        uint256 deviationPercent = 0;
        if (chainlinkPrice > 0 && pythPrice > 0) {
            if (chainlinkPrice > pythPrice) {
                deviationPercent = ((chainlinkPrice - pythPrice) * 100) / pythPrice;
            } else {
                deviationPercent = ((pythPrice - chainlinkPrice) * 100) / chainlinkPrice;
            }
            
            // Log if deviation exceeds threshold
            if (deviationPercent > maxPriceDeviation) {
                emit PriceDeviationDetected(chainlinkPrice, pythPrice, deviationPercent);
            }
            
            // Trigger circuit breaker for extreme deviations
            if (deviationPercent > circuitBreakerThreshold) {
                lastCircuitBreak = block.timestamp;
                emit CircuitBreakerTriggered(chainlinkPrice, pythPrice, deviationPercent);
                revert PriceDeviation(chainlinkPrice, pythPrice, deviationPercent);
            }
        }
        
        // Apply the selected price strategy
        PriceStrategy usedStrategy = priceStrategy;
        
        if (usedStrategy == PriceStrategy.CHAINLINK_ONLY) {
            finalPrice = chainlinkPrice > 0 ? chainlinkPrice : pythPrice;
        } 
        else if (usedStrategy == PriceStrategy.PYTH_ONLY) {
            finalPrice = pythPrice > 0 ? pythPrice : chainlinkPrice;
        }
        else if (usedStrategy == PriceStrategy.AVERAGE) {
            if (chainlinkPrice > 0 && pythPrice > 0) {
                finalPrice = (chainlinkPrice + pythPrice) / 2;
            } else {
                finalPrice = chainlinkPrice > 0 ? chainlinkPrice : pythPrice;
            }
        } 
        else if (usedStrategy == PriceStrategy.MIN_PRICE) {
            if (chainlinkPrice > 0 && pythPrice > 0) {
                finalPrice = chainlinkPrice < pythPrice ? chainlinkPrice : pythPrice;
            } else {
                finalPrice = chainlinkPrice > 0 ? chainlinkPrice : pythPrice;
            }
        } 
        else if (usedStrategy == PriceStrategy.MAX_PRICE) {
            if (chainlinkPrice > 0 && pythPrice > 0) {
                finalPrice = chainlinkPrice > pythPrice ? chainlinkPrice : pythPrice;
            } else {
                finalPrice = chainlinkPrice > 0 ? chainlinkPrice : pythPrice;
            }
        } 
        else if (usedStrategy == PriceStrategy.CHAINLINK_WITH_PYTH_FALLBACK) {
            finalPrice = chainlinkPrice > 0 ? chainlinkPrice : pythPrice;
        }
        
        // Update the cache
        if (finalPrice > 0) {
            cachedPrice = finalPrice;
            priceTimestamp = block.timestamp;
        }
        
        return finalPrice;
    }
    
    /**
     * @notice Convert token amount to USD
     */
    function convertToUSD(uint256 _amount) public nonReentrant whenNotPaused returns (uint256) {
        uint256 price = getFinalPrice();
        if (price == 0) revert NoPriceAvailable();
        
        uint256 amountUSD = _amount * price / 10**18;
        emit PriceCalculated(price, priceStrategy, _amount, amountUSD);
        
        return amountUSD;
    }
    
    /**
     * @notice Calculate the win threshold based on the swap amount
     */
    function calculateWinThreshold(uint256 _amount) public nonReentrant whenNotPaused returns (uint256 threshold) {
        // Convert from Wei to USD using our dual-oracle system
        uint256 amountInUSD = convertToUSD(_amount);
        uint256 amountUSDWithoutDecimals = amountInUSD / 10**18;
        
        // Cap the amount for threshold calculation
        uint256 cappedAmount = amountUSDWithoutDecimals;
        if (cappedAmount < MIN_AMOUNT_USD) {
            cappedAmount = MIN_AMOUNT_USD;
        } else if (cappedAmount > MAX_AMOUNT_USD) {
            cappedAmount = MAX_AMOUNT_USD;
        }
        
        // Calculate win probability (in basis points)
        uint256 winProbabilityBPS;
        if (cappedAmount <= MIN_AMOUNT_USD) {
            winProbabilityBPS = BASE_WIN_PROB_BPS;
        } else {
            winProbabilityBPS = BASE_WIN_PROB_BPS + 
                ((cappedAmount - MIN_AMOUNT_USD) * (MAX_WIN_PROB_BPS - BASE_WIN_PROB_BPS)) / 
                (MAX_AMOUNT_USD - MIN_AMOUNT_USD);
        }
        
        // Ensure we don't divide by zero
        if (winProbabilityBPS == 0)
            revert InvalidParameter();
        
        // Convert probability to threshold
        threshold = BPS_PRECISION * BPS_PRECISION / winProbabilityBPS;
        
        emit WinThresholdCalculated(msg.sender, _amount, amountInUSD, threshold);
        return threshold;
    }
    
    /**
     * @notice Triggered when a user swaps native token for DRAGON
     */
    function onSwapNativeTokenToDragon(address _user, uint256 _amount) external virtual whenNotPaused nonReentrant {
        // Only allow tx.origin to participate to prevent proxy/contract entries
        if (tx.origin != _user)
            revert NotAuthorized();
        
        // Check if amount is enough to enter
        if (_amount < minSwapAmount) {
            return;
        }
        
        // Calculate winning threshold based on amount
        uint256 winThreshold = calculateWinThreshold(_amount);
        
        // Generate internal request ID
        uint256 internalRequestId = nonce++;
        
        // Get USD value for logging
        uint256 amountUSD = convertToUSD(_amount);
        
        // Transfer tokens to this contract
        wrappedToken.safeTransferFrom(_user, address(this), _amount);
        
        // Emit event
        emit SwapDetected(_user, _amount, amountUSD, winThreshold);
        
        // Request randomness through VRF
        try IVRFConsumer(vrfConsumer).requestRandomness(_user) returns (uint64 requestId) {
            // Store mapping for randomness callback
            requestToUser[requestId] = _user;
            requestToAmount[requestId] = _amount;
            requestToThreshold[requestId] = winThreshold;
            
            emit RandomnessRequested(requestId, _user, winThreshold);
        } catch {
            // If VRF request fails, handle gracefully
            // In the future we could implement a fallback here
        }
    }
    
    /**
     * @notice Process randomness from VRF via LayerZero bridge
     * @dev Implements the IVRFConsumer interface
     * @param _requestId The request ID from SonicVRFConsumer
     * @param _user The user who initiated the request
     * @param _randomness The random value
     */
    function processRandomness(
        uint64 _requestId,
        address _user,
        uint256 _randomness
    ) external override whenNotPaused nonReentrant {
        // Only VRF consumer can call this function
        if (!hasRole(VRF_ROLE, msg.sender))
            revert NotAuthorized();
        
        // Get the user associated with this request
        address user = requestToUser[_requestId];
        if (user == address(0))
            revert UnknownRequest();
        
        // Verify user matches
        if (user != _user)
            revert NotAuthorized();
        
        // Get the threshold for this request
        uint256 winThreshold = requestToThreshold[_requestId];
        if (winThreshold == 0) {
            // If no threshold was stored, calculate it now using the stored amount
            uint256 amount = requestToAmount[_requestId];
            winThreshold = calculateWinThreshold(amount);
        }
        
        // Determine if user won (randomness % threshold == 0)
        if (_randomness % winThreshold == 0) {
            // Calculate win amount (69% of jackpot)
            uint256 currentJackpot = jackpotBalance;
            uint256 winAmount = currentJackpot * JACKPOT_DISTRIBUTION / 100;
            
            // Update jackpot (31% remains)
            jackpotBalance = currentJackpot - winAmount;
            
            // Update statistics
            lastWinner = user;
            lastWinAmount = winAmount;
            totalWinners++;
            totalPaidOut += winAmount;
            
            // Handle token transfers based on payout method
            if (payoutMethod == PayoutMethod.UNWRAP_TO_NATIVE) {
                // For chains where we want to unwrap tokens to native
                _unwrapAndTransferNative(user, winAmount);
            } else {
                // Standard ERC20 transfer for other chains
                wrappedToken.safeTransfer(user, winAmount);
            }
            
            // Emit event
            emit JackpotWon(user, winAmount, jackpotBalance);
        }
        
        // Clean up request data
        delete requestToUser[_requestId];
        delete requestToAmount[_requestId];
        delete requestToThreshold[_requestId];
    }
    
    /**
     * @notice Unwrap and transfer native tokens (ETH, AVAX, etc.)
     * @dev Handles unwrapping wrapped tokens and sending native tokens to user
     * @param _recipient Address to receive native tokens
     * @param _amount Amount to send
     */
    function _unwrapAndTransferNative(address _recipient, uint256 _amount) internal {
        // Unwrap token to native (works for WETH, WAVAX, etc.)
        IWETH(address(wrappedToken)).withdraw(_amount);
        
        // Send native token to recipient
        (bool success, ) = _recipient.call{value: _amount}("");
        if (!success) revert NativeTransferFailed();
    }
    
    /**
     * @notice Request randomness for a user
     * @dev Implements the IVRFConsumer interface, but should never be called directly
     * @param user The user requesting randomness
     * @return requestId The request ID for tracking
     */
    function requestRandomness(address user) external override pure returns (uint64) {
        revert NotAuthorized();
    }
    
    /**
     * @notice Add funds to the jackpot
     */
    function addToJackpot(uint256 _amount) external nonReentrant {
        if (_amount == 0)
            revert InvalidAmount();
        
        // Transfer tokens to this contract
        wrappedToken.safeTransferFrom(msg.sender, address(this), _amount);
        
        // Update jackpot balance
        jackpotBalance += _amount;
        
        emit JackpotIncreased(_amount, jackpotBalance);
    }
    
    /**
     * @notice Get the current jackpot balance
     */
    function getJackpotBalance() external view returns (uint256) {
        return jackpotBalance;
    }
    
    /**
     * @notice Get the native token wrapper address
     */
    function getNativeTokenWrapper() external view returns (address) {
        return address(wrappedToken);
    }
    
    /**
     * @notice Get lottery statistics
     */
    function getStats() external view returns (
        uint256 winners,
        uint256 paidOut,
        uint256 current
    ) {
        return (totalWinners, totalPaidOut, jackpotBalance);
    }
    
    /**
     * @notice Helper function for testing to set request data
     * @dev Only callable by testing role
     */
    function setRequestData(
        uint64 _requestId,
        address _user,
        uint256 _amount,
        uint256 _threshold
    ) external onlyRole(TESTING_ROLE) {
        requestToUser[_requestId] = _user;
        requestToAmount[_requestId] = _amount;
        requestToThreshold[_requestId] = _threshold;
    }
    
    // === Admin functions ===
    
    /**
     * @notice Set the minimum swap amount
     */
    function setMinSwapAmount(uint256 _minSwapAmount) external onlyRole(OPERATOR_ROLE) {
        uint256 oldAmount = minSwapAmount;
        minSwapAmount = _minSwapAmount;
        emit MinSwapAmountUpdated(oldAmount, _minSwapAmount);
    }
    
    /**
     * @notice Update the VRF consumer address
     */
    function setVRFConsumer(address _vrfConsumer) external onlyRole(OPERATOR_ROLE) {
        if (_vrfConsumer == address(0))
            revert InvalidAddress();
        
        address oldConsumer = vrfConsumer;
        
        // Revoke old role and grant new role
        _revokeRole(VRF_ROLE, oldConsumer);
        _grantRole(VRF_ROLE, _vrfConsumer);
        
        vrfConsumer = _vrfConsumer;
        emit VRFConsumerUpdated(oldConsumer, _vrfConsumer);
    }
    
    /**
     * @notice Update Chainlink feed address
     */
    function updateChainlinkFeed(address _newFeed) external onlyRole(ORACLE_MANAGER) {
        if (_newFeed == address(0)) 
            revert InvalidAddress();
            
        chainlinkFeed = AggregatorV3Interface(_newFeed);
        
        // Clear the cache to ensure we use the new feed immediately
        priceTimestamp = 0;
        cachedPrice = 0;
        
        // Enable Chainlink if it was disabled
        if (!chainlinkEnabled) {
            chainlinkEnabled = true;
        }
        
        emit PriceOracleUpdated("Chainlink", _newFeed);
    }
    
    /**
     * @notice Update Pyth oracle address
     */
    function updatePythOracle(address _newPythOracle) external onlyRole(ORACLE_MANAGER) {
        if (_newPythOracle == address(0))
            revert InvalidAddress();
            
        pythOracle = IPyth(_newPythOracle);
        
        // Clear the cache to ensure we use the new oracle immediately
        priceTimestamp = 0;
        cachedPrice = 0;
        
        // Enable Pyth if it was disabled
        if (!pythEnabled) {
            pythEnabled = true;
        }
        
        emit PriceOracleUpdated("Pyth", _newPythOracle);
    }
    
    /**
     * @notice Update Pyth price ID
     */
    function updatePythPriceId(bytes32 _newPriceId) external onlyRole(ORACLE_MANAGER) {
        pythPriceId = _newPriceId;
        
        // Clear the cache to ensure we use the new price ID immediately
        priceTimestamp = 0;
        cachedPrice = 0;
        
        emit PythPriceIdUpdated(_newPriceId);
    }
    
    /**
     * @notice Set price aggregation strategy
     */
    function setPriceStrategy(PriceStrategy _strategy) external onlyRole(ORACLE_MANAGER) {
        priceStrategy = _strategy;
        
        // Clear the cache to ensure we use the new strategy immediately
        priceTimestamp = 0;
        cachedPrice = 0;
        
        emit PriceStrategyUpdated(_strategy);
    }
    
    /**
     * @notice Emergency pause/unpause the contract
     */
    function setEmergencyPause(bool _paused) external onlyRole(EMERGENCY_ROLE) {
        if (_paused) {
            _pause();
        } else {
            _unpause();
        }
    }
    
    /**
     * @notice Force clear the price cache
     */
    function clearPriceCache() external onlyRole(ORACLE_MANAGER) {
        priceTimestamp = 0;
        cachedPrice = 0;
    }
    
    /**
     * @notice Reset circuit breaker in case of false positive
     */
    function resetCircuitBreaker() external onlyRole(EMERGENCY_ROLE) {
        lastCircuitBreak = 0;
    }
    
    /**
     * @notice Set the price cache duration
     */
    function setPriceCacheDuration(uint256 _duration) external onlyRole(ORACLE_MANAGER) {
        uint256 oldDuration = priceCacheDuration;
        priceCacheDuration = _duration;
        emit ConfigChanged("priceCacheDuration", oldDuration, _duration);
    }
    
    /**
     * @notice Set the maximum price deviation before alerting
     */
    function setMaxPriceDeviation(uint256 _deviation) external onlyRole(ORACLE_MANAGER) {
        uint256 oldDeviation = maxPriceDeviation;
        maxPriceDeviation = _deviation;
        emit ConfigChanged("maxPriceDeviation", oldDeviation, _deviation);
    }
    
    /**
     * @notice Set the circuit breaker threshold
     */
    function setCircuitBreakerThreshold(uint256 _threshold) external onlyRole(ORACLE_MANAGER) {
        uint256 oldThreshold = circuitBreakerThreshold;
        circuitBreakerThreshold = _threshold;
        emit ConfigChanged("circuitBreakerThreshold", oldThreshold, _threshold);
    }
    
    /**
     * @notice Set the circuit breaker cooldown duration
     */
    function setCircuitBreakerCooldown(uint256 _cooldown) external onlyRole(ORACLE_MANAGER) {
        uint256 oldCooldown = circuitBreakerCooldown;
        circuitBreakerCooldown = _cooldown;
        emit ConfigChanged("circuitBreakerCooldown", oldCooldown, _cooldown);
    }
    
    /**
     * @notice Enable or disable Chainlink oracle
     */
    function setChainlinkEnabled(bool _enabled) external onlyRole(ORACLE_MANAGER) {
        // Ensure at least one oracle will be enabled
        if (!_enabled && !pythEnabled)
            revert InvalidParameter();
        
        chainlinkEnabled = _enabled;
        
        // Clear the cache to ensure we use the updated oracle configuration immediately
        priceTimestamp = 0;
        cachedPrice = 0;
    }
    
    /**
     * @notice Enable or disable Pyth oracle
     */
    function setPythEnabled(bool _enabled) external onlyRole(ORACLE_MANAGER) {
        // Ensure at least one oracle will be enabled
        if (!_enabled && !chainlinkEnabled)
            revert InvalidParameter();
        
        pythEnabled = _enabled;
        
        // Clear the cache to ensure we use the updated oracle configuration immediately
        priceTimestamp = 0;
        cachedPrice = 0;
    }
    
    /**
     * @notice Allow direct native token deposits
     * @dev Native token will be wrapped to wrapped token automatically
     */
    receive() external payable {
        if (payoutMethod != PayoutMethod.UNWRAP_TO_NATIVE) revert DirectNativeNotSupported();
        
        // Wrap the received native token (ETH, AVAX, etc.)
        IWETH(address(wrappedToken)).deposit{value: msg.value}();
        
        emit NativeTokenReceived(msg.sender, msg.value);
    }
    
    /**
     * @notice Swap native token for Dragon directly
     * @dev For chains that support direct native token transactions (ETH, AVAX, etc.)
     */
    function swapNativeForDragon() external payable nonReentrant whenNotPaused {
        if (payoutMethod != PayoutMethod.UNWRAP_TO_NATIVE) revert DirectNativeNotSupported();
        if (msg.value == 0) revert InvalidAmount();
        
        // Wrap the native token
        IWETH(address(wrappedToken)).deposit{value: msg.value}();
        
        // Process the swap with the wrapped token
        this.onSwapNativeTokenToDragon(msg.sender, msg.value);
    }
    
    /**
     * @notice Update payout method
     * @dev Only callable by admin
     */
    function setPayoutMethod(PayoutMethod _payoutMethod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        PayoutMethod oldMethod = payoutMethod;
        payoutMethod = _payoutMethod;
        emit PayoutMethodUpdated(oldMethod, _payoutMethod);
    }
    
    /**
     * @notice Update chain configuration
     * @dev Only callable by admin
     */
    function setChainConfig(PayoutMethod _payoutMethod, string calldata _chainName) external onlyRole(DEFAULT_ADMIN_ROLE) {
        payoutMethod = _payoutMethod;
        chainName = _chainName;
        emit ChainConfigUpdated(_chainName, _payoutMethod);
    }
} 