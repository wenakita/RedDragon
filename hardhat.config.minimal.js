require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  paths: {
    tests: "./test/minimal",
    cache: "./cache-minimal",
    artifacts: "./artifacts-minimal",
    sources: "./contracts/mocks", // Only load mock files
    root: "./"
  }
}; 