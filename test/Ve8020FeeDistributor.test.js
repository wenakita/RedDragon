const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Ve8020FeeDistributor", function () {
  let ve8020FeeDistributor;
  let ve8020Token;
  let dragonToken;
  let wrappedSonic;
  let lpToken;
  let lpRouter;
  let owner;
  let user1;
  let user2;
  let user3;

  const WEEK = 7 * 86400;

  beforeEach(async function () {
    [owner, user1, user2, user3, lpRouter] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    dragonToken = await MockERC20.deploy("Dragon Token", "DRAGON", ethers.utils.parseEther("1000000"));
    await dragonToken.deployed();

    wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.utils.parseEther("1000000"));
    await wrappedSonic.deployed();

    lpToken = await MockERC20.deploy("LP Token", "LP", ethers.utils.parseEther("1000000"));
    await lpToken.deployed();

    // Deploy ve8020 token
    const Ve8020 = await ethers.getContractFactory("ve8020");
    ve8020Token = await Ve8020.deploy(lpToken.address);
    await ve8020Token.deployed();

    // Deploy fee distributor
    const Ve8020FeeDistributor = await ethers.getContractFactory("Ve8020FeeDistributor");
    ve8020FeeDistributor = await Ve8020FeeDistributor.deploy(
      ve8020Token.address,
      dragonToken.address,
      wrappedSonic.address
    );
    await ve8020FeeDistributor.deployed();

    // Set LP router
    await ve8020FeeDistributor.setLpRouter(lpRouter.address);

    // Transfer tokens to users for testing
    await lpToken.transfer(user1.address, ethers.utils.parseEther("10000"));
    await lpToken.transfer(user2.address, ethers.utils.parseEther("5000"));
    await lpToken.transfer(user3.address, ethers.utils.parseEther("2000"));

    // Users approve ve8020 to spend their LP tokens
    await lpToken.connect(user1).approve(ve8020Token.address, ethers.utils.parseEther("10000"));
    await lpToken.connect(user2).approve(ve8020Token.address, ethers.utils.parseEther("5000"));
    await lpToken.connect(user3).approve(ve8020Token.address, ethers.utils.parseEther("2000"));

    // Create locks for users
    const oneYearFromNow = Math.floor(Date.now() / 1000) + 365 * 86400;
    await ve8020Token.connect(user1).createLock(ethers.utils.parseEther("1000"), oneYearFromNow);
    await ve8020Token.connect(user2).createLock(ethers.utils.parseEther("500"), oneYearFromNow);
    await ve8020Token.connect(user3).createLock(ethers.utils.parseEther("200"), oneYearFromNow);

    // Register users as active holders
    await ve8020FeeDistributor.connect(user1).registerHolder(user1.address);
    await ve8020FeeDistributor.connect(user2).registerHolder(user2.address);
    await ve8020FeeDistributor.connect(user3).registerHolder(user3.address);

    // Fund the distributor with reward tokens
    await dragonToken.transfer(ve8020FeeDistributor.address, ethers.utils.parseEther("100000"));
  });

  describe("Initialization", function() {
    it("should initialize with correct values", async function() {
      expect(await ve8020FeeDistributor.veToken()).to.equal(ve8020Token.address);
      expect(await ve8020FeeDistributor.rewardToken()).to.equal(dragonToken.address);
      expect(await ve8020FeeDistributor.wrappedSonic()).to.equal(wrappedSonic.address);
      expect(await ve8020FeeDistributor.lpRouter()).to.equal(lpRouter.address);
      expect(await ve8020FeeDistributor.currentEpoch()).to.equal(0);
      expect(await ve8020FeeDistributor.rewardAllocation()).to.equal(8000);
      expect(await ve8020FeeDistributor.liquidityAllocation()).to.equal(2000);
    });

    it("should have correctly registered active holders", async function() {
      expect(await ve8020FeeDistributor.activeHolderCount()).to.equal(3);
      expect(await ve8020FeeDistributor.isActiveHolder(user1.address)).to.be.true;
      expect(await ve8020FeeDistributor.isActiveHolder(user2.address)).to.be.true;
      expect(await ve8020FeeDistributor.isActiveHolder(user3.address)).to.be.true;
      
      // Check the order of registration
      expect(await ve8020FeeDistributor.holderAt(0)).to.equal(user1.address);
      expect(await ve8020FeeDistributor.holderAt(1)).to.equal(user2.address);
      expect(await ve8020FeeDistributor.holderAt(2)).to.equal(user3.address);
    });
  });

  describe("Rewards Distribution", function() {
    it("should add rewards to the current epoch", async function() {
      const rewardAmount = ethers.utils.parseEther("1000");
      
      // Add rewards
      await ve8020FeeDistributor.addRewards(rewardAmount);
      
      // Check if rewards were added to the current epoch
      expect(await ve8020FeeDistributor.epochRewards(0)).to.equal(rewardAmount.mul(8000).div(10000));
      
      // 20% should be allocated to liquidity
      const liquidityAmount = rewardAmount.mul(2000).div(10000);
      expect(await ve8020FeeDistributor.epochLiquidityAdded(0)).to.equal(liquidityAmount);
    });
    
    it("should advance to a new epoch after EPOCH_DURATION", async function() {
      // Initial epoch
      expect(await ve8020FeeDistributor.currentEpoch()).to.equal(0);
      
      // Fast-forward time to next epoch
      await ethers.provider.send("evm_increaseTime", [WEEK + 1]);
      await ethers.provider.send("evm_mine");
      
      // Trigger epoch advancement (usually happens on addRewards)
      const rewardAmount = ethers.utils.parseEther("1000");
      await ve8020FeeDistributor.addRewards(rewardAmount);
      
      // Check if epoch has advanced
      expect(await ve8020FeeDistributor.currentEpoch()).to.equal(1);
    });
    
    it("should allow users to claim rewards", async function() {
      // Add rewards for distribution
      const rewardAmount = ethers.utils.parseEther("1000");
      await ve8020FeeDistributor.addRewards(rewardAmount);
      
      // User1 has 1000 LP tokens locked, representing ~58.8% of total voting power
      // User2 has 500 LP tokens locked, representing ~29.4% of total voting power
      // User3 has 200 LP tokens locked, representing ~11.8% of total voting power
      
      // Calculate expected rewards for user1 (80% of 1000 * 58.8% = 470.4 tokens)
      const rewardsForDistribution = rewardAmount.mul(8000).div(10000);
      const totalVotingPower = await ve8020Token.totalVotingPower();
      const user1VotingPower = await ve8020Token.balanceOf(user1.address);
      const expectedUser1Reward = rewardsForDistribution.mul(user1VotingPower).div(totalVotingPower);
      
      // Check initial balance
      const initialBalance = await dragonToken.balanceOf(user1.address);
      
      // Claim rewards for user1
      await ve8020FeeDistributor.connect(user1).claimRewards(0);
      
      // Check balance after claiming
      const finalBalance = await dragonToken.balanceOf(user1.address);
      expect(finalBalance.sub(initialBalance)).to.be.closeTo(expectedUser1Reward, ethers.utils.parseEther("0.1"));
      
      // Check claimed status
      expect(await ve8020FeeDistributor.userEpochClaimed(user1.address, 0)).to.be.true;
      
      // Try to claim again (should fail)
      await expect(
        ve8020FeeDistributor.connect(user1).claimRewards(0)
      ).to.be.revertedWith("Rewards already claimed");
    });
    
    it("should support automatic distribution", async function() {
      // Add rewards for distribution
      const rewardAmount = ethers.utils.parseEther("1000");
      await ve8020FeeDistributor.addRewards(rewardAmount);
      
      // Get initial balances
      const initialBalance1 = await dragonToken.balanceOf(user1.address);
      const initialBalance2 = await dragonToken.balanceOf(user2.address);
      const initialBalance3 = await dragonToken.balanceOf(user3.address);
      
      // Perform automatic distribution
      await ve8020FeeDistributor.distributeRewards(0, 0, 3); // Current epoch, start index 0, end index 3
      
      // Check balances after distribution
      const finalBalance1 = await dragonToken.balanceOf(user1.address);
      const finalBalance2 = await dragonToken.balanceOf(user2.address);
      const finalBalance3 = await dragonToken.balanceOf(user3.address);
      
      // All users should have received rewards
      expect(finalBalance1).to.be.gt(initialBalance1);
      expect(finalBalance2).to.be.gt(initialBalance2);
      expect(finalBalance3).to.be.gt(initialBalance3);
      
      // Claimed status should be updated
      expect(await ve8020FeeDistributor.userEpochClaimed(user1.address, 0)).to.be.true;
      expect(await ve8020FeeDistributor.userEpochClaimed(user2.address, 0)).to.be.true;
      expect(await ve8020FeeDistributor.userEpochClaimed(user3.address, 0)).to.be.true;
    });
  });

  describe("Liquidity Allocation", function() {
    it("should allocate part of the rewards to liquidity", async function() {
      const rewardAmount = ethers.utils.parseEther("1000");
      
      // Add rewards
      await ve8020FeeDistributor.addRewards(rewardAmount);
      
      // Check liquidity allocation
      const expectedLiquidity = rewardAmount.mul(2000).div(10000); // 20%
      expect(await ve8020FeeDistributor.epochLiquidityAdded(0)).to.equal(expectedLiquidity);
      expect(await ve8020FeeDistributor.totalLiquidityAdded()).to.equal(expectedLiquidity);
    });
  });

  describe("Administration", function() {
    it("should allow owner to update fee allocation", async function() {
      // Update allocation (70% rewards, 30% liquidity)
      await ve8020FeeDistributor.setFeeAllocation(7000, 3000);
      
      // Check updated allocation
      expect(await ve8020FeeDistributor.rewardAllocation()).to.equal(7000);
      expect(await ve8020FeeDistributor.liquidityAllocation()).to.equal(3000);
      
      // Add rewards with new allocation
      const rewardAmount = ethers.utils.parseEther("1000");
      await ve8020FeeDistributor.addRewards(rewardAmount);
      
      // Check if allocation was applied correctly
      expect(await ve8020FeeDistributor.epochRewards(0)).to.equal(rewardAmount.mul(7000).div(10000));
      expect(await ve8020FeeDistributor.epochLiquidityAdded(0)).to.equal(rewardAmount.mul(3000).div(10000));
    });
    
    it("should not allow invalid fee allocation", async function() {
      // Total should be 10000 basis points (100%)
      await expect(
        ve8020FeeDistributor.setFeeAllocation(8000, 3000)
      ).to.be.revertedWith("Must be 10000 basis points (100%)");
    });
    
    it("should allow owner to update LP router", async function() {
      const newRouter = user3.address;
      
      // Update router
      await ve8020FeeDistributor.setLpRouter(newRouter);
      
      // Check updated router
      expect(await ve8020FeeDistributor.lpRouter()).to.equal(newRouter);
    });
    
    it("should allow adding and removing active holders", async function() {
      // Remove a holder
      await ve8020FeeDistributor.removeHolder(user3.address);
      
      // Check if holder was removed
      expect(await ve8020FeeDistributor.isActiveHolder(user3.address)).to.be.false;
      expect(await ve8020FeeDistributor.activeHolderCount()).to.equal(2);
      
      // Add the holder back
      await ve8020FeeDistributor.connect(user3).registerHolder(user3.address);
      
      // Check if holder was added
      expect(await ve8020FeeDistributor.isActiveHolder(user3.address)).to.be.true;
      expect(await ve8020FeeDistributor.activeHolderCount()).to.equal(3);
    });
    
    it("should prevent registering holders with no voting power", async function() {
      const newUser = user3;
      
      // Try to register a user who hasn't locked any tokens
      await expect(
        ve8020FeeDistributor.registerHolder(owner.address)
      ).to.be.revertedWith("Address has no voting power");
    });
  });

  describe("Emergency Functions", function() {
    it("should allow emergency withdrawal of reward tokens", async function() {
      // Get initial balance
      const initialBalance = await dragonToken.balanceOf(owner.address);
      
      // Withdraw tokens
      const withdrawAmount = ethers.utils.parseEther("1000");
      await ve8020FeeDistributor.emergencyWithdraw(withdrawAmount, dragonToken.address);
      
      // Check final balance
      const finalBalance = await dragonToken.balanceOf(owner.address);
      expect(finalBalance.sub(initialBalance)).to.equal(withdrawAmount);
    });
  });
}); 