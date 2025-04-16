require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// RED DRAGON LAUNCH WIZARD custom task
task("launch-red-dragon", "Launches RED DRAGON on Sonic Blockchain")
  .addFlag("skipVrf", "Skip VRF subscription funding")
  .setAction(async (taskArgs, hre) => {
    try {
      // Import the script properly
      const launchScript = require("./scripts/RED_DRAGON_LAUNCH_WIZARD.js");
      
      // Pass the hardhat runtime environment and task arguments to the script
      await launchScript(hre, taskArgs);
    } catch (error) {
      console.error("Error during RED DRAGON launch:", error);
      throw error;
    }
  });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    sonic: {
      url: process.env.SONIC_MAINNET_RPC_URL || "https://rpc.soniclabs.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: parseInt(process.env.SONIC_MAINNET_CHAIN_ID || "146"), // Sonic mainnet
      timeout: 120000, // 2 minutes timeout
      gas: 5000000,
      gasPrice: 150000000000, // 150 gwei
      httpHeaders: {
        'Content-Type': 'application/json'
      }
    }
  },
  etherscan: {
    apiKey: {
      sonic: "6CMN3IV9FZRHYFA1BPVGWCXUWCUUQG54J1" // Use the provided SonicScan API key
    },
    customChains: [
      {
        network: "sonic",
        chainId: 146,
        urls: {
          apiURL: "https://api.sonicscan.org/api",
          browserURL: "https://sonicscan.org"
        }
      }
    ]
  },
  // Enable Sourcify verification as an alternative to Etherscan/SonicScan
  sourcify: {
    enabled: true,
    // You can specify custom endpoints if needed
    // apiUrl: "https://sourcify.dev/server",
    // browserUrl: "https://sourcify.dev"
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000 // 40 seconds timeout for tests
  }
}; 