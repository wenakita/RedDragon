const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🧪 Testing PaintSwap VRF subscription creation...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Using account:", deployer.address);

  // PaintSwap VRF addresses
  const VRF_COORDINATOR = process.env.VRF_COORDINATOR || "0x3ba925fdeae6b46d0bb4d424d829982cb2f7309e";
  const SUBSCRIPTION_MANAGER = process.env.SUBSCRIPTION_MANAGER || "0x3291b1ae6b74d59a4334bba0257873dda5d18115";
  
  console.log("📝 VRF Coordinator:", VRF_COORDINATOR);
  console.log("📝 Subscription Manager:", SUBSCRIPTION_MANAGER);

  // Test if we can create a subscription
  console.log("\n🔧 Attempting to create a subscription...");
  
  try {
    const subscriptionManager = await ethers.getContractAt("ISubscriptionManager", SUBSCRIPTION_MANAGER);
    console.log("✅ Successfully connected to Subscription Manager");
    
    // Try to create a subscription
    try {
      console.log("📋 Sending createSubscription transaction...");
      const tx = await subscriptionManager.createSubscription();
      console.log("📋 Transaction hash:", tx.hash);
      
      console.log("⏳ Waiting for transaction confirmation...");
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log("✅ Transaction successful!");
        
        // Check if we can get the subscription ID from the event
        try {
          // Assuming the event is in the first log entry
          if (receipt.events && receipt.events.length > 0) {
            const subscriptionId = receipt.events[0].args.subscriptionId;
            console.log("🎉 Created subscription ID:", subscriptionId.toString());
            
            // Fund the subscription (optional test)
            console.log("\n💰 Attempting to fund the subscription...");
            try {
              const fundTx = await subscriptionManager.fundSubscription(
                subscriptionId, 
                ethers.utils.parseEther("0.01") // Fund a small amount
              );
              console.log("📋 Funding transaction hash:", fundTx.hash);
              
              console.log("⏳ Waiting for funding transaction confirmation...");
              const fundReceipt = await fundTx.wait();
              
              if (fundReceipt.status === 1) {
                console.log("✅ Funding transaction successful!");
              } else {
                console.error("❌ Funding transaction failed!");
              }
            } catch (error) {
              console.error("❌ Error funding subscription:", error.message);
            }
          } else {
            console.warn("⚠️ No events found in the transaction receipt!");
          }
        } catch (error) {
          console.error("❌ Error extracting subscription ID:", error.message);
        }
      } else {
        console.error("❌ Transaction failed!");
      }
    } catch (error) {
      console.error("❌ Error creating subscription:", error.message);
    }
  } catch (error) {
    console.error("❌ Error connecting to Subscription Manager:", error.message);
  }

  console.log("\n🧪 VRF subscription test completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 