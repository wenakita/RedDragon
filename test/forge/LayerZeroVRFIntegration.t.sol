// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../lib/forge-std/src/Test.sol";
import "../../contracts/DragonSwapTriggerV2.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../contracts/interfaces/ISonicVRFConsumer.sol";
import "../../contracts/interfaces/IArbitrumVRFRequester.sol";

// Mock wrapped token
contract MockWrappedSonic is ERC20 {
    constructor() ERC20("Wrapped Sonic", "wS") {
        _mint(msg.sender, 1000000 ether);
    }

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}

// Mock dragon token
contract MockDragon is ERC20 {
    constructor() ERC20("Dragon", "DRAGON") {
        _mint(msg.sender, 1000000 ether);
    }
}

// Mock LayerZero Endpoint
contract MockLayerZeroEndpoint {
    uint16 public constant SEND_VERSION = 1;
    uint16 public constant RECEIVE_VERSION = 1;
    
    // Simulated chain IDs
    uint32 public constant ARBITRUM_CHAIN_ID = 110; // LayerZero Arbitrum chain ID
    uint32 public constant SONIC_CHAIN_ID = 175; // Example Sonic chain ID
    
    // Map of registered applications
    mapping(address => address) public remoteAddresses;
    
    // Fee configuration
    uint256 public baseFee = 0.01 ether;
    
    // Events for tracking
    event MessageSent(address indexed from, uint32 dstEid, bytes message);
    event MessageReceived(address indexed to, uint32 srcEid, bytes message);
    
    // Register a remote application
    function registerRemoteApp(address _local, address _remote) external {
        remoteAddresses[_local] = _remote;
    }
    
    // Set the base fee
    function setBaseFee(uint256 _fee) external {
        baseFee = _fee;
    }
    
    // Mock LayerZero send function
    function send(
        uint32 _dstEid,
        bytes calldata _destination,
        bytes calldata _message,
        bytes calldata /* _options */,
        address payable _refundAddress
    ) external payable returns (bytes32 messageId) {
        require(msg.value >= baseFee, "Insufficient fee");
        
        // Refund excess fees
        uint256 refund = msg.value - baseFee;
        if (refund > 0) {
            (bool success, ) = _refundAddress.call{value: refund}("");
            require(success, "Refund failed");
        }
        
        // Emit event for tracking
        emit MessageSent(msg.sender, _dstEid, _message);
        
        // Calculate a message ID (simple mock)
        return keccak256(abi.encodePacked(msg.sender, _dstEid, _message, block.timestamp));
    }
    
    // Simulate delivering a message to the destination (testing only)
    function deliverMessage(
        address _destination,
        uint32 _srcEid,
        bytes calldata _message
    ) external {
        // In a real implementation, this would come from LayerZero infrastructure
        emit MessageReceived(_destination, _srcEid, _message);
        
        // Format origin info for LayerZero
        bytes memory sender = abi.encodePacked(remoteAddresses[_destination]);
        
        // Create mock package for LayerZero receive (simplified)
        bytes memory origin = abi.encode(_srcEid, sender);
        
        // Create mock payload from simulated message
        (bool success, ) = _destination.call(
            abi.encodeWithSignature(
                "lzReceive(bytes,bytes32,bytes,address,bytes)",
                origin,
                bytes32(0), // guid (not needed for mocks)
                _message,
                address(0), // executor (not needed for mocks)
                bytes("") // extraData (not needed for mocks)
            )
        );
        require(success, "Message delivery failed");
    }
}

// Mock Sonic VRF Consumer
contract MockSonicVRFConsumer is ISonicVRFConsumer {
    uint64 public nonce;
    address public lotteryContract;
    address public arbitrumVRFRequester;
    uint32 public arbitrumChainId;
    MockLayerZeroEndpoint public lzEndpoint;
    
    mapping(uint64 => address) public requestToUser;
    
    event RandomnessRequested(uint64 indexed requestId, address indexed user);
    event RandomnessReceived(uint64 indexed requestId, address indexed user, uint256 randomness);
    
    constructor(address _lzEndpoint, address _lottery) {
        lzEndpoint = MockLayerZeroEndpoint(_lzEndpoint);
        lotteryContract = _lottery;
        arbitrumChainId = lzEndpoint.ARBITRUM_CHAIN_ID();
    }
    
    function setArbitrumVRFRequester(address _requester) external {
        arbitrumVRFRequester = _requester;
    }
    
    function requestRandomness(address _user) external override returns (uint64) {
        require(msg.sender == lotteryContract, "Only lottery contract");
        
        uint64 requestId = nonce++;
        requestToUser[requestId] = _user;
        
        // Encode the payload with request ID and user
        bytes memory payload = abi.encode(requestId, _user);
        
        // Simple options for mock
        bytes memory options = bytes("");
        
        // Send message via LayerZero mock
        lzEndpoint.send{value: 0.01 ether}(
            arbitrumChainId, 
            abi.encodePacked(arbitrumVRFRequester),
            payload,
            options,
            payable(address(this))
        );
        
        emit RandomnessRequested(requestId, _user);
        
        return requestId;
    }
    
    function lzReceive(
        bytes calldata _origin,
        bytes32 /* _guid */,
        bytes calldata _message,
        address /* _executor */,
        bytes calldata /* _extraData */
    ) external {
        require(msg.sender == address(lzEndpoint), "Not from LayerZero endpoint");
        
        // Decode _origin to get source chain ID and sender
        (uint32 srcEid, bytes memory sender) = abi.decode(_origin, (uint32, bytes));
        require(srcEid == arbitrumChainId, "Not from Arbitrum chain");
        
        // Verify the source address matches arbitrumVRFRequester
        address srcAddress = abi.decode(sender, (address));
        require(srcAddress == arbitrumVRFRequester, "Not from authorized source");
        
        // Decode the message to get the request ID, user, and randomness
        (uint64 requestId, address user, uint256 randomness) = abi.decode(_message, (uint64, address, uint256));
        
        // Verify the request ID and user
        address storedUser = requestToUser[requestId];
        require(storedUser != address(0), "Unknown request ID");
        require(storedUser == user, "User mismatch");
        
        emit RandomnessReceived(requestId, user, randomness);
        
        // Call processRandomness on the lottery contract
        (bool success, ) = lotteryContract.call(
            abi.encodeWithSignature(
                "processRandomness(uint64,address,uint256)",
                requestId,
                user,
                randomness
            )
        );
        
        // Clean up the request mapping
        delete requestToUser[requestId];
        
        require(success, "Lottery processing failed");
    }
}

// Mock Arbitrum VRF Requester
contract MockArbitrumVRFRequester is IArbitrumVRFRequester {
    address public sonicVRFConsumer;
    uint32 public sonicChainId;
    MockLayerZeroEndpoint public lzEndpoint;
    
    // Chainlink VRF configuration
    uint64 public subscriptionId = 123;
    bytes32 public keyHash = bytes32(uint256(1));
    uint16 public requestConfirmations = 3;
    uint32 public callbackGasLimit = 500000;
    
    // Request tracking
    mapping(uint64 => address) public requestToUser;
    
    // Simulation of randomness for testing
    mapping(uint64 => uint256) public requestToRandomness;
    
    event RandomnessRequested(uint64 indexed requestId, address indexed user);
    event RandomnessReceived(uint64 indexed requestId, address indexed user, uint256 randomness);
    event RandomnessSent(uint64 indexed requestId, address indexed user, uint256 randomness);
    
    constructor(address _lzEndpoint) {
        lzEndpoint = MockLayerZeroEndpoint(_lzEndpoint);
        sonicChainId = lzEndpoint.SONIC_CHAIN_ID();
    }
    
    function setSonicVRFConsumer(address _consumer) external {
        sonicVRFConsumer = _consumer;
    }
    
    function lzReceive(
        bytes calldata _origin,
        bytes32 /* _guid */,
        bytes calldata _message,
        address /* _executor */,
        bytes calldata /* _extraData */
    ) external {
        require(msg.sender == address(lzEndpoint), "Not from LayerZero endpoint");
        
        // Decode _origin to get source chain ID and sender
        (uint32 srcEid, bytes memory sender) = abi.decode(_origin, (uint32, bytes));
        require(srcEid == sonicChainId, "Not from Sonic chain");
        
        // Verify the source address matches sonicVRFConsumer
        address srcAddress = abi.decode(sender, (address));
        require(srcAddress == sonicVRFConsumer, "Not from authorized source");
        
        // Decode the message to get the request ID and user
        (uint64 requestId, address user) = abi.decode(_message, (uint64, address));
        
        // Store the request
        requestToUser[requestId] = user;
        
        emit RandomnessRequested(requestId, user);
        
        // In a real implementation, we would request randomness from Chainlink VRF here
        // For testing, we'll set a predefined randomness that can be controlled by tests
    }
    
    // Test helper to simulate Chainlink VRF callback
    function fulfillRandomWords(uint64 requestId, uint256 randomness) external {
        address user = requestToUser[requestId];
        require(user != address(0), "Unknown request ID");
        
        // Store the randomness
        requestToRandomness[requestId] = randomness;
        
        emit RandomnessReceived(requestId, user, randomness);
        
        // Send the randomness back to Sonic via LayerZero
        // Encode the payload with request ID, user, and randomness
        bytes memory payload = abi.encode(requestId, user, randomness);
        
        // Simple options for mock
        bytes memory options = bytes("");
        
        // Send message via LayerZero mock
        lzEndpoint.send{value: 0.01 ether}(
            sonicChainId, 
            abi.encodePacked(sonicVRFConsumer),
            payload,
            options,
            payable(address(this))
        );
        
        emit RandomnessSent(requestId, user, randomness);
        
        // Clean up the request
        delete requestToUser[requestId];
    }
}

// The test contract
contract LayerZeroVRFIntegrationTest is Test {
    // Contracts
    DragonSwapTriggerV2 public swapTrigger;
    MockWrappedSonic public wSonic;
    MockDragon public dragon;
    MockLayerZeroEndpoint public lzEndpoint;
    MockSonicVRFConsumer public sonicVRFConsumer;
    MockArbitrumVRFRequester public arbitrumVRFRequester;
    
    // Test accounts
    address public admin = address(1);
    address public user = address(2);
    
    function setUp() public {
        vm.startPrank(admin);
        
        // Deploy tokens
        wSonic = new MockWrappedSonic();
        dragon = new MockDragon();
        
        // Deploy LayerZero mock endpoint
        lzEndpoint = new MockLayerZeroEndpoint();
        
        // Give the admin some ETH for LayerZero messages
        vm.deal(admin, 10 ether);
        
        // Deploy DragonSwapTrigger (without price oracles for simplicity)
        swapTrigger = new DragonSwapTriggerV2(
            address(wSonic),
            address(dragon),
            address(0), // Will be set later
            0.01 ether, // minSwapAmount: 0.01 wS
            address(0), // No Chainlink
            address(0), // No Pyth
            bytes32(0), // No Pyth price ID
            admin,
            DragonSwapTriggerV2.PayoutMethod.ERC20,
            "Sonic"
        );
        
        // Deploy VRF components
        sonicVRFConsumer = new MockSonicVRFConsumer(address(lzEndpoint), address(swapTrigger));
        arbitrumVRFRequester = new MockArbitrumVRFRequester(address(lzEndpoint));
        
        // Set up cross-chain connections
        sonicVRFConsumer.setArbitrumVRFRequester(address(arbitrumVRFRequester));
        arbitrumVRFRequester.setSonicVRFConsumer(address(sonicVRFConsumer));
        
        // Register the applications with LayerZero
        lzEndpoint.registerRemoteApp(address(sonicVRFConsumer), address(arbitrumVRFRequester));
        lzEndpoint.registerRemoteApp(address(arbitrumVRFRequester), address(sonicVRFConsumer));
        
        // Set VRF consumer in DragonSwapTrigger
        swapTrigger.setVRFConsumer(address(sonicVRFConsumer));
        
        // Fund user account
        wSonic.transfer(user, 100 ether); // 100 wS
        
        // Set up jackpot
        wSonic.approve(address(swapTrigger), 100 ether);
        swapTrigger.addToJackpot(100 ether);
        
        vm.stopPrank();
    }
    
    function test_CrossChainVRFIntegration() public {
        // User performs a swap
        vm.startPrank(user);
        uint256 swapAmount = 1 ether;
        wSonic.approve(address(swapTrigger), swapAmount);
        
        // Mock tx.origin to be user
        vm.mockCall(
            address(tx.origin),
            abi.encode(),
            abi.encode(user)
        );
        
        swapTrigger.onSwapNativeTokenToDragon(user, swapAmount);
        vm.stopPrank();
        
        // Verify SonicVRFConsumer state
        assertEq(sonicVRFConsumer.nonce(), 1); // First request
        assertEq(sonicVRFConsumer.requestToUser(0), user); // User associated with request ID 0
        
        // Simulate Arbitrum VRF fulfillment with winning randomness
        uint256 threshold = swapTrigger.calculateWinThreshold(swapAmount);
        uint256 winningRandomness = threshold; // Ensures randomness % threshold == 0
        
        vm.deal(address(arbitrumVRFRequester), 1 ether); // Ensure it has ETH for LayerZero fee
        vm.prank(admin);
        arbitrumVRFRequester.fulfillRandomWords(0, winningRandomness);
        
        // Verify user won jackpot
        assertEq(swapTrigger.lastWinner(), user);
        assertEq(swapTrigger.totalWinners(), 1);
        assertEq(swapTrigger.lastWinAmount(), 100 ether * 69 / 100); // 69% of jackpot
        assertEq(swapTrigger.jackpotBalance(), 100 ether * 31 / 100); // 31% remains
    }
    
    function test_CrossChainVRFNoWin() public {
        // User performs a swap
        vm.startPrank(user);
        uint256 swapAmount = 1 ether;
        wSonic.approve(address(swapTrigger), swapAmount);
        
        // Mock tx.origin to be user
        vm.mockCall(
            address(tx.origin),
            abi.encode(),
            abi.encode(user)
        );
        
        swapTrigger.onSwapNativeTokenToDragon(user, swapAmount);
        vm.stopPrank();
        
        // Simulate Arbitrum VRF fulfillment with losing randomness
        uint256 threshold = swapTrigger.calculateWinThreshold(swapAmount);
        uint256 losingRandomness = threshold + 1; // Ensures randomness % threshold != 0
        
        vm.deal(address(arbitrumVRFRequester), 1 ether); // Ensure it has ETH for LayerZero fee
        vm.prank(admin);
        arbitrumVRFRequester.fulfillRandomWords(0, losingRandomness);
        
        // Verify user did not win
        assertEq(swapTrigger.lastWinner(), address(0)); // No winner yet
        assertEq(swapTrigger.totalWinners(), 0);
        assertEq(swapTrigger.jackpotBalance(), 100 ether); // Jackpot unchanged
    }
    
    function test_MultipleRequests() public {
        // Multiple users (simulated with same account) perform swaps
        for (uint i = 0; i < 3; i++) {
            vm.startPrank(user);
            uint256 swapAmount = 1 ether;
            wSonic.approve(address(swapTrigger), swapAmount);
            
            // Mock tx.origin to be user
            vm.mockCall(
                address(tx.origin),
                abi.encode(),
                abi.encode(user)
            );
            
            swapTrigger.onSwapNativeTokenToDragon(user, swapAmount);
            vm.stopPrank();
        }
        
        // Verify SonicVRFConsumer state
        assertEq(sonicVRFConsumer.nonce(), 3); // Three requests
        
        // Fulfill each request with different outcomes
        uint256 threshold = swapTrigger.calculateWinThreshold(1 ether);
        
        vm.deal(address(arbitrumVRFRequester), 3 ether); // Ensure it has ETH for LayerZero fees
        
        // First request: no win
        vm.prank(admin);
        arbitrumVRFRequester.fulfillRandomWords(0, threshold + 1);
        
        // Second request: win
        vm.prank(admin);
        arbitrumVRFRequester.fulfillRandomWords(1, threshold);
        
        // Third request: no win
        vm.prank(admin);
        arbitrumVRFRequester.fulfillRandomWords(2, threshold + 2);
        
        // Verify results
        assertEq(swapTrigger.lastWinner(), user);
        assertEq(swapTrigger.totalWinners(), 1);
        assertEq(swapTrigger.lastWinAmount(), 100 ether * 69 / 100); // 69% of jackpot
        assertEq(swapTrigger.jackpotBalance(), 100 ether * 31 / 100); // 31% remains
    }
} 