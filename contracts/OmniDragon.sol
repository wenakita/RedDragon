// SPDX-License-Identifier: MIT

/**
 *   =============================
 *         OMNI DRAGON
 *   =============================
 *  Omnichain Tokenomics Contract
 *   =============================
 *
 * // "Everywhere you go, I go. Cross-chain style." - Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// Layerzero mocks
import "./mocks/layerzero/OFT.sol";
import "./mocks/layerzero/ILayerZeroEndpoint.sol";

import "./interfaces/IDragon.sol";
import "./interfaces/IDragonSwapTrigger.sol";
import "./interfaces/IDragonJackpotVault.sol";
import "./interfaces/Ive69LPFeeDistributor.sol";
import "./interfaces/IChainRegistry.sol";

/**
 * @title OmniDragon
 * @dev Implementation of the Dragon token with omnichain capabilities via LayerZero
 * Extends OFT (Omnichain Fungible Token) for cross-chain functionality 
 * while maintaining the original Dragon tokenomics:
 * 
 * - 10% fee on buys (6.9% to jackpot, 2.41% to ve69LPfeedistributor)
 * - 10% fee on sells (6.9% to jackpot, 2.41% to ve69LPfeedistributor)
 * - 0.69% burn on all transfers
 */
contract OmniDragon is OFT, Ownable, ReentrancyGuard, IDragon {
    using SafeERC20 for IERC20;

    // ======== Storage Variables ========
    // Addresses
    address public immutable jackpotVault;
    address public immutable ve69LPFeeDistributor;
    address public immutable multisigAddress;
    
    // Chain Registry
    IChainRegistry public chainRegistry;
    
    // Token instance for native token wrapper
    IERC20 public nativeTokenWrapper;

    // Fee structure
    struct Fees {
        uint256 jackpotFee; // Fee for jackpot (basis points)
        uint256 ve69LPFee;  // Fee for ve69LP (basis points)
        uint256 burnFee;    // Fee for burning (basis points)
        uint256 totalFee;   // Total fee (basis points)
    }

    // Fixed fee values according to tokenomics
    Fees public buyFees = Fees(690, 241, 69, 1000);  
    // 10% total - 6.9% to jackpot, 2.41% to ve69LPfeedistributor, 0.69% burn
    Fees public sellFees = Fees(690, 241, 69, 1000); 
    // 10% total - 6.9% to jackpot, 2.41% to ve69LPfeedistributor, 0.69% burn
    
    // Fee tracking
    mapping(address => bool) public isExcludedFromFees;
    
    // Action timelock
    mapping(bytes32 => uint256) public pendingActions;
    uint256 public constant ACTION_DELAY = 7 days;
    
    // Initialize flags
    bool public jackpotAddressInitialized = false;
    bool public ve69LPFeeDistributorInitialized = false;
    bool public chainRegistryInitialized = false;
    bool public goldScratcherInitialized = false;
    bool public multisigAddressInitialized = false;

    // Winning scratcher registry
    mapping(uint256 => bool) public winningScratcherIds;

    // Cross-chain transfers
    mapping(uint16 => mapping(address => bool)) public trustedRemoteLookup;
    mapping(uint16 => uint256) public minDstGasLookup;
    
    // Cross-chain token tracking
    struct ChainSupply {
        uint16 chainId;
        string chainName;
        uint256 supply;
        uint256 lastUpdated;
    }
    
    mapping(uint16 => ChainSupply) public chainSupplies;
    uint16[] public supportedChains;
    uint256 public totalCrossChainSupply;
    uint256 public lastGlobalUpdate;

    // ======== Events ========
    event FeesUpdated(string feeType, uint256 jackpotFee, uint256 ve69LPFee, uint256 burnFee, uint256 totalFee);
    event ExcludedFromFees(address indexed account, bool isExcluded);
    event ActionQueued(bytes32 actionId, string actionType, uint256 executionTime);
    event ActionCancelled(bytes32 actionId, string reason);
    event ActionExecuted(bytes32 actionId, string actionType);
    event JackpotAddressUpdated(address indexed newAddress);
    event Ve69LPFeeDistributorUpdated(address indexed newAddress);
    event ChainRegistryUpdated(address indexed newRegistry);
    event SwapTriggerAddressUpdated(address indexed newAddress);
    event GoldScratcherAddressUpdated(address indexed newAddress);
    event MultisigAddressUpdated(address indexed newAddress);
    event WinningScratcherRegistered(uint256 indexed scratcherId);
    event FeeTransferred(address indexed recipient, uint256 amount, string feeType);
    event TokensBurned(uint256 amount);
    event TrustedRemoteSet(uint16 indexed chainId, address indexed remoteAddress);
    event MinDstGasSet(uint16 indexed chainId, uint256 minDstGas);
    event ChainSupplyUpdated(uint16 indexed chainId, string chainName, uint256 supply);
    event GlobalSupplyUpdated(uint256 totalSupply);

    /**
     * @dev Constructor to initialize the OmniDragon token
     * @param name_ Name of the token
     * @param symbol_ Symbol of the token
     * @param initialSupply Initial supply of tokens
     * @param _lzEndpoint Address of the LayerZero endpoint
     * @param _jackpotVault Address of the jackpot vault
     * @param _ve69LPFeeDistributor Address of the ve69LP fee distributor
     * @param _chainRegistry Address of the chain registry
     * @param _multisigAddress Address of the multisig
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        address _lzEndpoint,
        address _jackpotVault,
        address _ve69LPFeeDistributor,
        address _chainRegistry,
        address _multisigAddress
    ) OFT(name_, symbol_, _lzEndpoint) Ownable() {
        require(_jackpotVault != address(0), "Jackpot vault cannot be zero address");
        require(_ve69LPFeeDistributor != address(0), "ve69LP fee distributor cannot be zero address");
        require(_chainRegistry != address(0), "Chain registry cannot be zero address");
        require(_multisigAddress != address(0), "Multisig address cannot be zero address");

        // Set addresses
        jackpotVault = _jackpotVault;
        ve69LPFeeDistributor = _ve69LPFeeDistributor;
        chainRegistry = IChainRegistry(_chainRegistry);
        multisigAddress = _multisigAddress;
        
        // Initialize native token wrapper from chain registry
        uint16 currentChainId = chainRegistry.getCurrentChainId();
        address nativeTokenWrapperAddress = chainRegistry.getNativeTokenWrapper(currentChainId);
        require(nativeTokenWrapperAddress != address(0), "Native token wrapper not set in registry");
        nativeTokenWrapper = IERC20(nativeTokenWrapperAddress);

        // Exclude from fees - use explicit addresses to make deployment deterministic
        _excludeFromFees(address(this), true);
        _excludeFromFees(_multisigAddress, true); // Use multisig instead of msg.sender
        _excludeFromFees(_jackpotVault, true);
        _excludeFromFees(_ve69LPFeeDistributor, true);
        
        // Initialize flags
        jackpotAddressInitialized = true;
        ve69LPFeeDistributorInitialized = true;
        chainRegistryInitialized = true;
        multisigAddressInitialized = true;
        
        // Initialize chain tracking - current chain
        supportedChains.push(currentChainId);
        chainSupplies[currentChainId] = ChainSupply({
            chainId: currentChainId,
            chainName: chainRegistry.getChainConfig(currentChainId).chainName,
            supply: initialSupply,
            lastUpdated: block.timestamp
        });
        totalCrossChainSupply = initialSupply;
        lastGlobalUpdate = block.timestamp;
        
        // Mint initial supply to multisig instead of msg.sender for deterministic deployment
        _mint(_multisigAddress, initialSupply);
        
        // Transfer ownership to multisig
        transferOwnership(_multisigAddress);
    }

    /**
     * @dev Registers a winning scratcher - only callable by goldScratcher
     * @param scratcherId ID of the winning scratcher
     */
    function registerWinningScratcher(uint256 scratcherId) external {
        address goldScratcherAddress = chainRegistry.getChainConfig(chainRegistry.getCurrentChainId()).swapTrigger;
        require(msg.sender == goldScratcherAddress, "Only Gold Scratcher contract can register winning scratchers");
        winningScratcherIds[scratcherId] = true;
        emit WinningScratcherRegistered(scratcherId);
    }

    /**
     * @dev Sets the gold scratcher address - deprecated, now managed by chain registry
     * @param _goldScratcherAddress Address of the Gold Scratcher contract
     */
    function setGoldScratcherAddress(address _goldScratcherAddress) external onlyOwner {
        revert("Use chain registry to manage addresses");
    }

    /**
     * @dev Sets the lottery address - deprecated, now managed by chain registry
     * @param _swapTriggerAddress Address of the swap trigger contract
     */
    function setSwapTriggerAddress(address _swapTriggerAddress) external onlyOwner {
        revert("Use chain registry to manage addresses");
    }

    /**
     * @dev Sets the chain registry address
     * @param _chainRegistry Address of the chain registry contract
     */
    function setChainRegistry(address _chainRegistry) external onlyOwner {
        require(_chainRegistry != address(0), "Chain registry cannot be zero address");
        chainRegistry = IChainRegistry(_chainRegistry);
        emit ChainRegistryUpdated(_chainRegistry);
        
        // Update native token wrapper reference
        uint16 currentChainId = chainRegistry.getCurrentChainId();
        address nativeTokenWrapperAddress = chainRegistry.getNativeTokenWrapper(currentChainId);
        require(nativeTokenWrapperAddress != address(0), "Native token wrapper not set in registry");
        nativeTokenWrapper = IERC20(nativeTokenWrapperAddress);
    }

    /**
     * @dev Excludes an account from fees
     * @param account Address to exclude
     * @param excluded Whether to exclude or include
     */
    function excludeFromFees(address account, bool excluded) external onlyOwner {
        _excludeFromFees(account, excluded);
    }

    /**
     * @dev Internal function to exclude an account from fees
     * @param account Address to exclude from fees
     * @param excluded Boolean indicating if the account should be excluded
     */
    function _excludeFromFees(address account, bool excluded) internal {
        isExcludedFromFees[account] = excluded;
        emit ExcludedFromFees(account, excluded);
    }

    /**
     * @dev Sets the buy fees
     * @param _jackpotFee Fee to jackpot
     * @param _ve69LPFee Fee to ve69LP
     * @param _burnFee Fee to burn
     */
    function setBuyFees(
        uint256 _jackpotFee,
        uint256 _ve69LPFee,
        uint256 _burnFee
    ) external override onlyOwner {
        require(_jackpotFee + _ve69LPFee + _burnFee <= 2000, "Total fee cannot exceed 20%");
        
        buyFees.jackpotFee = _jackpotFee;
        buyFees.ve69LPFee = _ve69LPFee;
        buyFees.burnFee = _burnFee;
        buyFees.totalFee = _jackpotFee + _ve69LPFee + _burnFee;
        
        emit FeesUpdated("Buy", _jackpotFee, _ve69LPFee, _burnFee, buyFees.totalFee);
    }

    /**
     * @dev Sets the sell fees
     * @param _jackpotFee Fee to jackpot
     * @param _ve69LPFee Fee to ve69LP
     * @param _burnFee Fee to burn
     */
    function setSellFees(
        uint256 _jackpotFee,
        uint256 _ve69LPFee,
        uint256 _burnFee
    ) external override onlyOwner {
        require(_jackpotFee + _ve69LPFee + _burnFee <= 2000, "Total fee cannot exceed 20%");
        
        sellFees.jackpotFee = _jackpotFee;
        sellFees.ve69LPFee = _ve69LPFee;
        sellFees.burnFee = _burnFee;
        sellFees.totalFee = _jackpotFee + _ve69LPFee + _burnFee;
        
        emit FeesUpdated("Sell", _jackpotFee, _ve69LPFee, _burnFee, sellFees.totalFee);
    }

    /**
     * @dev Gets the buy fees
     * @return jackpotFee Fee to jackpot
     * @return ve69LPFee Fee to ve69LP
     * @return burnFee Fee to burn
     * @return totalFee Total fee
     */
    function getBuyFees() external view override returns (
        uint256 jackpotFee,
        uint256 ve69LPFee,
        uint256 burnFee,
        uint256 totalFee
    ) {
        return (buyFees.jackpotFee, buyFees.ve69LPFee, buyFees.burnFee, buyFees.totalFee);
    }

    /**
     * @dev Gets the sell fees
     * @return jackpotFee Fee to jackpot
     * @return ve69LPFee Fee to ve69LP
     * @return burnFee Fee to burn
     * @return totalFee Total fee
     */
    function getSellFees() external view override returns (
        uint256 jackpotFee,
        uint256 ve69LPFee,
        uint256 burnFee,
        uint256 totalFee
    ) {
        return (sellFees.jackpotFee, sellFees.ve69LPFee, sellFees.burnFee, sellFees.totalFee);
    }

    /**
     * @dev Implementation of the _beforeTokenTransfer hook that applies fees
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);
        
        // Skip fee processing for mints and burns
        if (from == address(0) || to == address(0)) {
            return;
        }

        // Skip fees for excluded accounts
        if (isExcludedFromFees[from] || isExcludedFromFees[to]) {
            return;
        }
        
        // Apply standard 0.69% burn fee on all transfers
        uint256 burnAmount = (amount * 69) / 10000; // 0.69% burn
        if (burnAmount > 0) {
            super._burn(from, burnAmount);
            emit TokensBurned(burnAmount);
        }
    }

    /**
     * @dev Set VRF connector
     * @param vrfConnector Address of the VRF connector
     */
    function setVRFConnector(address vrfConnector) external override onlyOwner {
        // Not used in the omnichain version
    }

    /**
     * @dev Owner can mint new tokens (for pool seeding, etc.)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external override onlyOwner {
        _mint(to, amount);
        
        // Update local chain supply
        uint16 currentChainId = chainRegistry.getCurrentChainId();
        chainSupplies[currentChainId].supply += amount;
        chainSupplies[currentChainId].lastUpdated = block.timestamp;
        totalCrossChainSupply += amount;
        lastGlobalUpdate = block.timestamp;
        
        emit ChainSupplyUpdated(currentChainId, chainSupplies[currentChainId].chainName, chainSupplies[currentChainId].supply);
        emit GlobalSupplyUpdated(totalCrossChainSupply);
    }

    /**
     * @dev Implement burn function from IDragon interface
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override(ERC20Burnable, IDragon) {
        _burn(msg.sender, amount);
        
        // Update local chain supply
        uint16 currentChainId = chainRegistry.getCurrentChainId();
        if (chainSupplies[currentChainId].supply >= amount) {
            chainSupplies[currentChainId].supply -= amount;
            chainSupplies[currentChainId].lastUpdated = block.timestamp;
        }
        if (totalCrossChainSupply >= amount) {
            totalCrossChainSupply -= amount;
            lastGlobalUpdate = block.timestamp;
        }
        
        emit ChainSupplyUpdated(currentChainId, chainSupplies[currentChainId].chainName, chainSupplies[currentChainId].supply);
        emit GlobalSupplyUpdated(totalCrossChainSupply);
    }

    /**
     * @dev Add to the jackpot balance
     * @param amount The amount to add to the jackpot
     */
    function addToJackpot(uint256 amount) external override {
        require(amount > 0, "Amount must be greater than 0");
        
        // Only allow the owner to add to jackpot
        require(msg.sender == owner(), "Not authorized");
        
        // Transfer native tokens to the jackpot vault
        nativeTokenWrapper.safeTransferFrom(msg.sender, jackpotVault, amount);
        IDragonJackpotVault(jackpotVault).addToJackpot(amount);
        
        emit FeeTransferred(jackpotVault, amount, "Jackpot");
    }

    /**
     * @dev Set trusted remote for cross-chain communication
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source contract address
     */
    function setTrustedRemote(uint16 _srcChainId, address _srcAddress) external onlyOwner {
        trustedRemoteLookup[_srcChainId][_srcAddress] = true;
        
        // Add chain to supported chains if not already added
        bool chainExists = false;
        for (uint i = 0; i < supportedChains.length; i++) {
            if (supportedChains[i] == _srcChainId) {
                chainExists = true;
                break;
            }
        }
        
        if (!chainExists) {
            supportedChains.push(_srcChainId);
            
            // Initialize chain supply from registry if possible
            try chainRegistry.getChainConfig(_srcChainId) returns (IChainRegistry.ChainConfig memory config) {
                string memory chainName = config.chainName;
                chainSupplies[_srcChainId] = ChainSupply({
                    chainId: _srcChainId,
                    chainName: chainName,
                    supply: 0,
                    lastUpdated: block.timestamp
                });
            } catch {
                // Fallback to legacy chain name resolution
                string memory chainName = getChainName(_srcChainId);
                chainSupplies[_srcChainId] = ChainSupply({
                    chainId: _srcChainId,
                    chainName: chainName,
                    supply: 0,
                    lastUpdated: block.timestamp
                });
            }
        }
        
        emit TrustedRemoteSet(_srcChainId, _srcAddress);
    }

    /**
     * @dev Set minimum destination gas for cross-chain messages
     * @param _dstChainId The destination chain ID
     * @param _minDstGas The minimum gas to use on the destination
     */
    function setMinDstGas(uint16 _dstChainId, uint256 _minDstGas) external onlyOwner {
        minDstGasLookup[_dstChainId] = _minDstGas;
        emit MinDstGasSet(_dstChainId, _minDstGas);
    }

    /**
     * @dev Check if a remote address is trusted
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source contract address
     * @return Whether the address is trusted
     */
    function isTrustedRemote(uint16 _srcChainId, address _srcAddress) public view returns (bool) {
        return trustedRemoteLookup[_srcChainId][_srcAddress];
    }

    /**
     * @dev Add hook for afterSwap that is unused in this implementation but required by the interface
     */
    function afterSwap(address from, address to, uint256 amount) external override {
        // This function is not used in the omnichain implementation
    }
    
    /**
     * @dev Override sendFrom to update cross-chain supply tracking
     */
    function sendFrom(
        address _from,
        uint16 _dstChainId,
        bytes calldata _toAddress,
        uint256 _amount,
        address _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable virtual override returns (uint256) {
        // Instead of calling super.sendFrom which doesn't work, implement the basic functionality
        // Burn tokens from sender (similar to OFT implementation)
        _burn(_from, _amount);
        
        // Emit standard event
        emit SendToChain(_dstChainId, _from, _toAddress, _amount);
        
        // Use 0 as mock message ID
        uint256 msgId = 0;
        
        // Update local chain supply
        uint16 currentChainId = chainRegistry.getCurrentChainId();
        if (chainSupplies[currentChainId].supply >= _amount) {
            chainSupplies[currentChainId].supply -= _amount;
            chainSupplies[currentChainId].lastUpdated = block.timestamp;
            emit ChainSupplyUpdated(currentChainId, chainSupplies[currentChainId].chainName, chainSupplies[currentChainId].supply);
        }
        
        // Update destination chain supply
        if (chainSupplies[_dstChainId].chainId != 0) {
            chainSupplies[_dstChainId].supply += _amount;
            chainSupplies[_dstChainId].lastUpdated = block.timestamp;
            emit ChainSupplyUpdated(_dstChainId, chainSupplies[_dstChainId].chainName, chainSupplies[_dstChainId].supply);
        }
        
        return msgId;
    }
    
    /**
     * @dev Get chain name from chain ID (legacy function, use chain registry when possible)
     * @param _chainId Chain ID
     * @return Chain name
     */
    function getChainName(uint16 _chainId) public pure returns (string memory) {
        if (_chainId == 146) return "Sonic";
        if (_chainId == 110) return "Arbitrum";
        if (_chainId == 111) return "Optimism";
        if (_chainId == 102) return "Ethereum";
        if (_chainId == 106) return "Avalanche";
        if (_chainId == 109) return "Polygon";
        if (_chainId == 108) return "BNB Chain";
        if (_chainId == 184) return "Base";
        if (_chainId == 116) return "Solana";
        if (_chainId == 115) return "Sui";
        return "Unknown";
    }
    
    /**
     * @dev Get all supported chains and their supplies
     * @return chains Array of supported chain IDs
     * @return names Array of chain names
     * @return supplies Array of chain supplies
     * @return lastUpdated Array of last update timestamps
     */
    function getAllChainSupplies() external view returns (
        uint16[] memory chains,
        string[] memory names,
        uint256[] memory supplies,
        uint256[] memory lastUpdated
    ) {
        uint len = supportedChains.length;
        chains = new uint16[](len);
        names = new string[](len);
        supplies = new uint256[](len);
        lastUpdated = new uint256[](len);
        
        for (uint i = 0; i < len; i++) {
            uint16 chainId = supportedChains[i];
            ChainSupply storage supply = chainSupplies[chainId];
            
            chains[i] = chainId;
            names[i] = supply.chainName;
            supplies[i] = supply.supply;
            lastUpdated[i] = supply.lastUpdated;
        }
        
        return (chains, names, supplies, lastUpdated);
    }

    /**
     * @dev Process entry for lottery
     * @param user Address of the user to register for the lottery
     * @param nativeTokenAmount Amount of native tokens involved
     */
    function processEntry(address user, uint256 nativeTokenAmount) internal {
        require(user != address(0), "Invalid user address");
        
        // Only allow end users to participate in the lottery, not contracts or proxies
        if (tx.origin == user) {
            // Get current chain config
            uint16 currentChainId = chainRegistry.getCurrentChainId();
            address swapTrigger = chainRegistry.getSwapTrigger(currentChainId);
            
            if (swapTrigger != address(0)) {
                // Call the chain-specific swap trigger
                IDragonSwapTrigger(swapTrigger).onSwapNativeTokenToDragon(user, nativeTokenAmount);
            }
        }
    }
} 