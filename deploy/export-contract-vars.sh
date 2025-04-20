#!/bin/bash
# Export contract addresses as environment variables

# IMPORTANT: Before running the deployment, replace these placeholder values with 
# your actual deployed contract addresses on the Sonic chain.
# 
# If you haven't deployed the contracts yet, you will need to:
# 1. Deploy the contracts using Hardhat scripts in the /scripts directory
# 2. Update this file with the deployed addresses
# 3. Run 'source deployment-files/export-contract-vars.sh'
# 4. Continue the deployment with './dragon-deploy.sh --continue'

export DRAGON_ADDRESS="0x10eeEA6C868Ef069e3571933ea6AF2b91922b637" # Main $DRAGON token address
export VRF_VALIDATOR_ADDRESS="" # VRF validator contract address (not in list)
export LOTTERY_SWAP_ADDRESS="0xF52b4D3B2608B02F8d2F9Ead4282F0378aCC5845" # Dragon Lottery Swap contract address (ConcreteDragonLotterySwap)
export GOLD_SCRATCHER_ADDRESS="0xe66EC78fA742B98b8a3AD7107F392EECBbDC77D5" # Gold Scratcher contract address
export COMPENSATION_ADDRESS="" # Delayed Entry Compensation contract address (not in list)
export JACKPOT_VAULT_ADDRESS="" # Jackpot Vault contract address (not in list)
export RED_ENVELOPES_ADDRESS="" # Red Envelopes contract address (not in list)
export VE69LP_ADDRESS="0xb5C23c1F2BeBA4575F845DEc0E585E404BEE3082" # Ve69LP Token address
export VE69LP_FEE_DISTRIBUTOR="0xc51EFC97d7619F202EF176232C52E42ea4A05e25" # Ve69LPFeeDistributor address
export PROMOTIONAL_ITEM_REGISTRY="0x7D4a9b727BC722F522BC630f01883B002B80953b" # PromotionalItemRegistry address
export MOCK_PAINTSWAP_VERIFIER="0xb8249eeFe931A74269F2650f125936f506FceaA9" # MockPaintSwapVerifier address

echo "Environment variables for contract addresses have been set."
