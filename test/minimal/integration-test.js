const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Mock Integration Tests", function() {
  let mockVRF;
  let mockLzEndpoint;
  let consumerContract;
  let lzReceiverContract;
  let owner;
  let user;
  
  beforeEach(async function() {
    [owner, user] = await ethers.getSigners();
    
    // Deploy MockVRFCoordinator
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    mockVRF = await MockVRFCoordinator.deploy();
    
    // Deploy MockLayerZeroEndpoint
    const MockLayerZeroEndpoint = await ethers.getContractFactory("MockLayerZeroEndpoint");
    mockLzEndpoint = await MockLayerZeroEndpoint.deploy(1); // Chain ID 1
    
    // Deploy ConsumerMock
    const ConsumerMock = await ethers.getContractFactory("ConsumerMock");
    consumerContract = await ConsumerMock.deploy();
    
    // Deploy LzReceiverMock
    const LzReceiverMock = await ethers.getContractFactory("LzReceiverMock");
    lzReceiverContract = await LzReceiverMock.deploy(mockLzEndpoint.address);
    
    // Fund a VRF subscription
    const subId = 1234;
    const amount = ethers.utils.parseEther("10");
    await mockVRF.fundSubscription(subId, amount);
  });
  
  it("should integrate VRF request with LayerZero message", async function() {
    // 1. Request VRF randomness
    const subId = 1234;
    const keyHash = ethers.utils.keccak256("0x1234");
    const requestConfirmations = 3;
    const callbackGasLimit = 500000;
    const numWords = 1;
    
    const requestTx = await mockVRF.requestRandomWords(
      keyHash, subId, requestConfirmations, callbackGasLimit, numWords
    );
    
    // Get the request ID (should be 0 for the first request)
    const requestId = 0;
    
    // 2. Set the consumer in the VRF coordinator
    // In a real system, this would be automatic, but we need to set it manually in tests
    const filter = mockVRF.filters.RandomWordsRequested();
    const events = await mockVRF.queryFilter(filter, requestTx.blockHash);
    expect(events.length).to.be.above(0);
    
    // 3. Prepare random words
    const randomWords = [ethers.BigNumber.from("12345678901234567890")];
    
    // 4. Fulfill the randomness to the consumer
    await mockVRF.fulfillRandomWords(requestId, consumerContract.address, randomWords);
    
    // 5. Create a LayerZero payload with the random value
    const lzPayload = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256[]"],
      [requestId, randomWords]
    );
    
    // 6. Send the random value through LayerZero
    const srcChainId = 1;
    const dstChainId = 2;
    const srcAddress = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [owner.address]
    );
    
    // 7. Set destination endpoint
    await mockLzEndpoint.setDestLzEndpoint(lzReceiverContract.address, mockLzEndpoint.address);
    
    // 8. Deliver the message to the receiver
    await mockLzEndpoint.receivePayload(
      srcChainId,
      srcAddress,
      lzReceiverContract.address,
      0, // nonce
      lzPayload,
      "0x"
    );
    
    // 9. Verify the receiver got the correct data
    expect(await lzReceiverContract.lastSrcChainId()).to.equal(srcChainId);
    expect(await lzReceiverContract.lastSrcAddress()).to.equal(srcAddress);
    expect(await lzReceiverContract.lastPayload()).to.equal(lzPayload);
    
    // 10. Decode the payload to verify the random value
    const decodedData = ethers.utils.defaultAbiCoder.decode(
      ["uint256", "uint256[]"],
      await lzReceiverContract.lastPayload()
    );
    
    expect(decodedData[0]).to.equal(requestId);
    expect(decodedData[1][0]).to.equal(randomWords[0]);
  });
  
  it("should handle multiple requests and LayerZero messages", async function() {
    // Setup
    const subId = 1234;
    const keyHash = ethers.utils.keccak256("0x1234");
    const requestConfirmations = 3;
    const callbackGasLimit = 500000;
    const numWords = 1;
    
    // Make 3 VRF requests
    for (let i = 0; i < 3; i++) {
      await mockVRF.requestRandomWords(
        keyHash, subId, requestConfirmations, callbackGasLimit, numWords
      );
      
      // Set the consumer for the request
      await mockVRF.fulfillRandomWords(
        i, // requestId
        consumerContract.address,
        [ethers.BigNumber.from(1000 + i)] // Different random word for each request
      );
      
      // Send a LayerZero message with the result
      const lzPayload = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256[]"],
        [i, [ethers.BigNumber.from(1000 + i)]]
      );
      
      // Deliver the message
      await mockLzEndpoint.receivePayload(
        1, // srcChainId
        ethers.utils.defaultAbiCoder.encode(["address"], [owner.address]),
        lzReceiverContract.address,
        i, // nonce
        lzPayload,
        "0x"
      );
    }
    
    // Check the last received payload contains the expected data
    const lastPayload = await lzReceiverContract.lastPayload();
    const decodedData = ethers.utils.defaultAbiCoder.decode(
      ["uint256", "uint256[]"],
      lastPayload
    );
    
    expect(decodedData[0]).to.equal(2); // Last request ID
    expect(decodedData[1][0]).to.equal(1002); // Last random word
  });
}); 