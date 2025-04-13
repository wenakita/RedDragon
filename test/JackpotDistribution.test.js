const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragonSwapLottery Automatic Jackpot Distribution", function () {
  let owner, user1, user2, exchangePair;
  let wrappedSonic, verifier, lottery;
  let requestId;

  // Constants for testing
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  
  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, exchangePair] = await ethers.getSigners();
    
    // Deploy mock wS token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.utils.parseEther("1000000"));
    
    // Deploy mock verifier
    const MockPaintSwapVRF = await ethers.getContractFactory("MockPaintSwapVRF");
    verifier = await MockPaintSwapVRF.deploy();
    
    // Deploy test lottery contract
    const TestRedDragonSwapLottery = await ethers.getContractFactory("TestRedDragonSwapLottery");
    lottery = await TestRedDragonSwapLottery.deploy(
      wrappedSonic.address,
      verifier.address
    );
    
    // Set exchange pair
    await lottery.setExchangePair(exchangePair.address);
    
    // Fund lottery with initial jackpot
    await wrappedSonic.transfer(lottery.address, ethers.utils.parseEther("1000"));
    await wrappedSonic.connect(owner).approve(lottery.address, ethers.utils.parseEther("10000"));
    await lottery.addToJackpot(ethers.utils.parseEther("1000"));
    
    // Fund users with wS
    await wrappedSonic.transfer(user1.address, ethers.utils.parseEther("10000"));
    await wrappedSonic.transfer(user2.address, ethers.utils.parseEther("10000"));
  });
  
  describe("Automatic Jackpot Distribution", function () {
    it("Should automatically distribute jackpot on win", async function () {
      // Get initial jackpot amount
      const initialJackpot = await lottery.getCurrentJackpot();
      expect(initialJackpot).to.equal(ethers.utils.parseEther("1000"));
      
      // Get initial user balance
      const initialUserBalance = await wrappedSonic.balanceOf(user1.address);
      
      // Setup a lottery entry (simulate a swap)
      const swapAmount = ethers.utils.parseEther("100"); // 100 wS
      
      // Use test function to bypass security checks
      await lottery.testProcessLottery(user1.address, swapAmount);
      
      // Get the requestId from emitted event
      const filter = lottery.filters.RandomnessRequested(null, user1.address);
      const events = await lottery.queryFilter(filter);
      expect(events.length).to.be.greaterThan(0);
      requestId = events[0].args.requestId;
      
      // Simulate winning by sending a random number that guarantees a win
      // Force a win by ensuring the random value is below the probability
      // In this case, the random value of 0 is guaranteed to be below any probability
      await verifier.fulfillRandomnessTest(requestId, [0]);
      
      // Check jackpot was reset
      const newJackpot = await lottery.getCurrentJackpot();
      expect(newJackpot).to.equal(0);
      
      // Check user received the jackpot
      const finalUserBalance = await wrappedSonic.balanceOf(user1.address);
      const expectedBalance = initialUserBalance.add(initialJackpot);
      expect(finalUserBalance).to.equal(expectedBalance);
      
      // Check stats were updated
      const stats = await lottery.getStats();
      expect(stats.winners).to.equal(1);
      expect(stats.payouts).to.equal(initialJackpot);
      expect(stats.current).to.equal(0);
    });
    
    it("Should work with owner calling distributeJackpot directly", async function () {
      // Setup a new jackpot
      await lottery.addToJackpot(ethers.utils.parseEther("500"));
      const jackpotAmount = await lottery.getCurrentJackpot();
      
      // Get initial user balance
      const initialUserBalance = await wrappedSonic.balanceOf(user2.address);
      
      // Owner directly distributes jackpot
      await lottery.connect(owner).distributeJackpot(user2.address, ethers.utils.parseEther("500"));
      
      // Check user received the amount
      const finalUserBalance = await wrappedSonic.balanceOf(user2.address);
      expect(finalUserBalance).to.equal(initialUserBalance.add(ethers.utils.parseEther("500")));
    });
    
    it("Should fail if non-authorized caller tries to distribute jackpot", async function () {
      // Try to distribute jackpot from user1 (not owner or contract itself)
      await expect(
        lottery.connect(user1).distributeJackpot(user2.address, ethers.utils.parseEther("500"))
      ).to.be.revertedWith("Not authorized");
    });
    
    it("Should validate that winner is not a contract", async function () {
      // Deploy a new contract to use as a potential receiver
      const MockReceiver = await ethers.getContractFactory("MockERC20");
      const receiver = await MockReceiver.deploy("Mock", "MCK", 0);
      
      // Try to distribute to a contract address
      await expect(
        lottery.connect(owner).distributeJackpot(receiver.address, ethers.utils.parseEther("500"))
      ).to.be.revertedWith("Winner cannot be a contract");
    });
    
    it("Should emit JackpotWon event when jackpot is distributed", async function () {
      // Check for event emission
      await expect(
        lottery.connect(owner).distributeJackpot(user1.address, ethers.utils.parseEther("500"))
      ).to.emit(lottery, "JackpotWon")
        .withArgs(user1.address, ethers.utils.parseEther("500"));
    });
  });
}); 