const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragonTimelock", function () {
  let timelock;
  let targetContract;
  let owner;
  let user;
  let tokenContract;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy the timelock contract
    const RedDragonTimelock = await ethers.getContractFactory("RedDragonTimelock");
    timelock = await RedDragonTimelock.deploy();
    await timelock.deployed();

    // Deploy a target contract for testing timelock actions
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    targetContract = await MockERC20.deploy("Target Token", "TGT", ethers.utils.parseEther("1000000"));
    await targetContract.deployed();

    // Deploy a token contract for testing token recovery
    tokenContract = await MockERC20.deploy("Recovery Token", "REC", ethers.utils.parseEther("1000000"));
    await tokenContract.deployed();

    // Transfer some tokens to the timelock contract
    await tokenContract.transfer(timelock.address, ethers.utils.parseEther("1000"));
  });

  describe("Action Scheduling", function() {
    it("should allow owner to schedule an action", async function() {
      // Prepare a function call to transfer tokens from the target contract
      const transferAmount = ethers.utils.parseEther("100");
      const transferData = targetContract.interface.encodeFunctionData(
        "transfer", [user.address, transferAmount]
      );
      
      // Schedule the action
      const description = "Transfer tokens to user";
      const tx = await timelock.scheduleAction(description, targetContract.address, transferData);
      
      // Get the action ID
      const actionId = await timelock.getActionId(targetContract.address, transferData);
      
      // Check event was emitted
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "ActionScheduled");
      expect(event).to.not.be.undefined;
      expect(event.args.actionId).to.equal(actionId);
      expect(event.args.description).to.equal(description);
      expect(event.args.target).to.equal(targetContract.address);
      
      // Check the action was scheduled
      const scheduledTime = await timelock.getScheduledTime(actionId);
      expect(scheduledTime).to.be.gt(0);
      
      // Check description was stored
      expect(await timelock.actionDescriptions(actionId)).to.equal(description);
      
      // Check time remaining
      const timeRemaining = await timelock.getTimeRemaining(actionId);
      expect(timeRemaining).to.be.gt(0);
    });
    
    it("should not allow scheduling an action with zero address target", async function() {
      const transferData = targetContract.interface.encodeFunctionData(
        "transfer", [user.address, ethers.utils.parseEther("100")]
      );
      
      await expect(
        timelock.scheduleAction("Invalid action", ethers.constants.AddressZero, transferData)
      ).to.be.revertedWith("Target cannot be zero address");
    });
    
    it("should not allow scheduling an action twice", async function() {
      const transferData = targetContract.interface.encodeFunctionData(
        "transfer", [user.address, ethers.utils.parseEther("100")]
      );
      
      // Schedule first time
      await timelock.scheduleAction("Transfer tokens", targetContract.address, transferData);
      
      // Try to schedule the same action again
      await expect(
        timelock.scheduleAction("Transfer tokens again", targetContract.address, transferData)
      ).to.be.revertedWith("Action already scheduled");
    });
    
    it("should not allow non-owner to schedule actions", async function() {
      const transferData = targetContract.interface.encodeFunctionData(
        "transfer", [user.address, ethers.utils.parseEther("100")]
      );
      
      await expect(
        timelock.connect(user).scheduleAction("Unauthorized action", targetContract.address, transferData)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Action Cancellation", function() {
    it("should allow owner to cancel a scheduled action", async function() {
      // Schedule an action
      const transferData = targetContract.interface.encodeFunctionData(
        "transfer", [user.address, ethers.utils.parseEther("100")]
      );
      
      await timelock.scheduleAction("Transfer to cancel", targetContract.address, transferData);
      const actionId = await timelock.getActionId(targetContract.address, transferData);
      
      // Cancel the action
      const tx = await timelock.cancelAction(actionId);
      
      // Check event was emitted
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "ActionCancelled");
      expect(event).to.not.be.undefined;
      expect(event.args.actionId).to.equal(actionId);
      
      // Check the action was cancelled
      expect(await timelock.getScheduledTime(actionId)).to.equal(0);
    });
    
    it("should not allow cancelling a non-existent action", async function() {
      const fakeActionId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("fake action"));
      
      await expect(
        timelock.cancelAction(fakeActionId)
      ).to.be.revertedWith("Action not scheduled");
    });
    
    it("should not allow non-owner to cancel actions", async function() {
      // Schedule an action
      const transferData = targetContract.interface.encodeFunctionData(
        "transfer", [user.address, ethers.utils.parseEther("100")]
      );
      
      await timelock.scheduleAction("Transfer to not cancel", targetContract.address, transferData);
      const actionId = await timelock.getActionId(targetContract.address, transferData);
      
      // Try to cancel as non-owner
      await expect(
        timelock.connect(user).cancelAction(actionId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Action Execution", function() {
    it("should not allow executing an action before the timelock period", async function() {
      // Give some tokens to the contract so it can transfer them
      await targetContract.transfer(timelock.address, ethers.utils.parseEther("500"));
      
      // Schedule an action
      const transferAmount = ethers.utils.parseEther("100");
      const transferData = targetContract.interface.encodeFunctionData(
        "transfer", [user.address, transferAmount]
      );
      
      await timelock.scheduleAction("Transfer immediately", targetContract.address, transferData);
      
      // Try to execute immediately
      await expect(
        timelock.executeAction(targetContract.address, transferData)
      ).to.be.revertedWith("Action not ready for execution");
    });
    
    it("should allow executing an action after the timelock period", async function() {
      // Give some tokens to the timelock so it can transfer them
      await targetContract.transfer(timelock.address, ethers.utils.parseEther("500"));
      
      // Schedule an action
      const transferAmount = ethers.utils.parseEther("100");
      const transferData = targetContract.interface.encodeFunctionData(
        "transfer", [user.address, transferAmount]
      );
      
      await timelock.scheduleAction("Transfer after delay", targetContract.address, transferData);
      
      // Fast-forward time
      await ethers.provider.send("evm_increaseTime", [24 * 3600 + 1]); // Just over 24 hours
      await ethers.provider.send("evm_mine");
      
      // Check initial balance
      const initialBalance = await targetContract.balanceOf(user.address);
      
      // Execute the action
      const tx = await timelock.executeAction(targetContract.address, transferData);
      
      // Check event was emitted
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "ActionExecuted");
      expect(event).to.not.be.undefined;
      
      // Check the action was executed
      const finalBalance = await targetContract.balanceOf(user.address);
      expect(finalBalance.sub(initialBalance)).to.equal(transferAmount);
      
      // Check the action was cleared from storage
      const actionId = await timelock.getActionId(targetContract.address, transferData);
      expect(await timelock.getScheduledTime(actionId)).to.equal(0);
    });
    
    it("should not allow executing an action that was not scheduled", async function() {
      const transferData = targetContract.interface.encodeFunctionData(
        "transfer", [user.address, ethers.utils.parseEther("100")]
      );
      
      await expect(
        timelock.executeAction(targetContract.address, transferData)
      ).to.be.revertedWith("Action not ready for execution");
    });
    
    it("should not allow executing an action that fails", async function() {
      // Schedule an action that will fail (transfer more than the balance)
      const transferAmount = ethers.utils.parseEther("10000000"); // More than available
      const transferData = targetContract.interface.encodeFunctionData(
        "transfer", [user.address, transferAmount]
      );
      
      await timelock.scheduleAction("Transfer too much", targetContract.address, transferData);
      
      // Fast-forward time
      await ethers.provider.send("evm_increaseTime", [24 * 3600 + 1]); // Just over 24 hours
      await ethers.provider.send("evm_mine");
      
      // Execute should fail
      await expect(
        timelock.executeAction(targetContract.address, transferData)
      ).to.be.revertedWith("Action execution failed");
    });
  });

  describe("Token Recovery", function() {
    it("should allow owner to recover tokens sent to the contract", async function() {
      const recoveryAmount = ethers.utils.parseEther("500");
      const initialBalance = await tokenContract.balanceOf(owner.address);
      
      // Recover half of the tokens
      await timelock.recoverToken(tokenContract.address, recoveryAmount);
      
      // Check balances
      const finalBalance = await tokenContract.balanceOf(owner.address);
      expect(finalBalance.sub(initialBalance)).to.equal(recoveryAmount);
      
      // Check remaining balance
      expect(await tokenContract.balanceOf(timelock.address)).to.equal(ethers.utils.parseEther("500"));
    });
    
    it("should not allow non-owner to recover tokens", async function() {
      await expect(
        timelock.connect(user).recoverToken(tokenContract.address, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 