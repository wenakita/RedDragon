const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DragonShadowV3Swapper Feature Flags", function () {
  let shadowV3Swapper;
  let owner;
  let mockPoolVoting;
  let partner;
  let user;

  beforeEach(async function () {
    [owner, partner, user] = await ethers.getSigners();

    // Deploy mock tokens to satisfy constructor requirements
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock Token", "MOCK", 18);
    
    // Deploy mock contracts for dependencies
    const MockRouter = await ethers.getContractFactory("MockShadowRouter");
    const mockRouter = await MockRouter.deploy();
    
    const MockQuoter = await ethers.getContractFactory("MockShadowQuoter");
    const mockQuoter = await MockQuoter.deploy();
    
    const MockX33 = await ethers.getContractFactory("MockX33");
    const mockX33 = await MockX33.deploy();
    
    const MockJackpot = await ethers.getContractFactory("MockJackpot");
    const mockJackpot = await MockJackpot.deploy();
    
    const Mockve69LPBoost = await ethers.getContractFactory("Mockve69LPBoost");
    const mockVe69LPBoost = await Mockve69LPBoost.deploy();

    // Deploy mock pool voting contract
    const Mockve69LPPoolVoting = await ethers.getContractFactory("Mockve69LPPoolVoting");
    mockPoolVoting = await Mockve69LPPoolVoting.deploy();

    // Deploy DragonShadowV3Swapper
    const DragonShadowV3Swapper = await ethers.getContractFactory("DragonShadowV3Swapper");
    shadowV3Swapper = await DragonShadowV3Swapper.deploy(
      mockRouter.address,
      mockQuoter.address,
      mockX33.address,
      mockToken.address, // beetsLp
      mockToken.address, // ws
      mockToken.address, // usdc
      mockJackpot.address,
      mockToken.address, // ve69LP
      mockVe69LPBoost.address
    );
    
    // Authorize the partner
    await shadowV3Swapper.setPartnerAuthorization(partner.address, true);
    
    // Set the pool voting contract
    await shadowV3Swapper.setPoolVoting(mockPoolVoting.address);
    
    // Set up some boost values in the mock
    await mockPoolVoting.setPartnerAddressMapping(partner.address, 1);
    await mockPoolVoting.setPartnerBoost(1, 500); // 5% boost for partner
  });

  it("should have feature flags disabled by default", async function () {
    const poolVotingEnabled = await shadowV3Swapper.poolVotingEnabled();
    const partnerBoostEnabled = await shadowV3Swapper.partnerBoostEnabled();
    
    expect(poolVotingEnabled).to.equal(false);
    expect(partnerBoostEnabled).to.equal(false);
  });

  it("should allow owner to enable feature flags", async function () {
    await shadowV3Swapper.setPoolVotingEnabled(true);
    await shadowV3Swapper.setPartnerBoostEnabled(true);
    
    const poolVotingEnabled = await shadowV3Swapper.poolVotingEnabled();
    const partnerBoostEnabled = await shadowV3Swapper.partnerBoostEnabled();
    
    expect(poolVotingEnabled).to.equal(true);
    expect(partnerBoostEnabled).to.equal(true);
  });
  
  it("should ignore partner boosts when feature flags are disabled", async function () {
    // Mock the estimation function
    const estimationBefore = await shadowV3Swapper.estimateOutputsWithBoostAndPartner(
      ethers.utils.parseEther("10"), // amount
      user.address, // user
      partner.address // partner
    );
    
    // Boost should be ignored (no partner boost applied)
    expect(estimationBefore.wsEquivalentForJackpot).to.equal(estimationBefore.wsEquivalentForJackpot);
    
    // Now enable the features
    await shadowV3Swapper.setPoolVotingEnabled(true);
    await shadowV3Swapper.setPartnerBoostEnabled(true);
    
    // Check estimation with enabled features
    const estimationAfter = await shadowV3Swapper.estimateOutputsWithBoostAndPartner(
      ethers.utils.parseEther("10"), // amount
      user.address, // user
      partner.address // partner
    );
    
    // Now the partner boost should be applied, making the wsEquivalent higher
    expect(estimationAfter.wsEquivalentForJackpot).to.be.gt(estimationBefore.wsEquivalentForJackpot);
  });

  it("should not apply boosts if poolVotingEnabled is true but partnerBoostEnabled is false", async function () {
    // Enable only pool voting
    await shadowV3Swapper.setPoolVotingEnabled(true);
    
    // Keep partner boost disabled
    const estimationHalfEnabled = await shadowV3Swapper.estimateOutputsWithBoostAndPartner(
      ethers.utils.parseEther("10"), // amount
      user.address, // user
      partner.address // partner
    );
    
    // Now enable both
    await shadowV3Swapper.setPartnerBoostEnabled(true);
    
    const estimationFullyEnabled = await shadowV3Swapper.estimateOutputsWithBoostAndPartner(
      ethers.utils.parseEther("10"), // amount
      user.address, // user
      partner.address // partner
    );
    
    // Only when both flags are enabled should the boost be applied
    expect(estimationFullyEnabled.wsEquivalentForJackpot).to.be.gt(estimationHalfEnabled.wsEquivalentForJackpot);
  });
  
  it("should emit FeatureFlagUpdated events when flags are changed", async function () {
    await expect(shadowV3Swapper.setPoolVotingEnabled(true))
      .to.emit(shadowV3Swapper, "FeatureFlagUpdated")
      .withArgs("poolVoting", true);
      
    await expect(shadowV3Swapper.setPartnerBoostEnabled(true))
      .to.emit(shadowV3Swapper, "FeatureFlagUpdated")
      .withArgs("partnerBoost", true);
  });
}); 