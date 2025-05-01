const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TestVRFConsumer Minimal Test", function () {
  let testVRFConsumer;
  let simplifiedDragon;
  let owner, user1;
  
  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();
    
    // Deploy SimplifiedDragon
    const SimplifiedDragon = await ethers.getContractFactory("SimplifiedDragon");
    simplifiedDragon = await SimplifiedDragon.deploy(
      ethers.utils.parseEther("1000000"),
      ethers.constants.AddressZero
    );
    await simplifiedDragon.deployed();
    
    // Deploy TestVRFConsumer
    const TestVRFConsumer = await ethers.getContractFactory("TestVRFConsumer");
    testVRFConsumer = await TestVRFConsumer.deploy(simplifiedDragon.address);
    await testVRFConsumer.deployed();
    
    // Set VRF consumer in dragon contract
    await simplifiedDragon.setVRFConsumer(testVRFConsumer.address);
  });
  
  it("Should request and deliver randomness", async function () {
    // Request randomness
    const tx = await simplifiedDragon.testRequestRandomness(user1.address);
    await tx.wait();
    
    // Check request is stored
    const requestId = 1; // First request should be ID 1
    expect(await testVRFConsumer.requestToUser(requestId)).to.equal(user1.address);
    
    // Deliver randomness
    const randomValue = 12345;
    await testVRFConsumer.deliverRandomness(requestId, randomValue);
    
    // Verify the request was cleared (address zero means it was processed)
    expect(await testVRFConsumer.requestToUser(requestId)).to.equal(ethers.constants.AddressZero);
  });
}); 