import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  SimpleGrid, 
  Flex,
  Divider,
  useToast,
  Alert,
  AlertIcon,
  Spinner,
  Center,
  Image
} from '@chakra-ui/react';
import { FiDollarSign, FiUsers, FiPercent } from 'react-icons/fi';
import axios from 'axios';
import { ethers } from 'ethers';
import './App.css';

// Import components
import StatsCard from './components/StatsCard';
import JackpotCard from './components/JackpotCard';
import TaxBreakdown from './components/TaxBreakdown';
import UserLookup from './components/UserLookup';
import InfoCard from './components/InfoCard';
import mockData, { mockDragonInfo, mockJackpotInfo } from './mockData';

const API_URL = process.env.REACT_APP_API_URL || 'https://dragon-api-893099525123.us-central1.run.app';
const RPC_URL = process.env.REACT_APP_RPC_URL || 'https://rpc.soniclabs.com';
const USE_MOCK_DATA = process.env.REACT_APP_MOCK_DATA === 'true';

function App() {
  const [dragonInfo, setDragonInfo] = useState(null);
  const [jackpotInfo, setJackpotInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  // Fetch Dragon info from the API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use mock data for local development
        if (USE_MOCK_DATA) {
          console.log('Using mock data for local development');
          setDragonInfo(mockDragonInfo);
          setJackpotInfo(mockJackpotInfo);
          setLoading(false);
          return;
        }
        
        // Try to connect directly to the blockchain if API fails
        if (window.ethereum) {
          try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            console.log('Connected to MetaMask');
          } catch (err) {
            console.error('Error connecting to MetaMask:', err);
          }
        }
        
        // Fetch from the API
        try {
          const [dragonResponse, jackpotResponse] = await Promise.all([
            axios.get(`${API_URL}/api/dragon/info`),
            axios.get(`${API_URL}/api/jackpot/info`)
          ]);
          
          setDragonInfo(dragonResponse.data);
          setJackpotInfo(jackpotResponse.data);
        } catch (err) {
          console.error('API Error:', err);
          setError('Could not connect to the Dragon API. Please check your network connection or try again later.');
          
          // Fallback to direct blockchain connection
          try {
            const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
            console.log('Using direct RPC connection');
            
            // In a real application, you would create contract instances and fetch data directly
          } catch (rpcErr) {
            console.error('RPC Error:', rpcErr);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Setup an interval to refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Container maxW="container.xl" py={8}>
      <Flex align="center" mb={6}>
        <Image src="/favicon.svg" alt="Dragon Logo" boxSize="50px" mr={4} />
        <Box>
          <Heading as="h1" size="2xl" mb={2} color="brand.500" className="app-header">Dragon Dashboard</Heading>
          <Text fontSize="lg" color="gray.600">
            Monitor statistics for the Dragon Project on Sonic blockchain
          </Text>
        </Box>
      </Flex>
      
      {loading ? (
        <Center p={10}>
          <Spinner size="xl" color="brand.500" thickness="4px" />
        </Center>
      ) : error ? (
        <Alert status="error" mb={8}>
          <AlertIcon />
          {error}
        </Alert>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={10} mb={10}>
            {/* Dragon Token Stats */}
            <StatsCard
              title="Dragon Token"
              value={dragonInfo?.totalSupply ? Number(dragonInfo.totalSupply).toLocaleString() : '—'}
              helpText="Total Supply"
              icon={FiDollarSign}
              badgeText={`Trading ${dragonInfo?.tradingEnabled ? "Enabled" : "Disabled"}`}
              badgeColor={dragonInfo?.tradingEnabled ? "green" : "red"}
            />
            
            {/* Jackpot Stats */}
            <JackpotCard jackpotInfo={jackpotInfo} />
            
            {/* Tax Info */}
            <TaxBreakdown taxes={dragonInfo?.taxes} />
          </SimpleGrid>
          
          <Divider my={8} />
          
          {/* User Balance Lookup */}
          <UserLookup />
          
          {/* Project Information */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
            <InfoCard
              title="Dragon Token Information"
              description="Key information about the $DRAGON token and related contracts."
              items={[
                "10% fee on all buys and sells",
                "0.69% token burn on all transfers",
                "Lottery triggered by special swaps"
              ]}
              links={[
                { 
                  text: "View on SonicScan", 
                  url: `https://sonicscan.org/address/${process.env.REACT_APP_CONTRACT_DRAGON}#code` 
                }
              ]}
            />
            
            <InfoCard
              title="Related Resources"
              description="Official Dragon Project links and resources."
              links={[
                { text: "Dragon Documentation", url: "https://docs.dragon.io" },
                { text: "PaintSwap Trading", url: "https://paintswap.finance" },
                { text: "Sonic Blockchain Explorer", url: "https://sonicscan.org" }
              ]}
            />
          </SimpleGrid>
          
          <Box textAlign="center" opacity={0.7} fontSize="sm">
            <Text>Dragon Project Dashboard • Data refreshes every 30 seconds</Text>
            <Text mt={1}>Contract Address: {process.env.REACT_APP_CONTRACT_DRAGON}</Text>
          </Box>
        </>
      )}
    </Container>
  );
}

export default App; 