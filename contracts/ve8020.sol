// SPDX-License-Identifier: MIT

/**
 *   ==============================
 *              ve8020
 *   ==============================
 *    Voting-Escrow Token Standard
 *   ==============================
 *
 * // "Lee, this is America. We don't care about your 'rich cultural heritage'!" - Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.9;

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
    function balanceOf(address _user) external view returns (uint256) {
        LockedBalance memory userLock = locked[_user];
        return calculateVotingPower(userLock.amount, userLock.unlockTime);
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
        require(_value > 0, "Must lock non-zero amount");
        require(_unlockTime > block.timestamp, "Lock time must be in the future");
        require(_unlockTime >= block.timestamp + MIN_LOCK_TIME, "Lock time must be at least 1 week");
        require(_unlockTime <= block.timestamp + MAX_LOCK_TIME, "Lock time too long");

        LockedBalance storage userLock = locked[msg.sender];
        require(userLock.amount == 0, "Lock already exists");

        // Transfer tokens to contract
        require(lpToken.transferFrom(msg.sender, address(this), _value), "Transfer failed");

        // Update locked balance
        userLock.amount = _value;
        userLock.unlockTime = _unlockTime;

        // Calculate voting power
        uint256 votingPower = calculateVotingPower(_value, _unlockTime);

        // Update total supply
        uint256 prevSupply = totalSupply;
        totalSupply = prevSupply + votingPower;

        // Update user point history
        userPointEpoch[msg.sender] += 1;
        uint256 userEpoch = userPointEpoch[msg.sender];
        userPointHistory[msg.sender][userEpoch] = Point({
            bias: votingPower,
            slope: votingPower / (_unlockTime - block.timestamp),
            timestamp: block.timestamp
        });

        // Update global point history
        epoch += 1;
        pointHistory[epoch] = Point({
            bias: totalSupply,
            slope: pointHistory[epoch - 1].slope + (votingPower / (_unlockTime - block.timestamp)),
            timestamp: block.timestamp
        });

        emit Deposit(msg.sender, _value, _unlockTime, block.timestamp);
        emit Supply(prevSupply, totalSupply);
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
        LockedBalance storage userLock = locked[msg.sender];
        require(userLock.amount > 0, "No existing lock found");
        require(_unlockTime > userLock.unlockTime, "Cannot decrease lock time");
        require(_unlockTime <= block.timestamp + MAX_LOCK_TIME, "Lock time too long");
        require(_unlockTime >= block.timestamp + MIN_LOCK_TIME, "Lock time must be in the future");

        // Calculate old voting power
        uint256 oldVotingPower = calculateVotingPower(userLock.amount, userLock.unlockTime);

        // Update unlock time
        userLock.unlockTime = _unlockTime;

        // Calculate new voting power
        uint256 newVotingPower = calculateVotingPower(userLock.amount, _unlockTime);

        // Update user point history
        userPointEpoch[msg.sender] += 1;
        uint256 userEpoch = userPointEpoch[msg.sender];
        userPointHistory[msg.sender][userEpoch] = Point({
            bias: newVotingPower,
            slope: 0,
            timestamp: block.timestamp
        });

        // Update total supply
        totalSupply = totalSupply - oldVotingPower + newVotingPower;

        // Update global point history
        epoch += 1;
        pointHistory[epoch] = Point({
            bias: totalSupply,
            slope: 0,
            timestamp: block.timestamp
        });

        emit Deposit(msg.sender, userLock.amount, _unlockTime, block.timestamp);
    }
    
    /**
     * @dev Withdraw tokens once the lock has expired
     */
    function withdraw() external nonReentrant {
        LockedBalance storage userLock = locked[msg.sender];
        require(userLock.amount > 0, "No lock found");
        require(block.timestamp >= userLock.unlockTime, "Lock not expired");

        // Save the amount to withdraw
        uint256 amount = userLock.amount;

        // Clear the lock before any external calls
        userLock.amount = 0;
        userLock.unlockTime = 0;

        // Update total supply (voting power should already be 0 since lock expired)
        uint256 oldVotingPower = calculateVotingPower(amount, userLock.unlockTime);
        if (oldVotingPower > 0) {
            totalSupply = totalSupply > oldVotingPower ? totalSupply - oldVotingPower : 0;
        }

        // Update user point history
        userPointEpoch[msg.sender] += 1;
        uint256 userEpoch = userPointEpoch[msg.sender];
        userPointHistory[msg.sender][userEpoch] = Point({
            bias: 0,
            slope: 0,
            timestamp: block.timestamp
        });

        // Update global point history
        epoch += 1;
        pointHistory[epoch] = Point({
            bias: totalSupply,
            slope: 0,
            timestamp: block.timestamp
        });

        // Transfer tokens back to user
        require(lpToken.transfer(msg.sender, amount), "Transfer failed");

        emit Withdraw(msg.sender, amount, block.timestamp);
        emit Supply(totalSupply + oldVotingPower, totalSupply);
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
        
        uint256 timeDiff = _unlockTime - block.timestamp;
        if (timeDiff > MAX_LOCK_TIME) {
            timeDiff = MAX_LOCK_TIME;
        }
        
        // Calculate voting power with improved precision
        // Use 1e18 precision throughout the calculation
        uint256 timeRatio = (timeDiff * 1e18) / MAX_LOCK_TIME;
        uint256 votingPower = (_amount * timeRatio) / 1e18;
        
        return votingPower;
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
        
        // Calculate slope and bias with improved precision
        uint256 oldSlope = 0;
        uint256 newSlope = 0;
        
        if (_oldLocked.unlockTime > block.timestamp) {
            uint256 timeDiff = _oldLocked.unlockTime - block.timestamp;
            if (timeDiff > MAX_LOCK_TIME) {
                timeDiff = MAX_LOCK_TIME;
            }
            // Calculate slope with 1e18 precision
            oldSlope = (_oldLocked.amount * 1e18) / timeDiff;
        }
        
        if (_newLocked.unlockTime > block.timestamp) {
            uint256 timeDiff = _newLocked.unlockTime - block.timestamp;
            if (timeDiff > MAX_LOCK_TIME) {
                timeDiff = MAX_LOCK_TIME;
            }
            // Calculate slope with 1e18 precision
            newSlope = (_newLocked.amount * 1e18) / timeDiff;
        }
        
        // Update user point history with current timestamp
        userOldPoint.bias = oldPower;
        userOldPoint.slope = oldSlope;
        userOldPoint.timestamp = block.timestamp;
        
        userNewPoint.bias = newPower;
        userNewPoint.slope = newSlope;
        userNewPoint.timestamp = block.timestamp;
        
        // Save user point history
        userPointHistory[_user][userEpoch] = userNewPoint;
        
        // Update global point history
        epoch += 1;
        
        // Update global supply with proper overflow checks
        uint256 prevSupply = totalSupply;
        totalSupply = prevSupply + newPower - oldPower;
        
        // Update global point history with proper overflow checks
        Point memory lastPoint = pointHistory[epoch - 1];
        pointHistory[epoch] = Point({
            bias: lastPoint.bias + newPower - oldPower,
            slope: lastPoint.slope + newSlope - oldSlope,
            timestamp: block.timestamp
        });
        
        emit Supply(prevSupply, totalSupply);
    }
} 