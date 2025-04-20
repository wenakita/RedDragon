const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockToken", function () {
  let mockToken;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Use the standalone mock token
    const MockToken = await ethers.getContractFactory("contracts/test-mocks-standalone/MockToken.sol:MockToken");
    mockToken = await MockToken.deploy("Mock Token", "MOCK", false); // No initial supply
    await mockToken.deployed();
  });

  it("should have correct name and symbol", async function () {
    expect(await mockToken.name()).to.equal("Mock Token");
    expect(await mockToken.symbol()).to.equal("MOCK");
  });

  it("should allow minting tokens", async function () {
    await mockToken.mint(user1.address, ethers.utils.parseEther("100"));
    expect(await mockToken.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("100"));
  });

  it("should allow burning tokens", async function () {
    await mockToken.mint(user1.address, ethers.utils.parseEther("100"));
    await mockToken.burn(user1.address, ethers.utils.parseEther("50"));
    expect(await mockToken.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("50"));
  });

  it("should mint initial supply when requested", async function () {
    const MockToken = await ethers.getContractFactory("contracts/test-mocks-standalone/MockToken.sol:MockToken");
    const tokenWithInitialSupply = await MockToken.deploy("Token With Supply", "TWS", true);
    await tokenWithInitialSupply.deployed();
    
    expect(await tokenWithInitialSupply.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("1000000"));
  });

  it("should support ownable functions", async function () {
    expect(await mockToken.owner()).to.equal(owner.address);
    
    // Transfer ownership
    await mockToken.transferOwnership(user1.address);
    expect(await mockToken.owner()).to.equal(user1.address);
  });
}); 