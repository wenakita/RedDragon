/**
 * Minimal hardhat config for testing
 */
require("@nomiclabs/hardhat-waffle");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.20",
  paths: {
    sources: "./test/mocks",
    tests: "./test",
    cache: "./cache_test",
    artifacts: "./artifacts_test"
  }
}; 