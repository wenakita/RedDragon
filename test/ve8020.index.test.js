const { expect } = require("chai");

// Main index file for ve(80/20) system tests
describe("Ve(80/20) System Tests", function () {
  // Import and run individual test files
  
  describe("ve8020 Token", function () {
    before(function() {
      console.log("========== Running ve8020 Token Tests ==========");
    });
    
    require("./ve8020.test.js");
  });
  
  describe("Ve8020FeeDistributor", function () {
    before(function() {
      console.log("========== Running Ve8020FeeDistributor Tests ==========");
    });
    
    require("./Ve8020FeeDistributor.test.js");
  });
  
  describe("ve8020LotteryIntegrator", function () {
    before(function() {
      console.log("========== Running ve8020LotteryIntegrator Tests ==========");
    });
    
    require("./ve8020LotteryIntegrator.test.js");
  });
  
  describe("RedDragonFeeManager", function () {
    before(function() {
      console.log("========== Running RedDragonFeeManager Tests ==========");
    });
    
    require("./RedDragonFeeManager.test.js");
  });
  
  describe("Ve8020 System Integration", function () {
    before(function() {
      console.log("========== Running Ve8020 System Integration Tests ==========");
    });
    
    require("./Ve8020System.test.js");
  });
  
  describe("Boost Simulation", function () {
    before(function() {
      console.log("========== Running Boost Simulation Tests ==========");
    });
    
    require("./BoostSimulation.test.js");
  });
}); 