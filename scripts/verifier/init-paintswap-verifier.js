const hre = require("hardhat");
const fs = require("fs");
const { ethers } = require("hardhat");

/**
 * Initialize PaintSwap Verifier with VRF Coordinator
 * This script sets up the VRF Coordinator, key hash, and fee for randomness requests
 */
async function main() {
  console.log("🔄 PaintSwap Verifier Initialization Script");
  console.log("==========================================");

  try {
    // Load deployment addresses
    let addresses = {};
    const deploymentFile = "deployment-addresses-sonic.json";
    
    if (fs.existsSync(deploymentFile)) {
      addresses = JSON.parse(fs.readFileSync(deploymentFile));
      console.log("📝 Loaded deployment addresses");
    } else {
      console.error("❌ Deployment addresses file not found");
      process.exit(1);
    }
    
    // Check required addresses exist
    if (!addresses.paintSwapVerifier) {
      console.error("❌ PaintSwap Verifier address not found in deployment file");
      process.exit(1);
    }
    
    const paintSwapVerifierAddress = addresses.paintSwapVerifier;
    console.log(`📋 PaintSwap Verifier address: ${paintSwapVerifierAddress}`);
    
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`📋 Using account: ${signer.address}`);
    
    // Connect to verifier contract
    const verifier = await hre.ethers.getContractAt("RedDragonPaintSwapVerifier", paintSwapVerifierAddress);
    
    // Check current configuration
    console.log("\n🔍 Checking current VRF Coordinator configuration");
    console.log("--------------------------------------------");
    
    let vrfCoordinator = "";
    let keyHash = "";
    let fee = "";
    
    try {
      vrfCoordinator = await verifier.vrfCoordinator();
      keyHash = await verifier.keyHash();
      fee = await verifier.fee();
      
      console.log(`Current VRF Coordinator: ${vrfCoordinator}`);
      console.log(`Current Key Hash: ${keyHash}`);
      console.log(`Current Fee: ${fee.toString()}`);
      
      if (vrfCoordinator !== "0x0000000000000000000000000000000000000000") {
        console.log("\n⚠️ VRF Coordinator is already set.");
        const shouldOverride = await promptYesNo("Do you want to override these settings? (y/n): ");
        
        if (!shouldOverride) {
          console.log("✅ Keeping current settings. Exiting.");
          process.exit(0);
        }
      }
    } catch (error) {
      console.log("⚠️ Could not check current configuration:", error.message);
      console.log("   Continuing with initialization...");
    }
    
    // Check ownership
    try {
      const owner = await verifier.owner();
      console.log(`Contract owner: ${owner}`);
      
      if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.error("❌ You are not the owner of the contract. Cannot initialize.");
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error checking contract ownership:", error.message);
      process.exit(1);
    }
    
    // Prompt for VRF details
    console.log("\n📝 Enter VRF Coordinator details");
    console.log("------------------------------");
    
    // For Sonic chain, we use PaintSwap's VRF
    // https://docs.paintswap.finance/contracts/chainlink-vrf
    const networks = {
      "Sonic": {
        vrfCoordinator: "0xDE8BB0aae084696204aE35a64bDBEEd6f26b1aE5",
        keyHash: "0xa5a98c13f6b3b4bc95bcdcbe35df8a278de4b5c3f480a1789b56f67a5e193d89",
        fee: ethers.utils.parseEther("0.0001") // 0.0001 Sonic
      }
    };
    
    console.log("Network presets:");
    console.log("1. Sonic");
    
    let selectedVRF = "";
    let selectedKeyHash = "";
    let selectedFee = "";
    
    const usePreset = await promptYesNo("Use a network preset? (y/n): ");
    
    if (usePreset) {
      selectedVRF = networks.Sonic.vrfCoordinator;
      selectedKeyHash = networks.Sonic.keyHash;
      selectedFee = networks.Sonic.fee;
      
      console.log(`Using Sonic preset:`);
      console.log(`VRF Coordinator: ${selectedVRF}`);
      console.log(`Key Hash: ${selectedKeyHash}`);
      console.log(`Fee: ${ethers.utils.formatEther(selectedFee)} Sonic`);
    } else {
      // Manual entry
      selectedVRF = await prompt("Enter VRF Coordinator address: ");
      selectedKeyHash = await prompt("Enter Key Hash: ");
      const feeInput = await prompt("Enter Fee (in Sonic): ");
      selectedFee = ethers.utils.parseEther(feeInput);
    }
    
    // Confirm values
    const confirm = await promptYesNo("Do you want to continue with these values? (y/n): ");
    if (!confirm) {
      console.log("❌ Initialization cancelled");
      process.exit(0);
    }
    
    // Initialize VRF
    console.log("\n🔄 Initializing PaintSwap Verifier...");
    try {
      const tx = await verifier.initialize(selectedVRF, selectedKeyHash, selectedFee);
      console.log(`Transaction sent: ${tx.hash}`);
      console.log("Waiting for confirmation...");
      
      await tx.wait();
      console.log("✅ PaintSwap Verifier initialized successfully!");
      
      // Verify initialization
      const newVRFCoordinator = await verifier.vrfCoordinator();
      const newKeyHash = await verifier.keyHash();
      const newFee = await verifier.fee();
      
      console.log("\n🔍 New configuration:");
      console.log(`VRF Coordinator: ${newVRFCoordinator}`);
      console.log(`Key Hash: ${newKeyHash}`);
      console.log(`Fee: ${ethers.utils.formatEther(newFee)} Sonic`);
      
      if (newVRFCoordinator.toLowerCase() !== selectedVRF.toLowerCase()) {
        console.error("⚠️ VRF Coordinator was not set correctly!");
      }
      
      if (newKeyHash.toLowerCase() !== selectedKeyHash.toLowerCase()) {
        console.error("⚠️ Key Hash was not set correctly!");
      }
      
      if (!newFee.eq(selectedFee)) {
        console.error("⚠️ Fee was not set correctly!");
      }
      
    } catch (error) {
      console.error("❌ Error initializing VRF:", error.message);
      process.exit(1);
    }
    
    console.log("\n✅ Script completed successfully!");
    
  } catch (error) {
    console.error("❌ Error during execution:", error.message);
    process.exit(1);
  }
}

// Helper function for yes/no prompts
async function promptYesNo(question) {
  // In a non-interactive environment, default to yes
  if (!process.stdin.isTTY) {
    console.log(`${question} (defaulting to yes in non-interactive mode)`);
    return true;
  }
  
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Helper function for general prompts
async function prompt(question) {
  // In a non-interactive environment, we can't prompt
  if (!process.stdin.isTTY) {
    console.error(`Cannot prompt for ${question} in non-interactive mode`);
    process.exit(1);
  }
  
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer);
    });
  });
}

// Run the main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 