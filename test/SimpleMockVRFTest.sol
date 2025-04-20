// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/mocks/MockDragonPaintSwapVRF.sol";

contract SimpleMockVRFTest is Test {
    MockDragonPaintSwapVRF public mockVRF;

    address public constant COORDINATOR = address(0x3Ba925fdeAe6B46d0BB4d424D829982Cb2F7309e);
    address public constant USER = address(0x2);

    function setUp() public {
        mockVRF = new MockDragonPaintSwapVRF(COORDINATOR, true);
    }

    function testConstructor() public {
        assertEq(mockVRF.vrfCoordinator(), COORDINATOR);
        assertEq(mockVRF.keyHash(), keccak256(abi.encodePacked("MockDragonPaintSwapVRF")));
        assertEq(mockVRF.subscriptionId(), 123456);
        assertTrue(mockVRF.isVrfEnabled());
    }

    function testRequestRandomness() public {
        vm.prank(USER);
        bytes32 requestId = mockVRF.requestRandomness();
        assertEq(mockVRF.requestCount(), 1);
        assertEq(mockVRF.lastConsumer(), USER);
    }

    function testRandomnessToRange() public {
        bytes32 requestId = keccak256(abi.encodePacked("test"));
        uint256 range = 100;
        uint256 result = mockVRF.randomnessToRange(requestId, range);
        assertEq(result, uint256(requestId) % range);
    }

    function testCheckThreshold() public {
        bytes32 requestId = keccak256(abi.encodePacked("test"));
        uint256 denominator = 10;
        uint256 threshold = 5;
        bool result = mockVRF.checkThreshold(requestId, denominator, threshold);
        assertEq(result, uint256(requestId) % denominator < threshold);
    }
} 