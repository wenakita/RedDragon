// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/mocks/MockLayerZeroEndpoint.sol";
import "../../contracts/mocks/LzReceiverMock.sol";

contract MockLayerZeroTest is Test {
    MockLayerZeroEndpoint public lzEndpoint;
    LzReceiverMock public receiver;
    
    uint16 public constant LOCAL_CHAIN_ID = 1;
    uint16 public constant REMOTE_CHAIN_ID = 2;
    
    function setUp() public {
        // Deploy the contracts
        lzEndpoint = new MockLayerZeroEndpoint(LOCAL_CHAIN_ID);
        receiver = new LzReceiverMock(address(lzEndpoint));
        
        // Set up the destination endpoint mapping
        lzEndpoint.setDestLzEndpoint(address(receiver), address(lzEndpoint));
    }
    
    function testInitialChainId() public {
        // Check if the chain ID was set correctly
        assertEq(lzEndpoint.chainId(), LOCAL_CHAIN_ID);
    }
    
    function testSendPayload() public {
        // Prepare parameters
        bytes memory destination = abi.encodePacked(address(receiver));
        bytes memory payload = abi.encode("Hello LayerZero");
        
        // Send payload
        lzEndpoint.send(
            REMOTE_CHAIN_ID,
            destination,
            payload,
            payable(address(this)),
            address(0),
            bytes("")
        );
        
        // Check if the payload was stored correctly
        assertEq(lzEndpoint.lastSentPayload(), payload);
        assertEq(lzEndpoint.lastDestinationChainId(), REMOTE_CHAIN_ID);
    }
    
    function testReceivePayload() public {
        // Prepare parameters
        bytes memory srcAddress = abi.encodePacked(address(this));
        bytes memory payload = abi.encode("Hello from remote chain");
        uint64 nonce = 0;
        
        // Mock receiving a payload
        lzEndpoint.receivePayload(
            REMOTE_CHAIN_ID,
            srcAddress,
            address(receiver),
            nonce,
            payload,
            bytes("")
        );
        
        // Check if the receiver received the payload correctly
        assertEq(receiver.lastSrcChainId(), REMOTE_CHAIN_ID);
        assertEq(receiver.lastSrcAddress(), srcAddress);
        assertEq(receiver.lastPayload(), payload);
    }
    
    function testEstimateFees() public {
        // Prepare parameters
        bytes memory payload = abi.encode("Hello LayerZero");
        
        // Estimate fees
        (uint256 nativeFee, uint256 zroFee) = lzEndpoint.estimateFees(
            REMOTE_CHAIN_ID,
            address(receiver),
            payload,
            false,
            bytes("")
        );
        
        // Check fee values (the mock returns 0.01 ether for native fee and 0 for zro fee)
        assertEq(nativeFee, 0.01 ether);
        assertEq(zroFee, 0);
    }
    
    // We need to be able to receive ETH for the tests
    receive() external payable {}
} 