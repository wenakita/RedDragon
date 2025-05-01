// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockVRFConsumer
 * @dev Mocks the VRF Consumer for testing
 */
contract MockVRFConsumer {
    /**
     * @dev Mock an external VRF request
     * @param _user User address
     * @return Mock request ID
     */
    function requestRandomness(address _user) external pure returns (uint64) {
        // Return a deterministic request ID for testing
        return uint64(uint160(_user)) % 1000000;
    }
    
    /**
     * @dev Mock a VRF response that isn't a winning result
     * @param _target Target contract to call
     * @param _requestId Request ID
     * @param _user User address
     * @param _randomness Random value
     */
    function mockResponseNotWinning(
        address _target,
        uint256 _requestId,
        address _user,
        uint256 _randomness
    ) external {
        // Call processRandomness but ensure the randomness won't result in a win
        // Most implementations win on _randomness % threshold == 0, so we ensure it's not 0
        uint256 nonWinningRandomness = _randomness;
        if (nonWinningRandomness % 100 == 0) {
            nonWinningRandomness += 1;
        }
        
        // Call the target contract
        (bool success, ) = _target.call(
            abi.encodeWithSignature(
                "processRandomness(uint64,address,uint256)",
                _requestId,
                _user,
                nonWinningRandomness
            )
        );
        require(success, "MockVRFConsumer: processRandomness call failed");
    }
    
    /**
     * @dev Mock a VRF response that is a winning result
     * @param _target Target contract to call
     * @param _requestId Request ID
     * @param _user User address
     */
    function mockResponseWinning(
        address _target,
        uint256 _requestId,
        address _user
    ) external {
        // Call processRandomness with a randomness value that ensures a win
        // We use 0 since most implementations check randomness % threshold == 0
        uint256 winningRandomness = 0;
        
        // Call the target contract
        (bool success, ) = _target.call(
            abi.encodeWithSignature(
                "processRandomness(uint64,address,uint256)",
                _requestId,
                _user,
                winningRandomness
            )
        );
        require(success, "MockVRFConsumer: processRandomness call failed");
    }
} 