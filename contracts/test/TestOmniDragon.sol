// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IDragon.sol";
import "../interfaces/IDragonSwapTrigger.sol";
import "../interfaces/IDragonJackpotVault.sol";
import "../interfaces/IVRFConsumer.sol";
import "./TestVRFConsumer.sol";
import "./TestCrossChainBridge.sol";
import "./TestLotteryMechanics.sol";

/**
 * @title TestWrappedSonic
 * @dev Mock implementation of Wrapped Sonic (wS) token for testing
 */
contract TestWrappedSonic is ERC20, Ownable {
    constructor() ERC20("Wrapped Sonic", "wS") Ownable() {}
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title MockVe69LPFeeDistributor
 * @dev Mock implementation of ve69LP fee distributor for testing
 */
contract MockVe69LPFeeDistributor is Ownable {
    TestWrappedSonic public wrappedSonic;
    
    event FeeReceived(address indexed sender, uint256 amount);
    
    constructor(address _wrappedSonic) Ownable() {
        wrappedSonic = TestWrappedSonic(_wrappedSonic);
    }
    
    function receiveFees(uint256 amount) external {
        emit FeeReceived(msg.sender, amount);
    }
}

/**
 * @title MockJackpotVault
 * @dev Mock implementation of the jackpot vault for testing
 */
contract MockJackpotVault is Ownable, IDragonJackpotVault {
    TestWrappedSonic public wrappedSonic;
    uint256 public balance;
    
    event JackpotIncreased(address indexed sender, uint256 amount);
    event JackpotDistributed(address indexed winner, uint256 amount);
    event JackpotWithdrawn(address indexed recipient, uint256 amount);
    
    constructor(address _wrappedSonic) Ownable() {
        wrappedSonic = TestWrappedSonic(_wrappedSonic);
    }
    
    function addToJackpot(uint256 amount) external override {
        balance += amount;
        emit JackpotIncreased(msg.sender, amount);
    }
    
    function getJackpotSize() external view override returns (uint256) {
        return balance;
    }
    
    function distributeJackpot(address winner, uint256 amount) external override {
        require(amount <= balance, "Insufficient balance");
        balance -= amount;
        wrappedSonic.transfer(winner, amount);
        emit JackpotDistributed(winner, amount);
    }
    
    function withdrawJackpot(uint256 amount, address recipient) external override onlyOwner {
        require(amount <= balance, "Insufficient balance");
        balance -= amount;
        wrappedSonic.transfer(recipient, amount);
        emit JackpotWithdrawn(recipient, amount);
    }
}

/**
 * @title MockChainRegistry
 * @dev Mock implementation of chain registry for testing
 */
contract MockChainRegistry is Ownable {
    struct ChainConfig {
        string chainName;
        uint16 chainId;
        address swapTrigger;
        address vrfConsumer;
        address nativeTokenWrapper;
    }
    
    mapping(uint16 => ChainConfig) public chainConfigs;
    uint16 public currentChainId;
    
    constructor(uint16 _currentChainId) Ownable() {
        currentChainId = _currentChainId;
    }
    
    function setChainConfig(
        uint16 _chainId,
        string memory _chainName,
        address _swapTrigger,
        address _vrfConsumer,
        address _nativeTokenWrapper
    ) external onlyOwner {
        chainConfigs[_chainId] = ChainConfig({
            chainName: _chainName,
            chainId: _chainId,
            swapTrigger: _swapTrigger,
            vrfConsumer: _vrfConsumer,
            nativeTokenWrapper: _nativeTokenWrapper
        });
    }
    
    function getChainConfig(uint16 _chainId) external view returns (ChainConfig memory) {
        return chainConfigs[_chainId];
    }
    
    function getCurrentChainId() external view returns (uint16) {
        return currentChainId;
    }
    
    function getSwapTrigger(uint16 _chainId) external view returns (address) {
        return chainConfigs[_chainId].swapTrigger;
    }
    
    function getNativeTokenWrapper(uint16 _chainId) external view returns (address) {
        return chainConfigs[_chainId].nativeTokenWrapper;
    }
}

/**
 * @title TestOmniDragon
 * @dev Integration test for OmniDragon features including VRF, cross-chain, and lottery
 */
contract TestOmniDragon {
    // Contracts
    TestWrappedSonic public wrappedSonic;
    IDragon public dragonToken;
    MockJackpotVault public jackpotVault;
    MockVe69LPFeeDistributor public ve69LPFeeDistributor;
    MockChainRegistry public chainRegistry;
    IDragonSwapTrigger public swapTrigger;
    TestVRFConsumer public vrfConsumer;
    TestCrossChainBridge public crossChainBridge;
    TestLotteryMechanics public lotteryMechanics;
    
    // Test parameters
    address public deployer;
    address public user1;
    address public user2;
    
    // Chain IDs
    uint16 public constant SONIC_CHAIN_ID = 146;
    uint16 public constant ARBITRUM_CHAIN_ID = 110;
    
    // Events
    event SetupComplete(address indexed deployer, address indexed dragonToken);
    event SwapCompleted(address indexed user, uint256 wsAmount, uint256 dragonAmount);
    event LotteryEntered(address indexed user, uint256 amount);
    event CrossChainTransferStarted(address indexed sender, uint16 dstChainId, uint256 amount);
    event RandomnessRequested(uint256 indexed requestId, address indexed user);
    event RandomnessDelivered(uint256 indexed requestId, uint256 randomness);
    event LotteryWon(address indexed winner, uint256 amount);
    
    constructor(address _deployer, address _user1, address _user2, address _dragonToken) {
        deployer = _deployer;
        user1 = _user1;
        user2 = _user2;
        dragonToken = IDragon(_dragonToken);
        
        // Initialize setup
        setup();
    }
    
    /**
     * @notice Setup all test contracts and configurations
     */
    function setup() internal {
        // Create base tokens
        wrappedSonic = new TestWrappedSonic();
        
        // Create infrastructure contracts
        jackpotVault = new MockJackpotVault(address(wrappedSonic));
        ve69LPFeeDistributor = new MockVe69LPFeeDistributor(address(wrappedSonic));
        chainRegistry = new MockChainRegistry(SONIC_CHAIN_ID);
        
        // Create test mechanics contracts
        vrfConsumer = new TestVRFConsumer(address(dragonToken));
        crossChainBridge = new TestCrossChainBridge(SONIC_CHAIN_ID, "Sonic");
        swapTrigger = IDragonSwapTrigger(address(0)); // Will be set after lotteryMechanics
        
        // Setup chain registry
        chainRegistry.setChainConfig(
            SONIC_CHAIN_ID,
            "Sonic",
            address(0), // Will update after creating swapTrigger
            address(vrfConsumer),
            address(wrappedSonic)
        );
        
        // Setup cross-chain bridge
        crossChainBridge.registerChain(ARBITRUM_CHAIN_ID, "Arbitrum");
        crossChainBridge.registerContract(SONIC_CHAIN_ID, address(dragonToken));
        
        // Setup and register lottery mechanics
        lotteryMechanics = new TestLotteryMechanics(
            address(wrappedSonic),
            address(dragonToken),
            address(0) // Will update after creating swapTrigger
        );
        
        // Create and configure swap trigger (placeholder, would be specific implementation in production)
        swapTrigger = IDragonSwapTrigger(address(0x123)); // Mock address for demonstration
        
        // Update references
        lotteryMechanics.updateSwapTrigger(address(swapTrigger));
        chainRegistry.setChainConfig(
            SONIC_CHAIN_ID,
            "Sonic",
            address(swapTrigger),
            address(vrfConsumer),
            address(wrappedSonic)
        );
        
        // Mint initial tokens for testing
        wrappedSonic.mint(deployer, 1000000 * 10**18);
        wrappedSonic.mint(user1, 10000 * 10**18);
        wrappedSonic.mint(user2, 10000 * 10**18);
        
        emit SetupComplete(deployer, address(dragonToken));
    }
    
    /**
     * @notice Simulate a swap from wS to DRAGON
     * @param _user User to perform the swap
     * @param _amount Amount of wS to swap
     */
    function simulateSwap(address _user, uint256 _amount) external {
        // Transfer wS tokens from user to this contract
        wrappedSonic.transferFrom(_user, address(this), _amount);
        
        // Simulate the swap through lottery mechanics
        wrappedSonic.approve(address(lotteryMechanics), _amount);
        uint256 dragonAmount = lotteryMechanics.simulateSwap(_amount);
        
        emit SwapCompleted(_user, _amount, dragonAmount);
        emit LotteryEntered(_user, _amount);
    }
    
    /**
     * @notice Simulate cross-chain transfer
     * @param _sender Sender address
     * @param _dstChainId Destination chain ID
     * @param _amount Amount to transfer
     * @return messageId The message ID for tracking
     */
    function simulateCrossChainTransfer(
        address _sender,
        uint16 _dstChainId,
        uint256 _amount
    ) external returns (uint256 messageId) {
        // Create payload for cross-chain message
        bytes memory payload = abi.encode(_sender, _amount);
        
        // Send message through bridge
        messageId = crossChainBridge.sendMessage(
            SONIC_CHAIN_ID,
            _dstChainId,
            address(dragonToken),
            crossChainBridge.omniDragonOnChain(_dstChainId),
            payload
        );
        
        // Update supply on both chains
        uint256 currentSupply = crossChainBridge.chainSupplies(SONIC_CHAIN_ID);
        crossChainBridge.updateChainSupply(SONIC_CHAIN_ID, currentSupply - _amount);
        
        uint256 dstSupply = crossChainBridge.chainSupplies(_dstChainId);
        crossChainBridge.updateChainSupply(_dstChainId, dstSupply + _amount);
        
        emit CrossChainTransferStarted(_sender, _dstChainId, _amount);
        
        return messageId;
    }
    
    /**
     * @notice Simulate VRF request and response
     * @param _user User to request randomness for
     * @return requestId The request ID
     */
    function simulateRandomnessRequest(address _user) external returns (uint256 requestId) {
        // Request randomness for user
        requestId = vrfConsumer.requestRandomness(_user);
        
        emit RandomnessRequested(requestId, _user);
        
        return requestId;
    }
    
    /**
     * @notice Simulate VRF response delivery
     * @param _requestId Request ID to fulfill
     * @param _randomness Random value to deliver
     */
    function simulateRandomnessDelivery(uint256 _requestId, uint256 _randomness) external {
        // Deliver randomness
        vrfConsumer.deliverRandomness(_requestId, _randomness);
        
        emit RandomnessDelivered(_requestId, _randomness);
    }
    
    /**
     * @notice Simulate lottery win
     * @param _winner Winner address
     * @param _amount Amount to win
     */
    function simulateLotteryWin(address _winner, uint256 _amount) external {
        // Simulate win in lottery mechanics
        lotteryMechanics.simulateWin(_winner, _amount);
        
        emit LotteryWon(_winner, _amount);
    }
    
    /**
     * @notice Add funds to jackpot
     * @param _sender Sender address
     * @param _amount Amount to add
     */
    function addToJackpot(address _sender, uint256 _amount) external {
        // Transfer wS tokens from sender
        wrappedSonic.transferFrom(_sender, address(this), _amount);
        
        // Add to jackpot
        wrappedSonic.approve(address(lotteryMechanics), _amount);
        lotteryMechanics.addToJackpot(_amount);
    }
    
    /**
     * @notice Get current test statistics
     * @return wsSupply Total wS supply
     * @return dragonSupply Total DRAGON supply
     * @return jackpotBalance Current jackpot balance
     * @return participantCount Number of lottery participants
     */
    function getTestStats() external view returns (
        uint256 wsSupply,
        uint256 dragonSupply,
        uint256 jackpotBalance,
        uint256 participantCount
    ) {
        wsSupply = wrappedSonic.totalSupply();
        dragonSupply = dragonToken.totalSupply();
        jackpotBalance = jackpotVault.getJackpotSize();
        participantCount = lotteryMechanics.getParticipantCount();
        
        return (wsSupply, dragonSupply, jackpotBalance, participantCount);
    }
} 