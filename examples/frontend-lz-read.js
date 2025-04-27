// Frontend example for using the LayerZero Read functionality
import { ethers } from 'ethers';
import { useState, useEffect } from 'react';

// ABI snippets for the EnhancedSonicVRFConsumer
const vrfConsumerAbi = [
  "function queryArbitrumVRFState(bytes calldata _extraOptions) external payable returns (tuple(bytes32 guid, uint256 nonce))",
  "function lastQueriedSubscriptionId() external view returns (uint64)",
  "function lastQueriedKeyHash() external view returns (bytes32)",
  "function lastQueriedConfirmations() external view returns (uint16)",
  "function getJackpotInfo() external view returns (uint256 winProb, uint256 payoutPercent, uint256 balance)",
  "event VRFStateQueried(uint64 subscriptionId, bytes32 keyHash, uint16 confirmations)"
];

// Example React component
function ArbitrumVRFStateViewer() {
  const [loading, setLoading] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [vrfState, setVrfState] = useState(null);
  const [jackpotInfo, setJackpotInfo] = useState(null);
  const [error, setError] = useState(null);
  
  const CONTRACT_ADDRESS = "YOUR_ENHANCED_VRF_CONSUMER_ADDRESS";
  
  useEffect(() => {
    // Fetch jackpot info on load
    fetchJackpotInfo();
    
    // Set up event listener for when VRF state is queried
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, vrfConsumerAbi, provider);
    
    const filter = contract.filters.VRFStateQueried();
    contract.on(filter, (subscriptionId, keyHash, confirmations) => {
      console.log("VRF State updated:", { subscriptionId, keyHash, confirmations });
      setVrfState({
        subscriptionId: subscriptionId.toString(),
        keyHash,
        confirmations: confirmations.toString()
      });
      setQuerying(false);
    });
    
    return () => {
      contract.removeAllListeners();
    };
  }, []);
  
  async function fetchJackpotInfo() {
    setLoading(true);
    setError(null);
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, vrfConsumerAbi, provider);
      
      const [winProb, payoutPercent, balance] = await contract.getJackpotInfo();
      
      setJackpotInfo({
        winProbability: (winProb.toNumber() / 100).toFixed(2) + "%",
        payoutPercentage: (payoutPercent.toNumber() / 100).toFixed(2) + "%",
        jackpotBalance: ethers.utils.formatEther(balance) + " DRAGON"
      });
    } catch (err) {
      console.error("Error fetching jackpot info:", err);
      setError("Failed to fetch jackpot information");
    } finally {
      setLoading(false);
    }
  }
  
  async function queryArbitrumVRFState() {
    setQuerying(true);
    setError(null);
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, vrfConsumerAbi, signer);
      
      // Define options for lzRead
      const options = {
        gasLimit: 200000,
        callDataSize: 96, // Size for 3 responses (uint64 + bytes32 + uint16)
        value: 0
      };
      
      // Encode the options
      const encodedOptions = ethers.utils.solidityPack(
        ["uint256", "uint256", "uint256"],
        [options.gasLimit, options.callDataSize, options.value]
      );
      
      // Execute the query (this initiates the lzRead request)
      const tx = await contract.queryArbitrumVRFState(encodedOptions, {
        value: ethers.utils.parseEther("0.05") // 0.05 ETH for cross-chain fees
      });
      
      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      console.log("Transaction confirmed, awaiting response from LayerZero...");
      
      // Note: The response will be handled by the event listener
      // The UI will update when the VRFStateQueried event is emitted
    } catch (err) {
      console.error("Error querying VRF state:", err);
      setError("Failed to query Arbitrum VRF state");
      setQuerying(false);
    }
  }
  
  if (loading) return <div>Loading jackpot information...</div>;
  
  return (
    <div className="vrf-viewer">
      <h2>Cross-Chain VRF Dashboard</h2>
      
      {error && <div className="error">{error}</div>}
      
      <div className="jackpot-info">
        <h3>Lottery Information</h3>
        {jackpotInfo ? (
          <ul>
            <li>Win Probability: {jackpotInfo.winProbability}</li>
            <li>Payout Percentage: {jackpotInfo.payoutPercentage}</li>
            <li>Current Jackpot: {jackpotInfo.jackpotBalance}</li>
          </ul>
        ) : (
          <p>No jackpot information available</p>
        )}
        <button onClick={fetchJackpotInfo}>Refresh Jackpot Info</button>
      </div>
      
      <div className="vrf-state">
        <h3>Arbitrum VRF Configuration</h3>
        {vrfState ? (
          <ul>
            <li>Subscription ID: {vrfState.subscriptionId}</li>
            <li>Key Hash: {vrfState.keyHash}</li>
            <li>Confirmations: {vrfState.confirmations}</li>
          </ul>
        ) : (
          <p>No VRF state information available</p>
        )}
        <button onClick={queryArbitrumVRFState} disabled={querying}>
          {querying ? "Querying..." : "Query Arbitrum VRF State"}
        </button>
        {querying && <p>This may take a minute as we query the Arbitrum chain via LayerZero...</p>}
      </div>
    </div>
  );
}

export default ArbitrumVRFStateViewer; 