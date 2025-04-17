// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IVe69LP
 * @dev Interface for the Ve69LP contract
 */
interface IVe69LP {
    struct LockedBalance {
        uint256 amount;
        uint256 unlockTime;
    }
    
    struct Point {
        uint256 bias;
        uint256 slope;
        uint256 timestamp;
    }
    
    function lpToken() external view returns (IERC20);
    function totalSupply() external view returns (uint256);
    function locked(address _user) external view returns (LockedBalance memory);
    function userPointEpoch(address _user) external view returns (uint256);
    function userPointHistory(address _user, uint256 _epoch) external view returns (Point memory);
    function pointHistory(uint256 _epoch) external view returns (Point memory);
    function epoch() external view returns (uint256);
    
    function balanceOf(address _user) external view returns (uint256);
    function totalVotingPower() external view returns (uint256);
    function createLock(uint256 _value, uint256 _unlockTime) external;
    function increaseLockAmount(uint256 _value) external;
    function extendLockTime(uint256 _unlockTime) external;
    function withdraw() external;
    function getLock(address _user) external view returns (uint256 amount, uint256 unlockTime);
    function calculateVotingPower(uint256 _amount, uint256 _unlockTime) external view returns (uint256);
} 