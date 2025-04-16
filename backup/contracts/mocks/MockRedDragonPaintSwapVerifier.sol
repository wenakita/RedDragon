// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRedDragonPaintSwapVerifier.sol";

/**
 * @title MockRedDragonPaintSwapVerifier
 * @dev Mock implementation of RedDragonPaintSwapVerifier for testing
 */
contract MockRedDragonPaintSwapVerifier {
    bool public verifyResult = true;
    
    /**
     * @dev Mock implementation of verify function
     * Always returns true unless configured otherwise
     */
    function verify(address _user) external view returns (bool) {
        return verifyResult;
    }
    
    /**
     * @dev Mock function to set the verification result
     * @param _result The result to return from verify
     */
    function setVerifyResult(bool _result) external {
        verifyResult = _result;
    }
} 