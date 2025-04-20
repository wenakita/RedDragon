const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockERC20", function () {
  let mockToken;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Note the fully qualified name to avoid ambiguity with other MockERC20 implementations
    const MockERC20 = await ethers.getContractFactory("test/mocks/tokens/MockERC20.sol:MockERC20");
    mockToken = await MockERC20.deploy("Mock Token", "MOCK", 18);
    await mockToken.deployed();
  });

  it("should have correct name and symbol", async function () {
    expect(await mockToken.name()).to.equal("Mock Token");
    expect(await mockToken.symbol()).to.equal("MOCK");
    expect(await mockToken.decimals()).to.equal(18);
  });

  it("should allow minting tokens", async function () {
    await mockToken.mint(user1.address, ethers.utils.parseEther("100"));
    expect(await mockToken.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("100"));
  });

  it("should allow burning tokens", async function () {
    await mockToken.mint(user1.address, ethers.utils.parseEther("100"));
    await mockToken.connect(user1).burn(ethers.utils.parseEther("50"));
    expect(await mockToken.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("50"));
  });

  it("should allow burning tokens from another address", async function () {
    await mockToken.mint(user1.address, ethers.utils.parseEther("100"));
    await mockToken.burnFrom(user1.address, ethers.utils.parseEther("50"));
    expect(await mockToken.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("50"));
  });

  it("should work with different decimal places", async function () {
    const MockERC20 = await ethers.getContractFactory("test/mocks/tokens/MockERC20.sol:MockERC20");
    const tokenWith6Decimals = await MockERC20.deploy("USD Coin Mock", "USDC", 6);
    await tokenWith6Decimals.deployed();
    
    expect(await tokenWith6Decimals.decimals()).to.equal(6);
    
    // Mint 100 USDC (with 6 decimals)
    await tokenWith6Decimals.mint(user1.address, 100 * 10**6);
    expect(await tokenWith6Decimals.balanceOf(user1.address)).to.equal(100 * 10**6);
  });
}); 