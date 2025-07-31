import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';
import { Store } from '@reduxjs/toolkit';

// Define a generic RootState type that can be updated later
type RootState = any;

// Store reference to be injected after store initialization
let store: Store<RootState> | null = null;

/**
 * Injects the Redux store into the Axios instance
 * This allows interceptors to access the store state
 */
export const injectStore = (reduxStore: Store<RootState>) => {
  store = reduxStore;
};

/**
 * Get auth token from Redux store
 */
const getAuthToken = (): string | null => {
  if (!store) return null;
  
  try {
    const state = store.getState();
    // TODO: Replace with actual auth slice selector
    // Example: return state.auth.token;
    return null;
  } catch (error) {
    console.warn('Failed to get auth token from store:', error);
    return null;
  }
};

/**
 * Dispatch logout action to Redux store
 */
const dispatchLogout = () => {
  if (!store) return;
  
  try {
    // TODO: Replace with actual logout action
    // Example: store.dispatch(logout());
    console.warn('Logout action not implemented yet');
  } catch (error) {
    console.error('Failed to dispatch logout action:', error);
  }
};

/**
 * Create and configure Axios instance
 */
const createAxiosInstance = (): AxiosInstance => {
  // Get base URL from environment or use default
  const getBaseURL = (): string => {
    try {
      // @ts-ignore - Vite environment variables
      return import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:3000/api';
    } catch {
      return 'http://localhost:3000/api';
    }
  };

  const instance = axios.create({
    baseURL: getBaseURL(),
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Portal': 'true',
    },
  });

  // Request interceptor
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getAuthToken();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    },
    (error: AxiosError) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error: AxiosError) => {
      const { response, message } = error;
      
      // Network error
      if (!response) {
        toast.error('Network error. Please check your connection.');
        return Promise.reject(error);
      }

      const { status, data } = response;

      switch (status) {
        case 401:
          toast.error('Session expired. Please log in again.');
          dispatchLogout();
          break;
          
        case 403:
          toast.error('Access denied. You do not have permission to perform this action.');
          break;
          
        case 404:
          toast.error('Resource not found.');
          break;
          
        case 422:
          // Validation errors - show first error message
          if (data && typeof data === 'object' && 'message' in data) {
            toast.error(data.message as string);
          } else {
            toast.error('Validation error. Please check your input.');
          }
          break;
          
        case 500:
          toast.error('Server error. Please try again later.');
          break;
          
        default:
          // Generic error message
          const errorMessage = data && typeof data === 'object' && 'message' in data 
            ? data.message as string 
            : message || 'An unexpected error occurred.';
          toast.error(errorMessage);
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// Export the configured Axios instance
export const api = createAxiosInstance();

// Export types for external use
export type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError }; 