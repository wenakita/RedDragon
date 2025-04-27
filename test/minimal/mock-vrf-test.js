const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockVRFCoordinator", function () {
  let mockVRF;
  let owner;
  let consumer;
  let consumerContract;
  
  before(async function () {
    [owner, consumer] = await ethers.getSigners();
    
    // Deploy a simple consumer contract
    const ConsumerMock = await ethers.getContractFactory("ConsumerMock");
    consumerContract = await ConsumerMock.deploy();
    
    // Deploy the MockVRFCoordinator
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    mockVRF = await MockVRFCoordinator.deploy();
  });
  
  it("should fund a subscription", async function () {
    const subId = 1234;
    const amount = ethers.utils.parseEther("10");
    
    await mockVRF.fundSubscription(subId, amount);
    
    const subscription = await mockVRF.subscriptions(subId);
    expect(subscription.balance).to.equal(amount);
  });
  
  it("should track request IDs correctly", async function () {
    const subId = 1234;
    const keyHash = ethers.utils.keccak256("0x1234");
    const requestConfirmations = 3;
    const callbackGasLimit = 500000;
    const numWords = 1;
    
    // First request should have ID 0
    const tx1 = await mockVRF.requestRandomWords(
      keyHash, subId, requestConfirmations, callbackGasLimit, numWords
    );
    
    // Second request should have ID 1
    const tx2 = await mockVRF.requestRandomWords(
      keyHash, subId, requestConfirmations, callbackGasLimit, numWords
    );
    
    // Check that the consumer for ID 0 is registered
    expect(await mockVRF.consumers(0)).to.equal(owner.address);
    
    // Check that the consumer for ID 1 is registered
    expect(await mockVRF.consumers(1)).to.equal(owner.address);
  });
  
  it("should emit an event when requesting random words", async function () {
    const subId = 1234;
    const keyHash = ethers.utils.keccak256("0x1234");
    const requestConfirmations = 3;
    const callbackGasLimit = 500000;
    const numWords = 1;
    
    await expect(mockVRF.requestRandomWords(
      keyHash, subId, requestConfirmations, callbackGasLimit, numWords
    )).to.emit(mockVRF, "RandomWordsRequested");
  });
  
  it("should fulfill random words to consumer contract", async function () {
    const requestId = 42;
    const randomWords = [12345, 67890];
    
    // Register the consumer contract as the consumer for this request ID
    mockVRF.consumers[requestId] = consumerContract.address;
    
    // Fulfill the random words
    await expect(mockVRF.fulfillRandomWords(
      requestId,
      consumerContract.address,
      randomWords
    )).to.emit(mockVRF, "RandomWordsFulfilled")
      .withArgs(requestId, randomWords, true);
    
    // Check that the consumer received the random words
    expect(await consumerContract.lastRequestId()).to.equal(requestId);
    expect(await consumerContract.lastRandomWords(0)).to.equal(randomWords[0]);
    expect(await consumerContract.lastRandomWords(1)).to.equal(randomWords[1]);
  });
  
  it("should revert when requesting with insufficient funds", async function () {
    const subId = 9999; // Unfunded subscription
    const keyHash = ethers.utils.keccak256("0x1234");
    const requestConfirmations = 3;
    const callbackGasLimit = 500000;
    const numWords = 1;
    
    await expect(mockVRF.requestRandomWords(
      keyHash, subId, requestConfirmations, callbackGasLimit, numWords
    )).to.be.revertedWith("Not enough funds in subscription");
  });
  
  it("should revert when consumer is not found for a request", async function () {
    const invalidRequestId = 9999;
    const randomWords = [12345];
    
    await expect(mockVRF.fulfillRandomWords(
      invalidRequestId,
      consumerContract.address,
      randomWords
    )).to.be.revertedWith("Consumer not found for request");
  });
}); 