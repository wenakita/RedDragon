require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config({ path: "./.env" });
const path = require('path');
const fs = require('fs');

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      chainId: 31337
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    sonic: {
      url: process.env.SONIC_MAINNET_RPC_URL || "https://rpc.soniclabs.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: parseInt(process.env.SONIC_MAINNET_CHAIN_ID || "146"),
      timeout: 120000,
      gas: 5000000,
      gasPrice: 150000000000,
      httpHeaders: {
        'Content-Type': 'application/json'
      }
    }
  },
  etherscan: {
    apiKey: {
      sonic: process.env.SONICSCAN_API_KEY || "6CMN3IV9FZRHYFA1BPVGWCXUWCUUQG54J1"
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
  sourcify: {
    enabled: true,
  },
  paths: {
    sources: "./contracts_temp",
    tests: "./test",
    cache: "./cache_temp",
    artifacts: "./artifacts_temp"
  },
  mocha: {
    timeout: 100000
  }
}; 