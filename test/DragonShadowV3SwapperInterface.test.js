const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DragonShadowV3Swapper with Interface", function () {
  let shadowV3Swapper;
  let owner;
  let mockPoolVoting;
  let user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock pool voting contract
    const Mockve69LPPoolVoting = await ethers.getContractFactory("Mockve69LPPoolVoting");
    mockPoolVoting = await Mockve69LPPoolVoting.deploy();

    // Deploy DragonShadowV3Swapper with dummy addresses
    const DragonShadowV3Swapper = await ethers.getContractFactory("DragonShadowV3Swapper");
    shadowV3Swapper = await DragonShadowV3Swapper.deploy(
      owner.address, // router address
      owner.address, // quoter address
      owner.address, // x33 token address
      owner.address, // beets lp token address
      owner.address, // wrappedSonic token address
      owner.address, // usdc token address
      owner.address, // jackpot address
      owner.address, // ve69LP address
      owner.address  // booster address
    );
  });

  it("should correctly set the pool voting contract", async function () {
    // Set the pool voting contract using the deployed mock contract
    await shadowV3Swapper.setPoolVoting(mockPoolVoting.address);
    
    // Verify it's set correctly
    const poolVotingAddress = await shadowV3Swapper.poolVoting();
    expect(poolVotingAddress).to.equal(mockPoolVoting.address);
    
    console.log("DragonShadowV3Swapper correctly uses the Ive69LPPoolVoting interface");
  });
}); 