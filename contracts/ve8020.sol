// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title ve8020
 * @dev Vote-Escrowed 80/20 LP token implementation
 * Users lock 80/20 LP tokens for a period of time to receive voting power
 * The voting power depends on the amount of tokens locked and the lock time
 * Follows the veCRV model from Curve Finance
 */
contract ve8020 is Ownable, ReentrancyGuard {
    // Structs
    struct LockedBalance {
        uint256 amount;       // Amount of 80/20 LP tokens locked
        uint256 unlockTime;   // Unix timestamp when tokens unlock
    }
    
    struct Point {
        uint256 bias;         // Voting power at the time of recording
        uint256 slope;        // How fast the voting power is decreasing over time
        uint256 timestamp;    // Time point was recorded
    }
    
    // Constants
    uint256 private constant WEEK = 7 * 86400;             // 1 week in seconds
    uint256 private constant MAX_LOCK_TIME = 4 * 365 * 86400; // 4 years in seconds
    uint256 private constant MIN_LOCK_TIME = 7 * 86400;    // 1 week in seconds
    
    // State variables
    IERC20 public lpToken;    // 80/20 LP token
    uint256 public totalSupply;       // Total ve8020 supply
    mapping(address => LockedBalance) public locked;
    mapping(address => uint256) public userPointEpoch;
    mapping(address => mapping(uint256 => Point)) public userPointHistory;
    mapping(uint256 => Point) public pointHistory;
    
    uint256 public epoch;
    
    // Events
    event Deposit(address indexed provider, uint256 value, uint256 locktime, uint256 timestamp);
    event Withdraw(address indexed provider, uint256 value, uint256 timestamp);
    event Supply(uint256 prevSupply, uint256 supply);
    
    /**
     * @dev Constructor
     * @param _lpToken Address of the 80/20 LP token
     */
    constructor(address _lpToken) {
        require(_lpToken != address(0), "LP token address cannot be zero");
        lpToken = IERC20(_lpToken);
        
        pointHistory[0] = Point({
            bias: 0,
            slope: 0,
            timestamp: block.timestamp
        });
        epoch = 0;
    }
    
    /**
     * @dev Get the voting power of a user
     * @param _user Address of the user
     * @return User's current voting power
     */
    function balanceOf(address _user) public view returns (uint256) {
        uint256 userEpoch = userPointEpoch[_user];
        if (userEpoch == 0) {
            return 0;
        }
        
        Point memory point = userPointHistory[_user][userEpoch];
        
        // Calculate current voting power using linear decay
        uint256 timeDiff = 0;
        if (block.timestamp > point.timestamp) {
            timeDiff = block.timestamp - point.timestamp;
        }
        
        // Avoid underflow if the user's lock has expired
        if (timeDiff >= MAX_LOCK_TIME || point.bias <= point.slope * timeDiff) {
            return 0;
        }
        
        // Calculate voting power with linear decay
        uint256 votingPower = point.bias - point.slope * timeDiff;
        
        // Get the user's lock
        LockedBalance memory userLock = locked[_user];
        
        // If the lock has expired, return 0
        if (block.timestamp >= userLock.unlockTime) {
            return 0;
        }
        
        return votingPower;
    }
    
    /**
     * @dev Get the total voting power
     * @return Total current voting power
     */
    function totalVotingPower() external view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * @dev Create a new lock or add to an existing lock
     * @param _value Amount of 80/20 LP to lock
     * @param _unlockTime Future time when tokens unlock
     */
    function createLock(uint256 _value, uint256 _unlockTime) external nonReentrant {
        LockedBalance storage userLocked = locked[msg.sender];
        
        // Check if the unlock time is valid (between min and max lock time)
        uint256 unlockTime = (_unlockTime / WEEK) * WEEK; // Round down to whole weeks
        require(unlockTime > block.timestamp, "Lock time must be in the future");
        require(unlockTime >= block.timestamp + MIN_LOCK_TIME, "Lock time too short");
        require(unlockTime <= block.timestamp + MAX_LOCK_TIME, "Lock time too long");
        
        require(_value > 0, "Must lock non-zero amount");
        
        // Check if the user already has a lock
        if (userLocked.amount > 0) {
            // User has an existing lock
            require(unlockTime > userLocked.unlockTime, "Cannot decrease lock time");
            require(userLocked.unlockTime > block.timestamp, "Lock expired");
            
            // Calculate new voting power
            _checkpoint(msg.sender, userLocked, LockedBalance({
                amount: userLocked.amount + _value,
                unlockTime: unlockTime
            }));
        } else {
            // New lock
            _checkpoint(msg.sender, LockedBalance({
                amount: 0,
                unlockTime: 0
            }), LockedBalance({
                amount: _value,
                unlockTime: unlockTime
            }));
        }
        
        // Update user's lock
        userLocked.amount += _value;
        userLocked.unlockTime = unlockTime;
        
        // Transfer LP tokens from user to contract
        require(lpToken.transferFrom(msg.sender, address(this), _value), "Transfer failed");
        
        emit Deposit(msg.sender, _value, unlockTime, block.timestamp);
    }
    
    /**
     * @dev Increase lock amount without changing the unlock time
     * @param _value Additional amount of 80/20 LP to lock
     */
    function increaseLockAmount(uint256 _value) external nonReentrant {
        LockedBalance storage userLocked = locked[msg.sender];
        
        require(_value > 0, "Must increase by non-zero amount");
        require(userLocked.amount > 0, "No existing lock found");
        require(userLocked.unlockTime > block.timestamp, "Lock expired");
        
        // Checkpoint with new amount but same unlock time
        _checkpoint(msg.sender, userLocked, LockedBalance({
            amount: userLocked.amount + _value,
            unlockTime: userLocked.unlockTime
        }));
        
        // Update user's lock
        userLocked.amount += _value;
        
        // Transfer LP tokens from user to contract
        require(lpToken.transferFrom(msg.sender, address(this), _value), "Transfer failed");
        
        emit Deposit(msg.sender, _value, userLocked.unlockTime, block.timestamp);
    }
    
    /**
     * @dev Extend lock time without changing the amount
     * @param _unlockTime New unlock time
     */
    function extendLockTime(uint256 _unlockTime) external nonReentrant {
        LockedBalance storage userLocked = locked[msg.sender];
        
        uint256 unlockTime = (_unlockTime / WEEK) * WEEK; // Round down to whole weeks
        require(unlockTime > userLocked.unlockTime, "Cannot decrease lock time");
        require(unlockTime <= block.timestamp + MAX_LOCK_TIME, "Lock time too long");
        require(userLocked.amount > 0, "No existing lock found");
        require(userLocked.unlockTime > block.timestamp, "Lock expired");
        
        // Checkpoint with same amount but new unlock time
        _checkpoint(msg.sender, userLocked, LockedBalance({
            amount: userLocked.amount,
            unlockTime: unlockTime
        }));
        
        // Update user's lock
        userLocked.unlockTime = unlockTime;
        
        emit Deposit(msg.sender, 0, unlockTime, block.timestamp);
    }
    
    /**
     * @dev Withdraw tokens once the lock has expired
     */
    function withdraw() external nonReentrant {
        LockedBalance storage userLocked = locked[msg.sender];
        
        require(userLocked.amount > 0, "No lock found");
        require(block.timestamp >= userLocked.unlockTime, "Lock not expired");
        
        uint256 value = userLocked.amount;
        
        // Checkpoint with zero balance
        _checkpoint(msg.sender, userLocked, LockedBalance({
            amount: 0,
            unlockTime: 0
        }));
        
        // Update user's lock
        userLocked.amount = 0;
        userLocked.unlockTime = 0;
        
        // Return LP tokens to the user
        require(lpToken.transfer(msg.sender, value), "Transfer failed");
        
        emit Withdraw(msg.sender, value, block.timestamp);
    }
    
    /**
     * @dev Get lock information for a user
     * @param _user Address of the user
     * @return amount Amount of locked LP tokens
     * @return unlockTime Timestamp when tokens unlock
     */
    function getLock(address _user) external view returns (uint256 amount, uint256 unlockTime) {
        LockedBalance memory userLocked = locked[_user];
        return (userLocked.amount, userLocked.unlockTime);
    }
    
    /**
     * @dev Calculate voting power based on amount and lock time
     * @param _amount Amount of LP tokens locked
     * @param _unlockTime Time when tokens unlock
     * @return Voting power
     */
    function calculateVotingPower(uint256 _amount, uint256 _unlockTime) public view returns (uint256) {
        if (_amount == 0 || _unlockTime <= block.timestamp) {
            return 0;
        }
        
        uint256 lockDuration = _unlockTime - block.timestamp;
        if (lockDuration > MAX_LOCK_TIME) {
            lockDuration = MAX_LOCK_TIME;
        }
        
        // Voting power = amount * (lockDuration / MAX_LOCK_TIME)
        // This means max lock time = full voting power, shorter locks = proportionally less
        return (_amount * lockDuration) / MAX_LOCK_TIME;
    }
    
    /**
     * @dev Internal function to update user points and total supply
     * @param _user User address
     * @param _oldLocked Old locked balance
     * @param _newLocked New locked balance
     */
    function _checkpoint(address _user, LockedBalance memory _oldLocked, LockedBalance memory _newLocked) internal {
        Point memory userOldPoint;
        Point memory userNewPoint;
        
        // Calculate old and new voting power
        uint256 oldPower = calculateVotingPower(_oldLocked.amount, _oldLocked.unlockTime);
        uint256 newPower = calculateVotingPower(_newLocked.amount, _newLocked.unlockTime);
        
        // Update user point epoch and save history
        userPointEpoch[_user] += 1;
        uint256 userEpoch = userPointEpoch[_user];
        
        // Calculate slope and bias
        uint256 oldSlope = 0;
        uint256 newSlope = 0;
        
        if (_oldLocked.unlockTime > block.timestamp) {
            oldSlope = (_oldLocked.amount * MAX_LOCK_TIME) / (_oldLocked.unlockTime - block.timestamp);
        }
        
        if (_newLocked.unlockTime > block.timestamp) {
            newSlope = (_newLocked.amount * MAX_LOCK_TIME) / (_newLocked.unlockTime - block.timestamp);
        }
        
        // Update user point history
        userOldPoint.bias = oldPower;
        userOldPoint.slope = oldSlope;
        userOldPoint.timestamp = block.timestamp;
        
        userNewPoint.bias = newPower;
        userNewPoint.slope = newSlope;
        userNewPoint.timestamp = block.timestamp;
        
        userPointHistory[_user][userEpoch] = userNewPoint;
        
        // Update global point history
        epoch += 1;
        
        // Update global supply
        uint256 prevSupply = totalSupply;
        totalSupply = prevSupply + newPower - oldPower;
        
        pointHistory[epoch] = Point({
            bias: pointHistory[epoch - 1].bias + newPower - oldPower,
            slope: pointHistory[epoch - 1].slope + newSlope - oldSlope,
            timestamp: block.timestamp
        });
        
        emit Supply(prevSupply, totalSupply);
    }
} 