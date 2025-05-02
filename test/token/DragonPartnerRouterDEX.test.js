// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { smock } = require('@defi-wonderland/smock');

describe("DragonPartnerRouter DEX Price Discovery", function () {
  let router;
  let partnerRegistry;
  let shadowRouter;
  let quoter;
  let jackpot;
  let ve69LP;
  let booster;
  let redDragonToken;
  let partnerToken;
  let wrappedSonicToken;
  let owner;
  let user;
  let mockPartnerToken;
  let mockWrappedSonic;
  let mockQuoter;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Load the actual contracts
    const DragonPartnerRegistry = await ethers.getContractFactory("DragonPartnerRegistry");
    const DragonPartnerRouter = await ethers.getContractFactory("DragonPartnerRouter");

    // Deploy real tokens for testing
    // Use MockERC20 to simulate real tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    redDragonToken = await MockERC20.deploy("Red Dragon", "RDGS", 18);
    partnerToken = await MockERC20.deploy("X33 Token", "X33", 18);
    wrappedSonicToken = await MockERC20.deploy("Wrapped Sonic", "wS", 18);

    // Deploy necessary mock infrastructure
    const MockRouter = await ethers.getContractFactory("MockShadowRouter");
    shadowRouter = await MockRouter.deploy();

    const MockQuoter = await ethers.getContractFactory("MockShadowQuoter");
    quoter = await MockQuoter.deploy();

    const MockJackpot = await ethers.getContractFactory("MockJackpot");
    jackpot = await MockJackpot.deploy();

    // Deploy ve69LP fee distributor and booster
    ve69LP = await ethers.deployContract("MockFeeDistributor");
    const MockBooster = await ethers.getContractFactory("MockBooster");
    booster = await MockBooster.deploy();

    // Deploy partner registry
    partnerRegistry = await DragonPartnerRegistry.deploy();

    // Deploy the router with real components
    router = await DragonPartnerRouter.deploy(
      partnerRegistry.address,
      shadowRouter.address,
      quoter.address,
      jackpot.address,
      ve69LP.address,
      booster.address,
      redDragonToken.address,
      partnerToken.address,
      wrappedSonicToken.address
    );

    // Mint tokens to users
    await partnerToken.mint(user.address, ethers.utils.parseEther("1000"));
    await partnerToken.connect(user).approve(router.address, ethers.utils.parseEther("1000"));

    // Create mock tokens
    const Token = await ethers.getContractFactory('MockERC20');
    mockPartnerToken = await Token.deploy('Partner Token', 'PTN');
    mockWrappedSonic = await Token.deploy('Wrapped Sonic', 'wS');
    
    // Create mock quoter that simulates Uniswap V3 quoter
    const MockQuoterFactory = await smock.mock('MockUniswapV3Quoter');
    mockQuoter = await MockQuoterFactory.deploy();
    
    // Create mock partner registry
    const MockRegistryFactory = await ethers.getContractFactory('MockPartnerRegistry');
    const mockRegistry = await MockRegistryFactory.deploy();

    // Deploy router with mocks
    const Router = await ethers.getContractFactory('DragonPartnerRouter');
    router = await Router.deploy(
      mockWrappedSonic.address,
      mockQuoter.address,
      mockRegistry.address
    );

    // Set partner token
    await router.setPartnerToken(mockPartnerToken.address);
    
    // Default to manual ratio as fallback
    await router.setManualRatio(ethers.utils.parseEther('2')); // 1 PTN = 2 wS
    
    // Set price method to MULTI_ROUTE
    await router.setPriceMethod(1); // MULTI_ROUTE = 1
  });

  it('should prioritize Uniswap V3 quoter for price discovery', async function () {
    const partnerAmount = ethers.utils.parseEther('10');
    const expectedOutput = ethers.utils.parseEther('25'); // Different from manual ratio
    
    // Mock the quoter to return our expected value
    await mockQuoter.mock.quoteExactInputSingle.returns(expectedOutput);
    
    // Get the equivalent wrapped Sonic amount
    const wrappedSonicAmount = await router.calculateWrappedSonicEquivalent(partnerAmount);
    
    // Verify the router used the Uniswap V3 quoter
    expect(wrappedSonicAmount).to.equal(expectedOutput);
    
    // Verify quoter was called with correct parameters
    const quoterCalls = await mockQuoter.smocked.quoteExactInputSingle.getCalls();
    expect(quoterCalls.length).to.equal(1);
    expect(quoterCalls[0][0]).to.equal(mockPartnerToken.address); // tokenIn
    expect(quoterCalls[0][1]).to.equal(mockWrappedSonic.address); // tokenOut
  });

  it('should fall back to manual ratio when Uniswap V3 quoter fails', async function () {
    const partnerAmount = ethers.utils.parseEther('10');
    const expectedManualOutput = ethers.utils.parseEther('20'); // 10 PTN * 2 ratio
    
    // Make the quoter revert to simulate failure
    await mockQuoter.mock.quoteExactInputSingle.reverts();
    
    // Get the equivalent wrapped Sonic amount
    const wrappedSonicAmount = await router.calculateWrappedSonicEquivalent(partnerAmount);
    
    // Verify it fell back to manual ratio
    expect(wrappedSonicAmount).to.equal(expectedManualOutput);
  });
  
  it('should use proper price discovery regardless of the contract ratios', async function () {
    // This test verifies that even if contract ratios would give a different result,
    // the router prioritizes Uniswap V3 price discovery
    
    const partnerAmount = ethers.utils.parseEther('10');
    const dexPrice = ethers.utils.parseEther('30'); // Significantly different price
    
    // Mock the quoter to return our dex price
    await mockQuoter.mock.quoteExactInputSingle.returns(dexPrice);
    
    // Get the equivalent wrapped Sonic amount
    const wrappedSonicAmount = await router.calculateWrappedSonicEquivalent(partnerAmount);
    
    // Verify the router used the Uniswap V3 quoter price, not contract ratios
    expect(wrappedSonicAmount).to.equal(dexPrice);
  });
}); 