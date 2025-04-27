// Script to set up and configure LayerZero Read for the cross-chain VRF solution
const { ethers } = require("hardhat");

async function main() {
  console.log("Setting up LayerZero Read for cross-chain VRF...");

  // Configuration constants
  const READ_LIBRARY_ADDRESS = "0x123456789abcdef123456789abcdef123456789a"; // Replace with the actual ReadLib1002 address
  const READ_CHANNEL_ID = 5; // Replace with the appropriate channel ID
  
  // DVN configuration data
  const DVN_CONFIG = {
    dvnAddresses: [
      "0xabcdef123456789abcdef123456789abcdef1234", // Replace with actual DVN addresses
      "0x9876543210abcdef9876543210abcdef98765432"
    ],
    thresholdNumerator: 1,
    thresholdDenominator: 2,
    gasPrice: ethers.parseUnits("5", "gwei"),
    nativeFee: ethers.parseEther("0.01")
  };

  // Get deployed contracts
  console.log("Loading deployed contracts...");
  
  const EnhancedSonicVRFConsumer = await ethers.getContractFactory("EnhancedSonicVRFConsumer");
  const enhancedVRFConsumer = await EnhancedSonicVRFConsumer.attach(
    "YOUR_DEPLOYED_CONTRACT_ADDRESS" // Replace with the actual deployed address
  );
  
  // Get LayerZero Endpoint
  const lzEndpointAddress = await enhancedVRFConsumer.endpoint();
  const LZEndpoint = await ethers.getContractFactory("ILayerZeroEndpointV2");
  const lzEndpoint = LZEndpoint.attach(lzEndpointAddress);
  
  console.log(`Connected to LayerZero Endpoint at ${lzEndpointAddress}`);

  // Step 1: Set the Send Library for the READ_CHANNEL_ID
  console.log("Setting Send Library for Read Channel...");
  const setSendLibTx = await lzEndpoint.setSendLibrary(
    enhancedVRFConsumer.address,
    READ_CHANNEL_ID,
    READ_LIBRARY_ADDRESS
  );
  await setSendLibTx.wait();
  console.log(`Send Library set: ${READ_LIBRARY_ADDRESS}`);

  // Step 2: Set the Receive Library for the READ_CHANNEL_ID
  console.log("Setting Receive Library for Read Channel...");
  const setReceiveLibTx = await lzEndpoint.setReceiveLibrary(
    enhancedVRFConsumer.address,
    READ_CHANNEL_ID,
    READ_LIBRARY_ADDRESS
  );
  await setReceiveLibTx.wait();
  console.log(`Receive Library set: ${READ_LIBRARY_ADDRESS}`);

  // Step 3: Configure the DVNs for the application
  console.log("Configuring DVNs for the application...");
  
  // Encode the DVN configuration
  const CONFIG_TYPE_DVN = 1; // Config type for DVN
  const abiCoder = new ethers.AbiCoder();
  
  const dvnConfig = abiCoder.encode(
    ["address[]", "uint16", "uint16", "uint128", "uint128"],
    [
      DVN_CONFIG.dvnAddresses,
      DVN_CONFIG.thresholdNumerator,
      DVN_CONFIG.thresholdDenominator,
      DVN_CONFIG.gasPrice,
      DVN_CONFIG.nativeFee
    ]
  );
  
  const setConfigTx = await lzEndpoint.setConfig(
    enhancedVRFConsumer.address,
    READ_CHANNEL_ID,
    CONFIG_TYPE_DVN,
    dvnConfig
  );
  await setConfigTx.wait();
  console.log("DVN configuration set successfully");

  // Step 4: Activate the read channel in the contract
  console.log("Activating Read Channel in the contract...");
  const setReadChannelTx = await enhancedVRFConsumer.setReadChannel(READ_CHANNEL_ID, true);
  await setReadChannelTx.wait();
  console.log(`Read Channel ${READ_CHANNEL_ID} activated`);

  console.log("\nLayerZero Read setup completed successfully!");
  console.log("------------------------------");
  console.log("Next steps:");
  console.log("1. Fund your contract with ETH for LayerZero fees");
  console.log("2. Try querying the VRF state from Arbitrum");
  console.log("3. Update Dragon token to utilize enhanced VRF functionality");
  console.log("------------------------------");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 