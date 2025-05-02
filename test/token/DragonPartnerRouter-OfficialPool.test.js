// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { smock } = require('@defi-wonderland/smock');

describe("DragonPartnerRouter Official Pool", function () {
  let router;
  let partnerRegistry;
  let mockRouter;
  let quoter;
  let jackpot;
  let ve69LP;
  let booster;
  let redDragonToken;
  let wrappedSonicToken;
  let owner;
  let user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Create mock tokens
    const Token = await ethers.getContractFactory('MockERC20');
    redDragonToken = await Token.deploy('Red Dragon', 'RDGS', 18);
    wrappedSonicToken = await Token.deploy('Wrapped Sonic', 'wS', 18);
    
    // Create mock router
    const MockRouter = await smock.mock('IShadowSwapRouter');
    mockRouter = await MockRouter.deploy();
    
    // Configure the mock router to return a fixed output amount
    await mockRouter.mock.exactInputSingle.returns(ethers.utils.parseEther('10'));
    
    // Create mock quoter
    const MockQuoter = await smock.mock('MockShadowQuoter');
    quoter = await MockQuoter.deploy();
    
    // Mock the jackpot
    const mockJackpot = await smock.fake('IJackpot');
    jackpot = mockJackpot.address;
    
    // Deploy partner registry
    const DragonPartnerRegistry = await ethers.getContractFactory("DragonPartnerRegistry");
    partnerRegistry = await DragonPartnerRegistry.deploy();
    
    // Deploy the UniswapV3PriceUtils library
    const UniswapV3PriceUtils = await ethers.getContractFactory("UniswapV3PriceUtils");
    const priceUtils = await UniswapV3PriceUtils.deploy();
    
    // Deploy router
    const DragonPartnerRouter = await ethers.getContractFactory("DragonPartnerRouter", {
      libraries: {
        UniswapV3PriceUtils: priceUtils.address
      }
    });
    
    router = await DragonPartnerRouter.deploy(
      partnerRegistry.address,
      mockRouter.address,
      quoter.address,
      jackpot,
      owner.address, // ve69LP (using owner as placeholder)
      owner.address, // booster (using owner as placeholder)
      redDragonToken.address,
      wrappedSonicToken.address, // Use wS as "partner token" for simplicity
      wrappedSonicToken.address
    );
    
    // Mint tokens to user
    await redDragonToken.mint(user.address, ethers.utils.parseEther('1000'));
    await wrappedSonicToken.mint(user.address, ethers.utils.parseEther('1000'));
    
    // Approve tokens for router
    await redDragonToken.connect(user).approve(router.address, ethers.utils.parseEther('1000'));
    await wrappedSonicToken.connect(user).approve(router.address, ethers.utils.parseEther('1000'));
  });

  it("should retrieve the correct Dragon/wS pool information", async function () {
    const poolInfo = await router.getDragonPoolInfo();
    
    expect(poolInfo.poolName).to.equal("69/31 redDragon-wS");
    expect(poolInfo.dragonRatio).to.equal(69);
    expect(poolInfo.wsRatio).to.equal(31);
  });

  it("should swap redDragon for wS through the official pool", async function () {
    const amountIn = ethers.utils.parseEther('100');
    const minAmountOut = ethers.utils.parseEther('5');
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    await expect(router.connect(user).swapThroughOfficialPool(
      redDragonToken.address,
      wrappedSonicToken.address,
      amountIn,
      minAmountOut,
      deadline
    ))
      .to.emit(router, 'OfficialPoolSwap')
      .withArgs(
        user.address,
        redDragonToken.address,
        wrappedSonicToken.address,
        amountIn,
        ethers.utils.parseEther('10') // Mock router returns 10 tokens
      );
    
    // Verify router function call
    const routerCalls = await mockRouter.smocked.exactInputSingle.getCalls();
    expect(routerCalls.length).to.equal(1);
    expect(routerCalls[0][0].tokenIn).to.equal(redDragonToken.address);
    expect(routerCalls[0][0].tokenOut).to.equal(wrappedSonicToken.address);
    expect(routerCalls[0][0].amountIn).to.equal(amountIn);
  });

  it("should swap wS for redDragon and trigger jackpot entry", async function () {
    const amountIn = ethers.utils.parseEther('50');
    const minAmountOut = ethers.utils.parseEther('5');
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    await expect(router.connect(user).swapThroughOfficialPool(
      wrappedSonicToken.address,
      redDragonToken.address,
      amountIn,
      minAmountOut,
      deadline
    ))
      .to.emit(router, 'OfficialPoolSwapWithJackpot')
      .withArgs(
        user.address,
        wrappedSonicToken.address,
        redDragonToken.address,
        amountIn,
        ethers.utils.parseEther('10'), // Mock router returns 10 tokens
        amountIn // Jackpot entry amount should be the same as amountIn for wS->Dragon swaps
      );
  });

  it("should estimate output amount for the official pool swap", async function () {
    const amountIn = ethers.utils.parseEther('100');
    
    // Mock the quoter to return an expected amount
    await quoter.mock.quoteExactInputSingle.returns(ethers.utils.parseEther('45'));
    
    const [estimatedOut, jackpotEligible] = await router.connect(user).estimateOfficialPoolSwap(
      redDragonToken.address,
      wrappedSonicToken.address,
      amountIn
    );
    
    expect(estimatedOut).to.equal(ethers.utils.parseEther('45'));
    expect(jackpotEligible).to.be.false; // Dragon to wS swap is not eligible
    
    // Test wS to Dragon swap
    const [estimatedOut2, jackpotEligible2] = await router.connect(user).estimateOfficialPoolSwap(
      wrappedSonicToken.address,
      redDragonToken.address,
      amountIn
    );
    
    expect(estimatedOut2).to.equal(ethers.utils.parseEther('45'));
    expect(jackpotEligible2).to.be.true; // wS to Dragon swap is eligible
  });

  it("should reject swaps between tokens other than redDragon and wS", async function () {
    const amountIn = ethers.utils.parseEther('100');
    const minAmountOut = ethers.utils.parseEther('5');
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    // Create a fake token
    const otherToken = await (await ethers.getContractFactory('MockERC20')).deploy('Other', 'OTHER', 18);
    
    await expect(router.connect(user).swapThroughOfficialPool(
      otherToken.address,
      redDragonToken.address,
      amountIn,
      minAmountOut,
      deadline
    )).to.be.revertedWith("Only redDragon<>wS swaps allowed");
    
    await expect(router.connect(user).swapThroughOfficialPool(
      redDragonToken.address,
      otherToken.address,
      amountIn,
      minAmountOut,
      deadline
    )).to.be.revertedWith("Only redDragon<>wS swaps allowed");
  });
}); 