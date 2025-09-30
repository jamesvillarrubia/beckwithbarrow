import axios from 'axios';

// Create axios instance with Strapi base URL
const api = axios.create({
  baseURL: 'http://localhost:1337/api',
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
    const url = populate ? `/${endpoint}?populate=${populate}` : `/${endpoint}`;
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
    const url = populate ? `/${endpoint}?populate=${populate}` : `/${endpoint}`;
    const response = await api.get(url);
    return response.data;
  },
};

export default api;
