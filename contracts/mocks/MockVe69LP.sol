// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/Ive69LP.sol";

/**
 * @title MockVe69LP
 * @dev Mock implementation of the ve69LP token for testing
 */
contract MockVe69LP is ERC20, Ive69LP {
    mapping(address => uint256) private votingPower;
    uint256 private _totalVotingPower;
    
    // Mapping to store user locks
    mapping(address => LockedBalance) private _locks;
    
    struct LockedBalance {
        uint256 amount;
        uint256 unlockTime;
    }

    constructor() ERC20("Mock ve69LP", "MVE69LP") {}
    
    /**
     * @dev Mint tokens to a user for testing
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
        votingPower[to] = amount;
        _totalVotingPower += amount;
    }
    
    /**
     * @dev Get the voting power of a user
     * @param _user Address of the user
     * @return User's current voting power
     */
    function balanceOf(address _user) public view override(ERC20, Ive69LP) returns (uint256) {
        return votingPower[_user];
    }
    
    /**
     * @dev Set custom voting power for a user
     * @param _user User address
     * @param _power Voting power to set
     */
    function setVotingPower(address _user, uint256 _power) external {
        _totalVotingPower = _totalVotingPower - votingPower[_user] + _power;
        votingPower[_user] = _power;
    }
    
    /**
     * @dev Get the total voting power
     * @return Total current voting power
     */
    function totalVotingPower() external view override returns (uint256) {
        return _totalVotingPower;
    }
    
    /**
     * @dev Get lock information for a user
     * @param _user Address of the user
     * @return amount Amount of locked LP tokens
     * @return unlockTime Timestamp when tokens unlock
     */
    function getLock(address _user) external view override returns (uint256 amount, uint256 unlockTime) {
        LockedBalance memory lock = _locks[_user];
        return (lock.amount, lock.unlockTime);
    }

    /**
     * @dev Create a new lock or add to an existing lock
     * @param _value Amount of 69/31 LP to lock
     * @param _unlockTime Future time when tokens unlock
     */
    function createLock(uint256 _value, uint256 _unlockTime) external override {
        require(_value > 0, "Must lock non-zero amount");
        require(_unlockTime > block.timestamp, "Lock time must be in the future");
        require(_locks[msg.sender].amount == 0, "Lock already exists");
        
        _locks[msg.sender] = LockedBalance({
            amount: _value,
            unlockTime: _unlockTime
        });
        
        // Set voting power equal to lock amount for simplicity in mock
        votingPower[msg.sender] = _value;
        _totalVotingPower += _value;
    }
    
    /**
     * @dev Increase lock amount without changing the unlock time
     * @param _value Additional amount of 69/31 LP to lock
     */
    function increaseLockAmount(uint256 _value) external override {
        require(_value > 0, "Must increase by non-zero amount");
        require(_locks[msg.sender].amount > 0, "No existing lock found");
        
        _locks[msg.sender].amount += _value;
        
        // Update voting power
        votingPower[msg.sender] += _value;
        _totalVotingPower += _value;
    }
    
    /**
     * @dev Extend lock time without changing the amount
     * @param _unlockTime New unlock time
     */
    function extendLockTime(uint256 _unlockTime) external override {
        require(_locks[msg.sender].amount > 0, "No existing lock found");
        require(_unlockTime > _locks[msg.sender].unlockTime, "Cannot decrease lock time");
        
        _locks[msg.sender].unlockTime = _unlockTime;
    }
    
    /**
     * @dev Withdraw tokens once the lock has expired
     */
    function withdraw() external override {
        require(_locks[msg.sender].amount > 0, "No lock found");
        require(block.timestamp >= _locks[msg.sender].unlockTime, "Lock not expired");
        
        uint256 amount = _locks[msg.sender].amount;
        
        // Clear lock
        _locks[msg.sender].amount = 0;
        _locks[msg.sender].unlockTime = 0;
        
        // Reset voting power
        _totalVotingPower -= votingPower[msg.sender];
        votingPower[msg.sender] = 0;
    }
} 