// SPDX-License-Identifier: MIT

/**
 *   =============================
 *   CHAIN-SPECIFIC SWAP TRIGGER
 *   =============================
 *   Base contract for chain-specific triggers
 *   =============================
 *
 * // "One jackpot, many coins." - Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IDragonSwapTrigger.sol";
import "./interfaces/IVRFConsumer.sol";
import "./interfaces/IChainRegistry.sol";

/**
 * @title ChainSpecificSwapTrigger
 * @dev Base contract for chain-specific swap triggers that handles lottery entries
 * when users swap a native token for DRAGON
 */
abstract contract ChainSpecificSwapTrigger is IDragonSwapTrigger, Ownable, ReentrancyGuard {
    // State variables
    IERC20 public nativeTokenWrapper;
    IERC20 public dragonToken;
    address public vrfConsumer;
    IChainRegistry public chainRegistry;
    
    // Lottery configuration
    uint256 public minSwapAmount;
    uint256 public winThreshold = 1000; // 0.1% chance (1/1000)
    uint256 public jackpotBalance;
    
    // Request tracking
    mapping(uint256 => address) public requestToUser;
    mapping(uint256 => uint256) public requestToAmount;
    uint256 public nonce;
    
    // Winner tracking
    address public lastWinner;
    uint256 public lastWinAmount;
    uint256 public totalWinners;
    uint256 public totalPaidOut;
    
    // Chain info
    uint16 public chainId;
    string public chainName;
    
    // Events
    event SwapDetected(address indexed user, uint256 amount);
    event RandomnessRequested(uint256 indexed requestId, address indexed user);
    event JackpotWon(address indexed winner, uint256 amount);
    event JackpotIncreased(uint256 amount, uint256 newBalance);
    event WinThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event MinSwapAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event VRFConsumerUpdated(address oldConsumer, address newConsumer);
    
    /**
     * @dev Constructor
     * @param _nativeTokenWrapper Address of native token wrapper (WETH, WSONIC, etc.)
     * @param _dragonToken Address of DRAGON token
     * @param _vrfConsumer Address of VRF consumer
     * @param _minSwapAmount Minimum amount for lottery entry
     * @param _chainRegistry Address of the chain registry
     * @param _chainId Chain ID for this implementation
     * @param _chainName Chain name for this implementation
     */
    constructor(
        address _nativeTokenWrapper,
        address _dragonToken,
        address _vrfConsumer,
        uint256 _minSwapAmount,
        address _chainRegistry,
        uint16 _chainId,
        string memory _chainName
    ) {
        require(_nativeTokenWrapper != address(0), "Native token wrapper address cannot be zero");
        require(_dragonToken != address(0), "DRAGON address cannot be zero");
        require(_vrfConsumer != address(0), "VRF consumer cannot be zero");
        require(_chainRegistry != address(0), "Chain registry cannot be zero");
        
        nativeTokenWrapper = IERC20(_nativeTokenWrapper);
        dragonToken = IERC20(_dragonToken);
        vrfConsumer = _vrfConsumer;
        minSwapAmount = _minSwapAmount;
        chainRegistry = IChainRegistry(_chainRegistry);
        chainId = _chainId;
        chainName = _chainName;
    }
    
    /**
     * @notice Triggered when a user swaps native token for DRAGON
     * @param _user The user who performed the swap
     * @param _amount The amount of native token swapped
     */
    function onSwapNativeTokenToDragon(address _user, uint256 _amount) external virtual override {
        // Only allow tx.origin to participate to prevent proxy/contract entries
        require(tx.origin == _user, "Only users can enter lottery");
        
        // Check if amount is enough to enter
        if (_amount < minSwapAmount) {
            return;
        }
        
        // Request randomness - implementation specific to each chain
        uint256 requestId = requestRandomness(_user);
        
        // Store mapping
        requestToUser[requestId] = _user;
        requestToAmount[requestId] = _amount;
        
        emit SwapDetected(_user, _amount);
        emit RandomnessRequested(requestId, _user);
    }
    
    /**
     * @notice Add funds to the jackpot
     * @param _amount The amount to add
     */
    function addToJackpot(uint256 _amount) external override {
        // Transfer native tokens to this contract
        nativeTokenWrapper.transferFrom(msg.sender, address(this), _amount);
        
        // Update jackpot balance
        jackpotBalance += _amount;
        
        emit JackpotIncreased(_amount, jackpotBalance);
    }
    
    /**
     * @notice Get the current jackpot balance
     * @return The jackpot balance
     */
    function getJackpotBalance() external view override returns (uint256) {
        return jackpotBalance;
    }
    
    /**
     * @notice Set the win threshold
     * @param _winThreshold The new win threshold
     */
    function setWinThreshold(uint256 _winThreshold) external override onlyOwner {
        require(_winThreshold > 0, "Threshold must be greater than 0");
        uint256 oldThreshold = winThreshold;
        winThreshold = _winThreshold;
        emit WinThresholdUpdated(oldThreshold, _winThreshold);
    }
    
    /**
     * @notice Set the minimum swap amount
     * @param _minSwapAmount The new minimum swap amount
     */
    function setMinSwapAmount(uint256 _minSwapAmount) external override onlyOwner {
        uint256 oldAmount = minSwapAmount;
        minSwapAmount = _minSwapAmount;
        emit MinSwapAmountUpdated(oldAmount, _minSwapAmount);
    }
    
    /**
     * @notice Process the randomness from VRF
     * @param _requestId The request ID
     * @param _randomness The random value
     */
    function fulfillRandomness(uint256 _requestId, uint256 _randomness) external override {
        require(msg.sender == vrfConsumer, "Only VRF consumer");
        
        address user = requestToUser[_requestId];
        require(user != address(0), "Unknown request");
        
        // Get the amount that was swapped (stored in mapping)
        uint256 swapAmount = requestToAmount[_requestId];
        
        // Calculate dynamic win probability based on the amount
        // LINEARLY SCALED from $1 to $10,000:
        // $1 = 0.0004% chance (threshold: 250,000)
        // $10,000 = 4% chance (threshold: 25)
        // $1,000 = 0.4% chance (threshold: 250)
        // $5,000 = 2.0% chance (threshold: 50)
        
        // Define probability range
        uint256 MIN_PROBABILITY_SCALED = 4; // 0.0004% * 10,000 for precision
        uint256 MAX_PROBABILITY_SCALED = 40000; // 4.0% * 10,000
        
        // Calculate win probability (scaled by 10,000 for integer math)
        uint256 winProbabilityScaled;
        
        if (swapAmount <= 1e18) { // $1 or less
            winProbabilityScaled = MIN_PROBABILITY_SCALED;
        } else if (swapAmount >= 10000e18) { // $10,000 or more
            winProbabilityScaled = MAX_PROBABILITY_SCALED;
        } else {
            // Linear interpolation between $1 and $10,000
            uint256 normalizedPosition = ((swapAmount - 1e18) * 10000) / (10000e18 - 1e18);
            winProbabilityScaled = MIN_PROBABILITY_SCALED + (normalizedPosition * (MAX_PROBABILITY_SCALED - MIN_PROBABILITY_SCALED)) / 10000;
        }
        
        // Convert probability to threshold
        // If probability is X%, threshold is (100/X)
        // Since we scaled probability by 10,000, we need to multiply by 10,000
        uint256 dynamicThreshold = 1000000 / winProbabilityScaled;
        
        // Determine if user won using the dynamic threshold
        bool isWinner = _randomness % dynamicThreshold == 0;
        
        if (isWinner && jackpotBalance > 0) {
            // Calculate win amount - full jackpot
            uint256 winAmount = jackpotBalance;
            jackpotBalance = 0;
            
            // Transfer jackpot to winner
            nativeTokenWrapper.transfer(user, winAmount);
            
            // Update stats
            lastWinner = user;
            lastWinAmount = winAmount;
            totalWinners++;
            totalPaidOut += winAmount;
            
            emit JackpotWon(user, winAmount);
        }
        
        // Clean up
        delete requestToUser[_requestId];
        delete requestToAmount[_requestId];
    }
    
    /**
     * @notice Update the VRF consumer address
     * @param _vrfConsumerAddress The new address
     */
    function setVRFConsumer(address _vrfConsumerAddress) external virtual override onlyOwner {
        require(_vrfConsumerAddress != address(0), "VRF consumer cannot be zero");
        address oldConsumer = vrfConsumer;
        vrfConsumer = _vrfConsumerAddress;
        emit VRFConsumerUpdated(oldConsumer, _vrfConsumerAddress);
    }
    
    /**
     * @notice Get the native token wrapper address used by this swap trigger
     * @return The native token wrapper address
     */
    function getNativeTokenWrapper() external view override returns (address) {
        return address(nativeTokenWrapper);
    }
    
    /**
     * @notice Get lottery statistics
     * @return winners Number of winners
     * @return paidOut Total amount paid out
     * @return current Current jackpot
     */
    function getStats() external view returns (
        uint256 winners,
        uint256 paidOut,
        uint256 current
    ) {
        return (totalWinners, totalPaidOut, jackpotBalance);
    }
    
    /**
     * @notice In case of emergency, recover native tokens
     * @param _to Address to send tokens to
     */
    function emergencyWithdraw(address _to) external onlyOwner {
        require(_to != address(0), "Cannot withdraw to zero address");
        uint256 balance = nativeTokenWrapper.balanceOf(address(this));
        nativeTokenWrapper.transfer(_to, balance);
        jackpotBalance = 0;
    }
    
    /**
     * @notice Request randomness - to be implemented by chain-specific triggers
     * @param _user User address for randomness request
     * @return requestId The request ID
     */
    function requestRandomness(address _user) internal virtual returns (uint256);
} 