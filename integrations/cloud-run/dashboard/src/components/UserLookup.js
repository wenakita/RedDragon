import React, { useState } from 'react';
import {
  Box,
  Heading,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  useToast
} from '@chakra-ui/react';
import { FiSearch } from 'react-icons/fi';
import axios from 'axios';
import { ethers } from 'ethers';
import mockData, { mockUserBalance } from '../mockData';

const API_URL = process.env.REACT_APP_API_URL || 'https://dragon-api-893099525123.us-central1.run.app';
const USE_MOCK_DATA = process.env.REACT_APP_MOCK_DATA === 'true';

/**
 * User lookup component for checking Dragon token balances
 */
const UserLookup = () => {
  const [userAddress, setUserAddress] = useState('');
  const [userBalance, setUserBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleUserLookup = async () => {
    if (!ethers.utils.isAddress(userAddress)) {
      toast({
        title: 'Invalid address',
        description: 'Please enter a valid Ethereum address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Use mock data for local development
      if (USE_MOCK_DATA) {
        console.log('Using mock user data for local development');
        setTimeout(() => {
          setUserBalance({
            ...mockUserBalance,
            address: userAddress
          });
          setIsLoading(false);
        }, 500);
        return;
      }
      
      const response = await axios.get(`${API_URL}/api/user/${userAddress}`);
      setUserBalance(response.data);
    } catch (err) {
      console.error('Error fetching user balance:', err);
      toast({
        title: 'Error',
        description: 'Could not fetch user balance. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={6} shadow="md" borderWidth="1px" borderRadius="lg" bg="white" mb={10}>
      <Heading as="h3" size="md" mb={4}>Check User Balance</Heading>
      <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
        <FormControl flex="1">
          <FormLabel>Wallet Address</FormLabel>
          <Input 
            placeholder="0x..." 
            value={userAddress} 
            onChange={e => setUserAddress(e.target.value)}
          />
        </FormControl>
        <Button 
          colorScheme="brand" 
          onClick={handleUserLookup} 
          leftIcon={<FiSearch />}
          alignSelf={{ base: 'flex-start', md: 'flex-end' }}
          mt={{ base: 2, md: 0 }}
          isLoading={isLoading}
          loadingText="Looking up"
        >
          Lookup
        </Button>
      </Flex>
      
      {userBalance && (
        <Box mt={4} p={4} bg="gray.50" borderRadius="md">
          <Flex justify="space-between">
            <Text fontWeight="bold">Address:</Text>
            <Text>{userBalance.address}</Text>
          </Flex>
          <Flex justify="space-between" mt={2}>
            <Text fontWeight="bold">Dragon Balance:</Text>
            <Text>{Number(userBalance.dragonBalance).toLocaleString()} $DRAGON</Text>
          </Flex>
          {userBalance.ve69LPLock && (
            <Flex justify="space-between" mt={2}>
              <Text fontWeight="bold">ve69LP Lock:</Text>
              <Text>{Number(userBalance.ve69LPLock).toLocaleString()} ve69LP</Text>
            </Flex>
          )}
        </Box>
      )}
    </Box>
  );
};

export default UserLookup; 