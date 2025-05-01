// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/SonicVRFConsumerRead.sol";
import "../../contracts/mocks/MockLzEndpoint.sol";
import "@layerzerolabs/oapp-evm/contracts/oapp/libs/ReadCodecV1.sol";

contract VRFReadTest is Test {
    // Contracts
    MockLzEndpoint public sonicLzEndpoint;
    SonicVRFConsumerRead public sonicVRFConsumerRead;
    
    // Test accounts
    address public owner = address(1);
    address public user1 = address(2);
    address public delegate = address(3);
    address public lotteryContract = address(4);
    address public arbitrumVRFRequester = address(5);
    
    // Chain IDs
    uint32 public constant ARBITRUM_CHAIN_ID = 110;
    uint32 public constant LZ_READ_RESPONSE_ID = 4294967295; // Special ID for read responses
    
    // Mock VRF values for test
    uint64 public constant MOCK_SUBSCRIPTION_ID = 12345;
    bytes32 public constant MOCK_KEY_HASH = bytes32(uint256(123456));
    uint16 public constant MOCK_CONFIRMATIONS = 3;
    uint32 public constant MOCK_CALLBACK_GAS_LIMIT = 500000;
    uint32 public constant MOCK_NUM_WORDS = 1;
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy mock LZ endpoint
        sonicLzEndpoint = new MockLzEndpoint();
        
        // Deploy SonicVRFConsumerRead
        sonicVRFConsumerRead = new SonicVRFConsumerRead(
            address(sonicLzEndpoint),
            ARBITRUM_CHAIN_ID,
            arbitrumVRFRequester,
            lotteryContract,
            delegate
        );
        
        vm.stopPrank();
        
        // Fund endpoint and consumer with ETH for fees
        vm.deal(address(sonicVRFConsumerRead), 10 ether);
    }
    
    function testQueryVRFState() public {
        // We can only test that the query function works (sends a message)
        // The actual response would need to be mocked later
        
        vm.prank(owner);
        bytes memory extraOptions = "";
        
        // Call the query function and track events
        vm.recordLogs();
        sonicVRFConsumerRead.queryArbitrumVRFState{value: 0.1 ether}(extraOptions);
        
        // Check that a message was "sent" via LZ
        Vm.Log[] memory entries = vm.getRecordedLogs();
        assertGt(entries.length, 0); // At least one event should be emitted
    }
    
    function testHandleReadResponse() public {
        // Prepare the response payloads according to ReadCodecV1 format
        bytes[] memory dataArray = new bytes[](5);
        uint256[] memory appLabels = new uint256[](5);
        
        // Fill app labels
        appLabels[0] = 1; // subscriptionId
        appLabels[1] = 2; // keyHash
        appLabels[2] = 3; // confirmations
        appLabels[3] = 4; // callbackGasLimit
        appLabels[4] = 5; // numWords
        
        // Fill data
        dataArray[0] = abi.encode(MOCK_SUBSCRIPTION_ID);
        dataArray[1] = abi.encode(MOCK_KEY_HASH);
        dataArray[2] = abi.encode(MOCK_CONFIRMATIONS);
        dataArray[3] = abi.encode(MOCK_CALLBACK_GAS_LIMIT);
        dataArray[4] = abi.encode(MOCK_NUM_WORDS);
        
        // Encode the response according to ReadCodecV1 format
        bytes memory message = formatDecodedResponse(appLabels, dataArray);
        
        // Create the LayerZero packet
        bytes memory packetBytes = abi.encodePacked(address(sonicVRFConsumerRead));
        bytes32 guid = bytes32(uint256(123)); // Mock GUID

        // Simulate receiving read response
        vm.prank(address(sonicLzEndpoint));
        sonicLzEndpoint.mockLzReceive(
            LZ_READ_RESPONSE_ID,
            packetBytes, // Source address
            0, // Nonce
            message
        );
        
        // Verify state was updated
        assertEq(sonicVRFConsumerRead.lastQueriedSubscriptionId(), MOCK_SUBSCRIPTION_ID);
        assertEq(sonicVRFConsumerRead.lastQueriedKeyHash(), MOCK_KEY_HASH);
        assertEq(sonicVRFConsumerRead.lastQueriedConfirmations(), MOCK_CONFIRMATIONS);
        assertEq(sonicVRFConsumerRead.lastQueriedCallbackGasLimit(), MOCK_CALLBACK_GAS_LIMIT);
        assertEq(sonicVRFConsumerRead.lastQueriedNumWords(), MOCK_NUM_WORDS);
        assertGt(sonicVRFConsumerRead.lastQueriedTimestamp(), 0);
    }
    
    function testReadChannelSettings() public {
        // Test that the READ_CHANNEL constant is set correctly
        assertEq(sonicVRFConsumerRead.READ_CHANNEL(), 5);
        
        // Test that the READ_MSG_TYPE constant is set correctly
        assertEq(sonicVRFConsumerRead.READ_MSG_TYPE(), 1);
    }
    
    function testCombineOptions() public {
        // Use a public method to expose the private combineOptions function
        bytes memory result = sonicVRFConsumerRead.exposed_combineOptions(
            sonicVRFConsumerRead.READ_CHANNEL(),
            sonicVRFConsumerRead.READ_MSG_TYPE(),
            ""
        );
        
        // Expected result should be READ_CHANNEL (5) + READ_MSG_TYPE (1) + extraOptions ("")
        bytes memory expected = abi.encodePacked(uint32(5), uint16(1), "");
        
        // Check that the combined options match what we expect
        assertEq(keccak256(result), keccak256(expected));
    }
    
    // Helper function to format response in ReadCodecV1 format
    function formatDecodedResponse(uint256[] memory appLabels, bytes[] memory data) public pure returns (bytes memory) {
        // This is a simplified version of how ReadCodecV1 formats response data
        // For testing purposes only
        
        // Start with the version byte and the number of responses
        bytes memory result = abi.encodePacked(uint8(1), uint8(appLabels.length));
        
        // For each response, append the app label and data
        for (uint256 i = 0; i < appLabels.length; i++) {
            result = abi.encodePacked(result, uint16(appLabels[i]), uint16(data[i].length), data[i]);
        }
        
        return result;
    }
}

// Extend the contract to expose private methods for testing
contract ExposedSonicVRFConsumerRead is SonicVRFConsumerRead {
    constructor(
        address _endpoint,
        uint32 _arbitrumChainId,
        address _arbitrumVRFRequester,
        address _lotteryContract,
        address _delegate
    ) SonicVRFConsumerRead(
        _endpoint,
        _arbitrumChainId,
        _arbitrumVRFRequester,
        _lotteryContract,
        _delegate
    ) {}
    
    function exposed_combineOptions(uint32 _channelId, uint16 _msgType, bytes calldata _extraOptions) external pure returns (bytes memory) {
        return combineOptions(_channelId, _msgType, _extraOptions);
    }
} 