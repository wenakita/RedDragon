// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./MockBalancerPoolToken.sol";

/**
 * @title MockBalancerWeightedPoolV3
 * @dev Mock implementation of Balancer WeightedPool V3 for testing
 * Simplified version to test Dragon integration with Balancer pools
 */
contract MockBalancerWeightedPoolV3 {
    address public immutable vault;
    MockBalancerPoolToken public immutable bpt;
    bytes32 public immutable poolId;
    
    // Pool tokens (typically Dragon and WSONIC)
    address[] public tokens;
    uint256[] public normalizedWeights;
    uint256[] public balances;
    
    // Pool settings
    string public name;
    string public symbol;
    uint256 public swapFeePercentage;
    
    // Events
    event WeightsUpdated(uint256[] weights);
    event PoolInitialized();
    
    constructor(
        address _vault,
        string memory _name,
        string memory _symbol,
        address[] memory _tokens,
        uint256[] memory _weights,
        uint256 _swapFeePercentage
    ) {
        require(_tokens.length == _weights.length, "Tokens and weights length mismatch");
        require(_tokens.length == 2, "Only 2-token pools supported in this mock");
        
        vault = _vault;
        name = _name;
        symbol = _symbol;
        tokens = _tokens;
        normalizedWeights = _weights;
        swapFeePercentage = _swapFeePercentage;
        
        // Generate pool ID (typically the pool address)
        poolId = bytes32(uint256(uint160(address(this))));
        
        // Create BPT token
        bpt = new MockBalancerPoolToken(
            _name,
            _symbol,
            _vault
        );
    }
    
    /**
     * @dev Get pool ID for this weighted pool
     * @return Pool ID as bytes32
     */
    function getPoolId() external view returns (bytes32) {
        return poolId;
    }
    
    /**
     * @dev Get normalized weights for the pool tokens
     * @return Array of normalized weights (percentages in 18 decimals)
     */
    function getNormalizedWeights() external view returns (uint256[] memory) {
        return normalizedWeights;
    }
    
    /**
     * @dev Update token balances (for testing)
     * @param _balances New token balances
     */
    function setBalances(uint256[] memory _balances) external {
        require(_balances.length == tokens.length, "Balances length mismatch");
        balances = _balances;
    }
    
    /**
     * @dev Update normalized weights (for testing)
     * @param _weights New token weights
     */
    function setWeights(uint256[] memory _weights) external {
        require(_weights.length == tokens.length, "Weights length mismatch");
        normalizedWeights = _weights;
        emit WeightsUpdated(_weights);
    }
    
    /**
     * @dev Get tokens in the pool
     * @return Array of token addresses
     */
    function getTokens() external view returns (address[] memory) {
        return tokens;
    }
    
    /**
     * @dev Get current token balances
     * @return Array of token balances
     */
    function getBalances() external view returns (uint256[] memory) {
        return balances;
    }
    
    /**
     * @dev Get BPT token address
     * @return Address of the pool token
     */
    function getPoolTokenAddress() external view returns (address) {
        return address(bpt);
    }
    
    /**
     * @dev Get the total supply of BPT tokens
     * @return Total BPT supply
     */
    function getTotalSupply() external view returns (uint256) {
        return bpt.totalSupply();
    }
    
    /**
     * @dev Calculate the spot price between two tokens
     * Using the formula: spotPrice = (balanceOut / weightOut) / (balanceIn / weightIn)
     * @param tokenIn Address of the input token
     * @param tokenOut Address of the output token
     * @return Spot price as a fixed point number (with 18 decimals)
     */
    function getSpotPrice(address tokenIn, address tokenOut) external view returns (uint256) {
        // Find indices of the tokens
        uint256 indexIn;
        uint256 indexOut;
        bool foundIn = false;
        bool foundOut = false;
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenIn) {
                indexIn = i;
                foundIn = true;
            }
            if (tokens[i] == tokenOut) {
                indexOut = i;
                foundOut = true;
            }
        }
        
        require(foundIn && foundOut, "Token not in pool");
        
        // Calculate spot price using the weighted formula
        // spotPrice = (balanceOut / weightOut) / (balanceIn / weightIn)
        uint256 balanceOut = balances[indexOut];
        uint256 weightOut = normalizedWeights[indexOut];
        uint256 balanceIn = balances[indexIn];
        uint256 weightIn = normalizedWeights[indexIn];
        
        // To avoid precision loss during calculation, first multiply by 1e18
        // Then do the division, this ensures we have more precision in the result
        uint256 numerator = balanceOut * 1e18 / weightOut;
        uint256 denominator = balanceIn * 1e18 / weightIn;
        
        // Return spot price with 18 decimal places
        if (denominator == 0) return 0;
        return (numerator * 1e18) / denominator;
    }
} 