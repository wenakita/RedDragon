const { ethers } = require("hardhat");

/**
 * Deploy mock token contracts
 * @returns {Promise<Object>} Object containing deployed mock tokens
 */
async function deployMockTokens(signer) {
  const deployer = signer || (await ethers.getSigners())[0];
  
  // Deploy MockERC20
  const MockERC20 = await ethers.getContractFactory(
    "test/mocks/tokens/MockERC20.sol:MockERC20", 
    deployer
  );
  const mockERC20 = await MockERC20.deploy("Mock Token", "MOCK", 18);
  await mockERC20.deployed();
  
  // Deploy MockToken
  const MockToken = await ethers.getContractFactory(
    "test/mocks/tokens/MockToken.sol:MockToken", 
    deployer
  );
  const mockToken = await MockToken.deploy("Mock Supply Token", "MST", false);
  await mockToken.deployed();

  // Deploy MockXShadow
  const MockXShadow = await ethers.getContractFactory(
    "test/mocks/tokens/MockXShadow.sol:MockXShadow", 
    deployer
  );
  const mockXShadow = await MockXShadow.deploy("Mock xSHADOW", "xSHADOW");
  await mockXShadow.deployed();
  
  // Deploy MockX33
  const MockX33 = await ethers.getContractFactory(
    "test/mocks/tokens/MockX33.sol:MockX33", 
    deployer
  );
  const mockX33 = await MockX33.deploy("Mock x33", "x33", mockXShadow.address);
  await mockX33.deployed();
  
  return {
    mockERC20,
    mockToken,
    mockXShadow,
    mockX33
  };
}

/**
 * Deploy mock core contracts
 * @returns {Promise<Object>} Object containing deployed mock core contracts
 */
async function deployMockCoreContracts(signer) {
  const deployer = signer || (await ethers.getSigners())[0];
  
  // Deploy MockJackpot
  const MockJackpot = await ethers.getContractFactory(
    "test/mocks/core/MockJackpot.sol:MockJackpot", 
    deployer
  );
  const mockJackpot = await MockJackpot.deploy();
  await mockJackpot.deployed();
  
  // Deploy Mockve69LPBoost
  const Mockve69LPBoost = await ethers.getContractFactory(
    "test/mocks/core/Mockve69LPBoost.sol:Mockve69LPBoost", 
    deployer
  );
  const mockve69LPBoost = await Mockve69LPBoost.deploy();
  await mockve69LPBoost.deployed();
  
  return {
    mockJackpot,
    mockve69LPBoost
  };
}

/**
 * Deploy mock external contracts
 * @returns {Promise<Object>} Object containing deployed mock external contracts
 */
async function deployMockExternalContracts(signer) {
  const deployer = signer || (await ethers.getSigners())[0];
  
  // Deploy MockShadowRouter
  const MockShadowRouter = await ethers.getContractFactory(
    "test/mocks/external/MockShadowRouter.sol:MockShadowRouter", 
    deployer
  );
  const mockShadowRouter = await MockShadowRouter.deploy();
  await mockShadowRouter.deployed();
  
  // Deploy MockShadowQuoter
  const MockShadowQuoter = await ethers.getContractFactory(
    "test/mocks/external/MockShadowQuoter.sol:MockShadowQuoter", 
    deployer
  );
  const mockShadowQuoter = await MockShadowQuoter.deploy();
  await mockShadowQuoter.deployed();
  
  return {
    mockShadowRouter,
    mockShadowQuoter
  };
}

/**
 * Deploy all mock contracts needed for a specific test
 * @param {Object} options Options for deploying mocks
 * @param {boolean} options.tokens Whether to deploy token mocks
 * @param {boolean} options.core Whether to deploy core contract mocks
 * @param {boolean} options.external Whether to deploy external contract mocks
 * @returns {Promise<Object>} Object containing all deployed mock contracts
 */
async function deployAllMocks(options = {}, signer) {
  const mocks = {};
  
  if (options.tokens !== false) {
    const tokenMocks = await deployMockTokens(signer);
    Object.assign(mocks, tokenMocks);
  }
  
  if (options.core !== false) {
    const coreMocks = await deployMockCoreContracts(signer);
    Object.assign(mocks, coreMocks);
  }
  
  if (options.external !== false) {
    const externalMocks = await deployMockExternalContracts(signer);
    Object.assign(mocks, externalMocks);
  }
  
  return mocks;
}

module.exports = {
  deployMockTokens,
  deployMockCoreContracts,
  deployMockExternalContracts,
  deployAllMocks
}; 