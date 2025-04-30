## Foundry

[![VRF Tests](https://github.com/yourusername/SonicRedDragon/actions/workflows/vrf-tests.yml/badge.svg)](https://github.com/yourusername/SonicRedDragon/actions/workflows/vrf-tests.yml)

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

-   **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
-   **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
-   **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
-   **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

## VRF Implementation Testing

The project includes comprehensive tests for the cross-chain VRF (Verifiable Random Function) implementation, which connects the Sonic and Arbitrum chains through LayerZero.

### Testing Framework

We use two testing frameworks:

1. **Hardhat**: For JavaScript-based testing
2. **Forge**: For Solidity-based testing

### Key VRF Test Files

- **test/vrf-implementation.test.js**: JavaScript tests for the VRF implementation
- **contracts/mocks/VRFTestHelper.sol**: Helper contract for testing VRF functionality
- **test/forge/CrossChainVRFTest.t.sol**: Forge tests for cross-chain VRF flow
- **test/forge/VRFReadTest.t.sol**: Forge tests for lzRead functionality
- **test/forge/VRFFallbackTest.t.sol**: Forge tests for error handling and recovery

### Running the Tests

#### Hardhat Tests

```bash
npx hardhat test test/vrf-implementation.test.js
```

#### Forge Tests

```bash
forge test --match-path test/forge/VRF*.t.sol -vvv
```

For more detailed instructions on testing the VRF implementation, see [VRF-TESTING-GUIDE.md](./VRF-TESTING-GUIDE.md).

### VRF Implementation Details

Our VRF implementation follows these principles:

1. **Cross-Chain Randomness**: Requests from Sonic chain, fulfillment on Arbitrum via Chainlink VRF
2. **Secure Flow**: Proper validation of source chains, addresses, and request IDs
3. **Recovery Mechanisms**: Retry functionality for failed message delivery or VRF outages
4. **Administrative Controls**: Owner-only parameter updates with proper access controls
5. **Error Handling**: Graceful handling of failures in the randomness processing pipeline
