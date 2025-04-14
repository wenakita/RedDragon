// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IRedDragon.sol";
import "./interfaces/IRedDragonSwapLottery.sol";

/**
 * @title RedDragonVerifier Contract
 * @notice Provides transparency and verification for the RedDragon token ecosystem
 * @dev Allows users to verify various aspects of the token, including fees, lottery, and security
 */
contract RedDragonVerifier is Ownable {
    
    // Contract addresses
    address public redDragonToken;
    address public redDragonLottery;
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
    event LpTokenAddressSet(address indexed lpTokenAddress);
    event ContractPaused(bool isPaused);
    event TimelockProposed(bytes32 indexed operationId, string operation, uint256 expirationTime);
    event TimelockExecuted(bytes32 indexed operationId, string operation);
    event TimelockCancelled(bytes32 indexed operationId, string operation);
    
    /**
     * @dev Constructor to initialize the verifier with contract addresses
     * @param _redDragonToken Address of the RedDragon token contract
     * @param _redDragonLottery Address of the lottery contract (can be zero address if not deployed yet)
     * @param _lpToken Address of the LP token (can be zero address if not deployed yet)
     */
    constructor(
        address _redDragonToken,
        address _redDragonLottery,
        address _lpToken
    ) {
        require(_redDragonToken != address(0), "RedDragon token address cannot be zero");
        
        redDragonToken = _redDragonToken;
        redDragonLottery = _redDragonLottery;
        lpToken = _lpToken;
         
        emit RedDragonTokenSet(_redDragonToken);
        if (_redDragonLottery != address(0)) emit LotteryAddressSet(_redDragonLottery);
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
     * @param _lpToken LP token address (set to zero to keep current)
     */
    function updateContractAddresses(
        address _redDragonToken,
        address _redDragonLottery,
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
     * @dev Get lottery and token information in a single call
     * @return lotteryExists Whether the lottery contract exists
     * @return lotteryEnabled Whether the lottery is enabled
     * @return potSize Current jackpot size
     * @return jackpotTokenSymbol Symbol of the jackpot token
     * @return tokenDecimals Decimals of the token
     * @return tokenTotalSupply Total supply of the token
     */
    function getTokenAndLotteryInfo() external view returns (
        bool lotteryExists,
        bool lotteryEnabled,
        uint256 potSize,
        string memory jackpotTokenSymbol,
        uint8 tokenDecimals,
        uint256 tokenTotalSupply
    ) {
        // Check lottery
        lotteryExists = (redDragonLottery != address(0));
        
        if (lotteryExists) {
            try IRedDragonSwapLottery(redDragonLottery).isLotteryEnabled() returns (bool enabled) {
                lotteryEnabled = enabled;
            } catch {
                lotteryEnabled = false;
            }
            
            try IRedDragonSwapLottery(redDragonLottery).getCurrentJackpot() returns (uint256 jackpot) {
                potSize = jackpot;
            } catch {
                potSize = 0;
            }
            
            try IRedDragonSwapLottery(redDragonLottery).getJackpotTokenSymbol() returns (string memory symbol) {
                jackpotTokenSymbol = symbol;
            } catch {
                jackpotTokenSymbol = "Unknown";
            }
        }
        
        // Get token info
        try IERC20Metadata(redDragonToken).decimals() returns (uint8 decimals) {
            tokenDecimals = decimals;
        } catch {
            tokenDecimals = 18; // Default to 18 if not available
        }
        
        try IERC20(redDragonToken).totalSupply() returns (uint256 totalSupply) {
            tokenTotalSupply = totalSupply;
        } catch {
            tokenTotalSupply = 0;
        }
    }
    
    /**
     * @dev Verify security status of the token
     * @return hasOwnership Whether the token has an owner
     * @return hasLottery Whether the lottery exists
     * @return lotterySecure Whether the lottery uses secure randomness
     */
    function verifySecurityStatus() external view whenNotPaused returns (
        bool hasOwnership,
        bool hasLottery,
        bool lotterySecure
    ) {
        // Check basic ownership (though not perfect, provides basic check)
        try Ownable(redDragonToken).owner() returns (address tokenOwner) {
            hasOwnership = (tokenOwner != address(0));
        } catch {
            hasOwnership = false;
        }
        
        // Check lottery existence
        hasLottery = (redDragonLottery != address(0));
        
        // Check lottery security (if it exists)
        if (hasLottery) {
            try this.checkVrfSecurity() returns (bool hasVrfEnabled, address vrfCoordinatorAddress) {
                lotterySecure = hasVrfEnabled && vrfCoordinatorAddress != address(0);
            } catch {
                lotterySecure = false;
            }
        }
    }
    
    /**
     * @dev Check if randomness is secure (using VRF)
     * @return hasVrfEnabled Whether VRF is enabled
     * @return vrfCoordinatorAddress Address of the VRF coordinator
     */
    function checkVrfSecurity() external view whenNotPaused returns (
        bool hasVrfEnabled,
        address vrfCoordinatorAddress
    ) {
        require(redDragonLottery != address(0), "Lottery not configured");
        
        // Try to get VRF configuration
        try IRedDragonSwapLottery(redDragonLottery).isVrfEnabled() returns (bool vrfEnabled) {
            hasVrfEnabled = vrfEnabled;
            
            if (hasVrfEnabled) {
                try IRedDragonSwapLottery(redDragonLottery).getVrfConfiguration() returns (
                    address vrfCoordinator,
                    bytes32 vrfKeyHash,
                    uint64 vrfSubscriptionId
                ) {
                    vrfCoordinatorAddress = vrfCoordinator;
                } catch {
                    // If we can't get the configuration, set to default values
                    vrfCoordinatorAddress = address(0);
                }
            }
        } catch {
            // If the contract doesn't support VRF, set to default values
            hasVrfEnabled = false;
            vrfCoordinatorAddress = address(0);
        }
    }
} 