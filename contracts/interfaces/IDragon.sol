// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IDragon
 * @dev Interface for the Dragon token contract
 */
interface IDragon {
    /**
     * @dev Get the buy fees structure
     * @return jackpotFee Fee percentage allocated to jackpot
     * @return ve69LPFee Fee percentage allocated to ve69LP
     * @return burnFee Fee percentage allocated to burn
     * @return totalFee Total fee percentage
     */
    function getBuyFees() external view returns (
        uint256 jackpotFee,
        uint256 ve69LPFee,
        uint256 burnFee,
        uint256 totalFee
    );
    
    /**
     * @dev Get the sell fees structure
     * @return jackpotFee Fee percentage allocated to jackpot
     * @return ve69LPFee Fee percentage allocated to ve69LP
     * @return burnFee Fee percentage allocated to burn
     * @return totalFee Total fee percentage
     */
    function getSellFees() external view returns (
        uint256 jackpotFee,
        uint256 ve69LPFee,
        uint256 burnFee,
        uint256 totalFee
    );
    
    /**
     * @dev Set the buy fees structure
     * @param _jackpotFee Fee percentage to jackpot
     * @param _ve69LPFee Fee percentage to ve69LP
     * @param _burnFee Fee percentage to burn
     */
    function setBuyFees(
        uint256 _jackpotFee,
        uint256 _ve69LPFee,
        uint256 _burnFee
    ) external;
    
    /**
     * @dev Set the sell fees structure
     * @param _jackpotFee Fee percentage to jackpot
     * @param _ve69LPFee Fee percentage to ve69LP
     * @param _burnFee Fee percentage to burn
     */
    function setSellFees(
        uint256 _jackpotFee,
        uint256 _ve69LPFee,
        uint256 _burnFee
    ) external;
    
    /**
     * @dev Mint new tokens
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external;
    
    /**
     * @dev Burn tokens
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external;
    
    /**
     * @dev Check if an address is excluded from fees
     * @param account Address to check
     * @return True if excluded from fees
     */
    function isExcludedFromFees(address account) external view returns (bool);
    
    /**
     * @dev Exclude or include an address from fees
     * @param account Address to exclude/include
     * @param excluded True to exclude, false to include
     */
    function setExcludedFromFees(address account, bool excluded) external;
} 