const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockERC20 Minimal Test", function () {
  let mockERC20;
  let owner;

  before(async function () {
    [owner] = await ethers.getSigners();
    
    // Get the contract factory directly from our mocks folder
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("Test Token", "TEST", 18);
    await mockERC20.deployed();
  });

  it("should have correct name, symbol and decimals", async function () {
    expect(await mockERC20.name()).to.equal("Test Token");
    expect(await mockERC20.symbol()).to.equal("TEST");
    expect(await mockERC20.decimals()).to.equal(18);
  });

  it("should mint tokens correctly", async function () {
    await mockERC20.mint(owner.address, ethers.utils.parseEther("100"));
    expect(await mockERC20.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("100"));
  });
}); 