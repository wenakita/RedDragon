// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
interface IJackpot {
    function enterJackpotWithWS(address user, uint256 wsAmount) external;
    function addToJackpot(uint256 amount) external;
}
