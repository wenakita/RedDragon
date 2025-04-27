import React from 'react';
import { 
  Stat, 
  StatLabel, 
  StatNumber, 
  StatHelpText,
  Flex,
  Box,
  Icon,
  Badge
} from '@chakra-ui/react';

/**
 * Reusable statistics card component
 * 
 * @param {string} title - Card title
 * @param {string|number} value - Main statistic value
 * @param {string} helpText - Additional context for the value
 * @param {React.ReactNode} icon - Icon component to display
 * @param {string} badgeText - Optional badge text
 * @param {string} badgeColor - Badge color scheme (green, red, blue, etc)
 * @param {React.ReactNode} extraContent - Optional additional content
 */
const StatsCard = ({ 
  title, 
  value, 
  helpText, 
  icon, 
  badgeText, 
  badgeColor = "gray",
  extraContent
}) => {
  return (
    <Stat p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white" className="stats-card">
      <Flex justifyContent="space-between">
        <Box>
          <StatLabel fontSize="lg">{title}</StatLabel>
          <StatNumber>{value}</StatNumber>
          {helpText && <StatHelpText>{helpText}</StatHelpText>}
        </Box>
        {icon && (
          <Box>
            <Icon as={icon} w={8} h={8} color="brand.500" />
          </Box>
        )}
      </Flex>
      
      {badgeText && (
        <Badge colorScheme={badgeColor} mt={2}>
          {badgeText}
        </Badge>
      )}
      
      {extraContent && (
        <Box mt={2}>
          {extraContent}
        </Box>
      )}
    </Stat>
  );
};

export default StatsCard; 