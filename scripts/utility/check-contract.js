const { ethers } = require('ethers');
require('dotenv').config();

async function checkContract() {
  try {
    const provider = new ethers.JsonRpcProvider('https://rpc.soniclabs.com');
    const code = await provider.getCode('0x171B882FBB125B14a09F9f9DA11CD1E7440A42ef');
    console.log('Contract code exists:', code !== '0x');
    console.log('Code length:', (code.length - 2) / 2, 'bytes');
    
    // Try to get owner
    const ownerAbi = ['function owner() view returns (address)'];
    const contract = new ethers.Contract('0x171B882FBB125B14a09F9f9DA11CD1E7440A42ef', ownerAbi, provider);
    try {
      const owner = await contract.owner();
      console.log('Contract owner:', owner);
    } catch (e) {
      console.log('Could not get owner:', e.message);
    }
    
    // Try to get VRF info
    const vrfAbi = [
      'function vrfCoordinator() view returns (address)',
      'function subscriptionId() view returns (uint64)',
      'function gasLane() view returns (bytes32)',
      'function callbackGasLimit() view returns (uint32)',
      'function requestConfirmations() view returns (uint16)'
    ];
    const vrfContract = new ethers.Contract('0x171B882FBB125B14a09F9f9DA11CD1E7440A42ef', vrfAbi, provider);
    try {
      const coordinator = await vrfContract.vrfCoordinator();
      console.log('VRF Coordinator:', coordinator);
      
      const subId = await vrfContract.subscriptionId();
      console.log('Subscription ID:', subId.toString());
      
      const gasLane = await vrfContract.gasLane();
      console.log('Gas Lane:', gasLane);
      
      const gasLimit = await vrfContract.callbackGasLimit();
      console.log('Callback Gas Limit:', gasLimit.toString());
      
      const confirmations = await vrfContract.requestConfirmations();
      console.log('Request Confirmations:', confirmations.toString());
    } catch (e) {
      console.log('Could not get VRF info:', e.message);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

checkContract(); 