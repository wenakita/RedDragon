// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IDragon
 * @notice Interface for the Dragon token with additional functionality
 */
interface IDragon is IERC20 {
    /**
     * @notice Hook to be called after a swap to trigger the lottery
     * @param from The address that sent the tokens
     * @param to The address that received the tokens
     * @param amount The amount of tokens transferred
     */
    function afterSwap(address from, address to, uint256 amount) external;
    
    /**
     * @notice Add the VRF connector to handle lottery requests
     * @param vrfConnector The address of the VRF connector
     */
    function setVRFConnector(address vrfConnector) external;
    
    /**
     * @notice Add to the jackpot balance
     * @param amount The amount to add to the jackpot
     */
    function addToJackpot(uint256 amount) external;

    /**
     * @notice Sets the buy fees
     * @param _jackpotFee Fee to jackpot
     * @param _ve69LPFee Fee to ve69LP
     * @param _burnFee Fee to burn
     */
    function setBuyFees(uint256 _jackpotFee, uint256 _ve69LPFee, uint256 _burnFee) external;

    /**
     * @notice Sets the sell fees
     * @param _jackpotFee Fee to jackpot
     * @param _ve69LPFee Fee to ve69LP
     * @param _burnFee Fee to burn
     */
    function setSellFees(uint256 _jackpotFee, uint256 _ve69LPFee, uint256 _burnFee) external;

    /**
     * @notice Gets the buy fees
     * @return jackpotFee Fee to jackpot
     * @return ve69LPFee Fee to ve69LP
     * @return burnFee Fee to burn
     * @return totalFee Total fee
     */
    function getBuyFees() external view returns (uint256 jackpotFee, uint256 ve69LPFee, uint256 burnFee, uint256 totalFee);

    /**
     * @notice Gets the sell fees
     * @return jackpotFee Fee to jackpot
     * @return ve69LPFee Fee to ve69LP
     * @return burnFee Fee to burn
     * @return totalFee Total fee
     */
    function getSellFees() external view returns (uint256 jackpotFee, uint256 ve69LPFee, uint256 burnFee, uint256 totalFee);

    /**
     * @notice Burns tokens
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external;

    /**
     * @notice Mints new tokens (for pool seeding, etc.)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external;
} 