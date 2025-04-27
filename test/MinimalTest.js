const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockVRFCoordinator Test", function () {
  let mockVRFCoordinator;
  let owner;
  let consumer;
  
  beforeEach(async function () {
    [owner, consumer] = await ethers.getSigners();
    
    // Deploy MockVRFCoordinator
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    mockVRFCoordinator = await MockVRFCoordinator.deploy();
  });
  
  it("should fund a subscription", async function () {
    const subId = 1234;
    const amount = ethers.utils.parseEther("10");
    
    await mockVRFCoordinator.fundSubscription(subId, amount);
    
    const subscription = await mockVRFCoordinator.subscriptions(subId);
    expect(subscription.balance).to.equal(amount);
  });
  
  it("should request random words", async function () {
    const subId = 1234;
    const amount = ethers.utils.parseEther("10");
    await mockVRFCoordinator.fundSubscription(subId, amount);
    
    const keyHash = ethers.utils.keccak256("0x1234");
    const requestConfirmations = 3;
    const callbackGasLimit = 500000;
    const numWords = 1;
    
    await expect(mockVRFCoordinator.requestRandomWords(
      keyHash,
      subId,
      requestConfirmations,
      callbackGasLimit,
      numWords
    )).to.emit(mockVRFCoordinator, "RandomWordsRequested");
  });
}); 