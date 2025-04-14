const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockERC20", function () {
  let mockToken;
  let owner;
  let user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Test Token", "TEST", ethers.utils.parseEther("1000000"));
    await mockToken.deployed();
  });

  it("should initialize with correct values", async function() {
    expect(await mockToken.name()).to.equal("Test Token");
    expect(await mockToken.symbol()).to.equal("TEST");
    expect(await mockToken.totalSupply()).to.equal(ethers.utils.parseEther("1000000"));
    expect(await mockToken.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("1000000"));
  });

  it("should transfer tokens correctly", async function() {
    const amount = ethers.utils.parseEther("1000");
    await mockToken.transfer(user.address, amount);
    
    expect(await mockToken.balanceOf(user.address)).to.equal(amount);
    expect(await mockToken.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("999000"));
  });
}); 