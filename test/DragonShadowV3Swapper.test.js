const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DragonLotterySwap with ShadowDex Integration", function () {
  let lotterySwap;
  let x33Token;
  let xShadowToken;
  let shadowToken;
  let beetsLP;
  let jackpot;
  let ve69LP;
  let owner;
  let user;
  let mockRouter;
  let mockQuoter;
  let mockWS;
  let mockUSDC;
  let mockVerifier;

  beforeEach(async function () {
    // Get signers
    [owner, user] = await ethers.getSigners();

    // Deploy mock tokens
    const MockToken = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    beetsLP = await MockToken.deploy("BeetsLP", "BLPT", 18);
    mockWS = await MockToken.deploy("Wrapped Sonic", "wS", 18);
    mockUSDC = await MockToken.deploy("USD Coin", "USDC", 6);
    shadowToken = await MockToken.deploy("Shadow", "SHADOW", 18);
    
    // Deploy mock Shadow tokens - xSHADOW and x33
    const MockXShadow = await ethers.getContractFactory("MockXShadow");
    xShadowToken = await MockXShadow.deploy("xSHADOW", "xSHADOW", shadowToken.address);
    
    const MockX33 = await ethers.getContractFactory("MockX33");
    x33Token = await MockX33.deploy("x33", "x33", xShadowToken.address);
    
    // Deploy mock contracts
    const MockJackpot = await ethers.getContractFactory("MockJackpot");
    jackpot = await MockJackpot.deploy();
    
    const MockVe69LP = await ethers.getContractFactory("contracts/mocks/MockVe69LP.sol:MockVe69LP");
    ve69LP = await MockVe69LP.deploy();
    
    const MockVRFVerifier = await ethers.getContractFactory("MockPaintSwapVRF");
    mockVerifier = await MockVRFVerifier.deploy();
    
    // Deploy mock Shadow router and quoter
    const MockShadowRouter = await ethers.getContractFactory("MockShadowRouter");
    mockRouter = await MockShadowRouter.deploy(x33Token.address, beetsLP.address);
    
    const MockShadowQuoter = await ethers.getContractFactory("MockShadowQuoter");
    mockQuoter = await MockShadowQuoter.deploy();

    // Deploy the ConcreteDragonLotterySwap
    const ConcreteDragonLotterySwap = await ethers.getContractFactory("ConcreteDragonLotterySwap");
    lotterySwap = await ConcreteDragonLotterySwap.deploy(
      mockWS.address,           // wrappedSonic
      mockVerifier.address,     // verifier
      ethers.constants.AddressZero, // registry (not needed for this test)
      ethers.constants.AddressZero  // goldScratcher (not needed for this test)
    );

    // Initialize ShadowDex integration
    await lotterySwap.initializeFullShadowDex(
      mockRouter.address,       // router
      mockQuoter.address,       // quoter
      x33Token.address,         // x33Token
      beetsLP.address,          // beetsLpToken
      mockUSDC.address,         // usdcToken
      ve69LP.address            // ve69LP
    );

    // Mint some tokens to the user
    await x33Token.mint(user.address, ethers.utils.parseEther("1000"));
    await beetsLP.mint(lotterySwap.address, ethers.utils.parseEther("1000"));
    
    // Approve tokens
    await x33Token.connect(user).approve(lotterySwap.address, ethers.utils.parseEther("1000"));
  });

  it("should initialize ShadowDex integration with correct parameters", async function () {
    expect(await lotterySwap.x33Token()).to.equal(x33Token.address);
    expect(await lotterySwap.beetsLpToken()).to.equal(beetsLP.address);
    expect(await lotterySwap.wrappedSonic()).to.equal(mockWS.address);
    expect(await lotterySwap.usdcToken()).to.equal(mockUSDC.address);
    expect(await lotterySwap.votingToken()).to.equal(ve69LP.address);
    expect(await lotterySwap.shadowRouter()).to.equal(mockRouter.address);
    expect(await lotterySwap.shadowQuoter()).to.equal(mockQuoter.address);
  });

  it("should allow setting price method and manual ratio", async function () {
    await lotterySwap.setPriceMethod(0); // Set to MANUAL
    expect(await lotterySwap.priceMethod()).to.equal(0);
    
    await lotterySwap.updateManualRatio(ethers.utils.parseEther("2")); // 2:1 ratio
    expect(await lotterySwap.manualRatio()).to.equal(ethers.utils.parseEther("2"));
  });

  it("should handle basic lottery functionality", async function() {
    // Set up lottery parameters
    await lotterySwap.setEntryLimits(
      ethers.utils.parseEther("1"),   // min entry
      ethers.utils.parseEther("1000") // max entry
    );
    
    // Add some jackpot
    await lotterySwap.addToJackpot(ethers.utils.parseEther("100"));
    expect(await lotterySwap.jackpot()).to.equal(ethers.utils.parseEther("100"));
    
    // Test that lottery stats are initialized correctly
    const stats = await lotterySwap.getStats();
    expect(stats.winners).to.equal(0);
    expect(stats.payouts).to.equal(0);
    expect(stats.current).to.equal(ethers.utils.parseEther("100"));
  });
  
  // Add more tests for combined functionality
}); 