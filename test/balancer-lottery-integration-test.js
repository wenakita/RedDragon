// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Balancer Lottery + VRF Integration Test
 * 
 * This test verifies that:
 * 1. SonicVRFConsumer can request randomness
 * 2. ArbitrumVRFRequester can receive the request and forward to VRF
 * 3. Randomness is properly received and processed
 * 4. Lottery mechanics work with the VRF-provided randomness
 */
describe("Balancer Lottery + VRF Integration", function() {
  // Test constants
  const ARBITRUM_CHAIN_ID = 110;  // LayerZero chain ID for Arbitrum
  const SONIC_CHAIN_ID = 175;     // LayerZero chain ID for Sonic
  const VRF_KEY_HASH = "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409";
  const VRF_SUBSCRIPTION_ID = 123;
  
  // Contract instances
  let owner, user1, user2, user3;
  let mockLayerZeroEndpoint, mockVRFCoordinator;
  let sonicVRFConsumer, arbitrumVRFRequester;
  let dragonLottery, wrappedSonic, ve69LP;
  let mockBalancerVault;
  
  before(async function() {
    // Get signers
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy mock contracts first
    const MockLayerZeroEndpoint = await ethers.getContractFactory("MockLayerZeroEndpoint");
    mockLayerZeroEndpoint = await MockLayerZeroEndpoint.deploy();
    
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinatorV2");
    mockVRFCoordinator = await MockVRFCoordinator.deploy();
    
    const MockBalancerVaultFactory = await ethers.getContractFactory("MockBalancerVaultImpl");
    mockBalancerVault = await MockBalancerVaultFactory.deploy();
    
    // Deploy token contracts
    const WrappedSonic = await ethers.getContractFactory("MockWrappedSonic");
    wrappedSonic = await WrappedSonic.deploy("Wrapped Sonic", "wS");
    
    const Ve69LP = await ethers.getContractFactory("MockVe69LP");
    ve69LP = await Ve69LP.deploy("Voting Escrow 69 LP", "ve69LP");
    
    // Deploy VRF infrastructure
    const VRFConsumerBase = await ethers.getContractFactory("VRFConsumerBase");
    const vrfConsumerBase = await VRFConsumerBase.deploy();
    
    const VRFConsumerBaseV2 = await ethers.getContractFactory("VRFConsumerBaseV2");
    const vrfConsumerBaseV2 = await VRFConsumerBaseV2.deploy(mockVRFCoordinator.address);
    
    // Deploy lottery contract first (to pass address to VRF consumer)
    const DragonLottery = await ethers.getContractFactory("MockDragonLottery");
    dragonLottery = await DragonLottery.deploy(wrappedSonic.address, ve69LP.address);
    
    // Deploy VRF consumer contracts
    const SonicVRFConsumer = await ethers.getContractFactory("SonicVRFConsumer");
    sonicVRFConsumer = await SonicVRFConsumer.deploy(
      mockLayerZeroEndpoint.address,
      ARBITRUM_CHAIN_ID,
      owner.address, // Temporarily use owner as placeholder for ArbitrumVRFRequester
      dragonLottery.address
    );
    
    const ArbitrumVRFRequester = await ethers.getContractFactory("ArbitrumVRFRequester");
    arbitrumVRFRequester = await ArbitrumVRFRequester.deploy(
      mockVRFCoordinator.address,
      mockLayerZeroEndpoint.address,
      VRF_SUBSCRIPTION_ID,
      VRF_KEY_HASH,
      SONIC_CHAIN_ID,
      sonicVRFConsumer.address
    );
    
    // Now update SonicVRFConsumer with correct ArbitrumVRFRequester address
    await sonicVRFConsumer.updateArbitrumVRFRequester(arbitrumVRFRequester.address);
    
    // Connect lottery to VRF consumer
    await dragonLottery.setVRFConsumer(sonicVRFConsumer.address);
    
    // Fund accounts with tokens for testing
    await wrappedSonic.mint(user1.address, ethers.utils.parseEther("10000"));
    await wrappedSonic.mint(user2.address, ethers.utils.parseEther("5000"));
    await wrappedSonic.mint(user3.address, ethers.utils.parseEther("1000"));
    
    await ve69LP.mint(user1.address, ethers.utils.parseEther("1000"));
    await ve69LP.mint(user2.address, ethers.utils.parseEther("10000"));
    
    // Set up mock protocol for cross-chain communication
    await mockLayerZeroEndpoint.setDestLzEndpoint(sonicVRFConsumer.address, mockLayerZeroEndpoint.address);
    await mockLayerZeroEndpoint.setDestLzEndpoint(arbitrumVRFRequester.address, mockLayerZeroEndpoint.address);
  });
  
  describe("VRF Integration", function() {
    it("should request randomness from SonicVRFConsumer", async function() {
      // Prepare for test
      await wrappedSonic.connect(user1).approve(dragonLottery.address, ethers.utils.parseEther("1000"));
      
      // User swaps wS tokens to enter lottery
      const tx = await dragonLottery.connect(user1).enterLottery(ethers.utils.parseEther("1000"));
      
      // Verify events
      const receipt = await tx.wait();
      expect(receipt.events.some(e => e.event === "LotteryEntered")).to.be.true;
      
      // Verify randomness was requested from SonicVRFConsumer
      expect(receipt.events.some(e => e.event === "RandomnessRequested")).to.be.true;
    });
    
    it("should receive randomness request on ArbitrumVRFRequester", async function() {
      // Simulate LayerZero message delivery from Sonic to Arbitrum
      await mockLayerZeroEndpoint.executeMessage(
        sonicVRFConsumer.address,
        arbitrumVRFRequester.address,
        0, // nonce
        ethers.utils.defaultAbiCoder.encode(
          ["uint64", "address"],
          [0, user1.address] // Request ID and user
        )
      );
      
      // Verify VRF request was made to Chainlink
      const requestStatus = await arbitrumVRFRequester.requests(0);
      expect(requestStatus.sonicRequestId).to.equal(0);
      expect(requestStatus.user).to.equal(user1.address);
      expect(requestStatus.fulfilled).to.be.false;
    });
    
    it("should process VRF randomness and send back to Sonic", async function() {
      // Simulate VRF coordinator fulfilling randomness
      await mockVRFCoordinator.fulfillRandomWords(
        0, // requestId
        arbitrumVRFRequester.address,
        [12345678] // Random value
      );
      
      // Verify request is now fulfilled
      const requestStatus = await arbitrumVRFRequester.requests(0);
      expect(requestStatus.fulfilled).to.be.true;
      expect(requestStatus.randomness).to.equal(12345678);
    });
    
    it("should complete the lottery draw when randomness is received", async function() {
      // Simulate LayerZero message delivery from Arbitrum to Sonic
      await mockLayerZeroEndpoint.executeMessage(
        arbitrumVRFRequester.address,
        sonicVRFConsumer.address,
        0, // nonce
        ethers.utils.defaultAbiCoder.encode(
          ["uint64", "address", "uint256"],
          [0, user1.address, 12345678] // Request ID, user, and randomness
        )
      );
      
      // Verify lottery results were processed
      const lotteryResult = await dragonLottery.getLastLotteryResult();
      expect(lotteryResult.processed).to.be.true;
      expect(lotteryResult.randomness).to.equal(12345678);
    });
  });
  
  describe("Balancer Lottery Mechanics", function() {
    it("should calculate win probability based on wS amount", async function() {
      // Test with 1 wS
      let probability = await dragonLottery.calculateWinProbability(ethers.utils.parseEther("1"));
      expect(probability).to.equal(4); // 0.0004% (4 out of 1,000,000)
      
      // Test with 10,000 wS
      probability = await dragonLottery.calculateWinProbability(ethers.utils.parseEther("10000"));
      expect(probability).to.equal(40000); // 4% (40,000 out of 1,000,000)
      
      // Test with 5,000 wS (midpoint)
      probability = await dragonLottery.calculateWinProbability(ethers.utils.parseEther("5000"));
      expect(probability).to.be.closeTo(20000, 10); // ~2% (20,000 out of 1,000,000)
    });
    
    it("should apply ve69LP boost correctly", async function() {
      // Base probability for 1,000 wS
      const baseProbability = await dragonLottery.calculateWinProbability(ethers.utils.parseEther("1000"));
      
      // User 1 with 1,000 ve69LP (~1.46x boost)
      const user1Boost = await dragonLottery.calculateBoostMultiplier(ethers.utils.parseEther("1000"));
      const user1Probability = await dragonLottery.calculateBoostedProbability(
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("1000")
      );
      
      // User 2 with 10,000 ve69LP (~2.15x boost)
      const user2Boost = await dragonLottery.calculateBoostMultiplier(ethers.utils.parseEther("10000"));
      const user2Probability = await dragonLottery.calculateBoostedProbability(
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("10000")
      );
      
      // Verify boosts
      expect(user1Probability).to.be.closeTo(baseProbability.mul(user1Boost).div(ethers.utils.parseEther("1")), 10);
      expect(user2Probability).to.be.closeTo(baseProbability.mul(user2Boost).div(ethers.utils.parseEther("1")), 10);
      
      // Verify user 2 has higher probability than user 1
      expect(user2Probability).to.be.gt(user1Probability);
    });
    
    it("should determine winner correctly based on randomness", async function() {
      // Test with a randomness value that should result in a win
      // 12,345 is below 40,000 threshold for 10,000 wS
      const isWinner1 = await dragonLottery.checkWinStatus(
        12345, // Randomness
        ethers.utils.parseEther("10000"), // 10,000 wS
        0 // No ve69LP
      );
      expect(isWinner1).to.be.true;
      
      // Test with a randomness value that should result in a loss
      // 950,000 is above the threshold for 1 wS (4) and should be a loss
      const isWinner2 = await dragonLottery.checkWinStatus(
        950000, // Randomness
        ethers.utils.parseEther("1"), // 1 wS
        0 // No ve69LP
      );
      expect(isWinner2).to.be.false;
      
      // Test with ve69LP boost
      // 60,000 is above threshold for 10,000 wS (40,000) but below with 2x boost (80,000)
      const isWinner3 = await dragonLottery.checkWinStatus(
        60000, // Randomness
        ethers.utils.parseEther("10000"), // 10,000 wS
        ethers.utils.parseEther("10000") // 10,000 ve69LP (~2.15x boost)
      );
      expect(isWinner3).to.be.true;
    });
  });
  
  describe("Full Lottery Flow", function() {
    it("should complete a full lottery cycle with multiple users", async function() {
      // Reset lottery state
      await dragonLottery.resetLottery();
      
      // User 1 enters with 500 wS and 1,000 ve69LP
      await wrappedSonic.connect(user1).approve(dragonLottery.address, ethers.utils.parseEther("500"));
      await dragonLottery.connect(user1).enterLotteryWithBoost(
        ethers.utils.parseEther("500"),
        ethers.utils.parseEther("1000")
      );
      
      // User 2 enters with 2,000 wS and 10,000 ve69LP
      await wrappedSonic.connect(user2).approve(dragonLottery.address, ethers.utils.parseEther("2000"));
      await dragonLottery.connect(user2).enterLotteryWithBoost(
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("10000")
      );
      
      // User 3 enters with 1,000 wS and no ve69LP
      await wrappedSonic.connect(user3).approve(dragonLottery.address, ethers.utils.parseEther("1000"));
      await dragonLottery.connect(user3).enterLottery(ethers.utils.parseEther("1000"));
      
      // Mock a winning randomness value for User 2
      // In a real environment, this would come from VRF
      await dragonLottery.mockRandomnessResult(1, user2.address, 15000); // Winner
      
      // Check User 2 won
      const lotteryResult = await dragonLottery.getLastLotteryResult();
      expect(lotteryResult.processed).to.be.true;
      expect(lotteryResult.winner).to.equal(user2.address);
      
      // Verify prize distribution
      const jackpotAmount = await dragonLottery.getJackpotAmount();
      expect(jackpotAmount).to.be.gt(0);
      
      const balanceBefore = await wrappedSonic.balanceOf(user2.address);
      await dragonLottery.distributePrize();
      const balanceAfter = await wrappedSonic.balanceOf(user2.address);
      
      expect(balanceAfter).to.be.gt(balanceBefore);
      expect(balanceAfter.sub(balanceBefore)).to.equal(jackpotAmount);
    });
  });
});

// Mock contract implementations for testing
contract("MockLayerZeroEndpoint", function() {
  mapping(address => address) private destLzEndpoint;
  
  function setDestLzEndpoint(address _source, address _dest) external {
    destLzEndpoint[_source] = _dest;
  }
  
  function send(
    MessagingParams calldata _params,
    address payable _refundAddress
  ) external payable returns (MessagingReceipt memory) {
    return MessagingReceipt({
      guid: bytes32(0),
      nonce: 0,
      fee: MessagingFee(0, 0)
    });
  }
  
  function executeMessage(
    address _source,
    address _destination,
    uint64 _nonce,
    bytes calldata _payload
  ) external {
    ILayerZeroReceiver(_destination).lzReceive(
      0, // srcChainId
      abi.encodePacked(_source),
      _nonce,
      _payload
    );
  }
}

contract("MockVRFCoordinatorV2", function() {
  function requestRandomWords(
    bytes32 _keyHash,
    uint64 _subscriptionId,
    uint16 _minimumRequestConfirmations,
    uint32 _callbackGasLimit,
    uint32 _numWords
  ) external returns (uint256) {
    return 0; // Return request ID 0
  }
  
  function fulfillRandomWords(
    uint256 _requestId,
    address _consumer,
    uint256[] calldata _randomWords
  ) external {
    VRFConsumerBaseV2(_consumer).rawFulfillRandomWords(_requestId, _randomWords);
  }
}

contract("MockWrappedSonic", function() {
  constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}
  
  function mint(address _to, uint256 _amount) external {
    _mint(_to, _amount);
  }
}

contract("MockVe69LP", function() {
  constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}
  
  function mint(address _to, uint256 _amount) external {
    _mint(_to, _amount);
  }
}

contract("MockDragonLottery", function() {
  address public wrappedSonic;
  address public ve69LP;
  address public vrfConsumer;
  
  struct LotteryResult {
    bool processed;
    address winner;
    uint256 randomness;
  }
  
  LotteryResult public lastResult;
  uint256 public jackpotAmount;
  
  constructor(address _wrappedSonic, address _ve69LP) {
    wrappedSonic = _wrappedSonic;
    ve69LP = _ve69LP;
    jackpotAmount = 0;
  }
  
  function setVRFConsumer(address _vrfConsumer) external {
    vrfConsumer = _vrfConsumer;
  }
  
  function enterLottery(uint256 _amount) external {
    IERC20(wrappedSonic).transferFrom(msg.sender, address(this), _amount);
    jackpotAmount += _amount;
    
    // Request randomness
    IVRFConsumer(vrfConsumer).requestRandomness(msg.sender);
    
    emit LotteryEntered(msg.sender, _amount, 0);
  }
  
  function enterLotteryWithBoost(uint256 _amount, uint256 _ve69LPAmount) external {
    IERC20(wrappedSonic).transferFrom(msg.sender, address(this), _amount);
    jackpotAmount += _amount;
    
    // Request randomness
    IVRFConsumer(vrfConsumer).requestRandomness(msg.sender);
    
    emit LotteryEntered(msg.sender, _amount, _ve69LPAmount);
  }
  
  function mockRandomnessResult(uint64 _requestId, address _user, uint256 _randomness) external {
    lastResult = LotteryResult({
      processed: true,
      winner: _user,
      randomness: _randomness
    });
  }
  
  function processRandomness(uint64 _requestId, address _user, uint256 _randomness) external {
    lastResult = LotteryResult({
      processed: true,
      winner: _user,
      randomness: _randomness
    });
  }
  
  function getLastLotteryResult() external view returns (LotteryResult memory) {
    return lastResult;
  }
  
  function getJackpotAmount() external view returns (uint256) {
    return jackpotAmount;
  }
  
  function distributePrize() external {
    if (lastResult.processed && lastResult.winner != address(0)) {
      IERC20(wrappedSonic).transfer(lastResult.winner, jackpotAmount);
      jackpotAmount = 0;
    }
  }
  
  function resetLottery() external {
    lastResult = LotteryResult({
      processed: false,
      winner: address(0),
      randomness: 0
    });
    jackpotAmount = 0;
  }
  
  function calculateWinProbability(uint256 _wsAmount) external pure returns (uint256) {
    // Define constants
    uint256 MIN_PROBABILITY = 4;      // 0.0004% = 4 out of 10^6
    uint256 MAX_PROBABILITY = 40000;  // 4% = 40,000 out of 10^6
    uint256 MAX_AMOUNT = 10000 ether; // 10,000 wS with 18 decimals
    
    // Ensure minimum swap amount
    uint256 amount = _wsAmount < 1 ether ? 1 ether : _wsAmount;
    
    // Calculate probability (linear scaling)
    if (amount >= MAX_AMOUNT) {
      return MAX_PROBABILITY;
    } else {
      // Linear interpolation
      uint256 slope = ((MAX_PROBABILITY - MIN_PROBABILITY) * 1e18) / (MAX_AMOUNT - 1 ether);
      uint256 increase = ((amount - 1 ether) * slope) / 1e18;
      return MIN_PROBABILITY + increase;
    }
  }
  
  function calculateBoostMultiplier(uint256 _ve69LPAmount) external pure returns (uint256) {
    // No ve69LP means no boost
    if (_ve69LPAmount == 0) return 1e18; // 1.0 with 18 decimals precision
    
    // Define boost parameters
    uint256 BASE_MULTIPLIER = 1e18;  // 1.0 base
    uint256 MAX_BONUS = 15e17;       // 1.5 maximum additional bonus
    uint256 SCALE_FACTOR = 10e18;    // Scale factor for the cube root
    
    // Calculate cube root of ve69LP amount
    uint256 cubeRoot = approximateCubeRoot(_ve69LPAmount);
    
    // Calculate bonus with diminishing returns
    uint256 bonus = (cubeRoot * 1e18) / SCALE_FACTOR;
    
    // Cap the bonus at max bonus
    if (bonus > MAX_BONUS) {
      bonus = MAX_BONUS;
    }
    
    // Return base multiplier + bonus
    return BASE_MULTIPLIER + bonus;
  }
  
  function calculateBoostedProbability(uint256 _wsAmount, uint256 _ve69LPAmount) external view returns (uint256) {
    uint256 baseProbability = this.calculateWinProbability(_wsAmount);
    uint256 boostMultiplier = this.calculateBoostMultiplier(_ve69LPAmount);
    return (baseProbability * boostMultiplier) / 1e18;
  }
  
  function checkWinStatus(
    uint256 _randomness,
    uint256 _wsAmount, 
    uint256 _ve69LPAmount
  ) external view returns (bool) {
    // Scale randomness to range 0-999,999
    uint256 scaledRandom = _randomness % 1_000_000;
    
    // Calculate threshold
    uint256 baseProbability = this.calculateWinProbability(_wsAmount);
    
    // Apply boost if applicable
    if (_ve69LPAmount > 0) {
      uint256 boostMultiplier = this.calculateBoostMultiplier(_ve69LPAmount);
      baseProbability = (baseProbability * boostMultiplier) / 1e18;
    }
    
    // User wins if random number is less than threshold
    return scaledRandom < baseProbability;
  }
  
  function approximateCubeRoot(uint256 x) internal pure returns (uint256) {
    // Simplified cube root approximation for testing
    if (x == 0) return 0;
    
    uint256 result;
    if (x < 1000) {
      result = (x ** 333) / (1e18 ** 332);
    } else {
      // Rough approximation for larger values
      if (x < 1000 ether) {
        result = x ** (1 / 3);
      } else {
        result = 100 * (x / 1e18) ** (1 / 3);
      }
    }
    
    return result;
  }
  
  event LotteryEntered(address indexed user, uint256 amount, uint256 ve69LPAmount);
}

contract("MockBalancerVaultImpl", function() {
  using SafeERC20 for IERC20;
  
  // Pool data
  struct PoolData {
    address[] tokens;
    uint256[] balances;
    uint256 lastChangeBlock;
  }
  
  // Storage
  mapping(bytes32 => PoolData) private pools;
  uint256 private mockReturnAmount;
  
  function setupPool(
    bytes32 poolId,
    address[] memory tokens,
    uint256[] memory balances,
    uint256 lastChangeBlock
  ) external {
    PoolData storage pool = pools[poolId];
    pool.tokens = tokens;
    pool.balances = balances;
    pool.lastChangeBlock = lastChangeBlock;
  }
  
  function mockSetReturnAmount(uint256 amount) external {
    mockReturnAmount = amount;
  }
  
  function getPoolTokens(bytes32 poolId) external view returns (
    address[] memory tokens,
    uint256[] memory balances,
    uint256 lastChangeBlock
  ) {
    PoolData storage pool = pools[poolId];
    return (pool.tokens, pool.balances, pool.lastChangeBlock);
  }
  
  function swap(
    SingleSwap memory singleSwap,
    FundManagement memory funds,
    uint256 limit,
    uint256 deadline
  ) external payable returns (uint256) {
    // Transfer tokens from sender to this contract
    IERC20(singleSwap.assetIn).safeTransferFrom(funds.sender, address(this), singleSwap.amount);
    
    // Transfer return tokens to recipient
    IERC20(singleSwap.assetOut).safeTransfer(funds.recipient, mockReturnAmount);
    
    return mockReturnAmount;
  }
  
  function joinPool(
    bytes32 poolId,
    address sender,
    address recipient,
    JoinPoolRequest memory request
  ) external payable {
    // Implementation for testing
  }
  
  function exitPool(
    bytes32 poolId,
    address sender,
    address payable recipient,
    ExitPoolRequest memory request
  ) external {
    // Implementation for testing
  }
  
  // Required struct definitions for interface compatibility
  struct SingleSwap {
    bytes32 poolId;
    uint8 kind;
    address assetIn;
    address assetOut;
    uint256 amount;
    bytes userData;
  }
  
  struct FundManagement {
    address sender;
    bool fromInternalBalance;
    address payable recipient;
    bool toInternalBalance;
  }
  
  struct JoinPoolRequest {
    address[] assets;
    uint256[] maxAmountsIn;
    bytes userData;
    bool fromInternalBalance;
  }
  
  struct ExitPoolRequest {
    address[] assets;
    uint256[] minAmountsOut;
    bytes userData;
    bool toInternalBalance;
  }
} 