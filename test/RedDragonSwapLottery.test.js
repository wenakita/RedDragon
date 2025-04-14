const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragonSwapLottery", function () {
  let redDragonSwapLottery;
  let wrappedSonic;
  let verifier;
  let lpToken;
  let redEnvelope;
  let lpBooster;
  let priceOracle;
  let owner;
  let user1;
  let user2;
  let exchangePair;
  let votingToken;

  beforeEach(async function () {
    [owner, user1, user2, exchangePair] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.utils.parseEther("1000000"));
    lpToken = await MockERC20.deploy("LP Token", "LP", ethers.utils.parseEther("1000000"));
    votingToken = await MockERC20.deploy("Voting Token", "VOTE", ethers.utils.parseEther("1000000"));

    // Deploy mock verifier
    const MockPaintSwapVRF = await ethers.getContractFactory("contracts/mocks/MockPaintSwapVRF.sol:MockPaintSwapVRF");
    verifier = await MockPaintSwapVRF.deploy();
    await verifier.deployed();

    // Deploy mock price oracle
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracle.deploy(1000000); // Initial price of $1.00 (6 decimals)
    await priceOracle.deployed();

    // Deploy mock red envelope
    const RedEnvelope = await ethers.getContractFactory("contracts/RedEnvelope.sol:RedEnvelope");
    redEnvelope = await RedEnvelope.deploy(
      "Red Dragon Red Envelope",
      "RDRE",
      "https://api.reddragon.xyz/redenvelope/"
    );
    await redEnvelope.deployed();

    // Deploy mock LP booster
    const MockLPBooster = await ethers.getContractFactory("contracts/mocks/MockRedDragonLPBooster.sol:MockRedDragonLPBooster");
    lpBooster = await MockLPBooster.deploy(lpToken.address);
    await lpBooster.deployed();

    // Deploy the lottery contract
    const RedDragonSwapLottery = await ethers.getContractFactory("RedDragonSwapLottery");
    redDragonSwapLottery = await RedDragonSwapLottery.deploy(wrappedSonic.address, verifier.address);
    await redDragonSwapLottery.deployed();

    // Set up required addresses
    await redDragonSwapLottery.setExchangePair(exchangePair.address);
    await redDragonSwapLottery.setLPToken(lpToken.address);
    await redDragonSwapLottery.setRedEnvelope(redEnvelope.address);
    await redDragonSwapLottery.setLPBooster(lpBooster.address);
    await redDragonSwapLottery.setPriceOracle(priceOracle.address);
    await redDragonSwapLottery.setVotingToken(votingToken.address);
    
    // Fund the lottery contract with wS for jackpots
    await wrappedSonic.transfer(redDragonSwapLottery.address, ethers.utils.parseEther("100000"));
    
    // Give users some wS tokens
    await wrappedSonic.transfer(user1.address, ethers.utils.parseEther("10000"));
    await wrappedSonic.transfer(user2.address, ethers.utils.parseEther("5000"));
    
    // Give users some LP tokens
    await lpToken.transfer(user1.address, ethers.utils.parseEther("1000"));
    await lpToken.transfer(user2.address, ethers.utils.parseEther("500"));

    // Record LP acquisition timestamps to satisfy holding requirement
    const lpAmount1 = ethers.utils.parseEther("1000");
    const lpAmount2 = ethers.utils.parseEther("500");
    await redDragonSwapLottery.recordLpAcquisition(user1.address, lpAmount1);
    await redDragonSwapLottery.recordLpAcquisition(user2.address, lpAmount2);
    
    // Fast-forward time to meet the LP holding requirement
    await ethers.provider.send("evm_increaseTime", [2 * 86400]); // 2 days
    await ethers.provider.send("evm_mine");
    
    // Add to jackpot
    await wrappedSonic.approve(redDragonSwapLottery.address, ethers.utils.parseEther("1000"));
    await redDragonSwapLottery.addToJackpot(ethers.utils.parseEther("1000"));
  });

  describe("Initialization", function() {
    it("should initialize with correct values", async function() {
      expect(await redDragonSwapLottery.wrappedSonic()).to.equal(wrappedSonic.address);
      expect(await redDragonSwapLottery.verifier()).to.equal(verifier.address);
      expect(await redDragonSwapLottery.exchangePair()).to.equal(exchangePair.address);
      expect(await redDragonSwapLottery.lpToken()).to.equal(lpToken.address);
      expect(await redDragonSwapLottery.isPaused()).to.equal(false);
      expect(await redDragonSwapLottery.redEnvelope()).to.equal(redEnvelope.address);
      expect(await redDragonSwapLottery.lpBooster()).to.equal(lpBooster.address);
      expect(await redDragonSwapLottery.jackpot()).to.equal(ethers.utils.parseEther("1000"));
    });
  });

  describe("Lottery Entry and Processing", function() {
    it("should process a buy and potentially update the pity boost", async function() {
      const wsAmount = ethers.utils.parseEther("1");
      
      // Get the initial accumulated boost
      const initialBoost = await redDragonSwapLottery.accumulatedWSBoost();
      expect(initialBoost).to.equal(0);
      
      // Process a buy from the exchange pair
      await redDragonSwapLottery.connect(exchangePair).processBuy(user1.address, wsAmount);
      
      // Fulfill the randomness request to trigger pity boost update
      const requestId = await verifier.lastRequestId();
      const randomWords = [ethers.utils.parseEther("1")]; // Use a large value to ensure a loss
      await verifier.fulfillRandomWords(requestId, randomWords);
      
      // Check if pity boost was updated (it should increase when not winning)
      const newBoost = await redDragonSwapLottery.accumulatedWSBoost();
      const expectedBoost = ethers.utils.parseEther("1").div(10000000); // wsAmount * PITY_PERCENT_OF_SWAP / PITY_DIVISOR
      expect(newBoost).to.equal(expectedBoost);
    });
    
    it("should not allow non-exchange pair to process buys", async function() {
      const wsAmount = ethers.utils.parseEther("100");
      
      // Try to process a buy from a non-exchange pair address
      await expect(
        redDragonSwapLottery.connect(user1).processBuy(user1.address, wsAmount)
      ).to.be.revertedWith("Invalid context");
    });
    
    it("should not allow entry below minimum amount", async function() {
      const wsAmount = ethers.utils.parseEther("0.5"); // 0.5 wS, below the minimum
      
      // Process a buy with too small amount
      await expect(
        redDragonSwapLottery.connect(exchangePair).processBuy(user1.address, wsAmount)
      ).to.be.revertedWith("Invalid wSonic amount");
    });
  });

  describe("Probability and Boost Calculations", function() {
    it("should calculate base probability correctly", async function() {
      const wsAmount = ethers.utils.parseEther("1"); // 1 wS
      const baseProbability = await redDragonSwapLottery.calculateProbability(wsAmount);
      expect(baseProbability).to.equal(4000); // 0.4% for 1 wS
    });

    it("should apply LP boost correctly", async function() {
      const wsAmount = ethers.utils.parseEther("1");
      const baseProbability = await redDragonSwapLottery.calculateProbability(wsAmount);
      
      // Record LP acquisition timestamp
      await redDragonSwapLottery.recordLpAcquisition(user1.address, ethers.utils.parseEther("1000"));
      
      // Fast forward time to meet LP holding requirement
      await ethers.provider.send("evm_increaseTime", [2 * 86400]); // 2 days
      await ethers.provider.send("evm_mine");
      
      // Calculate probability with LP boost
      const boostedProbability = await redDragonSwapLottery.calculateProbability(user1.address, wsAmount);
      
      // The boost should be at least 1x (100) since user1 has LP tokens
      // The mock booster returns BASE_BOOST (100) for any LP balance
      expect(boostedProbability).to.equal(baseProbability);
    });

    it("should apply red envelope boost correctly", async function() {
      // Mint a red envelope to user1 directly
      await redEnvelope.mint(user1.address, 1, true); // Rarity 1, early adopter
      
      const wsAmount = ethers.utils.parseEther("1");
      const baseProbability = await redDragonSwapLottery.calculateProbability(wsAmount);
      
      // Calculate probability with red envelope boost
      const boostedProbability = await redDragonSwapLottery.calculateProbability(user1.address, wsAmount);
      
      // The boost should be at least 1.5x (150) since user1 has a red envelope
      const expectedMinBoost = baseProbability.mul(150).div(100);
      expect(boostedProbability).to.be.gte(expectedMinBoost);
    });
  });

  describe("Jackpot Management", function() {
    it("should add to the jackpot correctly", async function() {
      const initialJackpot = await redDragonSwapLottery.jackpot();
      const addAmount = ethers.utils.parseEther("500");
      
      await wrappedSonic.approve(redDragonSwapLottery.address, addAmount);
      await redDragonSwapLottery.addToJackpot(addAmount);
      
      const newJackpot = await redDragonSwapLottery.jackpot();
      expect(newJackpot).to.equal(initialJackpot.add(addAmount));
    });

    it("should allow owner to transfer jackpot", async function() {
      const initialJackpot = await redDragonSwapLottery.jackpot();
      const transferAmount = ethers.utils.parseEther("500");
      const initialUserBalance = await wrappedSonic.balanceOf(user1.address);
      
      await redDragonSwapLottery.transferJackpotTo(user1.address, transferAmount);
      
      const newJackpot = await redDragonSwapLottery.jackpot();
      expect(newJackpot).to.equal(initialJackpot.sub(transferAmount));
      
      const newUserBalance = await wrappedSonic.balanceOf(user1.address);
      expect(newUserBalance).to.equal(initialUserBalance.add(transferAmount));
    });

    it("should not allow non-owner to transfer jackpot", async function() {
      const transferAmount = ethers.utils.parseEther("500");
      
      await expect(
        redDragonSwapLottery.connect(user1).transferJackpotTo(user1.address, transferAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should not allow transferring more than jackpot amount", async function() {
      const jackpotAmount = await redDragonSwapLottery.jackpot();
      const transferAmount = jackpotAmount.add(ethers.utils.parseEther("1"));
      
      await expect(
        redDragonSwapLottery.transferJackpotTo(user1.address, transferAmount)
      ).to.be.revertedWith("Amount exceeds jackpot");
    });
  });

  describe("Timelock Operations", function() {
    it("should allow proposing emergency withdraw", async function() {
      const withdrawAmount = ethers.utils.parseEther("500");
      await redDragonSwapLottery.proposeEmergencyWithdraw(withdrawAmount);
      
      const operationId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string", "uint256"], ["emergencyWithdraw", withdrawAmount])
      );
      
      const expiration = await redDragonSwapLottery.timelockExpirations(operationId);
      expect(expiration).to.be.gt(0);
    });

    it("should not allow executing emergency withdraw before timelock", async function() {
      const withdrawAmount = ethers.utils.parseEther("500");
      await redDragonSwapLottery.proposeEmergencyWithdraw(withdrawAmount);
      
      await expect(
        redDragonSwapLottery.executeEmergencyWithdraw(withdrawAmount)
      ).to.be.revertedWith("Timelock not expired");
    });

    it("should allow executing emergency withdraw after timelock", async function() {
      const withdrawAmount = ethers.utils.parseEther("500");
      await redDragonSwapLottery.proposeEmergencyWithdraw(withdrawAmount);
      
      // Fast forward time to pass timelock period
      await ethers.provider.send("evm_increaseTime", [3 * 86400]); // 3 days
      await ethers.provider.send("evm_mine");
      
      await redDragonSwapLottery.executeEmergencyWithdraw(withdrawAmount);
      
      const newJackpot = await redDragonSwapLottery.jackpot();
      expect(newJackpot).to.equal(ethers.utils.parseEther("500")); // 1000 - 500
    });
  });

  describe("VRF Integration", function() {
    it("should request randomness correctly", async function() {
      const wsAmount = ethers.utils.parseEther("1000");
      await redDragonSwapLottery.connect(exchangePair).processBuy(user1.address, wsAmount);
      
      // Verify that a randomness request was made
      const requestId = await verifier.lastRequestId();
      expect(requestId).to.not.equal(ethers.constants.HashZero);
    });

    it("should process randomness correctly", async function() {
      const wsAmount = ethers.utils.parseEther("1000");
      await redDragonSwapLottery.connect(exchangePair).processBuy(user1.address, wsAmount);
      
      const requestId = await verifier.lastRequestId();
      const randomWords = [12345]; // Arbitrary random value
      
      // Fulfill the randomness request
      await verifier.fulfillRandomWords(requestId, randomWords);
      
      // Verify that the request was processed
      const pendingRequest = await redDragonSwapLottery.pendingRequests(requestId);
      expect(pendingRequest.user).to.equal(ethers.constants.AddressZero);
    });
  });

  describe("Security Features", function() {
    it("should prevent contract addresses from winning", async function() {
      // Deploy a mock contract
      const MockContract = await ethers.getContractFactory("MockContract");
      const mockContract = await MockContract.deploy();
      await mockContract.deployed();
      
      const wsAmount = ethers.utils.parseEther("1");
      
      await expect(
        redDragonSwapLottery.connect(exchangePair).processBuy(mockContract.address, wsAmount)
      ).to.be.revertedWith("Winner cannot be a contract");
    });

    it("should enforce LP holding requirement", async function() {
      // Create a new user with no LP tokens
      const [newUser] = await ethers.getSigners();
      await wrappedSonic.transfer(newUser.address, ethers.utils.parseEther("1"));
      
      const wsAmount = ethers.utils.parseEther("1");
      
      // Calculate probability for user with no LP
      const noLpProbability = await redDragonSwapLottery.calculateProbability(wsAmount);
      
      // Without LP tokens, should get base probability (4000 for 1 wS)
      expect(noLpProbability).to.equal(4000);
      
      // Give user some LP tokens but don't record acquisition
      await lpToken.transfer(newUser.address, ethers.utils.parseEther("1000"));
      
      // Calculate probability again - should still be base probability since acquisition not recorded
      const noRecordProbability = await redDragonSwapLottery.calculateProbability(wsAmount);
      expect(noRecordProbability).to.equal(4000);
      
      // Record LP acquisition
      await redDragonSwapLottery.recordLpAcquisition(newUser.address, ethers.utils.parseEther("1000"));
      
      // Fast forward time to meet LP holding requirement
      await ethers.provider.send("evm_increaseTime", [2 * 86400]); // 2 days
      await ethers.provider.send("evm_mine");
      
      // Calculate probability again - should now be boosted
      const boostedProbability = await redDragonSwapLottery.calculateProbability(newUser.address, wsAmount);
      expect(boostedProbability).to.be.gt(4000);
    });
  });
}); 