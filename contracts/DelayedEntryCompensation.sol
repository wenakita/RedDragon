// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./interfaces/IDragonPaintSwapVRF.sol";

/**
 * @title DelayedEntryCompensation
 * @dev Handles compensation for users who attempted to participate in the lottery
 * during VRF outages. The swap still completes, but instead of lottery entry,
 * they receive a special compensation ticket.
 */
contract DelayedEntryCompensation is Ownable, ERC721Enumerable {
    // Struct to track delayed entry details
    struct DelayedEntry {
        address user;
        uint256 swapAmount;
        uint256 timestamp;
        bool redeemed;
    }
    
    // Array of all delayed entries
    DelayedEntry[] public delayedEntries;
    
    // Mapping from user address to their delayed entry indices
    mapping(address => uint256[]) public userDelayedEntries;
    
    // Mapping to track if a token has been redeemed
    mapping(uint256 => bool) public redemptionStatus;
    
    // Whitelist mapping to track addresses whitelisted for future rewards
    mapping(address => bool) public whitelistedAddresses;
    
    // Mapping to track whitelisted amount per address
    mapping(address => uint256) public whitelistedAmount;
    
    // Event emitted when a new delayed entry is registered
    event DelayedEntryRegistered(address indexed user, uint256 swapAmount, uint256 entryIndex, uint256 tokenId);
    
    // Event emitted when compensation is claimed
    event CompensationClaimed(address indexed user, uint256 tokenId, uint256 swapAmount);
    
    // Event emitted when an address is added to whitelist
    event AddedToWhitelist(address indexed user, uint256 swapAmount);
    
    // Base URI for tokens
    string private _baseTokenURI;
    
    /**
     * @dev Constructor
     */
    constructor() ERC721("Whitelist Dragon", "WHITEDRAGON") Ownable() {
        _baseTokenURI = "https://sonicreddragon.io/white/";
    }
    
    /**
     * @dev Register a delayed entry and mint a compensation ticket
     * @param user Address of the user
     * @param swapAmount Amount of tokens swapped
     * @return tokenId The ID of the minted compensation ticket
     */
    function registerDelayedEntry(address user, uint256 swapAmount) external onlyOwner returns (uint256 tokenId) {
        require(user != address(0), "Invalid user address");
        require(swapAmount > 0, "Swap amount must be greater than zero");
        
        // Create new delayed entry record
        uint256 entryIndex = delayedEntries.length;
        delayedEntries.push(DelayedEntry({
            user: user,
            swapAmount: swapAmount,
            timestamp: block.timestamp,
            redeemed: false
        }));
        
        // Track this entry for the user
        userDelayedEntries[user].push(entryIndex);
        
        // Mint a compensation ticket NFT
        tokenId = delayedEntries.length; // Use entry index + 1 as token ID
        _mint(user, tokenId);
        
        emit DelayedEntryRegistered(user, swapAmount, entryIndex, tokenId);
        
        return tokenId;
    }
    
    /**
     * @dev Claim compensation for a delayed entry (adds to whitelist)
     * @param tokenId The ID of the compensation ticket
     */
    function claimCompensation(uint256 tokenId) external {
        require(_exists(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(!redemptionStatus[tokenId], "Already redeemed");
        
        // Mark as redeemed
        uint256 entryIndex = tokenId - 1;
        require(entryIndex < delayedEntries.length, "Invalid entry index");
        
        DelayedEntry storage entry = delayedEntries[entryIndex];
        entry.redeemed = true;
        redemptionStatus[tokenId] = true;
        
        // Add the claimer to whitelist
        whitelistedAddresses[msg.sender] = true;
        
        // Add their swap amount to their whitelisted amount
        whitelistedAmount[msg.sender] += entry.swapAmount;
        
        // Emit events
        emit CompensationClaimed(msg.sender, tokenId, entry.swapAmount);
        emit AddedToWhitelist(msg.sender, entry.swapAmount);
    }
    
    /**
     * @dev Check if an address is whitelisted
     * @param user Address to check
     * @return isWhitelisted Whether the address is whitelisted
     * @return amount Total whitelisted amount for this address
     */
    function checkWhitelist(address user) external view returns (bool isWhitelisted, uint256 amount) {
        return (whitelistedAddresses[user], whitelistedAmount[user]);
    }
    
    /**
     * @dev Manually add an address to whitelist (for admin use)
     * @param user Address to add to whitelist
     * @param amount Amount to whitelist
     */
    function addToWhitelist(address user, uint256 amount) external onlyOwner {
        require(user != address(0), "Invalid user address");
        
        whitelistedAddresses[user] = true;
        whitelistedAmount[user] += amount;
        
        emit AddedToWhitelist(user, amount);
    }
    
    /**
     * @dev Remove an address from whitelist
     * @param user Address to remove from whitelist
     */
    function removeFromWhitelist(address user) external onlyOwner {
        require(user != address(0), "Invalid user address");
        
        whitelistedAddresses[user] = false;
        // We keep the amount record for historical purposes
    }
    
    /**
     * @dev Get all delayed entries for a user
     * @param user Address of the user
     * @return indices Array of entry indices for the user
     */
    function getUserEntries(address user) external view returns (uint256[] memory indices) {
        return userDelayedEntries[user];
    }
    
    /**
     * @dev Get details of a delayed entry
     * @param entryIndex Index of the delayed entry
     * @return user Address of the user
     * @return swapAmount Amount of tokens swapped
     * @return timestamp Time when the entry was registered
     * @return redeemed Whether the entry has been redeemed
     */
    function getEntryDetails(uint256 entryIndex) external view returns (
        address user,
        uint256 swapAmount,
        uint256 timestamp,
        bool redeemed
    ) {
        require(entryIndex < delayedEntries.length, "Invalid entry index");
        DelayedEntry storage entry = delayedEntries[entryIndex];
        return (entry.user, entry.swapAmount, entry.timestamp, entry.redeemed);
    }
    
    /**
     * @dev Get total whitelist count
     * @return count Number of whitelisted addresses
     */
    function getWhitelistCount() external view returns (uint256 count) {
        // Note: This is a naive implementation that doesn't scale well
        // For production, consider tracking this in a counter variable
        uint256 total = 0;
        for (uint256 i = 0; i < delayedEntries.length; i++) {
            if (delayedEntries[i].redeemed) {
                total++;
            }
        }
        return total;
    }
    
    /**
     * @dev Set the base URI for token metadata
     * @param baseURI New base URI
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    /**
     * @dev Base URI for computing {tokenURI}
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
} 