// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title ISonicVRFConsumer
 * @notice Interface for the Sonic VRF Consumer contract
 */
interface ISonicVRFConsumer {
    /**
     * @notice Called when a user swaps wS for DRAGON, triggering a VRF request
     * @param user The address of the user making the swap
     * @param amount The amount being swapped
     */
    function onSwapWSToDragon(address user, uint256 amount) external;
    
    /**
     * @notice Request randomness for a user
     * @param _user The address of the user to request randomness for
     * @return requestId The ID of the randomness request
     */
    function requestRandomness(address _user) external returns (uint64);
    
    /**
     * @notice Add funds to the jackpot
     * @param amount The amount to add
     */
    function addToJackpot(uint256 amount) external;
    
    /**
     * @notice Update the win threshold
     * @param _winThreshold New threshold (0-10000)
     */
    function setWinThreshold(uint256 _winThreshold) external;
    
    /**
     * @notice Update the jackpot percentage
     * @param _jackpotPercentage New percentage (0-10000)
     */
    function setJackpotPercentage(uint256 _jackpotPercentage) external;
    
    /**
     * @notice Event emitted when a VRF request is initiated
     * @param requestId The ID of the request
     * @param user The user who initiated the request
     */
    event VRFRequested(uint64 indexed requestId, address indexed user);
    
    /**
     * @notice Event emitted when randomness is received
     * @param requestId The ID of the request
     * @param randomness The random value received
     */
    event RandomnessReceived(uint64 indexed requestId, uint256 randomness);
    
    /**
     * @notice Event emitted when lottery is won
     * @param winner The address of the winner
     * @param amount The amount won
     */
    event JackpotWon(address indexed winner, uint256 amount);
} 