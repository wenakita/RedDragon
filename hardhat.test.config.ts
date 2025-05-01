import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import * as dotenv from "dotenv";

// Load .env files
dotenv.config({ path: "./deployment.env" });

const config: HardhatUserConfig = {
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
    sources: "./contracts/test",
    tests: "./test",
    cache: "./cache-test",
    artifacts: "./artifacts-test"
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20
      }
    },
    sonic: {
      url: process.env.MAINNET_RPC_URL || "https://rpc.soniclabs.com",
      chainId: process.env.MAINNET_CHAIN_ID ? parseInt(process.env.MAINNET_CHAIN_ID) : 146,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 150000000000, // 150 gwei
      timeout: 60000
    }
  },
  mocha: {
    timeout: 100000
  }
};

export default config; 