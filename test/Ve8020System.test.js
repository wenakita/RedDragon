const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Ve8020 System Integration", function () {
  let dragonToken, lpToken, veToken, feeDistributor, lotteryIntegrator, lottery, feeManager;
  let owner, user1, user2, jackpotAddress, burnAddress;
  const WEEK = 7 * 24 * 60 * 60; // 1 week in seconds
  const YEAR = 365 * 24 * 60 * 60; // 1 year in seconds
  const MAX_LOCK = 4 * YEAR; // 4 years in seconds

  beforeEach(async function () {
    [owner, user1, user2, jackpotAddress, burnAddress] = await ethers.getSigners();
    
    // Deploy tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    dragonToken = await MockERC20.deploy("Dragon Token", "DRAGON", ethers.parseEther("1000000"));
    lpToken = await MockERC20.deploy("80/20 LP Token", "LP8020", ethers.parseEther("1000000"));
    const wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.parseEther("1000000"));
    
    // Deploy ve8020 contract
    const Ve8020 = await ethers.getContractFactory("ve8020");
    veToken = await Ve8020.deploy(await lpToken.getAddress());
    
    // Deploy fee distributor
    const FeeDistributor = await ethers.getContractFactory("Ve8020FeeDistributor");
    feeDistributor = await FeeDistributor.deploy(
      await veToken.getAddress(),
      await dragonToken.getAddress()
    );
    
    // Deploy lottery setup
    const MockVerifier = await ethers.getContractFactory("MockRedDragonPaintSwapVerifier");
    const verifier = await MockVerifier.deploy();
    
    const MockLottery = await ethers.getContractFactory("MockRedDragonSwapLottery");
    lottery = await MockLottery.deploy(
      await wrappedSonic.getAddress(),
      await verifier.getAddress()
    );
    
    // Deploy lottery integrator
    const LotteryIntegrator = await ethers.getContractFactory("ve8020LotteryIntegrator");
    lotteryIntegrator = await LotteryIntegrator.deploy(
      await veToken.getAddress(),
      await lottery.getAddress()
    );
    
    // Deploy fee manager
    const FeeManager = await ethers.getContractFactory("RedDragonFeeManager");
    feeManager = await FeeManager.deploy(
      await dragonToken.getAddress(),
      await feeDistributor.getAddress(),
      jackpotAddress.address,
      burnAddress.address
    );
    
    // Set lottery in fee manager
    await feeManager.setLottery(await lottery.getAddress());
    
    // Fund users with tokens
    await lpToken.transfer(user1.address, ethers.parseEther("10000"));
    await lpToken.transfer(user2.address, ethers.parseEther("10000"));
    await dragonToken.transfer(user1.address, ethers.parseEther("100000"));
    
    // Approvals
    await lpToken.connect(user1).approve(await veToken.getAddress(), ethers.parseEther("10000"));
    await lpToken.connect(user2).approve(await veToken.getAddress(), ethers.parseEther("10000"));
    await dragonToken.connect(user1).approve(await feeManager.getAddress(), ethers.parseEther("100000"));
  });

  describe("End-to-End Flow", function () {
    it("Should allow full flow from locking LP tokens to receiving fee rewards", async function () {
      // 1. User1 locks LP tokens in ve8020
      const lockAmount = ethers.parseEther("1000");
      const unlockTime = (await time.latest()) + MAX_LOCK; // 4 years
      await veToken.connect(user1).createLock(lockAmount, unlockTime);
      
      // 2. Sync user's voting power to lottery through integrator
      await lotteryIntegrator.connect(user1).syncMyVotingPower();
      
      // 3. Verify voting power is reflected in lottery
      const votingPower = await veToken.balanceOf(user1.address);
      const lotteryVotingPower = await lottery.getUserVotingPower(user1.address);
      expect(lotteryVotingPower).to.equal(votingPower);
      
      // 4. Distribute fees through fee manager
      const feeAmount = ethers.parseEther("100");
      await feeManager.connect(user1).distributeFees(
        0, // jackpot share
        feeAmount, // ve distributor share
        0 // burn share
      );
      
      // 5. Fast forward to next epoch
      await time.increase(WEEK + 60);
      await feeDistributor.checkAdvanceEpoch();
      
      // 6. Claim rewards from fee distributor
      const initialDragonBalance = await dragonToken.balanceOf(user1.address);
      await feeDistributor.connect(user1).claimEpochRewards(0);
      
      // 7. Verify rewards were received
      const finalDragonBalance = await dragonToken.balanceOf(user1.address);
      expect(finalDragonBalance).to.be.gt(initialDragonBalance);
      expect(finalDragonBalance - initialDragonBalance).to.equal(feeAmount);
    });
    
    it("Should distribute rewards proportionally to ve8020 holders", async function () {
      // User1 and User2 lock different amounts and times
      // User1: 1000 tokens for max time (full voting power)
      const user1Amount = ethers.parseEther("1000");
      const maxUnlockTime = (await time.latest()) + MAX_LOCK;
      await veToken.connect(user1).createLock(user1Amount, maxUnlockTime);
      
      // User2: 2000 tokens for half time (half voting power per token)
      const user2Amount = ethers.parseEther("2000");
      const halfUnlockTime = (await time.latest()) + MAX_LOCK/2;
      await veToken.connect(user2).createLock(user2Amount, halfUnlockTime);
      
      // Distribute fees through fee manager
      const feeAmount = ethers.parseEther("3000");
      await feeManager.connect(user1).distributeFees(
        0, // jackpot share
        feeAmount, // ve distributor share
        0 // burn share
      );
      
      // Fast forward to next epoch
      await time.increase(WEEK + 60);
      await feeDistributor.checkAdvanceEpoch();
      
      // User1 should get 1000/2000 = 1/2 of the rewards
      // User2 should get 1000/2000 = 1/2 of the rewards (2000 * 0.5 voting power = 1000)
      
      // User1 claims rewards
      const user1InitialBalance = await dragonToken.balanceOf(user1.address);
      await feeDistributor.connect(user1).claimEpochRewards(0);
      const user1FinalBalance = await dragonToken.balanceOf(user1.address);
      const user1Rewards = user1FinalBalance - user1InitialBalance;
      
      // User2 claims rewards
      const user2InitialBalance = await dragonToken.balanceOf(user2.address);
      await feeDistributor.connect(user2).claimEpochRewards(0);
      const user2FinalBalance = await dragonToken.balanceOf(user2.address);
      const user2Rewards = user2FinalBalance - user2InitialBalance;
      
      // Both should receive approximately the same amount (50% each)
      expect(user1Rewards).to.be.closeTo(user2Rewards, ethers.parseEther("1"));
      expect(user1Rewards).to.be.closeTo(feeAmount / 2n, ethers.parseEther("1"));
      expect(user2Rewards).to.be.closeTo(feeAmount / 2n, ethers.parseEther("1"));
    });
    
    it("Should boost lottery odds based on locked LP tokens", async function () {
      // Set up mock boost calculation in lottery
      await lottery.setMockBoost(250); // 2.5x boost
      
      // User locks LP tokens
      const lockAmount = ethers.parseEther("1000");
      const unlockTime = (await time.latest()) + MAX_LOCK;
      await veToken.connect(user1).createLock(lockAmount, unlockTime);
      
      // Sync voting power to lottery
      await lotteryIntegrator.syncUserVotingPower(user1.address);
      
      // Check boost calculation
      const boost = await lotteryIntegrator.calculateEffectiveBoost(user1.address);
      expect(boost).to.equal(250); // 2.5x boost
    });
    
    it("Should update lottery jackpot when fees are distributed", async function () {
      // Initial jackpot
      const initialJackpot = await lottery.getJackpot();
      
      // Distribute fees with jackpot share
      const jackpotShare = ethers.parseEther("500");
      await feeManager.connect(user1).distributeFees(
        jackpotShare, // jackpot share
        0, // ve distributor share
        0 // burn share
      );
      
      // Final jackpot
      const finalJackpot = await lottery.getJackpot();
      expect(finalJackpot).to.equal(initialJackpot + jackpotShare);
    });
    
    it("Should burn tokens when fees are distributed with burn share", async function () {
      // Initial burn address balance
      const initialBurnBalance = await dragonToken.balanceOf(burnAddress.address);
      
      // Distribute fees with burn share
      const burnShare = ethers.parseEther("300");
      await feeManager.connect(user1).distributeFees(
        0, // jackpot share
        0, // ve distributor share
        burnShare // burn share
      );
      
      // Final burn address balance
      const finalBurnBalance = await dragonToken.balanceOf(burnAddress.address);
      expect(finalBurnBalance).to.equal(initialBurnBalance + burnShare);
    });
  });
}); 