// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockVRFConsumer
 * @dev Mock implementation of VRF Consumer for testing
 */
contract MockVRFConsumer {
    /**
     * @dev Mock requesting randomness
     * @param _user The user address
     * @return A mock request ID
     */
    function requestRandomness(address _user) external pure returns (uint64) {
        // Return a deterministic request ID for testing
        return uint64(uint160(_user) % 1000000);
    }
    
    /**
     * @dev Mock a non-winning VRF response
     * @param _target Target contract to call
     * @param _requestId Request ID
     * @param _user User address
     * @param _randomness Random value (non-zero)
     */
    function mockResponseNotWinning(
        address _target,
        uint256 _requestId,
        address _user,
        uint256 _randomness
    ) external {
        // Make sure randomness is not zero to ensure non-winning result
        uint256 nonWinningRandomness = _randomness == 0 ? 123 : _randomness;
        
        // Call the target contract
        (bool success, ) = _target.call(
            abi.encodeWithSignature(
                "processRandomness(uint64,address,uint256)",
                _requestId,
                _user,
                nonWinningRandomness
            )
        );
        require(success, "VRF call failed");
    }
    
    /**
     * @dev Mock a winning VRF response
     * @param _target Target contract to call
     * @param _requestId Request ID
     * @param _user User address
     */
    function mockResponseWinning(
        address _target,
        uint256 _requestId,
        address _user
    ) external {
        // Call the target contract with randomness = 0
        // Since threshold checks use modulo, 0 % threshold = 0 will always win
        (bool success, ) = _target.call(
            abi.encodeWithSignature(
                "processRandomness(uint64,address,uint256)",
                _requestId,
                _user,
                0 // Winning randomness
            )
        );
        require(success, "VRF call failed");
    }
} 