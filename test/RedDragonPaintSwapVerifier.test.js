const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragonPaintSwapVerifier", function () {
  // We define a fixture to reuse the same setup in every test
  async function deployVerifierFixture() {
    // Deploy a Mock VRF Coordinator
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    const mockVRFCoordinator = await MockVRFCoordinator.deploy();

    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy RedDragonPaintSwapVerifier
    const RedDragonPaintSwapVerifier = await ethers.getContractFactory("RedDragonPaintSwapVerifier");
    const verifier = await RedDragonPaintSwapVerifier.deploy();
    
    // Initialize the verifier
    await verifier.initialize(
      await mockVRFCoordinator.getAddress(), // VRF Coordinator
      1, // Subscription ID
      "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f", // Gas Lane
      100000, // Callback Gas Limit
      3 // Request Confirmations
    );

    return { verifier, mockVRFCoordinator, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Should set the right VRF Coordinator address", async function () {
      const { verifier, mockVRFCoordinator } = await loadFixture(deployVerifierFixture);
      expect(await verifier.vrfCoordinator()).to.equal(await mockVRFCoordinator.getAddress());
    });

    it("Should set the right subscription ID", async function () {
      const { verifier } = await loadFixture(deployVerifierFixture);
      expect(await verifier.subscriptionId()).to.equal(1n);
    });

    it("Should set the right gas lane", async function () {
      const { verifier } = await loadFixture(deployVerifierFixture);
      expect(await verifier.gasLane()).to.equal("0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f");
    });

    it("Should set the right callback gas limit", async function () {
      const { verifier } = await loadFixture(deployVerifierFixture);
      expect(await verifier.callbackGasLimit()).to.equal(100000n);
    });

    it("Should set the right request confirmations", async function () {
      const { verifier } = await loadFixture(deployVerifierFixture);
      expect(await verifier.requestConfirmations()).to.equal(3n);
    });
  });

  describe("Randomness Request", function () {
    it("Should request randomness", async function () {
      const { verifier, mockVRFCoordinator } = await loadFixture(deployVerifierFixture);
      
      // Listen for events from the mock coordinator
      const requestRandomnessPromise = new Promise((resolve) => {
        mockVRFCoordinator.on("RandomnessRequested", (requestId) => {
          resolve(requestId);
        });
      });
      
      // Request randomness
      const tx = await verifier.requestRandomness();
      const receipt = await tx.wait();
      
      // Get the requestId from the event
      const requestId = await requestRandomnessPromise;
      
      // Check if RandomnessRequested event was emitted by the verifier
      const event = receipt.logs.find(log => {
        try {
          const parsed = verifier.interface.parseLog(log);
          return parsed && parsed.name === "RandomnessRequested";
        } catch (e) {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
    });
  });

  describe("Randomness Fulfillment", function () {
    it("Should fulfill randomness request", async function () {
      // Set a reasonable timeout for this specific test
      this.timeout(30000);
      
      const { verifier, mockVRFCoordinator } = await loadFixture(deployVerifierFixture);
      
      console.log(">> TEST STARTING: Should fulfill randomness request");
      
      try {
        // Request randomness
        console.log(">> REQUESTING RANDOMNESS");
        const tx = await verifier.requestRandomness();
        console.log(">> WAITING FOR TRANSACTION CONFIRMATION");
        
        const receipt = await tx.wait();
        console.log(">> TRANSACTION CONFIRMED");
        
        // Extract requestId from the transaction logs
        console.log(">> SEARCHING FOR REQUESTID IN LOGS");
        let requestId;
        
        // First try to get it from the verifier logs
        const verifierLogs = receipt.logs.filter(log => {
          try {
            const parsed = verifier.interface.parseLog(log);
            return parsed && parsed.name === "RandomnessRequested";
          } catch (e) {
            return false;
          }
        });
        
        if (verifierLogs.length > 0) {
          const parsedLog = verifier.interface.parseLog(verifierLogs[0]);
          requestId = parsedLog.args.requestId;
          console.log(">> FOUND REQUESTID IN VERIFIER LOGS:", requestId);
        } else {
          // Try to get it from the mock coordinator logs
          const coordinatorLogs = receipt.logs.filter(log => {
            try {
              const parsed = mockVRFCoordinator.interface.parseLog(log);
              return parsed && parsed.name === "RandomnessRequested";
            } catch (e) {
              return false;
            }
          });
          
          if (coordinatorLogs.length > 0) {
            const parsedLog = mockVRFCoordinator.interface.parseLog(coordinatorLogs[0]);
            requestId = parsedLog.args.requestId;
            console.log(">> FOUND REQUESTID IN COORDINATOR LOGS:", requestId);
          } else {
            // Use a hardcoded approach to extract bytes32 from logs as fallback
            for (const log of receipt.logs) {
              if (log.topics.length > 1 && log.topics[0] === ethers.keccak256(ethers.toUtf8Bytes("RandomnessRequested(bytes32)"))) {
                requestId = log.topics[1];
                console.log(">> FOUND REQUESTID FROM RAW LOGS:", requestId);
                break;
              }
            }
          }
        }
        
        if (!requestId) {
          throw new Error("Failed to extract requestId from logs");
        }
        
        // Check if the request was registered
        console.log(">> CHECKING IF REQUEST EXISTS");
        const requestExists = await mockVRFCoordinator.requests(requestId);
        console.log(">> REQUEST EXISTS:", requestExists);
        
        if (!requestExists) {
          throw new Error("Request not registered in mock coordinator");
        }
        
        // Get the requester address
        const requester = await mockVRFCoordinator.requesters(requestId);
        console.log(">> REQUESTER:", requester);
        console.log(">> VERIFIER ADDRESS:", await verifier.getAddress());
        
        // Fulfill the request from the coordinator
        console.log(">> FULFILLING RANDOMNESS");
        const fulfillTx = await mockVRFCoordinator.fulfillRandomWords(requestId, [123]);
        console.log(">> WAITING FOR FULFILLMENT CONFIRMATION");
        await fulfillTx.wait();
        console.log(">> RANDOMNESS FULFILLED");
        
        // Check if request was fulfilled
        console.log(">> CHECKING REQUEST FULFILLMENT STATUS");
        const isFulfilled = await verifier.isRequestFulfilled(requestId);
        console.log(">> IS FULFILLED:", isFulfilled);
        
        const randomResult = await verifier.getRandomResult(requestId);
        console.log(">> RANDOM RESULT:", randomResult.toString());
        
        expect(isFulfilled).to.be.true;
        expect(randomResult).to.equal(123);
        
        console.log(">> TEST COMPLETED SUCCESSFULLY");
      } catch (error) {
        console.error(">> TEST ERROR:", error.message);
        throw error;
      }
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to update VRF config", async function () {
      const { verifier } = await loadFixture(deployVerifierFixture);
      const newCoordinator = "0x1111111111111111111111111111111111111111";
      await verifier.updateVRFConfig(
        newCoordinator,
        2n,
        "0x1111111111111111111111111111111111111111111111111111111111111111",
        200000n,
        5n
      );
      expect(await verifier.vrfCoordinator()).to.equal(newCoordinator);
    });

    it("Should not allow non-owner to update VRF config", async function () {
      const { verifier, addr1 } = await loadFixture(deployVerifierFixture);
      const newCoordinator = "0x1111111111111111111111111111111111111111";
      await expect(
        verifier.connect(addr1).updateVRFConfig(
          newCoordinator,
          2n,
          "0x1111111111111111111111111111111111111111111111111111111111111111",
          200000n,
          5n
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 