# Dragon Testing: Next Steps

## 1. Priority Tests

- [x] Test Dragon token buy/sell fee calculations (Created `DragonFees.t.sol`)
- [x] Test jackpot prize distribution logic (Created `DragonJackpot.t.sol`) 
- [ ] Test VRF-based randomness integration with lottery (Partially covered in `DragonJackpot.t.sol`)
- [ ] Test LayerZero cross-chain functionality

## 2. Integration Test Scenarios

- [ ] Complete swap workflow: wS -> DRAGON with lottery entry
- [x] User winning the lottery jackpot (Covered in `DragonJackpot.t.sol`)
- [ ] Multi-chain VRF request and randomness fulfillment
- [ ] Proper fee distribution to jackpot and ve69LP (Partially covered in `DragonFees.t.sol`)

## 3. System Tests

- [ ] Load testing with many simultaneous entries
- [ ] Gas optimization measurements
- [ ] Fee collection over long-term operation
- [ ] Security tests (unexpected inputs, edge cases)

## 4. CI/CD Integration

- [ ] Set up GitHub Actions workflow
- [ ] Configure automated test runs
- [ ] Add test coverage reports
- [ ] Create deployment verification tests

## 5. Documentation

- [x] Document test structure (Created `README.md`)
- [ ] Add example test cases
- [ ] Create troubleshooting guide
- [ ] Document mock contract usage

## 6. Next Tasks

1. Create a test for VRF integration focusing on randomness generation
2. Create a test for LayerZero cross-chain messaging with the Dragon contracts
3. Set up CI/CD with basic GitHub Actions workflow
4. Create a more comprehensive documentation for the test suite 