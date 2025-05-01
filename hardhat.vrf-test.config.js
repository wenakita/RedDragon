/**
 * Hardhat configuration file specifically for VRF tests
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
    tests: "./test",
    artifacts: "./artifacts-vrf"
  },
  mocha: {
    timeout: 100000
  }
}; 