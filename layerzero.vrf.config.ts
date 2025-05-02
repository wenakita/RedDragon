import { EndpointId } from '@layerzerolabs/lz-definitions';
import type { OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat';
import { OAppEnforcedOption } from '@layerzerolabs/toolbox-hardhat';
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities';
import { TwoWayConfig, generateConnectionsConfig } from '@layerzerolabs/metadata-tools';

// Define VRF contracts on each chain
const arbitrumVRFRequester: OmniPointHardhat = {
  eid: EndpointId.ARBITRUM_V2_MAINNET, // Arbitrum = 110
  contractName: 'ArbitrumVRFRequester',
};

const sonicVRFConsumer: OmniPointHardhat = {
  eid: 146, // Sonic Mainnet EID = 146
  contractName: 'SonicVRFConsumer',
};

// Common execution options for VRF messages
// VRF needs higher gas limits due to randomness processing
const VRF_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
  {
    msgType: 1,
    optionType: ExecutorOptionType.LZ_RECEIVE,
    gas: 500000, // Higher gas limit for VRF operations
    value: 0,
  },
];

// Define pathways between chains
const pathways: TwoWayConfig[] = [
  [
    // 1) Arbitrum VRF Requester
    arbitrumVRFRequester,

    // 2) Sonic VRF Consumer
    sonicVRFConsumer,

    // 3) Channel security settings
    // Required DVNs, Optional DVNs and threshold
    [['LayerZero Labs'], []],

    // 4) Block confirmations
    [20, 20], // [arbitrum→sonic, sonic→arbitrum]

    // 5) Enforced execution options
    [VRF_ENFORCED_OPTIONS, VRF_ENFORCED_OPTIONS], // [arbitrum→sonic, sonic→arbitrum]
  ],
];

// Export configuration
export default async function () {
  // Generate the connections config based on the pathways
  const connections = await generateConnectionsConfig(pathways);
  
  return {
    contracts: [
      { contract: arbitrumVRFRequester },
      { contract: sonicVRFConsumer }
    ],
    connections,
  };
} 