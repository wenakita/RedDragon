// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../lib/forge-std/src/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Simple interface for OApp Read implementation
interface IOAppRead {
    function queryArbitrumVRFState(bytes calldata _extraOptions) external payable returns (bytes memory);
    function getArbitrumVRFQuery() external view returns (bytes memory);
}

// Simple interface for testing mock
interface IArbitrumVRFState {
    function subscriptionId() external view returns (uint64);
    function keyHash() external view returns (bytes32);
    function requestConfirmations() external view returns (uint16);
    function callbackGasLimit() external view returns (uint32);
}

// Mock LayerZero Read implementation for testing
contract MockLayerZeroRead {
    // Simulated channel constants
    uint32 public constant READ_CHANNEL = 5;
    
    // Simulated chain IDs
    uint32 public constant ARBITRUM_CHAIN_ID = 110; // LayerZero Arbitrum chain ID
    
    // Mock VRF State contract on Arbitrum
    IArbitrumVRFState public vrfState;
    
    // Events for tracking calls
    event ReadRequested(address sender, bytes command);
    event ReadResponse(address receiver, bytes response);
    
    constructor(address _vrfState) {
        vrfState = IArbitrumVRFState(_vrfState);
    }
    
    // Simulated LayerZero Read send
    function send(
        uint32 _channel,
        bytes calldata _cmd,
        bytes calldata _options,
        uint256 _nativeFee,
        address payable _refundAddress
    ) external payable returns (bytes memory) {
        require(_channel == READ_CHANNEL, "Invalid channel");
        require(msg.value >= _nativeFee, "Insufficient fee");
        
        // Log the read request
        emit ReadRequested(msg.sender, _cmd);
        
        // For testing, we'll just return a hardcoded response
        return bytes("");
    }
    
    // Function to simulate response delivery for testing
    function deliverReadResponse(address _receiver) external {
        // Query the actual VRF state contract
        uint64 subId = vrfState.subscriptionId();
        bytes32 keyHash = vrfState.keyHash();
        uint16 confirmations = vrfState.requestConfirmations();
        uint32 gasLimit = vrfState.callbackGasLimit();
        
        // Encode the response in the expected format
        bytes memory response = abi.encode(
            subId,
            keyHash,
            confirmations,
            gasLimit
        );
        
        emit ReadResponse(_receiver, response);
        
        // Call the receiver's _lzReceive method
        (bool success, ) = _receiver.call(
            abi.encodeWithSignature(
                "_lzReceive(bytes,bytes32,bytes,address,bytes)",
                abi.encode(4294965695, bytes("")), // Special read response eid (>4294965694)
                bytes32(0), // guid (not needed for mocks)
                response,
                address(0), // executor (not needed for mocks)
                bytes("") // extraData (not needed for mocks)
            )
        );
        require(success, "Response delivery failed");
    }
}

// Mock Arbitrum VRF State contract
contract MockArbitrumVRFState is IArbitrumVRFState {
    uint64 private _subscriptionId = 12345;
    bytes32 private _keyHash = bytes32(uint256(1));
    uint16 private _requestConfirmations = 3;
    uint32 private _callbackGasLimit = 500000;
    
    function subscriptionId() external view override returns (uint64) {
        return _subscriptionId;
    }
    
    function keyHash() external view override returns (bytes32) {
        return _keyHash;
    }
    
    function requestConfirmations() external view override returns (uint16) {
        return _requestConfirmations;
    }
    
    function callbackGasLimit() external view override returns (uint32) {
        return _callbackGasLimit;
    }
    
    // Admin functions to update state for testing
    function setSubscriptionId(uint64 subId) external {
        _subscriptionId = subId;
    }
    
    function setKeyHash(bytes32 hash) external {
        _keyHash = hash;
    }
    
    function setRequestConfirmations(uint16 confirmations) external {
        _requestConfirmations = confirmations;
    }
    
    function setCallbackGasLimit(uint32 gasLimit) external {
        _callbackGasLimit = gasLimit;
    }
}

// Mock SonicVRFConsumerRead (simplified for testing)
contract MockSonicVRFConsumerRead is IOAppRead {
    MockLayerZeroRead public lzRead;
    address public delegate;
    uint32 public arbitrumChainId;
    address public arbitrumVRFRequester;
    
    // Storage for VRF state
    uint64 public lastQueriedSubscriptionId;
    bytes32 public lastQueriedKeyHash;
    uint16 public lastQueriedConfirmations;
    uint32 public lastQueriedCallbackGasLimit;
    
    // Events
    event VRFStateQueried(uint64 subscriptionId, bytes32 keyHash, uint16 confirmations, uint32 callbackGasLimit);
    
    constructor(address _lzRead, address _arbitrumVRFRequester) {
        lzRead = MockLayerZeroRead(_lzRead);
        arbitrumVRFRequester = _arbitrumVRFRequester;
        arbitrumChainId = lzRead.ARBITRUM_CHAIN_ID();
    }
    
    function setDelegate(address _delegate) external {
        delegate = _delegate;
    }
    
    function queryArbitrumVRFState(bytes calldata _extraOptions) external payable override returns (bytes memory) {
        bytes memory cmd = getArbitrumVRFQuery();
        return lzRead.send{value: msg.value}(
            lzRead.READ_CHANNEL(),
            cmd,
            _extraOptions,
            msg.value,
            payable(msg.sender)
        );
    }
    
    function getArbitrumVRFQuery() public view override returns (bytes memory) {
        // This is a simplified version just for testing
        // In a real implementation, this would encode the EVMCallRequestV1 structs
        return abi.encode(
            0, // requestId
            arbitrumChainId,
            arbitrumVRFRequester
        );
    }
    
    // Simulated _lzReceive function
    function _lzReceive(
        bytes calldata _origin,
        bytes32 /* _guid */,
        bytes calldata _message,
        address /* _executor */,
        bytes calldata /* _extraData */
    ) external {
        // Verify this is a read response
        (uint32 srcEid, ) = abi.decode(_origin, (uint32, bytes));
        require(srcEid > 4294965694, "Not a read response");
        
        // Handle the read response
        _handleReadResponse(_message);
    }
    
    // Process read response
    function _handleReadResponse(bytes calldata _message) internal {
        // Extract the data from the response
        (
            uint64 subscriptionId,
            bytes32 keyHash,
            uint16 confirmations,
            uint32 callbackGasLimit
        ) = abi.decode(_message, (uint64, bytes32, uint16, uint32));
        
        // Store the queried state
        lastQueriedSubscriptionId = subscriptionId;
        lastQueriedKeyHash = keyHash;
        lastQueriedConfirmations = confirmations;
        lastQueriedCallbackGasLimit = callbackGasLimit;
        
        emit VRFStateQueried(subscriptionId, keyHash, confirmations, callbackGasLimit);
    }
}

// The test contract
contract LayerZeroReadVRFTest is Test {
    MockLayerZeroRead public lzRead;
    MockArbitrumVRFState public vrfState;
    MockSonicVRFConsumerRead public vrfConsumerRead;
    
    address public admin = address(1);
    address public user = address(2);
    
    function setUp() public {
        vm.startPrank(admin);
        
        // Deploy VRF state mockup
        vrfState = new MockArbitrumVRFState();
        
        // Deploy LayerZero Read mockup
        lzRead = new MockLayerZeroRead(address(vrfState));
        
        // Deploy VRFConsumerRead mockup
        vrfConsumerRead = new MockSonicVRFConsumerRead(address(lzRead), address(vrfState));
        
        // Give some ETH for fees
        vm.deal(admin, 10 ether);
        vm.deal(address(vrfConsumerRead), 1 ether);
        
        vm.stopPrank();
    }
    
    function test_ReadQuery() public {
        // Query VRF state
        vm.prank(admin);
        vrfConsumerRead.queryArbitrumVRFState{value: 0.01 ether}(bytes(""));
        
        // Deliver the response
        vm.prank(admin);
        lzRead.deliverReadResponse(address(vrfConsumerRead));
        
        // Verify stored state
        assertEq(vrfConsumerRead.lastQueriedSubscriptionId(), vrfState.subscriptionId());
        assertEq(vrfConsumerRead.lastQueriedKeyHash(), vrfState.keyHash());
        assertEq(vrfConsumerRead.lastQueriedConfirmations(), vrfState.requestConfirmations());
        assertEq(vrfConsumerRead.lastQueriedCallbackGasLimit(), vrfState.callbackGasLimit());
    }
    
    function test_StateChangesReflected() public {
        // Change VRF state
        vm.startPrank(admin);
        vrfState.setSubscriptionId(999);
        vrfState.setKeyHash(bytes32(uint256(999)));
        vrfState.setRequestConfirmations(5);
        vrfState.setCallbackGasLimit(1000000);
        vm.stopPrank();
        
        // Query VRF state
        vm.prank(admin);
        vrfConsumerRead.queryArbitrumVRFState{value: 0.01 ether}(bytes(""));
        
        // Deliver the response
        vm.prank(admin);
        lzRead.deliverReadResponse(address(vrfConsumerRead));
        
        // Verify stored state has the new values
        assertEq(vrfConsumerRead.lastQueriedSubscriptionId(), 999);
        assertEq(vrfConsumerRead.lastQueriedKeyHash(), bytes32(uint256(999)));
        assertEq(vrfConsumerRead.lastQueriedConfirmations(), 5);
        assertEq(vrfConsumerRead.lastQueriedCallbackGasLimit(), 1000000);
    }
    
    function test_MultipleQueries() public {
        // First query
        vm.prank(admin);
        vrfConsumerRead.queryArbitrumVRFState{value: 0.01 ether}(bytes(""));
        
        vm.prank(admin);
        lzRead.deliverReadResponse(address(vrfConsumerRead));
        
        // Change state
        vm.prank(admin);
        vrfState.setSubscriptionId(888);
        
        // Second query
        vm.prank(admin);
        vrfConsumerRead.queryArbitrumVRFState{value: 0.01 ether}(bytes(""));
        
        vm.prank(admin);
        lzRead.deliverReadResponse(address(vrfConsumerRead));
        
        // Verify stored state has the updated value
        assertEq(vrfConsumerRead.lastQueriedSubscriptionId(), 888);
    }
} 