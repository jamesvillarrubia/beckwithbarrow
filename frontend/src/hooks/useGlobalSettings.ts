/**
 * useGlobalSettings Hook
 * 
 * Custom hook to fetch and manage global settings from Strapi.
 * Provides access to global configuration like theme colors.
 * 
 * Features:
 * - Fetches global settings using React Query
 * - Caches settings for performance
 * - Provides typed access to global configuration
 * - Handles loading and error states
 */

import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

interface GlobalSettings {
  lightThemeColor?: string;
  [key: string]: unknown;
}

export const useGlobalSettings = () => {
  const { data: globalData, isLoading, error } = useQuery({
    queryKey: ['global-settings'],
    queryFn: async () => {
      console.log('Fetching global settings from API...');
      try {
        const result = await apiService.getSingleType('global');
        console.log('Global settings response:', result);
        return result;
      } catch (err) {
        console.error('Error fetching global settings:', err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });

  const globalSettings = globalData?.data as GlobalSettings;

  return {
    globalSettings,
    lightThemeColor: globalSettings?.lightThemeColor || '#d4cec9', // fallback color
    rawGlobalData: globalData, // Include raw data for debugging
    isLoading,
    error,
  };
};
