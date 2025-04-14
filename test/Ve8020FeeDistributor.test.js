const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Ve8020FeeDistributor", function () {
  let ve8020;
  let rewardToken;
  let feeDistributor;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy the mock ERC20 token for rewards
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    rewardToken = await MockERC20.deploy("RedDragon", "RD", 18);
    await rewardToken.deployed();

    // Mint some tokens to the owner for distribution
    await rewardToken.mint(owner.address, ethers.utils.parseEther("1000000"));

    // Deploy the ve8020 token
    const Ve8020 = await ethers.getContractFactory("ve8020");
    ve8020 = await Ve8020.deploy(rewardToken.address);
    await ve8020.deployed();

    // Deploy the fee distributor
    const Ve8020FeeDistributor = await ethers.getContractFactory("Ve8020FeeDistributor");
    feeDistributor = await Ve8020FeeDistributor.deploy(
      ve8020.address,
      rewardToken.address
    );
    await feeDistributor.deployed();

    // Transfer some tokens to the users for staking
    await rewardToken.transfer(user1.address, ethers.utils.parseEther("10000"));
    await rewardToken.transfer(user2.address, ethers.utils.parseEther("5000"));

    // Users approve ve8020 to spend their tokens
    await rewardToken.connect(user1).approve(ve8020.address, ethers.utils.parseEther("10000"));
    await rewardToken.connect(user2).approve(ve8020.address, ethers.utils.parseEther("5000"));

    // Users create locks in ve8020
    await ve8020.connect(user1).create_lock(ethers.utils.parseEther("1000"), 365 * 86400); // 1 year
    await ve8020.connect(user2).create_lock(ethers.utils.parseEther("500"), 365 * 86400); // 1 year
  });

  it("should have correct initial state", async function () {
    expect(await feeDistributor.veToken()).to.equal(ve8020.address);
    expect(await feeDistributor.rewardToken()).to.equal(rewardToken.address);
    expect(await feeDistributor.rewardAllocation()).to.equal(10000); // 100%
    expect(await feeDistributor.currentEpoch()).to.equal(0);
  });

  it("should allow owner to set fee allocation", async function () {
    await feeDistributor.setFeeAllocation(10000); // 100%
    expect(await feeDistributor.rewardAllocation()).to.equal(10000);
    
    // Should fail if not 100%
    await expect(feeDistributor.setFeeAllocation(9000)).to.be.revertedWith("Must be 10000 basis points (100%)");
  });

  it("should distribute rewards proportionally to voting power", async function () {
    // Owner approves fee distributor to spend tokens
    await rewardToken.approve(feeDistributor.address, ethers.utils.parseEther("10000"));
    
    // Add rewards
    await feeDistributor.addRewards(ethers.utils.parseEther("1000"));
    
    // Fast forward time to advance epoch
    await ethers.provider.send("evm_increaseTime", [7 * 86400]); // 1 week
    await ethers.provider.send("evm_mine");
    
    // Trigger distribution
    await feeDistributor.checkAdvanceEpoch();
    
    // Get rewards info for users
    const [user1Claimed, user1Rewards] = await feeDistributor.getUserEpochRewardInfo(user1.address, 0);
    const [user2Claimed, user2Rewards] = await feeDistributor.getUserEpochRewardInfo(user2.address, 0);
    
    // Since user1 has 2/3 of the voting power, they should get ~2/3 of rewards
    // and user2 should get ~1/3
    expect(user1Claimed).to.be.true;
    expect(user2Claimed).to.be.true;
    
    // Convert BigNumbers to numbers for easier comparison
    const user1RewardsNum = parseFloat(ethers.utils.formatEther(user1Rewards));
    const user2RewardsNum = parseFloat(ethers.utils.formatEther(user2Rewards));
    const totalRewardsNum = user1RewardsNum + user2RewardsNum;
    
    // Check approximate proportion (allow for small rounding errors)
    expect(user1RewardsNum / totalRewardsNum).to.be.closeTo(2/3, 0.01); // Within 1% of expected
    expect(user2RewardsNum / totalRewardsNum).to.be.closeTo(1/3, 0.01); // Within 1% of expected
  });

  it("should handle emergency withdrawals correctly", async function () {
    // Owner approves fee distributor to spend tokens
    await rewardToken.approve(feeDistributor.address, ethers.utils.parseEther("5000"));
    
    // Add rewards
    await feeDistributor.addRewards(ethers.utils.parseEther("5000"));
    
    // Check balance before withdrawal
    const initialBalance = await rewardToken.balanceOf(owner.address);
    
    // Emergency withdraw half the tokens
    await feeDistributor.emergencyWithdraw(
      rewardToken.address,
      owner.address,
      ethers.utils.parseEther("2500")
    );
    
    // Check balance after withdrawal
    const newBalance = await rewardToken.balanceOf(owner.address);
    expect(newBalance.sub(initialBalance)).to.equal(ethers.utils.parseEther("2500"));
    
    // Check remaining distributor balance
    expect(await rewardToken.balanceOf(feeDistributor.address)).to.equal(ethers.utils.parseEther("2500"));
  });
}); 