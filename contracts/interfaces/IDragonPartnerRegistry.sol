// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDragonPartnerRegistry
 * @dev Interface for the Dragon Partner Registry contract
 * Used by ve69LPUtilities and other contracts to interact with partner data
 */
interface IDragonPartnerRegistry {
    /**
     * @dev Partner structure
     */
    struct Partner {
        string name;
        uint256 feeShare; // Basis points (e.g., 5000 = 50%)
        uint256 probabilityBoost; // Basis points (e.g., 200 = 2%)
        bool isActive;
    }
    
    /**
     * @dev Get partner at specified index
     * @param index The index in the partner list
     * @return Partner address
     */
    function partnerList(uint256 index) external view returns (address);
    
    /**
     * @dev Get partner data
     * @param partnerAddress Partner address
     * @return name The partner name
     * @return feeShare The fee share in basis points
     * @return probabilityBoost The probability boost in basis points
     * @return isActive Whether the partner is active
     */
    function partners(address partnerAddress) external view returns (
        string memory name,
        uint256 feeShare,
        uint256 probabilityBoost,
        bool isActive
    );
    
    /**
     * @dev Check if a distributor is authorized
     * @param distributor Distributor address
     * @return Authorization status
     */
    function authorizedDistributors(address distributor) external view returns (bool);
    
    /**
     * @dev Get default probability boost
     * @return Default probability boost in basis points
     */
    function defaultProbabilityBoost() external view returns (uint256);
    
    /**
     * @dev Set the default probability boost for all partners
     * @param boost Default probability boost in basis points (e.g., 690 = 6.9%)
     */
    function setDefaultProbabilityBoost(uint256 boost) external;
    
    /**
     * @dev Add a new partner to the registry with default probability boost
     * @param partnerAddress Address of the partner
     * @param name Name of the partner
     * @param feeShare Fee share in basis points (e.g., 5000 = 50%)
     */
    function addPartnerWithDefaultBoost(
        address partnerAddress,
        string memory name,
        uint256 feeShare
    ) external;
    
    /**
     * @dev Add a new partner to the registry
     * @param partnerAddress Address of the partner
     * @param name Name of the partner
     * @param feeShare Fee share in basis points (e.g., 5000 = 50%)
     * @param probabilityBoost Probability boost in basis points (e.g., 200 = 2%)
     */
    function addPartner(
        address partnerAddress,
        string memory name,
        uint256 feeShare,
        uint256 probabilityBoost
    ) external;
    
    /**
     * @dev Update an existing partner's details
     * @param partnerAddress Address of the partner
     * @param name New name of the partner
     * @param feeShare New fee share in basis points
     * @param probabilityBoost New probability boost in basis points
     */
    function updatePartner(
        address partnerAddress,
        string memory name,
        uint256 feeShare,
        uint256 probabilityBoost
    ) external;
    
    /**
     * @dev Update an existing partner's details with default probability boost
     * @param partnerAddress Address of the partner
     * @param name New name of the partner
     * @param feeShare New fee share in basis points
     */
    function updatePartnerWithDefaultBoost(
        address partnerAddress,
        string memory name,
        uint256 feeShare
    ) external;
    
    /**
     * @dev Deactivate a partner
     * @param partnerAddress Address of the partner to deactivate
     */
    function deactivatePartner(address partnerAddress) external;
    
    /**
     * @dev Set authorization for a distributor
     * @param distributor Address of the distributor
     * @param authorized Whether the distributor is authorized
     */
    function setDistributorAuthorization(address distributor, bool authorized) external;
    
    /**
     * @dev Check if a partner is active
     * @param partnerAddress Address of the partner
     * @return True if partner is active
     */
    function isPartnerActive(address partnerAddress) external view returns (bool);
    
    /**
     * @dev Get partner details
     * @param partnerAddress Address of the partner
     * @return name Name of the partner
     * @return feeShare Fee share in basis points
     * @return probabilityBoost Probability boost in basis points
     * @return isActive Whether the partner is active
     */
    function getPartnerDetails(address partnerAddress) external view returns (
        string memory name,
        uint256 feeShare,
        uint256 probabilityBoost,
        bool isActive
    );
    
    /**
     * @dev Get the total number of partners
     * @return Number of partners
     */
    function getPartnerCount() external view returns (uint256);
    
    /**
     * @dev Check if a distributor is authorized
     * @param distributor Address of the distributor
     * @return True if the distributor is authorized
     */
    function isDistributorAuthorized(address distributor) external view returns (bool);
} 