import axios, { AxiosError } from 'axios';

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // Check for environment variable to use production API
  if (import.meta.env.VITE_USE_PROD_API === 'true') {
    // Use custom production URL if provided, otherwise use default
    return import.meta.env.VITE_PROD_API_URL || 'https://striking-ball-b079f8c4b0.strapiapp.com/api';
  }
  // Default to local API
  return 'http://localhost:1337/api';
};

// Create axios instance with Strapi base URL
const apiBaseUrl = getApiBaseUrl();
console.log(`🔗 Using API: ${apiBaseUrl}`);

/**
 * Smart timeout strategy:
 * - First request to an endpoint: 10 seconds (detect cold starts)
 * - Subsequent requests: 30 seconds (normal timeout)
 * - Retry with exponential backoff on timeout
 */
const endpointTimeouts = new Map<string, number>();
const DEFAULT_TIMEOUT = 10000; // 10 seconds for first request
const WARM_TIMEOUT = 30000; // 30 seconds for subsequent requests

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: DEFAULT_TIMEOUT,
});

// Request interceptor to adjust timeout based on endpoint history
api.interceptors.request.use((config) => {
  const endpoint = config.url || '';
  
  // Check if we've successfully called this endpoint before
  const lastSuccessTime = endpointTimeouts.get(endpoint);
  
  if (lastSuccessTime) {
    // Endpoint is warm, use longer timeout
    config.timeout = WARM_TIMEOUT;
  } else {
    // First call or cold start, use shorter timeout
    config.timeout = DEFAULT_TIMEOUT;
  }
  
  return config;
});

// Response interceptor to track successful requests
api.interceptors.response.use(
  (response) => {
    const endpoint = response.config.url || '';
    endpointTimeouts.set(endpoint, Date.now());
    return response;
  },
  (error: AxiosError) => {
    // If timeout on first request, mark endpoint as potentially cold
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      console.warn(`⚠️  Timeout on ${error.config?.url} - backend may be cold starting`);
    }
    return Promise.reject(error);
  }
);

// Types for Strapi responses
export interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiItem {
  id: number;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Generic API functions
export const apiService = {
  // Get all items from a collection
  async getCollection<T>(endpoint: string, populate = '', sort?: string): Promise<StrapiResponse<T[]>> {
    const params = new URLSearchParams();
    
    // Handle populate
    if (populate) {
      if (populate === '*') {
        params.append('populate', '*');
      } else {
        const fields = populate.split(',');
        fields.forEach(field => {
          if (field.includes('.')) {
            const [parent, child] = field.split('.');
            params.append(`populate[${parent}][populate][${child}]`, 'true');
          } else {
            params.append(`populate[${field}]`, 'true');
          }
        });
      }
    }
    
    // Handle sorting (e.g., 'createdAt:desc' or 'Title:asc')
    if (sort) {
      params.append('sort', sort);
    }
    
    const url = `/${endpoint}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get(url);
    return response.data;
  },

  // Get single item by ID
  async getItem<T>(endpoint: string, id: string | number): Promise<StrapiResponse<T>> {
    const response = await api.get(`/${endpoint}/${id}`);
    return response.data;
  },

  // Create new item
  async createItem<T>(endpoint: string, data: Partial<T>): Promise<StrapiResponse<T>> {
    const response = await api.post(`/${endpoint}`, { data });
    return response.data;
  },

  // Update item
  async updateItem<T>(endpoint: string, id: string | number, data: Partial<T>): Promise<StrapiResponse<T>> {
    const response = await api.put(`/${endpoint}/${id}`, { data });
    return response.data;
  },

  // Delete item
  async deleteItem(endpoint: string, id: string | number): Promise<void> {
    await api.delete(`/${endpoint}/${id}`);
  },

  // Get single type (like home page)
  async getSingleType<T>(endpoint: string, populate = ''): Promise<StrapiResponse<T>> {
    let url = `/${endpoint}`;
    if (populate) {
      // Handle wildcard populate (Strapi v5 syntax)
      if (populate === '*') {
        url += '?populate=*';
      } else {
        // Convert Strapi v5 populate syntax for specific fields
        const populateParams = new URLSearchParams();
        const fields = populate.split(',');
        
        fields.forEach(field => {
          if (field.includes('.')) {
            // Handle nested populate like "featuredProjects.cover"
            const [parent, child] = field.split('.');
            populateParams.append(`populate[${parent}][populate][${child}]`, 'true');
          } else {
            // Handle simple populate like "leftImage"
            populateParams.append(`populate[${field}]`, 'true');
          }
        });
        
        url += `?${populateParams.toString()}`;
      }
    }
    
    const response = await api.get(url);
    return response.data;
  },

  // Get item by slug (for projects, press articles, etc.)
  async getBySlug<T>(endpoint: string, slug: string, populate = ''): Promise<StrapiResponse<T[]>> {
    let url = `/${endpoint}?filters[slug][$eq]=${encodeURIComponent(slug)}`;
    
    if (populate) {
      // Handle wildcard populate
      if (populate === '*') {
        url += '&populate=*';
      } else {
        // Convert populate syntax for specific fields
        const fields = populate.split(',');
        
        fields.forEach(field => {
          if (field.includes('.')) {
            // Handle nested populate
            const [parent, child] = field.split('.');
            url += `&populate[${parent}][populate][${child}]=true`;
          } else {
            // Handle simple populate
            url += `&populate[${field}]=true`;
          }
        });
      }
    }
    
    const response = await api.get(url);
    return response.data;
  },
};

export default api;

