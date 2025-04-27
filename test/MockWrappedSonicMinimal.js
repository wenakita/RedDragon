const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockWrappedSonic Minimal Test", function () {
  let wrappedSonic;
  let owner;

  before(async function () {
    [owner] = await ethers.getSigners();
    
    const MockWrappedSonic = await ethers.getContractFactory("MockWrappedSonic");
    wrappedSonic = await MockWrappedSonic.deploy();
    await wrappedSonic.deployed();
  });

  it("should have correct name, symbol and decimals", async function () {
    expect(await wrappedSonic.name()).to.equal("Wrapped Sonic");
    expect(await wrappedSonic.symbol()).to.equal("wS");
    expect(await wrappedSonic.decimals()).to.equal(18);
  });

  it("should deposit and withdraw correctly", async function () {
    // Deposit 1 Sonic
    await wrappedSonic.deposit({ value: ethers.utils.parseEther("1") });
    expect(await wrappedSonic.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("1"));
    
    // Withdraw 0.5 Sonic
    await wrappedSonic.withdraw(ethers.utils.parseEther("0.5"));
    expect(await wrappedSonic.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("0.5"));
  });
}); 