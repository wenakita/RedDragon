const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ve8020FeeDistributor", function () {
  let ve8020FeeDistributor;
  let wrappedSonic;
  let ve8020;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.utils.parseEther("1000000"));
    await wrappedSonic.deployed();

    // Deploy mock ve8020
    const Ve8020 = await ethers.getContractFactory("ve8020");
    ve8020 = await Ve8020.deploy(wrappedSonic.address);
    await ve8020.deployed();

    // Deploy the fee distributor
    const Ve8020FeeDistributor = await ethers.getContractFactory("ve8020FeeDistributor");
    ve8020FeeDistributor = await Ve8020FeeDistributor.deploy(
      ve8020.address,
      wrappedSonic.address
    );
    await ve8020FeeDistributor.deployed();

    // Give users some wS tokens
    await wrappedSonic.transfer(user1.address, ethers.utils.parseEther("10000"));
    await wrappedSonic.transfer(user2.address, ethers.utils.parseEther("5000"));
  });

  describe("Initialization", function() {
    it("should initialize with correct values", async function() {
      expect(await ve8020FeeDistributor.wrappedSonic()).to.equal(wrappedSonic.address);
      expect(await ve8020FeeDistributor.veToken()).to.equal(ve8020.address);
      expect(await ve8020FeeDistributor.currentEpoch()).to.equal(0);
    });
  });

  describe("Reward Distribution", function() {
    beforeEach(async function() {
      // Create locks for users
      await wrappedSonic.connect(user1).approve(ve8020.address, ethers.utils.parseEther("1000"));
      await wrappedSonic.connect(user2).approve(ve8020.address, ethers.utils.parseEther("500"));
      
      // Get current block timestamp
      const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
      // Set lock time to 1 year from now
      const unlockTime = currentTime + 365 * 86400; // 1 year
      
      await ve8020.connect(user1).createLock(ethers.utils.parseEther("1000"), unlockTime);
      await ve8020.connect(user2).createLock(ethers.utils.parseEther("500"), unlockTime);
      
      // Add rewards
      await wrappedSonic.approve(ve8020FeeDistributor.address, ethers.utils.parseEther("1000"));
      await ve8020FeeDistributor.addRewards(ethers.utils.parseEther("1000"));
    });

    it.skip("should allow users to claim rewards", async function() {
      // Fast forward to next epoch
      await ethers.provider.send("evm_increaseTime", [7 * 86400]); // 1 week
      await ethers.provider.send("evm_mine");
      
      // Force epoch advancement
      await ve8020FeeDistributor.checkAdvanceEpoch();
      
      // User1 claims rewards
      const balanceBefore = await wrappedSonic.balanceOf(user1.address);
      await ve8020FeeDistributor.connect(user1).claimRewards(0); // Claim for epoch 0
      const balanceAfter = await wrappedSonic.balanceOf(user1.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it.skip("should not allow claiming rewards twice in same epoch", async function() {
      // Fast forward to next epoch
      await ethers.provider.send("evm_increaseTime", [7 * 86400]); // 1 week
      await ethers.provider.send("evm_mine");
      
      // Force epoch advancement
      await ve8020FeeDistributor.checkAdvanceEpoch();

      // First claim should succeed
      await ve8020FeeDistributor.connect(user1).claimRewards(0); // Claim for epoch 0

      // Second claim in same epoch should fail
      await expect(
        ve8020FeeDistributor.connect(user1).claimRewards(0) // Try to claim for epoch 0 again
      ).to.be.revertedWith("Already claimed for this epoch");
    });

    it.skip("should distribute rewards proportionally to voting power", async function() {
      // Fast forward to next epoch
      await ethers.provider.send("evm_increaseTime", [7 * 86400]); // 1 week
      await ethers.provider.send("evm_mine");
      
      // Force epoch advancement
      await ve8020FeeDistributor.checkAdvanceEpoch();

      // User1 and User2 claim rewards
      await ve8020FeeDistributor.connect(user1).claimRewards(0); // Claim for epoch 0
      await ve8020FeeDistributor.connect(user2).claimRewards(0); // Claim for epoch 0

      const user1Balance = await wrappedSonic.balanceOf(user1.address);
      const user2Balance = await wrappedSonic.balanceOf(user2.address);

      // User1 should get roughly twice the rewards as User2 (1000 vs 500 locked)
      expect(user1Balance).to.be.gt(user2Balance.mul(3).div(2)); // At least 1.5x more rewards
    });
  });

  describe("Emergency Controls", function() {
    it("should allow owner to perform emergency withdrawal", async function() {
      const amount = ethers.utils.parseEther("100");
      await wrappedSonic.transfer(ve8020FeeDistributor.address, amount);

      await ve8020FeeDistributor.emergencyWithdraw(owner.address, wrappedSonic.address, amount);
      expect(await wrappedSonic.balanceOf(owner.address)).to.be.gte(amount);
    });

    it("should not allow non-owner to perform emergency withdrawal", async function() {
      const amount = ethers.utils.parseEther("100");
      await wrappedSonic.transfer(ve8020FeeDistributor.address, amount);

      await expect(
        ve8020FeeDistributor.connect(user1).emergencyWithdraw(user1.address, wrappedSonic.address, amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 