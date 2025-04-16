// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IPromotionalItem.sol";
import "./interfaces/IGoldScratcher.sol";
import "./PromotionalItemRegistry.sol";

/**
 * @title GoldScratcher
 * @dev ERC721 token that represents a Gold Scratcher with the following features:
 * - Limited supply of 100 NFTs
 * - Fixed boost of 6.9% for winning scratchers
 * - Implements IPromotionalItem for integration with lottery system
 * - Tokens can be scratched to reveal if they're winners or losers
 * - One-time transfer restriction
 */
contract GoldScratcher is ERC721, Ownable, ReentrancyGuard, IPromotionalItem, IGoldScratcher {
    using Counters for Counters.Counter;
    using SafeMath for uint256;
    using Strings for uint256;

    // Counter for token IDs
    Counters.Counter private _tokenIdCounter;

    // Maximum supply of Gold Scratchers
    uint256 public constant MAX_SUPPLY = 100;

    // Boost percentage in basis points (6.9%)
    uint256 public constant SCRATCHER_BOOST = 690;

    // Base token URI
    string private _baseTokenURI;

    // Folders for unrevealed, winner, and loser URIs
    string private _unrevealedFolder;
    string private _winnerFolder;
    string private _loserFolder;

    // Promotional item registry
    PromotionalItemRegistry private _registry;

    // Reference to the lottery contract
    address private _lotteryContract;

    // Statistics
    uint256 private _totalScratched;
    uint256 private _totalWinners;
    uint256 private _totalLosers;

    // Marketing recipients
    address[] private _marketingRecipients;

    // Token properties
    struct ScratcherProperties {
        address originalOwner;
        bool isScratched;
        bool isWinner;
    }

    // Mapping from token ID to its properties
    mapping(uint256 => ScratcherProperties) public scratcherProperties;

    // Events
    event ScratcherMinted(uint256 indexed tokenId, address indexed owner);
    event ScratcherScratched(uint256 indexed tokenId, address indexed owner, bool isWinner);
    event ScratcherApplied(uint256 indexed tokenId, address indexed owner, uint256 amount, uint256 boostedAmount);
    event MarketingRecipientsSet(address[] recipients);
    event MarketingAirdropCompleted(uint256 count);
    event RegistrySet(address registryAddress);
    event LotteryContractSet(address lotteryContractAddress);
    event ScratcherAppliedToSwap(address indexed user, uint256 tokenId, bool isWinner, uint256 boostedAmount);

    /**
     * @dev Constructor for the GoldScratcher token
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param baseURI The base URI for the token metadata
     * @param unrevealedFolder The folder for unrevealed tokens
     * @param winnerFolder The folder for winner tokens
     * @param loserFolder The folder for loser tokens
     */
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        string memory unrevealedFolder,
        string memory winnerFolder,
        string memory loserFolder
    ) ERC721(name, symbol) {
        _baseTokenURI = baseURI;
        _unrevealedFolder = unrevealedFolder;
        _winnerFolder = winnerFolder;
        _loserFolder = loserFolder;
    }

    /**
     * @dev Sets the registry address
     * @param registryAddress The address of the promotional item registry
     */
    function setPromotionalRegistry(address registryAddress) external onlyOwner {
        _registry = PromotionalItemRegistry(registryAddress);
        emit RegistrySet(registryAddress);
    }

    /**
     * @dev Sets the lottery contract address
     * @param lotteryContractAddress The address of the lottery contract
     */
    function setLotteryContract(address lotteryContractAddress) external onlyOwner {
        require(lotteryContractAddress != address(0), "Invalid lottery contract address");
        _lotteryContract = lotteryContractAddress;
        emit LotteryContractSet(lotteryContractAddress);
    }

    /**
     * @dev Returns the remaining supply of Gold Scratchers
     * @return The number of Gold Scratchers that can still be minted
     */
    function remainingSupply() public view returns (uint256) {
        return MAX_SUPPLY - _tokenIdCounter.current();
    }

    /**
     * @dev Mints a new Gold Scratcher
     * @param to The address that will receive the minted token
     * @return The ID of the minted token
     */
    function mint(address to) public onlyOwner returns (uint256) {
        require(_tokenIdCounter.current() < MAX_SUPPLY, "Maximum supply reached");
        
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        
        _safeMint(to, tokenId);
        
        scratcherProperties[tokenId] = ScratcherProperties({
            originalOwner: to,
            isScratched: false,
            isWinner: false
        });
        
        emit ScratcherMinted(tokenId, to);
        
        return tokenId;
    }

    /**
     * @dev Mints multiple Gold Scratchers to multiple recipients
     * @param recipients The addresses that will receive the minted tokens
     */
    function batchMint(address[] calldata recipients) external onlyOwner {
        require(_tokenIdCounter.current() + recipients.length <= MAX_SUPPLY, "Would exceed maximum supply");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            mint(recipients[i]);
        }
    }

    /**
     * @dev Sets the marketing recipients
     * @param recipients The addresses that will receive Gold Scratchers for marketing purposes
     */
    function setMarketingRecipients(address[] calldata recipients) external onlyOwner {
        _marketingRecipients = recipients;
        emit MarketingRecipientsSet(recipients);
    }

    /**
     * @dev Airdrops Gold Scratchers to marketing recipients
     */
    function airdropToMarketingRecipients() external onlyOwner {
        require(_marketingRecipients.length > 0, "No marketing recipients set");
        require(_tokenIdCounter.current() + _marketingRecipients.length <= MAX_SUPPLY, "Would exceed maximum supply");
        
        for (uint256 i = 0; i < _marketingRecipients.length; i++) {
            mint(_marketingRecipients[i]);
        }
        
        emit MarketingAirdropCompleted(_marketingRecipients.length);
    }

    /**
     * @dev Scratches a Gold Scratcher to reveal if it's a winner or loser
     * @param tokenId The ID of the token to scratch
     * @return Whether the scratcher is a winner
     */
    function scratch(uint256 tokenId) external nonReentrant returns (bool) {
        require(_exists(tokenId), "Scratcher does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not the owner of this scratcher");
        require(!scratcherProperties[tokenId].isScratched, "Scratcher already scratched");
        
        // Generate a pseudo-random number to determine if this is a winner
        // In a production environment, consider using a more secure randomness source
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            msg.sender,
            tokenId
        )));
        
        // 20% chance of winning (1 in 5)
        bool isWinner = randomNumber % 5 == 0;
        
        // Update properties
        scratcherProperties[tokenId].isScratched = true;
        scratcherProperties[tokenId].isWinner = isWinner;
        
        // Update stats
        _totalScratched++;
        if (isWinner) {
            _totalWinners++;
        } else {
            _totalLosers++;
        }
        
        // Burn the token
        _burn(tokenId);
        
        emit ScratcherScratched(tokenId, msg.sender, isWinner);
        
        return isWinner;
    }

    /**
     * @dev Implementation of the IPromotionalItem interface
     * Applies a promotional item to boost an amount
     * @param itemId The ID of the promotional item
     * @param user The address of the user
     * @param amount The amount to be boosted
     * @return isSuccess A boolean indicating if the application was successful
     * @return boostedAmount The amount after applying the boost
     */
    function applyItem(uint256 itemId, address user, uint256 amount) 
        external 
        override 
        nonReentrant 
        returns (bool isSuccess, uint256 boostedAmount) 
    {
        require(
            msg.sender == address(_registry) || msg.sender == owner(),
            "Only registry or owner can call"
        );
        
        // Check if the token exists
        if (!_exists(itemId)) {
            return (false, amount);
        }
        
        // Check if the user is the owner of the token
        if (ownerOf(itemId) != user) {
            return (false, amount);
        }
        
        // Get the boost amount
        boostedAmount = amount;
        
        // Generate a pseudo-random number to determine if this is a winner
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            user,
            itemId
        )));
        
        // 20% chance of winning (1 in 5)
        bool isWinner = randomNumber % 5 == 0;
        
        // Apply boost if it's a winner
        if (isWinner) {
            boostedAmount = amount * (10000 + SCRATCHER_BOOST) / 10000;
            _totalWinners++;
        } else {
            _totalLosers++;
        }
        
        // Update properties
        scratcherProperties[itemId].isScratched = true;
        scratcherProperties[itemId].isWinner = isWinner;
        
        // Update stats
        _totalScratched++;
        
        // Burn the token
        _burn(itemId);
        
        emit ScratcherScratched(itemId, user, isWinner);
        emit ScratcherApplied(itemId, user, amount, boostedAmount);
        
        return (true, boostedAmount);
    }

    /**
     * @dev Implementation of the IPromotionalItem interface
     * Checks if a user has a specific promotional item
     * @param user The address of the user
     * @param itemId The ID of the item
     * @return A boolean indicating if the user has the item
     */
    function hasItem(address user, uint256 itemId) external view override returns (bool) {
        if (!_exists(itemId)) {
            return false;
        }
        
        return ownerOf(itemId) == user;
    }

    /**
     * @dev Implementation of the IGoldScratcher interface
     * Apply a scratcher to a swap transaction
     * @param tokenId The token ID to use
     * @param swapAmount The amount being swapped
     * @return isWinner Whether the scratcher was a winner
     * @return boostedAmount The amount after boost (if winner)
     */
    function applyToSwap(uint256 tokenId, uint256 swapAmount) external returns (bool isWinner, uint256 boostedAmount) {
        require(msg.sender == _lotteryContract || msg.sender == owner(), "Only lottery or owner");
        require(_exists(tokenId), "Token does not exist");
        require(ownerOf(tokenId) != address(0), "Token does not have an owner");
        
        // Get the token owner
        address tokenOwner = ownerOf(tokenId);
        
        // Generate a pseudo-random number to determine if this is a winner
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            tokenOwner,
            tokenId
        )));
        
        // 20% chance of winning (1 in 5)
        isWinner = randomNumber % 5 == 0;
        
        // Set default boosted amount
        boostedAmount = swapAmount;
        
        // If it's a winner, apply the boost
        if (isWinner) {
            boostedAmount = swapAmount * (10000 + SCRATCHER_BOOST) / 10000;
            _totalWinners++;
        } else {
            _totalLosers++;
        }
        
        // Update properties
        scratcherProperties[tokenId].isScratched = true;
        scratcherProperties[tokenId].isWinner = isWinner;
        
        // Update stats
        _totalScratched++;
        
        // Burn the token
        _burn(tokenId);
        
        // Emit events
        emit ScratcherScratched(tokenId, tokenOwner, isWinner);
        emit ScratcherAppliedToSwap(tokenOwner, tokenId, isWinner, boostedAmount);
        
        return (isWinner, boostedAmount);
    }

    /**
     * @dev Implementation of the IGoldScratcher interface
     * Check if a user has a GoldScratcher
     * @param user User to check
     * @return bool True if user has at least one scratcher
     */
    function hasScratcher(address user) external view returns (bool) {
        return balanceOf(user) > 0;
    }

    /**
     * @dev Implementation of the IGoldScratcher interface
     * Check if a user has a winning scratcher
     * @param user User address to check
     * @param tokenId Token ID to check
     * @return True if the user has a winning scratcher
     */
    function hasWinningScratcher(address user, uint256 tokenId) external view returns (bool) {
        if (!_exists(tokenId) || ownerOf(tokenId) != user) {
            return false;
        }
        
        ScratcherProperties memory props = scratcherProperties[tokenId];
        return props.isScratched && props.isWinner;
    }

    /**
     * @dev Calculates the boost for a specific token and user
     * @param user The address of the user
     * @param itemId The ID of the token
     * @return The boost amount in basis points (e.g., 690 = 6.9%)
     */
    function calculateBoost(address user, uint256 itemId) public view override(IPromotionalItem, IGoldScratcher) returns (uint256) {
        if (!_exists(itemId)) {
            return 0;
        }
        
        if (ownerOf(itemId) != user) {
            return 0;
        }
        
        return SCRATCHER_BOOST;
    }

    /**
     * @dev Returns the URI for a token
     * @param tokenId The ID of the token
     * @return The URI for the token metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        
        string memory baseURI = _baseURI();
        
        if (scratcherProperties[tokenId].isScratched) {
            if (scratcherProperties[tokenId].isWinner) {
                return string(abi.encodePacked(baseURI, _winnerFolder, tokenId.toString()));
            } else {
                return string(abi.encodePacked(baseURI, _loserFolder, tokenId.toString()));
            }
        } else {
            return string(abi.encodePacked(baseURI, _unrevealedFolder, tokenId.toString()));
        }
    }

    /**
     * @dev Hook that is called before any token transfer
     * Implements one-time transfer restriction
     * @param from The address transferring the token
     * @param to The address receiving the token
     * @param tokenId The ID of the token being transferred
     * @param batchSize The size of the batch in case of batch transfers
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);

        // Allow minting and burning
        if (from == address(0) || to == address(0)) {
            return;
        }
        
        // Check if the token has already been transferred
        require(
            from == scratcherProperties[tokenId].originalOwner,
            "GoldScratcher: already transferred once"
        );
    }

    /**
     * @dev Returns the base URI for the token metadata
     * @return The base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Returns the statistics for the Gold Scratchers
     * @return total Total scratchers minted
     * @return scratched Total scratchers that have been scratched
     * @return winners Total winning scratchers
     * @return losers Total losing scratchers
     * @return remaining Remaining scratchers available to mint
     */
    function getStats() external view returns (
        uint256 total,
        uint256 scratched,
        uint256 winners,
        uint256 losers,
        uint256 remaining
    ) {
        return (
            _tokenIdCounter.current(),
            _totalScratched,
            _totalWinners,
            _totalLosers,
            remainingSupply()
        );
    }

    /**
     * @dev IPromotionalItem interface implementation
     * Returns the type of the promotional item
     * @return The type of the promotional item
     */
    function getItemType() external pure override returns (string memory) {
        return "GOLD_SCRATCHER";
    }

    /**
     * @dev IPromotionalItem interface implementation
     * Returns the boost type of the promotional item
     * @return The boost type (JACKPOT)
     */
    function getBoostType() external pure override returns (IPromotionalItem.BoostType) {
        return IPromotionalItem.BoostType.JACKPOT;
    }

    /**
     * @dev IPromotionalItem interface implementation
     * Returns the transfer type of the promotional item
     * @return The transfer type (ONE_TIME_TRANSFER)
     */
    function getTransferType() external pure override returns (IPromotionalItem.TransferType) {
        return IPromotionalItem.TransferType.ONE_TIME_TRANSFER;
    }
} 