require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config({ path: "./.env" }); // Load main .env file
require("hardhat-gas-reporter");
require("hardhat-deploy");
const path = require('path');
const fs = require('fs');

// Always load deployment.env for the current session
require("dotenv").config({ path: "./deployment.env", override: true });

// Try to load deployment config .env if it exists
const deploymentEnvPath = path.join(__dirname, "deployment", "config", ".env");
if (fs.existsSync(deploymentEnvPath)) {
  require("dotenv").config({ path: deploymentEnvPath });
}

// Try to load deployment.env for direct deployment
const directDeploymentEnvPath = path.join(__dirname, "deployment.env");
if (fs.existsSync(directDeploymentEnvPath)) {
  require("dotenv").config({ path: directDeploymentEnvPath });
  console.log("Loaded deployment.env for direct deployment");
}

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// Deploy Dragon task
task("deploy-dragon", "Deploys Dragon with updated security changes")
  .setAction(async (taskArgs, hre) => {
    console.log("\n🐉 DEPLOYING DRAGON WITH SECURITY CHANGES 🐉\n");
  
    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);
  
    // Use process.env values since we loaded them above
    const wrappedSonicAddress = process.env.WRAPPED_SONIC_ADDRESS;
    
    // Get deployment path
    const configDir = path.join(__dirname, "deployments");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const contractAddressesPath = path.join(configDir, "contract-addresses.json");
    let contractAddresses = {};
    
    if (fs.existsSync(contractAddressesPath)) {
      contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
    }
    
    console.log(`Using wS address: ${wrappedSonicAddress}`);
    
    try {
      // Deploy JackpotVault if needed
      console.log("\n=== DEPLOYING JACKPOT VAULT ===\n");
      const JackpotVault = await hre.ethers.getContractFactory("DragonJackpotVault");
      
      // The vault gets created with the wrapped sonic address
      const jackpotVault = await JackpotVault.deploy(
        wrappedSonicAddress,
        deployer.address
      );
      
      await jackpotVault.deployed();
      console.log(`JackpotVault deployed to: ${jackpotVault.address}`);
      
      contractAddresses.jackpotVault = jackpotVault.address;
      
      // Deploy ve69LPFeeDistributor next
      console.log("\n=== DEPLOYING VE69LP FEE DISTRIBUTOR ===\n");
      const ve69LPAddress = contractAddresses.ve69LP || deployer.address; // Use deployer as placeholder if no ve69LP
      
      const Ve69LPFeeDistributor = await hre.ethers.getContractFactory("ve69LPFeeDistributor");
      const ve69LPFeeDistributor = await Ve69LPFeeDistributor.deploy(
        ve69LPAddress,
        wrappedSonicAddress
      );
      
      await ve69LPFeeDistributor.deployed();
      console.log(`Ve69LPFeeDistributor deployed to: ${ve69LPFeeDistributor.address}`);
      
      contractAddresses.ve69LPFeeDistributor = ve69LPFeeDistributor.address;
      
      // Finally deploy the Dragon token
      console.log("\n=== DEPLOYING DRAGON TOKEN ===\n");
      const initialSupply = hre.ethers.utils.parseEther("690000"); // 690,000 tokens
      
      const Dragon = await hre.ethers.getContractFactory("Dragon");
      const dragon = await Dragon.deploy(
        "Dragon",
        "DRAGON",
        initialSupply,
        jackpotVault.address,
        ve69LPFeeDistributor.address,
        wrappedSonicAddress,
        deployer.address // Use deployer as multisig for now
      );
      
      await dragon.deployed();
      console.log(`Dragon token deployed to: ${dragon.address}`);
      
      // Set Dragon token address on JackpotVault
      await jackpotVault.setTokenAddress(dragon.address);
      console.log("Set Dragon token address on JackpotVault");
      
      // Save all addresses
      contractAddresses.dragon = dragon.address;
      fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
      
      console.log("\n🐉 DEPLOYMENT COMPLETED! 🐉");
      console.log(`Dragon Token: ${dragon.address}`);
      console.log(`JackpotVault: ${jackpotVault.address}`);
      console.log(`Ve69LPFeeDistributor: ${ve69LPFeeDistributor.address}`);
      console.log("\nYou can find all contract addresses in deployments/contract-addresses.json");
    } catch (error) {
      console.error("Error deploying contracts:", error);
      throw error;
    }
  });

// RED DRAGON LAUNCH WIZARD custom task
task("launch-red-dragon", "Launches RED DRAGON on Sonic Blockchain")
  .addFlag("skipVrf", "Skip VRF subscription funding")
  .setAction(async (taskArgs, hre) => {
    try {
      // Import the script properly with updated path
      const launchScript = require("./deployment/RED_DRAGON_LAUNCH_WIZARD.js");
      
      // Pass the hardhat runtime environment and task arguments to the script
      await launchScript(hre, taskArgs);
    } catch (error) {
      console.error("Error during RED DRAGON launch:", error);
      throw error;
    }
  });

// Custom task to compile mock contracts
task("compile-mocks", "Compiles just the mock contracts", async (taskArgs, hre) => {
  console.log("Compiling mock contracts...");
  
  // Get list of mock contract files
  const fs = require("fs");
  const path = require("path");
  const mockDir = path.join(__dirname, "contracts", "mock");
  
  const mockFiles = fs.readdirSync(mockDir)
    .filter(file => file.endsWith(".sol"))
    .map(file => path.join(mockDir, file));
  
  console.log("Found mock files:", mockFiles);
  
  for (const file of mockFiles) {
    console.log(`Compiling ${file}...`);
    try {
      // Using child_process to run solc directly
      const { execSync } = require("child_process");
      const outDir = path.join(__dirname, "bytecode");
      
      // Create output directory if it doesn't exist
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      
      // Get just the filename without extension
      const baseName = path.basename(file, ".sol");
      
      // Compile using solc with node_modules in include path
      const cmd = `npx solc --bin --include-path node_modules/ --base-path . ${file} -o ${outDir}`;
      console.log(`Running: ${cmd}`);
      
      const output = execSync(cmd);
      console.log(`Compiled ${baseName}:`, output.toString());
      
      // Move the output file to have the exact name we want
      const defaultOutput = path.join(outDir, `${baseName}.bin`);
      
      if (fs.existsSync(defaultOutput)) {
        const targetPath = path.join(outDir, baseName);
        fs.writeFileSync(targetPath, fs.readFileSync(defaultOutput, "utf8"));
        console.log(`Written compiled bytecode to ${targetPath}`);
      }
    } catch (error) {
      console.error(`Error compiling ${file}:`, error.message);
    }
  }
  
  console.log("Mock compilation completed");
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
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20
      }
    }
  },
  mocha: {
    timeout: 100000
  },
  gasReporter: {
    enabled: false
  }
}; 