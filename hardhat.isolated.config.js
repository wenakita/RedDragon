/**
 * Completely isolated Hardhat configuration file for VRFTestHelper tests only
 */
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

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
    sources: "./contracts/mocks",
    tests: "./test/test-only",
    cache: "./cache-isolated",
    artifacts: "./artifacts-isolated"
  },
  mocha: {
    timeout: 100000
  }
}; 