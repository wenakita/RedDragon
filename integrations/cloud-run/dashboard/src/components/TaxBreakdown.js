import React from 'react';
import {
  Box,
  Flex,
  Text,
  Stat,
  StatLabel,
  Icon,
  Divider
} from '@chakra-ui/react';
import { FiPercent } from 'react-icons/fi';

/**
 * TaxBreakdown component showing Dragon token tax information
 * 
 * @param {Object} taxes - Tax configuration object
 * @param {number} taxes.jackpotBuy - Jackpot buy tax in basis points (e.g. 690 = 6.9%)
 * @param {number} taxes.jackpotSell - Jackpot sell tax in basis points
 * @param {number} taxes.feeBuy - Fee distributor buy tax in basis points
 * @param {number} taxes.feeSell - Fee distributor sell tax in basis points
 * @param {number} taxes.burn - Burn tax in basis points (e.g. 69 = 0.69%)
 */
const TaxBreakdown = ({ taxes }) => {
  // Utility to convert basis points to percentage string
  const formatBasisPoints = (basisPoints) => {
    if (basisPoints === undefined || basisPoints === null) return '—';
    
    // Convert basis points (e.g. 690 = 6.9%)
    const percentage = Number(basisPoints) / 100;
    return `${percentage.toFixed(2)}%`;
  };
  
  // Calculate total buy and sell taxes if all component taxes exist
  const calculateTotal = (type) => {
    if (!taxes) return '—';
    
    let total = 0;
    if (taxes[`jackpot${type}`]) total += Number(taxes[`jackpot${type}`]);
    if (taxes[`fee${type}`]) total += Number(taxes[`fee${type}`]);
    if (taxes.burn) total += Number(taxes.burn);
    
    return formatBasisPoints(total);
  };

  return (
    <Stat p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white" className="stats-card">
      <Flex justifyContent="space-between">
        <StatLabel fontSize="lg">Tax Information</StatLabel>
        <Icon as={FiPercent} w={6} h={6} color="brand.500" />
      </Flex>
      
      {taxes && (
        <Box mt={2}>
          <Flex justifyContent="space-between" mb={1}>
            <Text fontWeight="bold">Total Buy Tax:</Text>
            <Text fontWeight="bold" color="brand.500">{calculateTotal('Buy')}</Text>
          </Flex>
          <Divider my={2} />
          
          <Flex justify="space-between" mt={2}>
            <Text>Jackpot Buy Fee:</Text>
            <Text>{formatBasisPoints(taxes.jackpotBuy)}</Text>
          </Flex>
          <Flex justify="space-between" mt={1}>
            <Text>Fee Distributor Buy:</Text>
            <Text>{formatBasisPoints(taxes.feeBuy)}</Text>
          </Flex>
          
          <Divider my={3} />
          
          <Flex justifyContent="space-between" mb={1}>
            <Text fontWeight="bold">Total Sell Tax:</Text>
            <Text fontWeight="bold" color="brand.500">{calculateTotal('Sell')}</Text>
          </Flex>
          <Divider my={2} />
          
          <Flex justify="space-between" mt={2}>
            <Text>Jackpot Sell Fee:</Text>
            <Text>{formatBasisPoints(taxes.jackpotSell)}</Text>
          </Flex>
          <Flex justify="space-between" mt={1}>
            <Text>Fee Distributor Sell:</Text>
            <Text>{formatBasisPoints(taxes.feeSell)}</Text>
          </Flex>
          
          {taxes.burn !== undefined && (
            <>
              <Divider my={3} />
              <Flex justify="space-between" mt={2}>
                <Text>Burn Rate:</Text>
                <Text>{formatBasisPoints(taxes.burn)}</Text>
              </Flex>
            </>
          )}
        </Box>
      )}
    </Stat>
  );
};

export default TaxBreakdown; 