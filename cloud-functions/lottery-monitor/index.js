const functions = require('@google-cloud/functions-framework');
const { ethers } = require('ethers');
const { Logging } = require('@google-cloud/logging');
const { PubSub } = require('@google-cloud/pubsub');
const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config();

// Setup clients
const logging = new Logging();
const log = logging.log('lottery-monitor-function');
const pubsub = new PubSub();
const bigquery = new BigQuery();

// Contract addresses
const LOTTERY_SWAP_ADDRESS = process.env.LOTTERY_SWAP_ADDRESS;

// Events to listen for
const LOTTERY_ABI = [
  "event LotterySwapExecuted(address indexed user, uint256 amountIn, address tokenIn, uint256 amountOut, address tokenOut, uint256 lotteryType, bool isWinner, uint256 jackpotAmount)",
  "event JackpotWon(address indexed winner, uint256 amount, uint256 jackpotType)"
];

/**
 * Creates the BigQuery dataset and table if they don't exist
 */
async function setupBigQuery() {
  const datasetId = 'dragon_lottery';
  const tableId = 'lottery_events';

  // Create dataset if it doesn't exist
  try {
    await bigquery.createDataset(datasetId);
    console.log(`Dataset ${datasetId} created.`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`Dataset ${datasetId} already exists.`);
    } else {
      throw error;
    }
  }

  // Create table if it doesn't exist
  const schema = [
    { name: 'event_type', type: 'STRING' },
    { name: 'user_address', type: 'STRING' },
    { name: 'amount_in', type: 'NUMERIC' },
    { name: 'token_in', type: 'STRING' },
    { name: 'amount_out', type: 'NUMERIC' },
    { name: 'token_out', type: 'STRING' },
    { name: 'lottery_type', type: 'NUMERIC' },
    { name: 'is_winner', type: 'BOOLEAN' },
    { name: 'jackpot_amount', type: 'NUMERIC' },
    { name: 'transaction_hash', type: 'STRING' },
    { name: 'block_number', type: 'NUMERIC' },
    { name: 'timestamp', type: 'TIMESTAMP' }
  ];

  try {
    await bigquery.dataset(datasetId).createTable(tableId, { schema });
    console.log(`Table ${tableId} created.`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`Table ${tableId} already exists.`);
    } else {
      throw error;
    }
  }
}

/**
 * Insert lottery event into BigQuery
 */
async function insertLotteryEvent(eventData) {
  const datasetId = 'dragon_lottery';
  const tableId = 'lottery_events';
  
  const rows = [eventData];
  
  try {
    await bigquery
      .dataset(datasetId)
      .table(tableId)
      .insert(rows);
    console.log(`Inserted lottery event data for tx: ${eventData.transaction_hash}`);
  } catch (error) {
    console.error('Error inserting data:', error);
    throw error;
  }
}

/**
 * Publish event to PubSub for further processing
 */
async function publishEvent(eventData) {
  const topicName = 'lottery-events';
  const messageObject = {
    data: eventData,
    attributes: {
      eventType: eventData.event_type,
      isWinner: eventData.is_winner.toString()
    }
  };
  
  try {
    const messageBuffer = Buffer.from(JSON.stringify(messageObject));
    const messageId = await pubsub.topic(topicName).publish(messageBuffer);
    console.log(`Message ${messageId} published to topic ${topicName}`);
  } catch (error) {
    console.error('Error publishing message:', error);
    throw error;
  }
}

/**
 * Listens for lottery events and processes them
 */
functions.http('monitorLottery', async (req, res) => {
  try {
    // Log function start
    const metadata = {
      resource: {
        type: 'cloud_function',
        labels: {
          function_name: 'monitorLottery'
        }
      }
    };
    
    log.info(log.entry(metadata, 'Starting lottery monitor function'));
    
    // Setup BigQuery tables
    await setupBigQuery();
    
    // Initialize provider
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    
    // Initialize contract
    const lotteryContract = new ethers.Contract(
      LOTTERY_SWAP_ADDRESS,
      LOTTERY_ABI,
      provider
    );
    
    // Get the current block number
    const currentBlock = await provider.getBlockNumber();
    
    // Calculate the starting block (default to 1000 blocks ago if not specified)
    const blocksToScan = process.env.BLOCKS_TO_SCAN || 1000;
    const fromBlock = Math.max(0, currentBlock - parseInt(blocksToScan));
    
    log.info(log.entry(metadata, `Scanning from block ${fromBlock} to ${currentBlock}`));
    
    // Get lottery events
    const lotteryEvents = await lotteryContract.queryFilter(
      'LotterySwapExecuted',
      fromBlock,
      currentBlock
    );
    
    // Get jackpot events
    const jackpotEvents = await lotteryContract.queryFilter(
      'JackpotWon',
      fromBlock,
      currentBlock
    );
    
    log.info(log.entry(metadata, `Found ${lotteryEvents.length} lottery events and ${jackpotEvents.length} jackpot events`));
    
    // Process lottery events
    for (const event of lotteryEvents) {
      const block = await provider.getBlock(event.blockNumber);
      const eventData = {
        event_type: 'LotterySwapExecuted',
        user_address: event.args.user,
        amount_in: event.args.amountIn.toString(),
        token_in: event.args.tokenIn,
        amount_out: event.args.amountOut.toString(),
        token_out: event.args.tokenOut,
        lottery_type: event.args.lotteryType.toNumber(),
        is_winner: event.args.isWinner,
        jackpot_amount: event.args.jackpotAmount.toString(),
        transaction_hash: event.transactionHash,
        block_number: event.blockNumber,
        timestamp: new Date(block.timestamp * 1000).toISOString()
      };
      
      // Insert into BigQuery
      await insertLotteryEvent(eventData);
      
      // Publish event to PubSub
      await publishEvent(eventData);
      
      log.info(log.entry(metadata, `Processed lottery event: ${JSON.stringify(eventData)}`));
    }
    
    // Process jackpot events
    for (const event of jackpotEvents) {
      const block = await provider.getBlock(event.blockNumber);
      const eventData = {
        event_type: 'JackpotWon',
        user_address: event.args.winner,
        amount_in: '0',
        token_in: '',
        amount_out: '0',
        token_out: '',
        lottery_type: event.args.jackpotType.toNumber(),
        is_winner: true,
        jackpot_amount: event.args.amount.toString(),
        transaction_hash: event.transactionHash,
        block_number: event.blockNumber,
        timestamp: new Date(block.timestamp * 1000).toISOString()
      };
      
      // Insert into BigQuery
      await insertLotteryEvent(eventData);
      
      // Publish event to PubSub
      await publishEvent(eventData);
      
      log.info(log.entry(metadata, `Processed jackpot event: ${JSON.stringify(eventData)}`));
    }
    
    res.status(200).send({
      success: true,
      message: 'Lottery monitor function completed',
      lotteryEventsProcessed: lotteryEvents.length,
      jackpotEventsProcessed: jackpotEvents.length
    });
  } catch (error) {
    console.error('Error monitoring lottery:', error);
    log.error(log.entry({}, `Error monitoring lottery: ${error.message}`));
    
    res.status(500).send({
      success: false,
      message: 'Failed to monitor lottery',
      error: error.message
    });
  }
}); 