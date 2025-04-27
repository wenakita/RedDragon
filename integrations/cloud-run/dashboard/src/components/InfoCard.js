import React from 'react';
import {
  Box,
  Heading,
  Text,
  List,
  ListItem,
  ListIcon,
  Flex,
  Icon,
  Divider
} from '@chakra-ui/react';
import { FiInfo, FiCheck, FiExternalLink } from 'react-icons/fi';

/**
 * InfoCard component for displaying general information or links
 * 
 * @param {string} title - Card title
 * @param {string} description - Optional description
 * @param {Array} items - List of information items to display
 * @param {Array} links - List of links to display
 */
const InfoCard = ({ title, description, items = [], links = [] }) => {
  return (
    <Box p={6} shadow="md" borderWidth="1px" borderRadius="lg" bg="white" mb={6}>
      <Flex justifyContent="space-between" align="center" mb={4}>
        <Heading as="h3" size="md">{title}</Heading>
        <Icon as={FiInfo} color="brand.500" />
      </Flex>
      
      {description && (
        <Text color="gray.600" mb={4}>
          {description}
        </Text>
      )}
      
      {items.length > 0 && (
        <List spacing={2} mt={3}>
          {items.map((item, index) => (
            <ListItem key={index}>
              <Flex align="start">
                <ListIcon as={FiCheck} color="green.500" mt={1} />
                <Text>{item}</Text>
              </Flex>
            </ListItem>
          ))}
        </List>
      )}
      
      {links.length > 0 && (
        <>
          {items.length > 0 && <Divider my={4} />}
          <List spacing={2} mt={3}>
            {links.map((link, index) => (
              <ListItem key={index}>
                <Flex align="center">
                  <ListIcon as={FiExternalLink} color="brand.500" />
                  <Text 
                    as="a" 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    color="brand.500"
                    _hover={{ textDecoration: 'underline' }}
                  >
                    {link.text}
                  </Text>
                </Flex>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );
};

export default InfoCard; 