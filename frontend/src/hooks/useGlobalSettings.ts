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

export interface NavigationLink {
  id: number;
  label: string;
  url: string;
  external: boolean;
  openInNewTab: boolean;
  order: number;
}

interface GlobalSettings {
  lightThemeColor?: string;
  headerNavigation?: NavigationLink[];
  footerNavigation?: NavigationLink[];
  [key: string]: unknown;
}

export const useGlobalSettings = () => {
  const { data: globalData, isLoading, error } = useQuery({
    queryKey: ['global-settings'],
    queryFn: async () => {
      console.log('Fetching global settings from API...');
      try {
        // Populate navigation links
        const result = await apiService.getSingleType('global', 'headerNavigation,footerNavigation');
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

  // Sort navigation links by order
  const headerNavigation = globalSettings?.headerNavigation
    ?.sort((a, b) => a.order - b.order) || [];
  const footerNavigation = globalSettings?.footerNavigation
    ?.sort((a, b) => a.order - b.order) || [];

  return {
    globalSettings,
    lightThemeColor: globalSettings?.lightThemeColor || '#d4cec9', // fallback color
    headerNavigation,
    footerNavigation,
    rawGlobalData: globalData, // Include raw data for debugging
    isLoading,
    error,
  };
};
