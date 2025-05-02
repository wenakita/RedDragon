// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// NOTE: Before running these tests, install the forge-std library:
// forge install foundry-rs/forge-std
import "../../lib/forge-std/src/Test.sol";
import "../../contracts/test/DragonMathLibWrapper.sol";

contract DragonMathLibTest is Test {
    DragonMathLibWrapper public wrapper;
    uint256 constant PRECISION = 1e18;
    
    function setUp() public {
        wrapper = new DragonMathLibWrapper();
    }
    
    // ======== cubeRoot tests ========
    
    function testCubeRootZero() public {
        uint256 result = wrapper.cubeRoot(0);
        assertEq(result, 0, "cubeRoot of 0 should be 0");
    }
    
    function testCubeRootOne() public {
        uint256 result = wrapper.cubeRoot(PRECISION);
        assertEq(result, PRECISION, "cubeRoot of 1e18 should be 1e18");
    }
    
    function testCubeRootEight() public {
        // 8 * 1e18 => cubeRoot should be close to 2 * 1e18
        uint256 result = wrapper.cubeRoot(8 * PRECISION);
        assertApproxEqRel(result, 2 * PRECISION, 1e15, "cubeRoot of 8e18 should be ~2e18");
    }
    
    function testCubeRootLargeNumber() public {
        // Testing with a large but safe number (1e24)
        uint256 input = 1e24;
        uint256 result = wrapper.cubeRoot(input);
        // Expected ≈ 1e8 (1e24)^(1/3) 
        assertApproxEqRel(result, 1e8 * PRECISION / 1e2, 1e16, "cubeRoot of 1e24 should be ~1e8");
    }
    
    // ======== calculateVotingPower tests ========
    
    function testCalculateVotingPowerZero() public {
        uint256 result = wrapper.calculateVotingPower(0);
        assertEq(result, 0, "Voting power of 0 should be 0");
    }
    
    function testCalculateVotingPowerOne() public {
        // 1 token should result in 100 voting power (as per implementation)
        uint256 result = wrapper.calculateVotingPower(1);
        assertEq(result, 100, "Voting power of 1 should be 100");
    }
    
    function testCalculateVotingPowerNormal() public {
        // For 1e18 tokens, voting power should be 100 * 1e18 (as per implementation)
        uint256 result = wrapper.calculateVotingPower(PRECISION);
        assertEq(result, 100 * PRECISION, "Voting power of 1e18 should be 100e18");
    }
    
    function testCalculateVotingPowerLarge() public {
        // Test with a large number of tokens (1e27)
        uint256 result = wrapper.calculateVotingPower(1e27);
        // Should be approximately 100 * cubeRoot(1e27) = 100 * 1e9
        assertApproxEqRel(result, 100 * 1e9, 1e16, "Voting power calculation for large input is incorrect");
    }
    
    // ======== calculateTimedVotingPower tests ========
    
    function testCalculateTimedVotingPowerZero() public {
        uint256 result = wrapper.calculateTimedVotingPower(0, block.timestamp + 365 days, block.timestamp, 4 * 365 days);
        assertEq(result, 0, "Timed voting power with 0 amount should be 0");
    }
    
    function testCalculateTimedVotingPowerExpired() public {
        uint256 result = wrapper.calculateTimedVotingPower(
            1000 * PRECISION, 
            block.timestamp - 1, // Already expired
            block.timestamp, 
            4 * 365 days
        );
        assertEq(result, 0, "Timed voting power with expired lock should be 0");
    }
    
    function testCalculateTimedVotingPowerFullLock() public {
        uint256 maxLockTime = 4 * 365 days;
        uint256 amount = 1000 * PRECISION;
        uint256 result = wrapper.calculateTimedVotingPower(
            amount,
            block.timestamp + maxLockTime, // Full lock period
            block.timestamp,
            maxLockTime
        );
        assertEq(result, amount, "Full lock should return the full amount as voting power");
    }
    
    function testCalculateTimedVotingPowerHalfLock() public {
        uint256 maxLockTime = 4 * 365 days;
        uint256 amount = 1000 * PRECISION;
        uint256 result = wrapper.calculateTimedVotingPower(
            amount,
            block.timestamp + maxLockTime / 2, // Half lock period
            block.timestamp,
            maxLockTime
        );
        assertApproxEqRel(result, amount / 2, 1e15, "Half lock should return half the amount as voting power");
    }
    
    // ======== calculateBoostMultiplier tests ========
    
    function testCalculateBoostMultiplierZeroBalance() public {
        uint256 result = wrapper.calculateBoostMultiplier(
            0, // Zero user balance
            1000 * PRECISION,
            10000, // 100% base boost
            25000, // 250% max boost
            10000  // Precision
        );
        assertEq(result, 10000, "Zero balance should return base boost");
    }
    
    function testCalculateBoostMultiplierZeroSupply() public {
        uint256 result = wrapper.calculateBoostMultiplier(
            100 * PRECISION,
            0, // Zero total supply
            10000, // 100% base boost
            25000, // 250% max boost
            10000  // Precision
        );
        assertEq(result, 10000, "Zero supply should return base boost");
    }
    
    function testCalculateBoostMultiplierFullShare() public {
        // User has 100% of the supply, should get max boost
        uint256 balance = 1000 * PRECISION;
        uint256 result = wrapper.calculateBoostMultiplier(
            balance,
            balance, // Same as user balance
            10000, // 100% base boost
            25000, // 250% max boost
            10000  // Precision
        );
        assertEq(result, 25000, "100% share should get max boost");
    }
    
    function testCalculateBoostMultiplierPartialShare() public {
        // User has 25% of total supply
        uint256 userBalance = 250 * PRECISION;
        uint256 totalSupply = 1000 * PRECISION;
        uint256 result = wrapper.calculateBoostMultiplier(
            userBalance,
            totalSupply,
            10000, // 100% base boost
            25000, // 250% max boost
            10000  // Precision
        );
        
        // This should be between base and max boost
        assertTrue(result > 10000 && result < 25000, "25% share should get between base and max boost");
    }
    
    // ======== calculatePercentage tests ========
    
    function testCalculatePercentageZeroDenominator() public {
        uint256 result = wrapper.calculatePercentage(100, 0, PRECISION);
        assertEq(result, 0, "Percentage with zero denominator should be 0");
    }
    
    function testCalculatePercentageBasic() public {
        // Calculate 25% with precision 1e18
        uint256 result = wrapper.calculatePercentage(25, 100, PRECISION);
        assertEq(result, PRECISION / 4, "25/100 should be 25% or 0.25 * PRECISION");
    }
    
    function testCalculatePercentageLargeNumbers() public {
        // Calculate percentage with large numbers
        uint256 result = wrapper.calculatePercentage(
            75 * 10**18, 
            100 * 10**18, 
            PRECISION
        );
        assertEq(result, 75 * PRECISION / 100, "75e18/100e18 should be 75%");
    }
    
    // ======== applyBoost tests ========
    
    function testApplyBoostZero() public {
        uint256 result = wrapper.applyBoost(0, 15000, 10000);
        assertEq(result, 0, "Boosting zero should be zero");
    }
    
    function testApplyBoostNoBoost() public {
        // Multiplier = 100% (10000/10000)
        uint256 result = wrapper.applyBoost(1000, 10000, 10000);
        assertEq(result, 1000, "100% multiplier should return the same amount");
    }
    
    function testApplyBoostPositiveBoost() public {
        // 150% boost (15000/10000)
        uint256 result = wrapper.applyBoost(1000, 15000, 10000);
        assertEq(result, 1500, "150% multiplier should return 150% of original");
    }
    
    function testApplyBoostMaxPrecision() public {
        // Test with maximum precision
        uint256 amount = 1000 * PRECISION;
        uint256 multiplier = 25 * PRECISION / 10; // 250%
        uint256 result = wrapper.applyBoost(amount, multiplier, PRECISION);
        assertEq(result, 2500 * PRECISION, "250% boost at full precision");
    }
    
    // ======== mapRange tests ========
    
    function testMapRangeEdgeCases() public {
        // Test invalid ranges (fromLow >= fromHigh)
        uint256 result = wrapper.mapRange(50, 100, 100, 0, 1000, PRECISION);
        assertEq(result, 0, "Invalid range should return toLow");
        
        // Test invalid output range (toLow >= toHigh)
        result = wrapper.mapRange(50, 0, 100, 1000, 1000, PRECISION);
        assertEq(result, 1000, "Invalid output range should return toLow");
        
        // Test value below fromLow
        result = wrapper.mapRange(5, 10, 100, 0, 1000, PRECISION);
        assertEq(result, 0, "Value below fromLow should return toLow");
        
        // Test value above fromHigh
        result = wrapper.mapRange(150, 0, 100, 0, 1000, PRECISION);
        assertEq(result, 1000, "Value above fromHigh should return toHigh");
    }
    
    function testMapRangeNormalCase() public {
        // Map 50 from range [0, 100] to range [0, 1000]
        uint256 result = wrapper.mapRange(50, 0, 100, 0, 1000, PRECISION);
        assertEq(result, 500, "50 in [0,100] should map to 500 in [0,1000]");
    }
    
    function testMapRangeHighPrecision() public {
        // Map 0.5 (with precision) from [0, 1] to [0, 1000]
        uint256 result = wrapper.mapRange(PRECISION / 2, 0, PRECISION, 0, 1000, PRECISION);
        assertEq(result, 500, "0.5 in [0,1] should map to 500 in [0,1000]");
    }
    
    // ======== linearInterpolation tests ========
    
    function testLinearInterpolationEdgeCases() public {
        // Invalid range (end <= start position)
        uint256 result = wrapper.linearInterpolation(
            100, 200, PRECISION, PRECISION, PRECISION / 2, PRECISION
        );
        assertEq(result, 100, "Invalid range should return startValue");
        
        // Current position <= startPosition
        result = wrapper.linearInterpolation(
            100, 200, PRECISION, 2 * PRECISION, PRECISION, PRECISION
        );
        assertEq(result, 100, "Position at start should return startValue");
        
        // Current position >= endPosition
        result = wrapper.linearInterpolation(
            100, 200, PRECISION, 2 * PRECISION, 2 * PRECISION, PRECISION
        );
        assertEq(result, 200, "Position at end should return endValue");
    }
    
    function testLinearInterpolationIncreasing() public {
        // Interpolate from 100 to 200, at 50% position
        uint256 result = wrapper.linearInterpolation(
            100, 200, PRECISION, 2 * PRECISION, PRECISION + PRECISION / 2, PRECISION
        );
        assertEq(result, 150, "50% between 100 and 200 should be 150");
    }
    
    function testLinearInterpolationDecreasing() public {
        // Interpolate from 200 to 100, at 25% position
        uint256 result = wrapper.linearInterpolation(
            200, 100, PRECISION, 2 * PRECISION, PRECISION + PRECISION / 4, PRECISION
        );
        assertEq(result, 175, "25% between 200 and 100 should be 175");
    }
    
    // ======== calculateWeightedAverage tests ========
    
    function testCalculateWeightedAverageEmptyArrays() public {
        uint256[] memory values = new uint256[](0);
        uint256[] memory weights = new uint256[](0);
        uint256 result = wrapper.calculateWeightedAverage(values, weights, PRECISION);
        assertEq(result, 0, "Empty arrays should return 0");
    }
    
    function testCalculateWeightedAverageSingleValue() public {
        uint256[] memory values = new uint256[](1);
        uint256[] memory weights = new uint256[](1);
        values[0] = 100;
        weights[0] = PRECISION; // 100% weight
        uint256 result = wrapper.calculateWeightedAverage(values, weights, PRECISION);
        assertEq(result, 100, "Single value should return that value");
    }
    
    function testCalculateWeightedAverageEqualWeights() public {
        uint256[] memory values = new uint256[](3);
        uint256[] memory weights = new uint256[](3);
        values[0] = 100;
        values[1] = 200;
        values[2] = 300;
        
        // Equal weights for all values
        weights[0] = PRECISION / 3;
        weights[1] = PRECISION / 3;
        weights[2] = PRECISION / 3;
        
        uint256 result = wrapper.calculateWeightedAverage(values, weights, PRECISION);
        // Expected: (100+200+300)/3 = 200
        assertEq(result, 200, "Equal weights should give arithmetic mean");
    }
    
    function testCalculateWeightedAverageUnevenWeights() public {
        uint256[] memory values = new uint256[](3);
        uint256[] memory weights = new uint256[](3);
        values[0] = 100;
        values[1] = 200;
        values[2] = 300;
        
        // Weights: 20%, 30%, 50%
        weights[0] = PRECISION * 20 / 100;
        weights[1] = PRECISION * 30 / 100;
        weights[2] = PRECISION * 50 / 100;
        
        uint256 result = wrapper.calculateWeightedAverage(values, weights, PRECISION);
        // Expected: (100*0.2 + 200*0.3 + 300*0.5) = 20 + 60 + 150 = 230
        assertEq(result, 230, "Weighted average with uneven weights calculated incorrectly");
    }
    
    function testCalculateWeightedAverageMismatchedArrays() public {
        uint256[] memory values = new uint256[](2);
        uint256[] memory weights = new uint256[](3); // Mismatched length
        
        vm.expectRevert("Array length mismatch");
        wrapper.calculateWeightedAverage(values, weights, PRECISION);
    }
    
    function testCalculateWeightedAverageZeroWeightSum() public {
        uint256[] memory values = new uint256[](3);
        uint256[] memory weights = new uint256[](3);
        
        values[0] = 100;
        values[1] = 200;
        values[2] = 300;
        
        // All zero weights
        weights[0] = 0;
        weights[1] = 0;
        weights[2] = 0;
        
        uint256 result = wrapper.calculateWeightedAverage(values, weights, PRECISION);
        assertEq(result, 0, "Zero weight sum should return 0");
    }
    
    // ======== normalizeWeights tests ========
    
    function testNormalizeWeightsEmpty() public {
        uint256[] memory weights = new uint256[](0);
        uint256[] memory result = wrapper.normalizeWeights(weights, PRECISION);
        assertEq(result.length, 0, "Normalized empty array should be empty");
    }
    
    function testNormalizeWeightsZeroSum() public {
        uint256[] memory weights = new uint256[](3);
        weights[0] = 0;
        weights[1] = 0;
        weights[2] = 0;
        
        uint256[] memory result = wrapper.normalizeWeights(weights, PRECISION);
        assertEq(result.length, 3, "Result array length should match input");
        assertEq(result[0], 0, "Zero sum should result in zeros");
        assertEq(result[1], 0, "Zero sum should result in zeros");
        assertEq(result[2], 0, "Zero sum should result in zeros");
    }
    
    function testNormalizeWeightsEqualWeights() public {
        uint256[] memory weights = new uint256[](3);
        weights[0] = 1;
        weights[1] = 1;
        weights[2] = 1;
        
        uint256[] memory result = wrapper.normalizeWeights(weights, PRECISION);
        
        // Each should be 1/3 of precision
        uint256 expectedWeight = PRECISION / 3;
        assertApproxEqRel(result[0], expectedWeight, 1e15, "Equal weights should normalize to equal parts");
        assertApproxEqRel(result[1], expectedWeight, 1e15, "Equal weights should normalize to equal parts");
        assertApproxEqRel(result[2], expectedWeight, 1e15, "Equal weights should normalize to equal parts");
    }
    
    function testNormalizeWeightsUnevenWeights() public {
        uint256[] memory weights = new uint256[](3);
        weights[0] = 1;
        weights[1] = 2;
        weights[2] = 7;
        
        uint256[] memory result = wrapper.normalizeWeights(weights, PRECISION);
        
        // Expected: 10% (1/10), 20% (2/10), 70% (7/10)
        assertApproxEqRel(result[0], PRECISION / 10, 1e15, "First weight should be 10%");
        assertApproxEqRel(result[1], PRECISION * 2 / 10, 1e15, "Second weight should be 20%");
        assertApproxEqRel(result[2], PRECISION * 7 / 10, 1e15, "Third weight should be 70%");
        
        // Verify sum is equal to PRECISION
        uint256 sum = result[0] + result[1] + result[2];
        assertApproxEqRel(sum, PRECISION, 1e15, "Sum of normalized weights should equal precision");
    }
    
    function testNormalizeWeightsLargeValues() public {
        uint256[] memory weights = new uint256[](3);
        weights[0] = 1e20;
        weights[1] = 2e20;
        weights[2] = 7e20;
        
        uint256[] memory result = wrapper.normalizeWeights(weights, PRECISION);
        
        // Expected percentages should still be 10%, 20%, 70%
        assertApproxEqRel(result[0], PRECISION / 10, 1e15, "First weight should be 10%");
        assertApproxEqRel(result[1], PRECISION * 2 / 10, 1e15, "Second weight should be 20%");
        assertApproxEqRel(result[2], PRECISION * 7 / 10, 1e15, "Third weight should be 70%");
    }
} 