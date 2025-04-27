import React from 'react';
import {
  Box,
  Flex,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  Progress,
  Badge
} from '@chakra-ui/react';
import { FiAward, FiClock } from 'react-icons/fi';

/**
 * Jackpot statistics card component
 * 
 * @param {Object} jackpotInfo - Jackpot information object
 * @param {number} jackpotInfo.balance - Current jackpot balance
 * @param {number} jackpotInfo.winnerCount - Number of jackpot winners
 * @param {string} jackpotInfo.lastWinTime - Timestamp of last win
 * @param {number} jackpotInfo.targetThreshold - Target threshold for jackpot payout
 */
const JackpotCard = ({ jackpotInfo }) => {
  const formatNumber = (num) => {
    return num ? Number(num).toLocaleString() : '—';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  // Calculate progress percentage if targetThreshold exists
  const progressPercentage = jackpotInfo?.targetThreshold && jackpotInfo?.balance
    ? Math.min(100, (Number(jackpotInfo.balance) / Number(jackpotInfo.targetThreshold)) * 100)
    : 0;

  return (
    <Stat p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white" className="stats-card">
      <Flex justifyContent="space-between">
        <Box>
          <StatLabel fontSize="lg">Jackpot Balance</StatLabel>
          <StatNumber>
            {formatNumber(jackpotInfo?.balance)}
          </StatNumber>
          <StatHelpText>$DRAGON</StatHelpText>
        </Box>
        <Box>
          <Icon as={FiAward} w={8} h={8} color="brand.500" />
        </Box>
      </Flex>

      {jackpotInfo?.targetThreshold && (
        <Box mt={3}>
          <Flex justify="space-between" mb={1}>
            <Text fontSize="sm">Progress to Payout Threshold</Text>
            <Text fontSize="sm" fontWeight="bold">
              {progressPercentage.toFixed(1)}%
            </Text>
          </Flex>
          <Progress 
            value={progressPercentage} 
            colorScheme="brand" 
            size="sm" 
            borderRadius="full" 
          />
          <Flex justify="space-between" mt={1}>
            <Text fontSize="xs">Current</Text>
            <Text fontSize="xs">Target: {formatNumber(jackpotInfo.targetThreshold)}</Text>
          </Flex>
        </Box>
      )}

      <Flex mt={4} alignItems="center">
        <Badge colorScheme="green" mr={2}>
          {jackpotInfo?.winnerCount || '0'} Winners
        </Badge>
        {jackpotInfo?.lastWinTime && (
          <Flex alignItems="center" fontSize="sm" color="gray.600">
            <Icon as={FiClock} mr={1} />
            <Text>Last win: {formatTime(jackpotInfo.lastWinTime)}</Text>
          </Flex>
        )}
      </Flex>
    </Stat>
  );
};

export default JackpotCard; 