require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");

// This is a hardhat config specifically for cross-chain VRF tests
// It's kept separate to avoid conflicts with the main project

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.18",
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
    }
  },
  paths: {
    sources: "./test-crosschain",
    tests: "./test-crosschain",
    cache: "./cache-cc",
    artifacts: "./artifacts-cc"
  },
  mocha: {
    timeout: 30000
  }
}; 