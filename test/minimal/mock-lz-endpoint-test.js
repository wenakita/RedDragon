const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockLayerZeroEndpoint", function () {
  let mockLzEndpoint;
  let owner;
  let user;
  let receiverContract;
  
  // Setup test environment
  before(async function () {
    [owner, user] = await ethers.getSigners();
    
    // Deploy the MockLayerZeroEndpoint
    const MockLayerZeroEndpoint = await ethers.getContractFactory("MockLayerZeroEndpoint");
    mockLzEndpoint = await MockLayerZeroEndpoint.deploy(1); // Chain ID 1
    
    // Deploy a simple LZ receiver contract
    const LzReceiverMock = await ethers.getContractFactory("LzReceiverMock");
    receiverContract = await LzReceiverMock.deploy(mockLzEndpoint.address);
  });
  
  it("should initialize with the correct chain ID", async function () {
    expect(await mockLzEndpoint.chainId()).to.equal(1);
  });
  
  it("should set destination LZ endpoint", async function () {
    await mockLzEndpoint.setDestLzEndpoint(receiverContract.address, mockLzEndpoint.address);
    expect(await mockLzEndpoint.destLzEndpoint(1)).to.equal(mockLzEndpoint.address);
  });
  
  it("should send a payload and emit the PayloadSent event", async function () {
    const dstChainId = 2;
    const destination = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [receiverContract.address]
    );
    const payload = ethers.utils.defaultAbiCoder.encode(
      ["string"],
      ["Hello LayerZero"]
    );
    
    await expect(
      mockLzEndpoint.send(
        dstChainId,
        destination,
        payload,
        owner.address,
        ethers.constants.AddressZero, // Zero address for zro payment
        "0x"
      )
    ).to.emit(mockLzEndpoint, "PayloadSent")
      .withArgs(dstChainId, destination, owner.address, 0, payload);
    
    // Check that the last sent payload was stored
    expect(await mockLzEndpoint.lastSentPayload()).to.equal(payload);
    expect(await mockLzEndpoint.lastDestinationChainId()).to.equal(dstChainId);
  });
  
  it("should receive a payload and emit the PayloadReceived event", async function () {
    const srcChainId = 2;
    const srcAddress = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [owner.address]
    );
    const payload = ethers.utils.defaultAbiCoder.encode(
      ["string"],
      ["Hello from remote chain"]
    );
    
    await expect(
      mockLzEndpoint.receivePayload(
        srcChainId,
        srcAddress,
        receiverContract.address,
        0, // nonce
        payload,
        "0x"
      )
    ).to.emit(mockLzEndpoint, "PayloadReceived")
      .withArgs(srcChainId, srcAddress, receiverContract.address, 0, payload);
    
    // Check that the last received payload was stored
    expect(await mockLzEndpoint.lastReceivedPayload()).to.equal(payload);
  });
  
  it("should estimate fees correctly", async function () {
    const dstChainId = 2;
    const payload = ethers.utils.defaultAbiCoder.encode(
      ["string"],
      ["Hello LayerZero"]
    );
    
    const [nativeFee, zroFee] = await mockLzEndpoint.estimateFees(
      dstChainId,
      receiverContract.address,
      payload,
      false,
      "0x"
    );
    
    // The mock returns a fixed fee (0.01 ETH, 0 zroFee)
    expect(nativeFee).to.equal(ethers.utils.parseEther("0.01"));
    expect(zroFee).to.equal(0);
  });
}); 