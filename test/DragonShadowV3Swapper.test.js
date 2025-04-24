const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DragonShadowV3Swapper", function () {
  let shadowSwapper;
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
    
    // Deploy mock Shadow router and quoter
    const MockShadowRouter = await ethers.getContractFactory("MockShadowRouter");
    mockRouter = await MockShadowRouter.deploy(x33Token.address, beetsLP.address);
    
    const MockShadowQuoter = await ethers.getContractFactory("MockShadowQuoter");
    mockQuoter = await MockShadowQuoter.deploy();

    // Deploy the DragonShadowV3Swapper
    const DragonShadowV3Swapper = await ethers.getContractFactory("DragonShadowV3Swapper");
    shadowSwapper = await DragonShadowV3Swapper.deploy(
      mockRouter.address,     // router
      mockQuoter.address,     // quoter
      x33Token.address,       // x33Token
      beetsLP.address,        // beetsLpToken
      mockWS.address,         // wsToken
      mockUSDC.address,       // usdcToken
      jackpot.address,        // jackpot
      ve69LP.address,         // ve69LP
      ethers.constants.AddressZero  // booster (not needed for this test)
    );

    // Mint some tokens to the user
    await x33Token.mint(user.address, ethers.utils.parseEther("1000"));
    await beetsLP.mint(mockRouter.address, ethers.utils.parseEther("1000")); // Mock router needs LP tokens
    
    // Approve tokens
    await x33Token.connect(user).approve(shadowSwapper.address, ethers.utils.parseEther("1000"));
  });

  it("should initialize Shadow integration with correct parameters", async function () {
    expect(await shadowSwapper.x33Token()).to.equal(x33Token.address);
    expect(await shadowSwapper.beetsLpToken()).to.equal(beetsLP.address);
    expect(await shadowSwapper.wsToken()).to.equal(mockWS.address);
    expect(await shadowSwapper.usdcToken()).to.equal(mockUSDC.address);
    expect(await shadowSwapper.jackpot()).to.equal(jackpot.address);
    expect(await shadowSwapper.router()).to.equal(mockRouter.address);
    expect(await shadowSwapper.quoter()).to.equal(mockQuoter.address);
  });

  it("should allow setting price method and manual ratio", async function () {
    await shadowSwapper.setPriceMethod(0); // Set to MANUAL
    expect(await shadowSwapper.priceMethod()).to.equal(0);
    
    await shadowSwapper.updateManualRatio(ethers.utils.parseEther("2")); // 2:1 ratio
    expect(await shadowSwapper.manualRatio()).to.equal(ethers.utils.parseEther("2"));
  });
}); 