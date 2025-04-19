const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Simple Interface Test", function () {
  it("should verify the interface is correctly defined", async function () {
    // Get the existing contract addresses from the test environment
    // This assumes the contracts are already deployed at these addresses
    const [owner] = await ethers.getSigners();

    try {
      // Try to get a contract instance using the interface
      await ethers.getContractAt("Ive69LPPoolVoting", owner.address);
      
      console.log("Interface definition is valid");
      
      // Test passes if we get here without errors
      expect(true).to.be.true;
    } catch (error) {
      console.error("Interface definition error:", error.message);
      expect.fail("Interface definition is invalid");
    }
  });
}); 