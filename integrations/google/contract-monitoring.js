// Smart Contract Monitoring via Google Cloud Functions
const { BigQuery } = require('@google-cloud/bigquery');
const { PubSub } = require('@google-cloud/pubsub');
const { Logging } = require('@google-cloud/logging');
const { ethers } = require('ethers');

// Configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'dragon-ecosystem';
const RPC_URL = process.env.RPC_URL || 'https://mainnet.sonic.fantom.network/';
const PHASE_STATUS = process.env.DEPLOYMENT_PHASE || 'phase1';

// Initialize Google Cloud clients
const bigquery = new BigQuery({ projectId: PROJECT_ID });
const pubsub = new PubSub({ projectId: PROJECT_ID });
const logging = new Logging({ projectId: PROJECT_ID });
const log = logging.log('dragon-contract-monitoring');

// Contract addresses and ABIs - load from environment or config file
const CONTRACT_ADDRESSES = {
  beetsLP: process.env.BEETS_LP_ADDRESS,
  ve69LP: process.env.VE69LP_ADDRESS,
  poolVoting: process.env.POOL_VOTING_ADDRESS,
  dragonSwapper: process.env.DRAGON_SWAPPER_ADDRESS
};

// Topic names for PubSub events
const TOPICS = {
  lpCreated: 'lp-created',
  lpLocked: 'lp-locked',
  votesCast: 'votes-cast',
  partnerBoost: 'partner-boost'
};

// Initialize provider and contract interfaces
let provider;
let contracts = {};

/**
 * Initialize the monitoring system
 */
async function initialize() {
  try {
    // Create Ethereum provider
    provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    // Create topics if they don't exist
    await createTopicsIfNotExist();
    
    // Initialize contract interfaces
    await initializeContracts();
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing contract monitoring:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create PubSub topics if they don't exist
 */
async function createTopicsIfNotExist() {
  try {
    for (const [key, topicName] of Object.entries(TOPICS)) {
      const fullTopicName = `dragon-${topicName}`;
      const [exists] = await pubsub.topic(fullTopicName).exists();
      
      if (!exists) {
        await pubsub.createTopic(fullTopicName);
        console.log(`Created topic: ${fullTopicName}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error creating topics:', error);
    return false;
  }
}

/**
 * Initialize contract interfaces
 */
async function initializeContracts() {
  try {
    // Load ABIs
    const beetsLPAbi = require('./abis/BeetsLP.json');
    const ve69LPAbi = require('./abis/ve69LP.json');
    const poolVotingAbi = require('./abis/ve69LPPoolVoting.json');
    const dragonSwapperAbi = require('./abis/DragonShadowV3Swapper.json');
    
    // Create contract instances if addresses are provided
    if (CONTRACT_ADDRESSES.beetsLP) {
      contracts.beetsLP = new ethers.Contract(
        CONTRACT_ADDRESSES.beetsLP,
        beetsLPAbi,
        provider
      );
    }
    
    if (CONTRACT_ADDRESSES.ve69LP) {
      contracts.ve69LP = new ethers.Contract(
        CONTRACT_ADDRESSES.ve69LP,
        ve69LPAbi,
        provider
      );
    }
    
    if (CONTRACT_ADDRESSES.poolVoting) {
      contracts.poolVoting = new ethers.Contract(
        CONTRACT_ADDRESSES.poolVoting,
        poolVotingAbi,
        provider
      );
    }
    
    if (CONTRACT_ADDRESSES.dragonSwapper) {
      contracts.dragonSwapper = new ethers.Contract(
        CONTRACT_ADDRESSES.dragonSwapper,
        dragonSwapperAbi,
        provider
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing contracts:', error);
    return false;
  }
}

/**
 * Start monitoring contract events
 */
async function startMonitoring() {
  try {
    // Monitor ve69LP events
    if (contracts.ve69LP) {
      // Lock events
      contracts.ve69LP.on('Locked', async (user, amount, lockDuration, event) => {
        await handleLockEvent(user, amount, lockDuration, event);
      });
      
      // Unlock events
      contracts.ve69LP.on('Withdrawn', async (user, amount, event) => {
        await handleUnlockEvent(user, amount, event);
      });
    }
    
    // Monitor voting events
    if (contracts.poolVoting) {
      contracts.poolVoting.on('VoteCast', async (voter, partnerId, voteAmount, event) => {
        await handleVoteEvent(voter, partnerId, voteAmount, event);
      });
      
      contracts.poolVoting.on('BoostCalculated', async (period, event) => {
        await handleBoostCalculationEvent(period, event);
      });
    }
    
    // Monitor swapper events
    if (contracts.dragonSwapper) {
      contracts.dragonSwapper.on('SwapWithJackpotEntry', async (user, x33Amount, beetsLpReceived, wsEquivalent, boost, feeAmount, event) => {
        await handleSwapEvent(user, x33Amount, beetsLpReceived, wsEquivalent, boost, feeAmount, event);
      });
      
      contracts.dragonSwapper.on('ProbabilityBoosted', async (partner, boost, wsEquivalent, event) => {
        await handleProbabilityBoostEvent(partner, boost, wsEquivalent, event);
      });
      
      // Listen for feature flag updates
      contracts.dragonSwapper.on('FeatureFlagUpdated', async (featureName, enabled, event) => {
        await handleFeatureFlagEvent(featureName, enabled, event);
      });
    }
    
    console.log('Contract monitoring started');
    return { success: true };
  } catch (error) {
    console.error('Error starting contract monitoring:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle LP token lock event
 */
async function handleLockEvent(user, amount, lockDuration, event) {
  try {
    const metadata = {
      event: 'LP_LOCKED',
      user: user,
      amount: amount.toString(),
      lockDuration: lockDuration.toString(),
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: Date.now(),
      phase: PHASE_STATUS
    };
    
    // Log the event
    const entry = log.entry(metadata, `LP locked by ${user}: ${ethers.utils.formatEther(amount)} for ${lockDuration/86400} days`);
    await log.write(entry);
    
    // Publish to PubSub
    const topic = pubsub.topic(`dragon-${TOPICS.lpLocked}`);
    await topic.publish(Buffer.from(JSON.stringify(metadata)));
    
    // Track analytics
    if (process.env.ANALYTICS_ENABLED === 'true') {
      const analytics = require('./analytics');
      await analytics.trackBlockchainEvent('lp_token_locked', {
        contract_address: CONTRACT_ADDRESSES.ve69LP,
        lp_amount: ethers.utils.formatEther(amount),
        lock_duration: lockDuration.toNumber(),
        phase: PHASE_STATUS
      }, user);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error handling lock event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle LP token unlock/withdrawal event
 */
async function handleUnlockEvent(user, amount, event) {
  try {
    const metadata = {
      event: 'LP_WITHDRAWN',
      user: user,
      amount: amount.toString(),
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: Date.now(),
      phase: PHASE_STATUS
    };
    
    // Log the event
    const entry = log.entry(metadata, `LP withdrawn by ${user}: ${ethers.utils.formatEther(amount)}`);
    await log.write(entry);
    
    // No need to publish to PubSub for withdrawals
    
    // Track analytics
    if (process.env.ANALYTICS_ENABLED === 'true') {
      const analytics = require('./analytics');
      await analytics.trackBlockchainEvent('lp_token_withdrawn', {
        contract_address: CONTRACT_ADDRESSES.ve69LP,
        lp_amount: ethers.utils.formatEther(amount),
        phase: PHASE_STATUS
      }, user);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error handling unlock event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle vote casting event
 */
async function handleVoteEvent(voter, partnerId, voteAmount, event) {
  try {
    const metadata = {
      event: 'VOTE_CAST',
      voter: voter,
      partnerId: partnerId.toString(),
      voteAmount: voteAmount.toString(),
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: Date.now(),
      phase: PHASE_STATUS
    };
    
    // Log the event
    const entry = log.entry(metadata, `Vote cast by ${voter} for partner ${partnerId}: ${ethers.utils.formatEther(voteAmount)}`);
    await log.write(entry);
    
    // Publish to PubSub
    const topic = pubsub.topic(`dragon-${TOPICS.votesCast}`);
    await topic.publish(Buffer.from(JSON.stringify(metadata)));
    
    // Track analytics
    if (process.env.ANALYTICS_ENABLED === 'true') {
      const analytics = require('./analytics');
      await analytics.trackBlockchainEvent('vote_cast', {
        contract_address: CONTRACT_ADDRESSES.poolVoting,
        partner_id: partnerId.toString(),
        vote_power: ethers.utils.formatEther(voteAmount),
        phase: PHASE_STATUS
      }, voter);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error handling vote event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle boost calculation event
 */
async function handleBoostCalculationEvent(period, event) {
  try {
    const metadata = {
      event: 'BOOST_CALCULATED',
      period: period.toString(),
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: Date.now(),
      phase: PHASE_STATUS
    };
    
    // Log the event
    const entry = log.entry(metadata, `Boosts calculated for period ${period}`);
    await log.write(entry);
    
    // Don't need to publish this to PubSub as it's an internal event
    
    // Track analytics
    if (process.env.ANALYTICS_ENABLED === 'true') {
      const analytics = require('./analytics');
      await analytics.trackBlockchainEvent('boosts_calculated', {
        contract_address: CONTRACT_ADDRESSES.poolVoting,
        period: period.toString(),
        phase: PHASE_STATUS
      }, event.transaction.from);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error handling boost calculation event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle swap event
 */
async function handleSwapEvent(user, x33Amount, beetsLpReceived, wsEquivalent, boost, feeAmount, event) {
  try {
    const metadata = {
      event: 'SWAP_WITH_JACKPOT',
      user: user,
      x33Amount: x33Amount.toString(),
      beetsLpReceived: beetsLpReceived.toString(),
      wsEquivalent: wsEquivalent.toString(),
      boost: boost.toString(),
      feeAmount: feeAmount.toString(),
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: Date.now(),
      phase: PHASE_STATUS
    };
    
    // Log the event
    const entry = log.entry(metadata, `Swap by ${user}: ${ethers.utils.formatEther(x33Amount)} x33 with ${boost/100}% boost`);
    await log.write(entry);
    
    // Track analytics
    if (process.env.ANALYTICS_ENABLED === 'true') {
      const analytics = require('./analytics');
      await analytics.trackBlockchainEvent('swap_with_jackpot', {
        contract_address: CONTRACT_ADDRESSES.dragonSwapper,
        x33_amount: ethers.utils.formatEther(x33Amount),
        boost_percentage: boost.toNumber() / 100, // Convert from basis points to percentage
        ws_equivalent: ethers.utils.formatEther(wsEquivalent),
        fee_amount: ethers.utils.formatEther(feeAmount),
        phase: PHASE_STATUS
      }, user);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error handling swap event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle probability boost event
 */
async function handleProbabilityBoostEvent(partner, boost, wsEquivalent, event) {
  try {
    const metadata = {
      event: 'PROBABILITY_BOOSTED',
      partner: partner,
      boost: boost.toString(),
      wsEquivalent: wsEquivalent.toString(),
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: Date.now(),
      phase: PHASE_STATUS
    };
    
    // Log the event
    const entry = log.entry(metadata, `Partner boost for ${partner}: ${boost/100}% on ${ethers.utils.formatEther(wsEquivalent)} wS`);
    await log.write(entry);
    
    // Publish to PubSub
    const topic = pubsub.topic(`dragon-${TOPICS.partnerBoost}`);
    await topic.publish(Buffer.from(JSON.stringify(metadata)));
    
    // Track analytics
    if (process.env.ANALYTICS_ENABLED === 'true') {
      const analytics = require('./analytics');
      await analytics.trackBlockchainEvent('partner_boost_applied', {
        contract_address: CONTRACT_ADDRESSES.dragonSwapper,
        partner_address: partner,
        boost_basis_points: boost.toNumber(),
        ws_equivalent: ethers.utils.formatEther(wsEquivalent),
        phase: PHASE_STATUS
      }, event.transaction.from);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error handling probability boost event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle feature flag update event
 */
async function handleFeatureFlagEvent(featureName, enabled, event) {
  try {
    const metadata = {
      event: 'FEATURE_FLAG_UPDATED',
      featureName,
      enabled,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: Date.now(),
      phase: PHASE_STATUS
    };
    
    // Log the event
    const entry = log.entry(metadata, `Feature flag ${featureName} set to ${enabled}`);
    await log.write(entry);
    
    // Track analytics
    if (process.env.ANALYTICS_ENABLED === 'true') {
      const analytics = require('./analytics');
      await analytics.trackBlockchainEvent('feature_flag_updated', {
        contract_address: CONTRACT_ADDRESSES.dragonSwapper,
        feature_name: featureName,
        enabled: enabled,
        phase: PHASE_STATUS
      }, event.transaction.from);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error handling feature flag event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cloud Function entry point for HTTP trigger
 */
exports.monitorContractsHttp = async (req, res) => {
  try {
    await initialize();
    await startMonitoring();
    
    res.status(200).send({
      success: true,
      message: 'Contract monitoring started',
      monitoring: Object.keys(contracts).map(key => ({ 
        contract: key, 
        address: CONTRACT_ADDRESSES[key]
      }))
    });
  } catch (error) {
    console.error('Error in monitoring contracts:', error);
    res.status(500).send({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cloud Function entry point for PubSub trigger
 */
exports.processContractEvent = async (message, context) => {
  try {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    console.log(`Processing event: ${data.event}`);
    
    // Store event in BigQuery for analytics
    if (data.event) {
      const analytics = require('./analytics');
      await analytics.storeEventInBigQuery(data.event.toLowerCase(), data);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error processing contract event:', error);
    return { success: false, error: error.message };
  }
}; 