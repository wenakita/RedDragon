// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/Dragon.sol";
import "../../contracts/mocks/MockERC20.sol";

contract DragonFeesTest is Test {
    // Contracts
    Dragon public dragon;
    MockERC20 public wrappedSonic;
    
    // Accounts
    address public owner;
    address public user1;
    address public user2;
    address public jackpotAddress;
    address public ve69LPAddress;
    
    // Constants for fee calculation
    uint256 constant BUY_FEE = 1000; // 10% total
    uint256 constant JACKPOT_BUY_FEE = 690; // 6.9% to jackpot
    uint256 constant VETOKEN_BUY_FEE = 241; // 2.41% to veToken
    uint256 constant BURN_BUY_FEE = 69; // 0.69% burn

    uint256 constant SELL_FEE = 1000; // 10% total
    uint256 constant JACKPOT_SELL_FEE = 690; // 6.9% to jackpot
    uint256 constant VETOKEN_SELL_FEE = 241; // 2.41% to veToken
    uint256 constant BURN_SELL_FEE = 69; // 0.69% burn
    
    function setUp() public {
        // Setup accounts
        owner = address(this);
        user1 = vm.addr(1);
        user2 = vm.addr(2);
        jackpotAddress = vm.addr(3);
        ve69LPAddress = vm.addr(4);
        
        // Deploy wrapped Sonic token
        wrappedSonic = new MockERC20("Wrapped Sonic", "wS", 18);
        
        // Deploy Dragon token
        dragon = new Dragon(
            "Dragon",
            "DRAGON",
            jackpotAddress,
            ve69LPAddress,
            address(wrappedSonic)
        );
        
        // Fund users with wrapped Sonic
        wrappedSonic.mint(user1, 1000 ether);
        wrappedSonic.mint(user2, 1000 ether);
        
        // Set up approvals
        vm.startPrank(user1);
        wrappedSonic.approve(address(dragon), type(uint256).max);
        vm.stopPrank();
        
        vm.startPrank(user2);
        wrappedSonic.approve(address(dragon), type(uint256).max);
        vm.stopPrank();
    }
    
    function testBuyFeeCalculation() public {
        // Swap values
        uint256 wrappedSonicAmount = 100 ether;
        
        // Get fee breakdown
        (
            uint256 jackpotFee,
            uint256 veFee,
            uint256 burnFee,
            uint256 totalFee
        ) = dragon.getBuyFees();
        
        // Verify fee percentages
        assertEq(jackpotFee, JACKPOT_BUY_FEE, "Wrong jackpot buy fee");
        assertEq(veFee, VETOKEN_BUY_FEE, "Wrong veToken buy fee");
        assertEq(burnFee, BURN_BUY_FEE, "Wrong burn buy fee");
        assertEq(totalFee, BUY_FEE, "Wrong total buy fee");
        
        // Record balances before transaction
        uint256 jackpotBalanceBefore = dragon.balanceOf(jackpotAddress);
        uint256 veLPBalanceBefore = dragon.balanceOf(ve69LPAddress);
        uint256 totalSupplyBefore = dragon.totalSupply();
        
        // User buys DRAGON with wS
        vm.startPrank(user1);
        dragon.buy(wrappedSonicAmount);
        vm.stopPrank();
        
        // Calculate expected token amounts
        uint256 expectedFeeAmount = (wrappedSonicAmount * totalFee) / 10000;
        uint256 expectedJackpotFee = (wrappedSonicAmount * jackpotFee) / 10000;
        uint256 expectedVeLPFee = (wrappedSonicAmount * veFee) / 10000;
        uint256 expectedBurnFee = (wrappedSonicAmount * burnFee) / 10000;
        uint256 expectedUserAmount = wrappedSonicAmount - expectedFeeAmount;
        
        // Verify user received the right amount
        assertApproxEqAbs(
            dragon.balanceOf(user1),
            expectedUserAmount,
            10, // Allow small rounding error
            "User didn't receive expected amount"
        );
        
        // Verify fees were distributed correctly
        assertApproxEqAbs(
            dragon.balanceOf(jackpotAddress) - jackpotBalanceBefore,
            expectedJackpotFee,
            10,
            "Jackpot didn't receive expected fee"
        );
        
        assertApproxEqAbs(
            dragon.balanceOf(ve69LPAddress) - veLPBalanceBefore,
            expectedVeLPFee,
            10,
            "veLP didn't receive expected fee"
        );
        
        // Verify burned amount (by checking total supply change minus user amount)
        assertApproxEqAbs(
            dragon.totalSupply() - totalSupplyBefore - expectedUserAmount,
            expectedJackpotFee + expectedVeLPFee,
            10,
            "Wrong amount of tokens created"
        );
    }
    
    function testSellFeeCalculation() public {
        // First buy some tokens to sell
        uint256 wrappedSonicAmount = 100 ether;
        
        vm.startPrank(user1);
        dragon.buy(wrappedSonicAmount);
        
        // Record user's balance after buying
        uint256 userDragonBalance = dragon.balanceOf(user1);
        
        // Get fee breakdown
        (
            uint256 jackpotFee,
            uint256 veFee,
            uint256 burnFee,
            uint256 totalFee
        ) = dragon.getSellFees();
        
        // Verify fee percentages
        assertEq(jackpotFee, JACKPOT_SELL_FEE, "Wrong jackpot sell fee");
        assertEq(veFee, VETOKEN_SELL_FEE, "Wrong veToken sell fee");
        assertEq(burnFee, BURN_SELL_FEE, "Wrong burn sell fee");
        assertEq(totalFee, SELL_FEE, "Wrong total sell fee");
        
        // Record balances before selling
        uint256 jackpotBalanceBefore = dragon.balanceOf(jackpotAddress);
        uint256 veLPBalanceBefore = dragon.balanceOf(ve69LPAddress);
        uint256 totalSupplyBefore = dragon.totalSupply();
        uint256 wrappedSonicBalanceBefore = wrappedSonic.balanceOf(user1);
        
        // Calculate expected token amounts
        uint256 sellAmount = userDragonBalance / 2; // Sell half of tokens
        uint256 expectedFeeAmount = (sellAmount * totalFee) / 10000;
        uint256 expectedJackpotFee = (sellAmount * jackpotFee) / 10000;
        uint256 expectedVeLPFee = (sellAmount * veFee) / 10000;
        uint256 expectedBurnFee = (sellAmount * burnFee) / 10000;
        uint256 expectedNetAmount = sellAmount - expectedFeeAmount;
        
        // User sells DRAGON for wS
        dragon.sell(sellAmount);
        vm.stopPrank();
        
        // Verify user's DRAGON balance decreased correctly
        assertApproxEqAbs(
            dragon.balanceOf(user1),
            userDragonBalance - sellAmount,
            10,
            "User balance didn't decrease correctly"
        );
        
        // Verify user received the correct amount of wS
        assertApproxEqAbs(
            wrappedSonic.balanceOf(user1) - wrappedSonicBalanceBefore,
            expectedNetAmount,
            10,
            "User didn't receive expected wS amount"
        );
        
        // Verify fees were distributed correctly
        assertApproxEqAbs(
            dragon.balanceOf(jackpotAddress) - jackpotBalanceBefore,
            expectedJackpotFee,
            10,
            "Jackpot didn't receive expected fee"
        );
        
        assertApproxEqAbs(
            dragon.balanceOf(ve69LPAddress) - veLPBalanceBefore,
            expectedVeLPFee,
            10,
            "veLP didn't receive expected fee"
        );
        
        // Verify burn effect on total supply
        assertApproxEqAbs(
            totalSupplyBefore - dragon.totalSupply(),
            expectedBurnFee,
            10,
            "Wrong amount of tokens burned"
        );
    }
} 