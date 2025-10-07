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
  [key: string]: unknown;
}

interface MenuData {
  menuItem?: NavigationLink[];
  [key: string]: unknown;
}

export const useGlobalSettings = () => {
  // Fetch global settings (theme colors, etc.)
  const { data: globalData, isLoading: globalLoading, error: globalError } = useQuery({
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

  // Fetch menu data (navigation links)
  const { data: menuData, isLoading: menuLoading, error: menuError } = useQuery({
    queryKey: ['menu'],
    queryFn: async () => {
      console.log('Fetching menu from API...');
      try {
        const result = await apiService.getSingleType('menu', 'menuItem');
        console.log('Menu response:', result);
        return result;
      } catch (err) {
        console.error('Error fetching menu:', err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });

  const globalSettings = globalData?.data as GlobalSettings;
  const menu = menuData?.data as MenuData;

  // Sort navigation links by order
  const navigation = menu?.menuItem?.sort((a, b) => a.order - b.order) || [];

  return {
    globalSettings,
    lightThemeColor: globalSettings?.lightThemeColor || '#d4cec9', // fallback color
    navigation, // Single navigation menu
    rawGlobalData: globalData, // Include raw data for debugging
    rawMenuData: menuData, // Include raw menu data for debugging
    isLoading: globalLoading || menuLoading,
    error: globalError || menuError,
  };
};
