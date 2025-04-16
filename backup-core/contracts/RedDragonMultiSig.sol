// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title RedDragonMultiSig
 * @dev A multi-signature wallet for managing $DRAGON token contract
 * Requires multiple confirmations for actions, enhancing security
 */
contract RedDragonMultiSig is ReentrancyGuard {
    // Events
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event SubmitTransaction(address indexed owner, uint256 indexed txIndex, address indexed to, uint256 value, bytes data);
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event RequirementChanged(uint256 required);
    
    // State variables
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public numConfirmationsRequired;
    
    // Transaction structure
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmations;
        string description;
    }
    
    // Mapping from tx index => owner => confirmed
    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    
    // Array of all transactions
    Transaction[] public transactions;
    
    // Modifiers
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }
    
    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactions.length, "Transaction does not exist");
        _;
    }
    
    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "Transaction already executed");
        _;
    }
    
    modifier notConfirmed(uint256 _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "Transaction already confirmed");
        _;
    }
    
    /**
     * @dev Constructor to set initial owners and required confirmations
     * @param _owners Array of initial owner addresses
     * @param _numConfirmationsRequired Number of confirmations required for transactions
     */
    constructor(address[] memory _owners, uint256 _numConfirmationsRequired) {
        require(_owners.length > 0, "Owners required");
        require(_numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length, "Invalid number of required confirmations");
        
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");
            
            isOwner[owner] = true;
            owners.push(owner);
        }
        
        numConfirmationsRequired = _numConfirmationsRequired;
    }
    
    /**
     * @dev Allows the contract to receive Ether
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }
    
    /**
     * @dev Add a new owner
     * @param _owner Address of the new owner
     */
    function addOwner(address _owner) public onlyOwner {
        require(_owner != address(0), "Invalid owner");
        require(!isOwner[_owner], "Owner already exists");
        
        isOwner[_owner] = true;
        owners.push(_owner);
        
        emit OwnerAdded(_owner);
    }
    
    /**
     * @dev Remove an existing owner
     * @param _owner Address of the owner to remove
     */
    function removeOwner(address _owner) public onlyOwner {
        require(isOwner[_owner], "Not an owner");
        require(owners.length > numConfirmationsRequired, "Cannot remove: too few owners");
        
        isOwner[_owner] = false;
        
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == _owner) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }
        
        // Adjust required confirmations if necessary
        if (numConfirmationsRequired > owners.length) {
            numConfirmationsRequired = owners.length;
            emit RequirementChanged(numConfirmationsRequired);
        }
        
        emit OwnerRemoved(_owner);
    }
    
    /**
     * @dev Change the number of required confirmations
     * @param _numConfirmationsRequired New required confirmations
     */
    function changeRequirement(uint256 _numConfirmationsRequired) public onlyOwner {
        require(_numConfirmationsRequired > 0 && _numConfirmationsRequired <= owners.length, "Invalid number of required confirmations");
        
        numConfirmationsRequired = _numConfirmationsRequired;
        emit RequirementChanged(numConfirmationsRequired);
    }
    
    /**
     * @dev Submit a transaction for approval
     * @param _to Destination address
     * @param _value Value in wei
     * @param _data Transaction data
     * @param _description Description of the transaction
     * @return txIndex The index of the submitted transaction
     */
    function submitTransaction(address _to, uint256 _value, bytes memory _data, string memory _description) public onlyOwner returns (uint256) {
        uint256 txIndex = transactions.length;
        
        transactions.push(Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            confirmations: 0,
            description: _description
        }));
        
        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
        
        // Auto-confirm by submitter
        confirmTransaction(txIndex);
        
        return txIndex;
    }
    
    /**
     * @dev Confirm a transaction
     * @param _txIndex Transaction index
     */
    function confirmTransaction(uint256 _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) notConfirmed(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];
        transaction.confirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;
        
        emit ConfirmTransaction(msg.sender, _txIndex);
        
        // Automatically execute if enough confirmations
        if (transaction.confirmations >= numConfirmationsRequired) {
            executeTransaction(_txIndex);
        }
    }
    
    /**
     * @dev Execute a confirmed transaction
     * @param _txIndex Transaction index
     */
    function executeTransaction(uint256 _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) nonReentrant {
        Transaction storage transaction = transactions[_txIndex];
        
        require(transaction.confirmations >= numConfirmationsRequired, "Not enough confirmations");
        
        transaction.executed = true;
        
        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "Transaction execution failed");
        
        emit ExecuteTransaction(msg.sender, _txIndex);
    }
    
    /**
     * @dev Revoke a confirmation
     * @param _txIndex Transaction index
     */
    function revokeConfirmation(uint256 _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        require(isConfirmed[_txIndex][msg.sender], "Transaction not confirmed");
        
        Transaction storage transaction = transactions[_txIndex];
        transaction.confirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;
        
        emit RevokeConfirmation(msg.sender, _txIndex);
    }
    
    /**
     * @dev Get list of owners
     * @return Array of owner addresses
     */
    function getOwners() public view returns (address[] memory) {
        return owners;
    }
    
    /**
     * @dev Get transaction count
     * @return Number of transactions
     */
    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }
    
    /**
     * @dev Get transaction details
     * @param _txIndex Transaction index
     * @return to Recipient address
     * @return value Transaction value
     * @return data Transaction data
     * @return executed Execution status
     * @return confirmations Number of confirmations
     * @return description Transaction description
     */
    function getTransaction(uint256 _txIndex) public view txExists(_txIndex) returns (
        address to,
        uint256 value,
        bytes memory data,
        bool executed,
        uint256 confirmations,
        string memory description
    ) {
        Transaction storage transaction = transactions[_txIndex];
        
        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.confirmations,
            transaction.description
        );
    }
    
    /**
     * @dev Get pending transaction count
     * @return Number of pending transactions
     */
    function getPendingTransactionCount() public view returns (uint256) {
        uint256 count = 0;
        
        for (uint256 i = 0; i < transactions.length; i++) {
            if (!transactions[i].executed) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * @dev Check if a transaction is confirmed by a specific owner
     * @param _txIndex Transaction index
     * @param _owner Owner address
     * @return Whether the transaction is confirmed by the owner
     */
    function isTransactionConfirmedBy(uint256 _txIndex, address _owner) public view txExists(_txIndex) returns (bool) {
        return isConfirmed[_txIndex][_owner];
    }
    
    /**
     * @dev Generate encoded function data for token transfers
     * @param _token The token address
     * @param _to Recipient address
     * @param _amount Amount to transfer
     * @return Encoded function data for transfer
     */
    function encodeTokenTransfer(address _token, address _to, uint256 _amount) external pure returns (bytes memory) {
        return abi.encodeWithSignature("transfer(address,uint256)", _to, _amount);
    }
    
    /**
     * @dev Generate encoded function data for ownership transfer
     * @param _contract The contract address
     * @param _newOwner New owner address
     * @return Encoded function data for transferOwnership
     */
    function encodeTransferOwnership(address _contract, address _newOwner) external pure returns (bytes memory) {
        return abi.encodeWithSignature("transferOwnership(address)", _newOwner);
    }
    
    /**
     * @dev Generate encoded function data for renouncing ownership
     * @param _contract The contract address
     * @return Encoded function data for renounceOwnership
     */
    function encodeRenounceOwnership(address _contract) external pure returns (bytes memory) {
        return abi.encodeWithSignature("renounceOwnership()");
    }
    
    /**
     * @dev Prepare data to recover tokens accidentally sent to this wallet
     * @param _token The token address
     * @param _amount Amount to recover
     * @return Encoded function data for token recovery
     */
    function encodeTokenRecovery(address _token, uint256 _amount) external view returns (bytes memory) {
        return abi.encodeWithSignature("transfer(address,uint256)", msg.sender, _amount);
    }
    
    /**
     * @dev Check token balance of this wallet
     * @param _token Token address
     * @return Token balance
     */
    function getTokenBalance(address _token) external view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }
} 