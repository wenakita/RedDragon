# Contributing to SonicRedDragon

We love your input! We want to make contributing to SonicRedDragon as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

### Coding Style

* Use 4 spaces for indentation in Solidity files
* Use 2 spaces for indentation in JavaScript/TypeScript files
* Keep line length to a reasonable limit (120 characters)
* Add appropriate NatSpec comments to all Solidity contracts
* Follow the standard style conventions for Solidity and JavaScript
* Use async/await instead of promise chains

## Testing

Before submitting a PR, ensure all tests pass by running:

```bash
npx hardhat test
```

If you're adding new functionality, please include appropriate tests.

## Contract Development Guidelines

### Security Focused

* Avoid complex code structures that might introduce vulnerabilities
* Follow best practices for secure Solidity development
* Always consider potential attack vectors
* Use SafeMath or overflow-safe compiler version
* Use require statements with clear error messages
* Limit administrative capabilities and trust assumptions

### Gas Optimization

* Balance security with gas optimization
* Consider batching operations where it makes sense
* Avoid unnecessary storage operations
* Use memory for temporary computation
* Be mindful of loop operations

## Current Project Areas

These are areas of the project that currently need attention:

1. **ve(80/20) System**: Improving the voting escrow system for 80/20 LP tokens
2. **Lottery Mechanics**: Enhancing PaintSwap VRF integration and probability calculations
3. **Frontend Integration**: Building UI components for the ve(80/20) system
4. **Testing**: Expanding test coverage for edge cases
5. **Documentation**: Improving developer and user documentation

## License

By contributing, you agree that your contributions will be licensed under the project's license.

## Questions?

Feel free to contact the core development team if you have questions about the project or the contribution process.

Thank you for your interest in improving SonicRedDragon! 