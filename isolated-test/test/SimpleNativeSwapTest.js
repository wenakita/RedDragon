const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Simple Native Token Swap Test", function () {
  let mockSwapTrigger;
  let mockWrappedToken;
  let mockDragonToken;
  let mockVRFConsumer;
  let owner, user1, user2;
  
  const SWAP_AMOUNT = ethers.utils.parseEther("100");
  const MIN_SWAP_AMOUNT = ethers.utils.parseEther("10");
  
  before(async function() {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy our mock contracts
    const MockSwapTrigger = await ethers.getContractFactory("MockDragonSwapTrigger");
    const MockWrappedToken = await ethers.getContractFactory("MockWETH");
    const MockDragonToken = await ethers.getContractFactory("MockDragonToken");
    const MockVRFConsumer = await ethers.getContractFactory("MockVRFConsumer");
    
    // Deploy contracts
    mockWrappedToken = await MockWrappedToken.deploy("Wrapped Token", "wTOKEN");
    mockDragonToken = await MockDragonToken.deploy();
    mockVRFConsumer = await MockVRFConsumer.deploy();
    
    mockSwapTrigger = await MockSwapTrigger.deploy(
      mockWrappedToken.address,
      mockDragonToken.address,
      mockVRFConsumer.address,
      MIN_SWAP_AMOUNT
    );
    
    // Set up initial state
    // Mint tokens to users
    await mockWrappedToken.connect(owner).deposit({ value: ethers.utils.parseEther("1000") });
    await mockWrappedToken.connect(owner).transfer(user1.address, ethers.utils.parseEther("500"));
    
    // Approve tokens for swapping
    await mockWrappedToken.connect(user1).approve(mockSwapTrigger.address, ethers.utils.parseEther("1000"));
    
    // Add to jackpot
    await mockWrappedToken.connect(owner).approve(mockSwapTrigger.address, ethers.utils.parseEther("1000"));
    await mockSwapTrigger.connect(owner).addToJackpot(ethers.utils.parseEther("1000"));
  });
  
  it("Should allow users to swap tokens and enter the lottery", async function() {
    // Initial jackpot balance
    const initialJackpot = await mockSwapTrigger.getJackpotBalance();
    
    // User1 swaps tokens
    const tx = await mockSwapTrigger.connect(user1).onSwapNativeTokenToDragon(
      user1.address, 
      SWAP_AMOUNT
    );
    
    // Check events
    const receipt = await tx.wait();
    const swapEvent = receipt.events.find(e => e.event === "SwapDetected");
    const randomnessEvent = receipt.events.find(e => e.event === "RandomnessRequested");
    
    expect(swapEvent).to.not.be.undefined;
    expect(randomnessEvent).to.not.be.undefined;
    
    // Verify request created
    const requestId = randomnessEvent.args.requestId;
    const requestUser = await mockSwapTrigger.requestToUser(requestId);
    expect(requestUser).to.equal(user1.address);
  });
  
  it("Should award jackpot when winning randomness is received", async function() {
    // Initial balances
    const initialJackpot = await mockSwapTrigger.getJackpotBalance();
    const initialUserBalance = await mockWrappedToken.balanceOf(user1.address);
    
    // Get latest request ID
    const nonce = await mockSwapTrigger.nonce();
    const lastRequestId = nonce.sub(1);
    
    // Send a winning randomness (0 % anything = 0, so it will win)
    await mockVRFConsumer.mockResponseWinning(
      mockSwapTrigger.address,
      lastRequestId,
      user1.address
    );
    
    // Verify user won the jackpot
    const finalJackpot = await mockSwapTrigger.getJackpotBalance();
    const finalUserBalance = await mockWrappedToken.balanceOf(user1.address);
    
    expect(finalJackpot).to.equal(0);
    expect(finalUserBalance).to.be.gt(initialUserBalance);
    
    // Verify stats
    const stats = await mockSwapTrigger.getStats();
    expect(stats.winners.toNumber()).to.equal(1);
    expect(stats.current).to.equal(0);
  });
}); 