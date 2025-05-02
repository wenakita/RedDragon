// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "./DragonMathLibWrapper.sol";

contract DragonMathTest is Test {
    DragonMathLibWrapper public wrapper;
    uint256 constant PRECISION = 1e18;
    
    function setUp() public {
        wrapper = new DragonMathLibWrapper();
    }
    
    // ======== cubeRoot tests ========
    
    function testCubeRoot() public {
        uint256 result = wrapper.cubeRoot(27 * PRECISION);
        assertApproxEqRel(result, 3 * PRECISION, 0.01e18); // Allow 1% deviation
    }
    
    function testCubeRootZero() public {
        uint256 result = wrapper.cubeRoot(0);
        assertEq(result, 0, "cubeRoot of 0 should be 0");
    }
    
    // ======== calculateVotingPower tests ========
    
    function testCalculateVotingPower() public {
        uint256 result = wrapper.calculateVotingPower(1 * PRECISION);
        assertEq(result, 100 * PRECISION, "Voting power should be 100x for 1 token");
    }
    
    // ======== calculateBoostMultiplier tests ========
    
    function testCalculateBoostMultiplier() public {
        uint256 baseBoost = 10000;  // 1.0x
        uint256 maxBoost = 25000;   // 2.5x
        uint256 precision = 10000;  // Unused parameter
        
        // Test when user has no balance
        uint256 result = wrapper.calculateBoostMultiplier(0, 1000 * PRECISION, baseBoost, maxBoost, precision);
        assertEq(result, baseBoost, "Should return baseBoost when user has no balance");
        
        // Test when user has all the supply
        result = wrapper.calculateBoostMultiplier(1000 * PRECISION, 1000 * PRECISION, baseBoost, maxBoost, precision);
        assertEq(result, maxBoost, "Should return maxBoost when user has all the supply");
        
        // Test a partial case (implementation returns a simple middle value)
        result = wrapper.calculateBoostMultiplier(500 * PRECISION, 1000 * PRECISION, baseBoost, maxBoost, precision);
        assertEq(result, baseBoost + ((maxBoost - baseBoost) / 2), "Should return weighted boost");
    }
    
    // ======== normalizeWeights tests ========
    
    function testNormalizeWeights() public {
        uint256[] memory weights = new uint256[](3);
        weights[0] = 100;
        weights[1] = 200;
        weights[2] = 700;
        
        uint256[] memory normalized = wrapper.normalizeWeights(weights, PRECISION);
        
        assertEq(normalized.length, 3, "Array length should be preserved");
        assertEq(normalized[0], 100 * PRECISION / 1000, "First weight should be normalized to 10%");
        assertEq(normalized[1], 200 * PRECISION / 1000, "Second weight should be normalized to 20%");
        assertEq(normalized[2], 700 * PRECISION / 1000, "Third weight should be normalized to 70%");
    }
    
    function testNormalizeWeightsEmpty() public {
        uint256[] memory weights = new uint256[](0);
        uint256[] memory normalized = wrapper.normalizeWeights(weights, PRECISION);
        
        assertEq(normalized.length, 0, "Empty array should remain empty");
    }
    
    function testNormalizeWeightsZeroSum() public {
        uint256[] memory weights = new uint256[](3);
        weights[0] = 0;
        weights[1] = 0;
        weights[2] = 0;
        
        uint256[] memory normalized = wrapper.normalizeWeights(weights, PRECISION);
        
        assertEq(normalized.length, 3, "Array length should be preserved");
        assertEq(normalized[0], 0, "Weight should be 0");
        assertEq(normalized[1], 0, "Weight should be 0");
        assertEq(normalized[2], 0, "Weight should be 0");
    }
} 