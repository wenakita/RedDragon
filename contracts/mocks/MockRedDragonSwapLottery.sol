// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockRedDragonSwapLottery
 * @dev A simple mock implementation for testing
 */
contract MockRedDragonSwapLottery {
    using SafeERC20 for IERC20;
    
    // State variables
    IERC20 public wrappedSonic;
    address public verifier;
    uint256 public jackpot;
    address public exchangePair;
    IERC20 public lpToken;
    address public lpBooster;
    address public redEnvelope;
    address public priceOracle;
    address public votingToken;
    address public veToken;
    bool public isPaused;
    
    // Events
    event JackpotIncreased(uint256 amount);
    
    /**
     * @dev Constructor for mock
     * @param _wrappedSonic Address of the wrapped Sonic token
     * @param _verifier Address of the verifier (can be zero address for testing)
     */
    constructor(address _wrappedSonic, address _verifier) {
        require(_wrappedSonic != address(0), "wS address cannot be zero");
        wrappedSonic = IERC20(_wrappedSonic);
        verifier = _verifier;
        jackpot = 0;
        isPaused = false;
    }
    
    /**
     * @dev Add to jackpot function for testing
     * @param amount Amount to add to jackpot
     */
    function addToJackpot(uint256 amount) public {
        jackpot += amount;
        emit JackpotIncreased(amount);
    }
    
    /**
     * @dev Set exchange pair address
     */
    function setExchangePair(address _exchangePair) public {
        exchangePair = _exchangePair;
    }
    
    /**
     * @dev Set LP token address
     */
    function setLPToken(address _lpToken) public {
        lpToken = IERC20(_lpToken);
    }
    
    /**
     * @dev Set Red Envelope address
     */
    function setRedEnvelope(address _redEnvelope) public {
        redEnvelope = _redEnvelope;
    }
    
    /**
     * @dev Set LP Booster address
     */
    function setLPBooster(address _lpBooster) public {
        lpBooster = _lpBooster;
    }
    
    /**
     * @dev Set Price Oracle address
     */
    function setPriceOracle(address _priceOracle) public {
        priceOracle = _priceOracle;
    }
    
    /**
     * @dev Set Voting Token address
     */
    function setVotingToken(address _votingToken) public {
        votingToken = _votingToken;
    }
    
    /**
     * @dev Set VE Token address
     */
    function setVeToken(address _veToken) public {
        veToken = _veToken;
    }
    
    /**
     * @dev Record LP acquisition
     */
    function recordLpAcquisition(address user, uint256 amount) public {
        // Mock implementation
    }
    
    /**
     * @dev Get VRF configuration
     */
    function getVRFConfiguration() public pure returns (
        address vrfCoordinatorAddress,
        bytes32 keyHash,
        uint64 subscriptionId
    ) {
        return (address(0x1), bytes32(0), 0);
    }
    
    /**
     * @dev Check if VRF is enabled
     */
    function isVrfEnabled() public pure returns (bool) {
        return true;
    }
    
    /**
     * @dev Get probability for a user
     */
    function getProbability(address user) public pure returns (uint256) {
        return 5000; // 50%
    }
    
    /**
     * @dev Get current jackpot size
     */
    function getCurrentJackpot() public view returns (uint256) {
        return jackpot;
    }
    
    /**
     * @dev Get lottery stats
     */
    function getStats() public view returns (uint256 winners, uint256 payouts, uint256 current) {
        return (0, 0, jackpot);
    }
} 