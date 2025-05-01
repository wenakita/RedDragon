// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../lib/forge-std/src/Test.sol";
import "../../contracts/DragonSwapTriggerV2.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

// Mock WETH
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

// Mock Dragon Token
contract MockDragon is ERC20 {
    constructor() ERC20("Dragon", "DRAGON") {
        _mint(msg.sender, 1000000 ether);
    }
}

// Mock Chainlink Price Feed
contract MockChainlinkFeed is AggregatorV3Interface {
    int256 private price;
    uint8 private priceDecimals;
    
    constructor(int256 _price, uint8 _decimals) {
        price = _price;
        priceDecimals = _decimals;
    }
    
    function decimals() external view override returns (uint8) {
        return priceDecimals;
    }
    
    function description() external pure override returns (string memory) {
        return "Mock Price Feed";
    }
    
    function version() external pure override returns (uint256) {
        return 1;
    }
    
    function getRoundData(uint80 _roundId) external view override returns (
        uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound
    ) {
        return (_roundId, price, block.timestamp, block.timestamp, _roundId);
    }
    
    function latestRoundData() external view override returns (
        uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound
    ) {
        return (1, price, block.timestamp, block.timestamp, 1);
    }
    
    function setPrice(int256 _price) external {
        price = _price;
    }
}

// Mock Pyth Oracle
contract MockPythOracle is IPyth {
    mapping(bytes32 => PythStructs.Price) private prices;
    uint256 public fee = 0.01 ether;
    
    function getPrice(bytes32 id) external view override returns (PythStructs.Price memory) {
        PythStructs.Price memory price = prices[id];
        require(price.price != 0, "Price not found");
        return price;
    }
    
    function getPriceUnsafe(bytes32 id) external view override returns (PythStructs.Price memory) {
        return prices[id];
    }
    
    function getUpdateFee(bytes[] memory) external view override returns (uint256) {
        return fee;
    }
    
    function getValidTimePeriod() external pure override returns (uint256) {
        return 60;
    }
    
    function updatePriceFeeds(bytes[] memory, bytes32[] memory, uint64[] memory) external payable override {
        require(msg.value >= fee, "Insufficient payment");
    }
    
    function updatePriceFeedsIfNecessary(bytes[] memory, bytes32[] memory, uint64[] memory) external payable override {
        require(msg.value >= fee, "Insufficient payment");
    }
    
    function parsePriceFeedUpdates(bytes[] memory, mapping(bytes32 => bytes32[])[20] memory) external view override returns (PythStructs.PriceFeed[] memory) {
        revert("Not implemented");
    }
    
    function parsePriceFeedUpdatesUnique(bytes[] memory, mapping(bytes32 => bytes32[])[20] memory) external view override returns (PythStructs.PriceFeed[] memory) {
        revert("Not implemented");
    }
    
    function setPrice(bytes32 id, int64 _price, int32 _expo, uint publishTime) external {
        prices[id] = PythStructs.Price({
            price: _price,
            conf: 0,
            expo: _expo,
            publishTime: publishTime
        });
    }
}

// Mock VRF Consumer
contract MockVRFConsumer is IVRFConsumer {
    address public dragonSwapTrigger;
    mapping(uint64 => address) public requestToUser;
    uint64 public nextRequestId = 1;
    
    constructor() {}
    
    function setDragonSwapTrigger(address _dragonSwapTrigger) external {
        dragonSwapTrigger = _dragonSwapTrigger;
    }
    
    function requestRandomness(address user) external override returns (uint64) {
        require(msg.sender == dragonSwapTrigger, "Not authorized");
        uint64 requestId = nextRequestId++;
        requestToUser[requestId] = user;
        return requestId;
    }
    
    function processRandomness(uint64 requestId, address user, uint256 randomness) external override {
        // This is a mock so we don't implement this
        revert("Mock does not implement processRandomness");
    }
    
    // Test helper to manually fulfill randomness
    function fulfillRandomness(uint64 requestId, address user, uint256 randomness) external {
        IVRFConsumer(dragonSwapTrigger).processRandomness(requestId, user, randomness);
    }
}

// The actual test contract
contract DragonSwapTriggerVRFTest is Test {
    DragonSwapTriggerV2 public swapTrigger;
    MockWrappedSonic public wSonic;
    MockDragon public dragon;
    MockChainlinkFeed public chainlinkFeed;
    MockPythOracle public pythOracle;
    MockVRFConsumer public vrfConsumer;
    
    bytes32 public pythPriceId = bytes32(uint256(1));
    address public admin = address(1);
    address public user = address(2);
    
    // Convert 1 wS to 1000 USD (1 wS = $1000)
    int256 public constant SONIC_PRICE = 1000 * 10**8; // Chainlink format with 8 decimals
    int64 public constant PYTH_SONIC_PRICE = 1000 * 10**6; // Pyth format with 6 decimals
    int32 public constant PYTH_EXPO = -6; // Pyth exponent
    
    function setUp() public {
        vm.startPrank(admin);
        
        // Deploy tokens
        wSonic = new MockWrappedSonic();
        dragon = new MockDragon();
        
        // Deploy price oracles
        chainlinkFeed = new MockChainlinkFeed(SONIC_PRICE, 8);
        pythOracle = new MockPythOracle();
        pythOracle.setPrice(pythPriceId, PYTH_SONIC_PRICE, PYTH_EXPO, block.timestamp);
        
        // Deploy VRF consumer
        vrfConsumer = new MockVRFConsumer();
        
        // Deploy DragonSwapTrigger with ERC20 payout method
        swapTrigger = new DragonSwapTriggerV2(
            address(wSonic),
            address(dragon),
            address(vrfConsumer),
            0.01 ether, // minSwapAmount: 0.01 wS
            address(chainlinkFeed),
            address(pythOracle),
            pythPriceId,
            admin,
            DragonSwapTriggerV2.PayoutMethod.ERC20, // Use ERC20 method for simplicity
            "Sonic"
        );
        
        // Set up VRF consumer
        vrfConsumer.setDragonSwapTrigger(address(swapTrigger));
        
        // Fund user account
        wSonic.transfer(user, 100 ether); // 100 wS
        
        vm.stopPrank();
    }
    
    function test_InitialState() public {
        assertEq(address(swapTrigger.wrappedToken()), address(wSonic));
        assertEq(address(swapTrigger.dragonToken()), address(dragon));
        assertEq(swapTrigger.vrfConsumer(), address(vrfConsumer));
        assertEq(swapTrigger.minSwapAmount(), 0.01 ether);
        assertEq(swapTrigger.payoutMethod(), uint(DragonSwapTriggerV2.PayoutMethod.ERC20));
        assertEq(swapTrigger.chainName(), "Sonic");
        assertEq(swapTrigger.jackpotBalance(), 0);
    }
    
    function test_PriceFeedIntegration() public {
        // Verify both price feeds work
        uint256 price = swapTrigger.getFinalPrice();
        assertEq(price, 1000 * 10**18); // Price should be 1000 USD with 18 decimals
        
        // Verify USD conversion
        uint256 oneToken = 1 ether; // 1 wS
        uint256 usdValue = swapTrigger.convertToUSD(oneToken);
        assertEq(usdValue, 1000 * 10**18); // Should be 1000 USD
    }
    
    function test_WinThresholdCalculation() public {
        // For a $1 swap, should get BASE_WIN_PROB_BPS = 4 basis points
        uint256 oneUsdSwap = 0.001 ether; // 0.001 wS = $1
        uint256 threshold = swapTrigger.calculateWinThreshold(oneUsdSwap);
        assertEq(threshold, 10000 * 10000 / 4); // BPS_PRECISION * BPS_PRECISION / BASE_WIN_PROB_BPS
        
        // For a $10,000 swap, should get MAX_WIN_PROB_BPS = 400 basis points
        uint256 tenThousandUsdSwap = 10 ether; // 10 wS = $10,000
        threshold = swapTrigger.calculateWinThreshold(tenThousandUsdSwap);
        assertEq(threshold, 10000 * 10000 / 400); // BPS_PRECISION * BPS_PRECISION / MAX_WIN_PROB_BPS
    }
    
    function test_SwapAndProcessRandomness() public {
        // Add funds to jackpot first
        vm.startPrank(admin);
        wSonic.approve(address(swapTrigger), 100 ether);
        swapTrigger.addToJackpot(100 ether);
        vm.stopPrank();
        
        // Verify jackpot balance
        assertEq(swapTrigger.jackpotBalance(), 100 ether);
        
        // User performs a swap
        vm.startPrank(user);
        uint256 swapAmount = 1 ether; // 1 wS = $1000
        wSonic.approve(address(swapTrigger), swapAmount);
        
        // Call swap trigger function
        vm.mockCall(
            address(tx.origin),
            abi.encode(),
            abi.encode(user)
        );
        swapTrigger.onSwapNativeTokenToDragon(user, swapAmount);
        vm.stopPrank();
        
        // Admin fulfill randomness that will result in a win (randomness % threshold == 0)
        uint64 requestId = 1; // First request ID
        uint256 threshold = swapTrigger.calculateWinThreshold(swapAmount);
        uint256 winningRandomness = threshold; // Ensures randomness % threshold == 0
        
        vm.prank(address(vrfConsumer));
        swapTrigger.processRandomness(requestId, user, winningRandomness);
        
        // Verify user won jackpot
        assertEq(swapTrigger.lastWinner(), user);
        assertEq(swapTrigger.totalWinners(), 1);
        assertEq(swapTrigger.lastWinAmount(), 100 ether * 69 / 100); // 69% of jackpot
        assertEq(swapTrigger.jackpotBalance(), 100 ether * 31 / 100); // 31% remains
        assertEq(wSonic.balanceOf(user), 100 ether - swapAmount + (100 ether * 69 / 100)); // Initial - swap + winnings
    }
    
    function test_SwapAndProcessRandomnessNoWin() public {
        // Add funds to jackpot first
        vm.startPrank(admin);
        wSonic.approve(address(swapTrigger), 100 ether);
        swapTrigger.addToJackpot(100 ether);
        vm.stopPrank();
        
        // User performs a swap
        vm.startPrank(user);
        uint256 swapAmount = 1 ether; // 1 wS = $1000
        wSonic.approve(address(swapTrigger), swapAmount);
        
        // Call swap trigger function
        vm.mockCall(
            address(tx.origin),
            abi.encode(),
            abi.encode(user)
        );
        swapTrigger.onSwapNativeTokenToDragon(user, swapAmount);
        vm.stopPrank();
        
        // Admin fulfill randomness that will result in NO win
        uint64 requestId = 1; // First request ID
        uint256 threshold = swapTrigger.calculateWinThreshold(swapAmount);
        uint256 losingRandomness = threshold + 1; // Ensures randomness % threshold != 0
        
        vm.prank(address(vrfConsumer));
        swapTrigger.processRandomness(requestId, user, losingRandomness);
        
        // Verify user did not win
        assertEq(swapTrigger.lastWinner(), address(0)); // No winner yet
        assertEq(swapTrigger.totalWinners(), 0);
        assertEq(swapTrigger.jackpotBalance(), 100 ether); // Jackpot unchanged
        assertEq(wSonic.balanceOf(user), 100 ether - swapAmount); // Initial - swap
    }
    
    function test_NativeTokenSwap() public {
        // Change payout method to UNWRAP_TO_NATIVE
        vm.prank(admin);
        swapTrigger.setPayoutMethod(DragonSwapTriggerV2.PayoutMethod.UNWRAP_TO_NATIVE);
        
        // Add funds to jackpot
        vm.startPrank(admin);
        wSonic.approve(address(swapTrigger), 100 ether);
        swapTrigger.addToJackpot(100 ether);
        vm.stopPrank();
        
        // User swaps native tokens
        vm.deal(user, 1 ether);
        vm.prank(user);
        
        // Mock tx.origin to be user
        vm.mockCall(
            address(tx.origin),
            abi.encode(),
            abi.encode(user)
        );
        
        swapTrigger.swapNativeForDragon{value: 1 ether}();
        
        // Admin fulfill randomness that will result in a win
        uint64 requestId = 1; // First request ID
        uint256 threshold = swapTrigger.calculateWinThreshold(1 ether);
        uint256 winningRandomness = threshold; // Ensures randomness % threshold == 0
        
        vm.prank(address(vrfConsumer));
        swapTrigger.processRandomness(requestId, user, winningRandomness);
        
        // Verify user won and received native tokens
        assertEq(swapTrigger.lastWinner(), user);
        assertEq(swapTrigger.totalWinners(), 1);
        
        // Since native tokens are sent back, balance should be 0 + win amount
        assertEq(user.balance, 100 ether * 69 / 100);
    }
} 