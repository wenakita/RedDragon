// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DragonMathLibWrapper.sol";

contract DragonMathTest is Test {
    DragonMathLibWrapper public wrapper;
    uint256 constant PRECISION = 1e18;
    
    function setUp() public {
        wrapper = new DragonMathLibWrapper();
    }
    
    function testCubeRoot() public {
        // Test that cubeRoot(27 * 10^18) ≈ 3 * 10^18
        uint256 result = wrapper.cubeRoot(27 * 1e18);
        uint256 expected = 3 * 1e18;
        uint256 tolerance = 1e15; // 0.1% tolerance
        
        assertTrue(
            result > expected - tolerance && result < expected + tolerance,
            "Cube root calculation incorrect"
        );
    }
    
    function testCalculateVotingPower() public {
        // Test that the voting power of 1e18 tokens is 100 * 1e18
        uint256 result = wrapper.calculateVotingPower(1e18);
        assertEq(result, 100 * 1e18, "Voting power calculation incorrect");
    }
    
    function testBoostMultiplier() public {
        // User has 100% of the supply, should get max boost
        uint256 userBalance = 1000 * PRECISION;
        uint256 totalSupply = 1000 * PRECISION;
        uint256 result = wrapper.calculateBoostMultiplier(
            userBalance,
            totalSupply,
            10000, // 100% base boost
            25000, // 250% max boost
            10000  // Precision
        );
        
        assertEq(result, 25000, "100% share should get max boost");
    }
    
    function testNormalizeWeights() public {
        uint256[] memory weights = new uint256[](3);
        weights[0] = 1;
        weights[1] = 2;
        weights[2] = 7;
        
        uint256[] memory result = wrapper.normalizeWeights(weights, PRECISION);
        
        // Expected: 10% (1/10), 20% (2/10), 70% (7/10)
        assertApproxEqRel(result[0], PRECISION / 10, 1e15, "First weight should be 10%");
        assertApproxEqRel(result[1], PRECISION * 2 / 10, 1e15, "Second weight should be 20%");
        assertApproxEqRel(result[2], PRECISION * 7 / 10, 1e15, "Third weight should be 70%");
    }
}
