// SPDX-License-Identifier: MIT

/**
 *   =============================
 *     OMNI DRAGON DEPLOYER
 *   =============================
 *   Deterministic Address Factory
 *   =============================
 *
 * // "Same look, same feel, same address." - Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

import "./OmniDragon.sol";

/**
 * @title OmniDragonDeployer
 * @dev Factory contract that deploys OmniDragon with a deterministic address using CREATE2
 * This allows us to deploy the OmniDragon contract with the same address on every chain
 */
contract OmniDragonDeployer {
    // Events
    event OmniDragonDeployed(address indexed omniDragonAddress);
    event BytecodeChecksumComputed(bytes32 bytecodeChecksum);
    event DeterministicAddressComputed(address computedAddress, bytes32 salt);
    
    // Default salt value for consistent addressing
    bytes32 public constant DEFAULT_SALT = bytes32(uint256(0x69));
    
    /**
     * @dev Compute the address where the OmniDragon contract will be deployed
     * @param name_ Name of the token
     * @param symbol_ Symbol of the token
     * @param initialSupply Initial supply of tokens
     * @param lzEndpoint Address of the LayerZero endpoint
     * @param jackpotVault Address of the jackpot vault
     * @param ve69LPFeeDistributor Address of the ve69LP fee distributor
     * @param wrappedSonicAddress Address of the wS token
     * @param multisigAddress Address of the multisig
     * @param salt Optional salt value (defaults to DEFAULT_SALT for consistent addresses across chains)
     * @return The address where the OmniDragon contract will be deployed
     */
    function computeOmniDragonAddress(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        address lzEndpoint,
        address jackpotVault,
        address ve69LPFeeDistributor,
        address wrappedSonicAddress,
        address multisigAddress,
        bytes32 salt
    ) public view returns (address) {
        bytes memory bytecode = _getCreationBytecode(
            name_,
            symbol_,
            initialSupply,
            lzEndpoint,
            jackpotVault,
            ve69LPFeeDistributor,
            wrappedSonicAddress,
            multisigAddress
        );
        
        bytes32 bytecodeHash = keccak256(bytecode);
        
        address predictedAddress = address(uint160(uint(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            bytecodeHash
        )))));
        
        return predictedAddress;
    }
    
    /**
     * @dev Deploy OmniDragon with a deterministic address using CREATE2
     * @param name_ Name of the token
     * @param symbol_ Symbol of the token
     * @param initialSupply Initial supply of tokens
     * @param lzEndpoint Address of the LayerZero endpoint
     * @param jackpotVault Address of the jackpot vault
     * @param ve69LPFeeDistributor Address of the ve69LP fee distributor
     * @param wrappedSonicAddress Address of the wS token
     * @param multisigAddress Address of the multisig
     * @param salt Optional salt value (defaults to DEFAULT_SALT for consistent addresses across chains)
     * @return The address of the deployed OmniDragon contract
     */
    function deployOmniDragon(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        address lzEndpoint,
        address jackpotVault,
        address ve69LPFeeDistributor,
        address wrappedSonicAddress,
        address multisigAddress,
        bytes32 salt
    ) public returns (address) {
        bytes memory bytecode = _getCreationBytecode(
            name_,
            symbol_,
            initialSupply,
            lzEndpoint,
            jackpotVault,
            ve69LPFeeDistributor,
            wrappedSonicAddress,
            multisigAddress
        );
        
        // Compute bytecode hash and emit it for verification
        bytes32 bytecodeHash = keccak256(bytecode);
        emit BytecodeChecksumComputed(bytecodeHash);
        
        // Compute and emit deterministic address
        address computedAddress = address(uint160(uint(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            bytecodeHash
        )))));
        emit DeterministicAddressComputed(computedAddress, salt);
        
        address omniDragon;
        
        assembly {
            omniDragon := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if eq(omniDragon, 0) {
                revert(0, 0)
            }
        }
        
        // Verify the deployed address matches the computed address
        require(omniDragon == computedAddress, "Deployed address does not match computed address");
        
        emit OmniDragonDeployed(omniDragon);
        return omniDragon;
    }
    
    /**
     * @dev Helper function to deploy with default salt
     */
    function deployOmniDragonWithDefaultSalt(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        address lzEndpoint,
        address jackpotVault,
        address ve69LPFeeDistributor,
        address wrappedSonicAddress,
        address multisigAddress
    ) external returns (address) {
        return deployOmniDragon(
            name_,
            symbol_,
            initialSupply,
            lzEndpoint,
            jackpotVault,
            ve69LPFeeDistributor,
            wrappedSonicAddress,
            multisigAddress,
            DEFAULT_SALT
        );
    }
    
    /**
     * @dev Helper function to compute address with default salt
     */
    function computeOmniDragonAddressWithDefaultSalt(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        address lzEndpoint,
        address jackpotVault,
        address ve69LPFeeDistributor,
        address wrappedSonicAddress,
        address multisigAddress
    ) external view returns (address) {
        return computeOmniDragonAddress(
            name_,
            symbol_,
            initialSupply,
            lzEndpoint,
            jackpotVault,
            ve69LPFeeDistributor,
            wrappedSonicAddress,
            multisigAddress,
            DEFAULT_SALT
        );
    }
    
    /**
     * @dev Verify the creation bytecode to ensure it will produce the same address
     * @return The bytecode hash for verification
     */
    function getCreationBytecodeHash(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        address lzEndpoint,
        address jackpotVault,
        address ve69LPFeeDistributor,
        address wrappedSonicAddress,
        address multisigAddress
    ) external pure returns (bytes32) {
        bytes memory bytecode = _getCreationBytecode(
            name_,
            symbol_,
            initialSupply,
            lzEndpoint,
            jackpotVault,
            ve69LPFeeDistributor,
            wrappedSonicAddress,
            multisigAddress
        );
        
        return keccak256(bytecode);
    }
    
    /**
     * @dev Get the creation bytecode for the OmniDragon contract
     * @param name_ Name of the token
     * @param symbol_ Symbol of the token
     * @param initialSupply Initial supply of tokens
     * @param lzEndpoint Address of the LayerZero endpoint
     * @param jackpotVault Address of the jackpot vault
     * @param ve69LPFeeDistributor Address of the ve69LP fee distributor
     * @param wrappedSonicAddress Address of the wS token
     * @param multisigAddress Address of the multisig
     * @return The creation bytecode for the OmniDragon contract
     */
    function _getCreationBytecode(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        address lzEndpoint,
        address jackpotVault,
        address ve69LPFeeDistributor,
        address wrappedSonicAddress,
        address multisigAddress
    ) internal pure returns (bytes memory) {
        return abi.encodePacked(
            type(OmniDragon).creationCode,
            abi.encode(
                name_,
                symbol_,
                initialSupply,
                lzEndpoint,
                jackpotVault,
                ve69LPFeeDistributor,
                wrappedSonicAddress,
                multisigAddress
            )
        );
    }
} 