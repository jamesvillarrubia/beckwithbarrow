import axios from 'axios';

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

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

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
  async getCollection<T>(endpoint: string, populate = ''): Promise<StrapiResponse<T[]>> {
    let url = `/${endpoint}`;
    if (populate) {
      // Convert Strapi v5 populate syntax
      const populateParams = new URLSearchParams();
      const fields = populate.split(',');
      
      fields.forEach(field => {
        if (field.includes('.')) {
          // Handle nested populate like "projects.cover"
          const [parent, child] = field.split('.');
          populateParams.append(`populate[${parent}][populate][${child}]`, 'true');
        } else {
          // Handle simple populate like "cover"
          populateParams.append(`populate[${field}]`, 'true');
        }
      });
      
      url += `?${populateParams.toString()}`;
    }
    
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
      // Convert Strapi v5 populate syntax
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
    
    const response = await api.get(url);
    return response.data;
  },
};

export default api;
