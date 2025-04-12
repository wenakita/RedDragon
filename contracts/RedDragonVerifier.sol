// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IRedDragon.sol";
import "./interfaces/IRedDragonSwapLottery.sol";
import "./interfaces/IRedDragonLPBurner.sol";

/**
 * @title RedDragonVerifier Contract
 * @notice Provides transparency and verification for the RedDragon token ecosystem
 * @dev Allows users to verify various aspects of the token, including fees, lottery, and security
 */
contract RedDragonVerifier is Ownable {
    
    // Contract addresses
    address public redDragonToken;
    address public redDragonLottery;
    address public redDragonLPBurner;
    address public lpToken;
    
    // Dead address for burn verification
    address constant public DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
     
    // Security enhancements
    bool public isPaused;
    mapping(bytes32 => uint256) public timelockExpirations;
    uint256 public constant TIMELOCK_PERIOD = 2 days;
    
    // Events
    event ContractAddressChanged(string contractName, address newAddress);
    event RedDragonTokenSet(address indexed tokenAddress);
    event LotteryAddressSet(address indexed lotteryAddress);
    event LpBurnerAddressSet(address indexed lpBurnerAddress);
    event LpTokenAddressSet(address indexed lpTokenAddress);
    event ContractPaused(bool isPaused);
    event TimelockProposed(bytes32 indexed operationId, string operation, uint256 expirationTime);
    event TimelockExecuted(bytes32 indexed operationId, string operation);
    event TimelockCancelled(bytes32 indexed operationId, string operation);
    
    /**
     * @dev Constructor to initialize the verifier with contract addresses
     * @param _redDragonToken Address of the RedDragon token contract
     * @param _redDragonLottery Address of the lottery contract (can be zero address if not deployed yet)
     * @param _redDragonLPBurner Address of the LP burner contract (can be zero address if not deployed yet)
     * @param _lpToken Address of the LP token (can be zero address if not deployed yet)
     */
    constructor(
        address _redDragonToken,
        address _redDragonLottery,
        address _redDragonLPBurner,
        address _lpToken
    ) {
        require(_redDragonToken != address(0), "RedDragon token address cannot be zero");
        
        redDragonToken = _redDragonToken;
        redDragonLottery = _redDragonLottery;
        redDragonLPBurner = _redDragonLPBurner;
        lpToken = _lpToken;
         
        emit RedDragonTokenSet(_redDragonToken);
        if (_redDragonLottery != address(0)) emit LotteryAddressSet(_redDragonLottery);
        if (_redDragonLPBurner != address(0)) emit LpBurnerAddressSet(_redDragonLPBurner);
        if (_lpToken != address(0)) emit LpTokenAddressSet(_lpToken);
    }
    
    /**
     * @dev Modifier to check if contract is not paused
     */
    modifier whenNotPaused() {
        require(!isPaused, "Contract is paused");
        _;
    }

    /**
     * @dev Modifier to check if timelock has expired
     */
    modifier timelockExpired(bytes32 operationId) {
        require(timelockExpirations[operationId] != 0, "Timelock not initiated");
        require(block.timestamp >= timelockExpirations[operationId], "Timelock not expired");
        _;
        delete timelockExpirations[operationId];
    }
    
    /**
     * @dev Modifier to ensure only EOAs can call the function
     * Uses both tx.origin == msg.sender check and code.length check for maximum security
     */
    modifier onlyEOA() {
        require(tx.origin == msg.sender, "Only EOAs can call directly");
        require(msg.sender.code.length == 0, "Only EOAs allowed");
        _;
    }
    
    /**
     * @dev Update contract addresses
     * @param _redDragonToken RedDragon token address (set to zero to keep current)
     * @param _redDragonLottery Lottery address (set to zero to keep current)
     * @param _redDragonLPBurner LP burner address (set to zero to keep current)
     * @param _lpToken LP token address (set to zero to keep current)
     */
    function updateContractAddresses(
        address _redDragonToken,
        address _redDragonLottery,
        address _redDragonLPBurner,
        address _lpToken
    ) external onlyOwner whenNotPaused {
        if (_redDragonToken != address(0)) {
            redDragonToken = _redDragonToken;
            emit ContractAddressChanged("RedDragonToken", _redDragonToken);
            emit RedDragonTokenSet(_redDragonToken);
        }
        
        if (_redDragonLottery != address(0)) {
            redDragonLottery = _redDragonLottery;
            emit ContractAddressChanged("RedDragonLottery", _redDragonLottery);
            emit LotteryAddressSet(_redDragonLottery);
        }
        
        if (_redDragonLPBurner != address(0)) {
            redDragonLPBurner = _redDragonLPBurner;
            emit ContractAddressChanged("RedDragonLPBurner", _redDragonLPBurner);
            emit LpBurnerAddressSet(_redDragonLPBurner);
        }
        
        if (_lpToken != address(0)) {
            lpToken = _lpToken;
            emit ContractAddressChanged("LPToken", _lpToken);
            emit LpTokenAddressSet(_lpToken);
        }
    }
    
    /**
     * @dev Set the RedDragon token address
     * @param _redDragonToken New RedDragon token address
     */
    function setRedDragonToken(address _redDragonToken) external onlyOwner timelockExpired(keccak256(abi.encodePacked("setRedDragonToken", _redDragonToken))) {
        require(_redDragonToken != address(0), "RedDragon token address cannot be zero");
        redDragonToken = _redDragonToken;
        emit RedDragonTokenSet(_redDragonToken);
        emit TimelockExecuted(keccak256(abi.encodePacked("setRedDragonToken", _redDragonToken)), "setRedDragonToken");
    }
    
    /**
     * @dev Propose to update the RedDragon token address
     * @param _redDragonToken New RedDragon token address
     */
    function proposeRedDragonToken(address _redDragonToken) external onlyOwner whenNotPaused {
        require(_redDragonToken != address(0), "RedDragon token address cannot be zero");
        bytes32 operationId = keccak256(abi.encodePacked("setRedDragonToken", _redDragonToken));
        timelockExpirations[operationId] = block.timestamp + TIMELOCK_PERIOD;
        emit TimelockProposed(operationId, "setRedDragonToken", timelockExpirations[operationId]);
    }
    
    /**
     * @dev Set the lottery address
     * @param _redDragonLottery New lottery address
     */
    function setRedDragonLottery(address _redDragonLottery) external onlyOwner timelockExpired(keccak256(abi.encodePacked("setRedDragonLottery", _redDragonLottery))) {
        redDragonLottery = _redDragonLottery;
        emit LotteryAddressSet(_redDragonLottery);
        emit TimelockExecuted(keccak256(abi.encodePacked("setRedDragonLottery", _redDragonLottery)), "setRedDragonLottery");
    }
    
    /**
     * @dev Propose to update the lottery address
     * @param _redDragonLottery New lottery address
     */
    function proposeRedDragonLottery(address _redDragonLottery) external onlyOwner whenNotPaused {
        bytes32 operationId = keccak256(abi.encodePacked("setRedDragonLottery", _redDragonLottery));
        timelockExpirations[operationId] = block.timestamp + TIMELOCK_PERIOD;
        emit TimelockProposed(operationId, "setRedDragonLottery", timelockExpirations[operationId]);
    }
    
    /**
     * @dev Set the LP burner address
     * @param _redDragonLPBurner New LP burner address
     */
    function setRedDragonLPBurner(address _redDragonLPBurner) external onlyOwner timelockExpired(keccak256(abi.encodePacked("setRedDragonLPBurner", _redDragonLPBurner))) {
        redDragonLPBurner = _redDragonLPBurner;
        emit LpBurnerAddressSet(_redDragonLPBurner);
        emit TimelockExecuted(keccak256(abi.encodePacked("setRedDragonLPBurner", _redDragonLPBurner)), "setRedDragonLPBurner");
    }
    
    /**
     * @dev Propose to update the LP burner address
     * @param _redDragonLPBurner New LP burner address
     */
    function proposeRedDragonLPBurner(address _redDragonLPBurner) external onlyOwner whenNotPaused {
        bytes32 operationId = keccak256(abi.encodePacked("setRedDragonLPBurner", _redDragonLPBurner));
        timelockExpirations[operationId] = block.timestamp + TIMELOCK_PERIOD;
        emit TimelockProposed(operationId, "setRedDragonLPBurner", timelockExpirations[operationId]);
    }
    
    /**
     * @dev Set the LP token address
     * @param _lpToken New LP token address
     */
    function setLpToken(address _lpToken) external onlyOwner timelockExpired(keccak256(abi.encodePacked("setLpToken", _lpToken))) {
        lpToken = _lpToken;
        emit LpTokenAddressSet(_lpToken);
        emit TimelockExecuted(keccak256(abi.encodePacked("setLpToken", _lpToken)), "setLpToken");
    }
    
    /**
     * @dev Propose to update the LP token address
     * @param _lpToken New LP token address
     */
    function proposeLpToken(address _lpToken) external onlyOwner whenNotPaused {
        bytes32 operationId = keccak256(abi.encodePacked("setLpToken", _lpToken));
        timelockExpirations[operationId] = block.timestamp + TIMELOCK_PERIOD;
        emit TimelockProposed(operationId, "setLpToken", timelockExpirations[operationId]);
    }
    
    /**
     * @dev Enable or disable the circuit breaker
     * @param _isPaused New pause state
     */
    function setPaused(bool _isPaused) external onlyOwner {
        isPaused = _isPaused;
        emit ContractPaused(_isPaused);
    }
    
    /**
     * @dev Cancel a proposed timelock operation
     * @param operationId ID of the operation to cancel
     */
    function cancelTimelockOperation(bytes32 operationId) external onlyOwner {
        require(timelockExpirations[operationId] != 0, "Operation not proposed");
        delete timelockExpirations[operationId];
        emit TimelockCancelled(operationId, "cancelled");
    }
    
    /**
     * @dev Get verified lottery information
     * @return lotteryExists Whether the lottery contract exists
     * @return currentJackpot Current jackpot amount
     * @return totalWinners Total number of winners
     * @return totalPayouts Total amount paid out
     * @return lastWinner Address of the last winner
     * @return lastWinAmount Amount won by the last winner
     * @return isVrfEnabled Whether VRF is enabled
     * @return vrfCoordinator Address of VRF coordinator
     * @return vrfKeyHash VRF key hash
     * @return vrfSubscriptionId VRF subscription ID
     */
    function getLotteryVerification() external view whenNotPaused onlyEOA returns (
        bool lotteryExists,
        uint256 currentJackpot,
        uint256 totalWinners,
        uint256 totalPayouts,
        address lastWinner,
        uint256 lastWinAmount,
        bool isVrfEnabled,
        address vrfCoordinator,
        bytes32 vrfKeyHash,
        uint64 vrfSubscriptionId
    ) {
        lotteryExists = (redDragonLottery != address(0));
        
        if (lotteryExists) {
            // Get jackpot and stats
            currentJackpot = IRedDragonSwapLottery(redDragonLottery).getCurrentJackpot();
            (totalWinners, totalPayouts, ) = IRedDragonSwapLottery(redDragonLottery).getStats();
            
            // Get winner information
            try IRedDragonSwapLottery(redDragonLottery).getLastWinner() returns (address winner) {
                lastWinner = winner;
            } catch {}
            
            try IRedDragonSwapLottery(redDragonLottery).getLastWinAmount() returns (uint256 winAmount) {
                lastWinAmount = winAmount;
            } catch {}
            
            // Get VRF information
            try IRedDragonSwapLottery(redDragonLottery).isVrfEnabled() returns (bool vrfEnabled) {
                isVrfEnabled = vrfEnabled;
            } catch {}
            
            if (isVrfEnabled) {
                try IRedDragonSwapLottery(redDragonLottery).getVrfConfiguration() returns (
                    address _vrfCoordinator,
                    bytes32 _vrfKeyHash,
                    uint64 _vrfSubscriptionId
                ) {
                    vrfCoordinator = _vrfCoordinator;
                    vrfKeyHash = _vrfKeyHash;
                    vrfSubscriptionId = _vrfSubscriptionId;
                } catch {}
            }
        }
    }
    
    /**
     * @dev Get liquidity burn verification information
     * @return burnerExists Whether the LP burner contract exists
     * @return totalLpBurned Total amount of LP tokens burned
     * @return lpTotalSupply Total supply of LP tokens
     * @return burnedLpPercentage Percentage of total LP tokens that are burned (in basis points)
     * @return isEnoughBurned Whether enough LP tokens are burned (minimum 10%)
     * @return tokenTotalSupply Total supply of the token
     */
    function getLiquidityBurnVerification() external view whenNotPaused returns (
        bool burnerExists,
        uint256 totalLpBurned,
        uint256 lpTotalSupply,
        uint256 burnedLpPercentage,
        bool isEnoughBurned,
        uint256 tokenTotalSupply
    ) {
        burnerExists = (redDragonLPBurner != address(0) && lpToken != address(0));
        
        if (burnerExists) {
            // Get LP token burn information
            totalLpBurned = IERC20(lpToken).balanceOf(DEAD_ADDRESS);
            lpTotalSupply = IERC20(lpToken).totalSupply();
            
            // Calculate percentage burned (in basis points, 100 = 1%)
            if (lpTotalSupply > 0) {
                burnedLpPercentage = (totalLpBurned * 10000) / lpTotalSupply;
            }
            
            // Check if enough LP is burned (at least a minimum required amount)
            uint256 requiredPercentage = 1000; // 10%
            isEnoughBurned = (burnedLpPercentage >= requiredPercentage);
            
            // Get token supply information
            tokenTotalSupply = IRedDragon(redDragonToken).totalSupply();
        }
    }
    
    /**
     * @dev Check if token passes basic security standards
     * @return feesWithinLimits Whether fees are within reasonable limits
     * @return hasOwnershipTimelock Whether the contract has an ownership timelock
     * @return hasLiquidityBurned Whether liquidity is burned
     * @return liquidityBurnAdequate Whether the liquidity burn is adequate (>10% of LP tokens)
     * @return hasAdminTimelock Whether admin functions have a timelock
     * @return securityScore Overall security score (out of 100)
     */
    function checkSecurityStandards() external view whenNotPaused returns (
        bool feesWithinLimits,
        bool hasOwnershipTimelock,
        bool hasLiquidityBurned,
        bool liquidityBurnAdequate,
        bool hasAdminTimelock,
        uint256 securityScore
    ) {
        // Check fees are within reasonable limits
        (
            ,
            ,
            ,
            ,
            uint256 totalFeeBuy,
            ,
            ,
            ,
            ,
            uint256 totalFeeSell
        ) = IRedDragon(redDragonToken).getDetailedFeeInfo();
        
        feesWithinLimits = (totalFeeBuy <= 1500 && totalFeeSell <= 1500); // 15% or less
        
        // Check ownership status
        (
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            hasOwnershipTimelock
        ) = IRedDragon(redDragonToken).getContractConfiguration();
        
        // Check liquidity burn
        bool burnerExists = (redDragonLPBurner != address(0) && lpToken != address(0));
        
        if (burnerExists) {
            uint256 totalLpBurned = IERC20(lpToken).balanceOf(DEAD_ADDRESS);
            hasLiquidityBurned = (totalLpBurned > 0);
            
            // Check if burn is adequate (at least 10% of LP tokens)
            uint256 lpTotalSupply = IERC20(lpToken).totalSupply();
            if (lpTotalSupply > 0) {
                uint256 burnedLpPercentage = (totalLpBurned * 10000) / lpTotalSupply;
                liquidityBurnAdequate = (burnedLpPercentage >= 1000); // 10% or more
            } else {
                liquidityBurnAdequate = false;
            }
        } else {
            hasLiquidityBurned = false;
            liquidityBurnAdequate = false;
        }
        
        // Check admin timelock
        hasAdminTimelock = hasOwnershipTimelock; // Same as ownership locked in this case
        
        // Calculate security score (out of 100)
        securityScore = 0;
        
        // Fees within limits: 20 points
        if (feesWithinLimits) securityScore += 20;
        
        // Ownership timelock: 25 points
        if (hasOwnershipTimelock) securityScore += 25;
        
        // Has liquidity burned: 25 points
        if (hasLiquidityBurned) securityScore += 25;
        
        // Liquidity burn adequate: 15 points
        if (liquidityBurnAdequate) securityScore += 15;
        
        // Admin timelock: 15 points
        if (hasAdminTimelock) securityScore += 15;
    }
    
    /**
     * @dev Verify if LP tokens have been burned (community verification method)
     * @param requiredPercentage Percentage of LP tokens required to be burned (in basis points, 100 = 1%)
     * @return burnPercentage Actual percentage of LP tokens burned
     * @return isEnough Whether enough LP tokens are burned as per the requirement
     */
    function verifyLpBurn(uint256 requiredPercentage) external view whenNotPaused returns (uint256 burnPercentage, bool isEnough) {
        require(lpToken != address(0), "LP token not set");
        require(requiredPercentage <= 10000, "Percentage cannot exceed 100%");
        
        uint256 totalLpBurned = IERC20(lpToken).balanceOf(DEAD_ADDRESS);
        uint256 lpTotalSupply = IERC20(lpToken).totalSupply();
        
        if (lpTotalSupply > 0) {
            burnPercentage = (totalLpBurned * 10000) / lpTotalSupply;
            isEnough = (burnPercentage >= requiredPercentage);
        } else {
            burnPercentage = 0;
            isEnough = false;
        }
    }
    
    /**
     * @dev Check if randomness is secure (using VRF)
     * @return isRandomnessSecure Whether randomness is secure
     * @return hasVrfEnabled Whether VRF is enabled
     * @return vrfCoordinatorAddress Address of the VRF coordinator
     * @return vrfContractSetup Whether VRF contracts are properly set up
     */
    function checkRandomnessSecurity() external view whenNotPaused onlyEOA returns (
        bool isRandomnessSecure,
        bool hasVrfEnabled,
        address vrfCoordinatorAddress,
        bool vrfContractSetup
    ) {
        bool lotteryExists = (redDragonLottery != address(0));
        
        if (lotteryExists) {
            // Check if VRF is enabled
            try IRedDragonSwapLottery(redDragonLottery).isVrfEnabled() returns (bool vrfEnabled) {
                hasVrfEnabled = vrfEnabled;
            } catch {}
            
            // Get VRF coordinator address
            if (hasVrfEnabled) {
                try IRedDragonSwapLottery(redDragonLottery).getVrfConfiguration() returns (
                    address _vrfCoordinator,
                    bytes32 ,
                    uint64 
                ) {
                    vrfCoordinatorAddress = _vrfCoordinator;
                    
                    // Check if VRF contracts are properly set up
                    vrfContractSetup = (vrfCoordinatorAddress != address(0));
                    
                    // Randomness is secure if VRF is enabled and properly set up
                    isRandomnessSecure = hasVrfEnabled && vrfContractSetup;
                } catch {}
            }
        }
    }
} 