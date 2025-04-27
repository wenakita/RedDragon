// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Minimal Test contract for forge testing
contract Test {
    function assertTrue(bool condition) internal {
        require(condition, "Assertion failed");
    }
} 