import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for debugging
api.interceptors.request.use(request => {
  console.log('Request:', request);
  return request;
});

// Add response interceptor for handling auth errors
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      // Redirect to GitHub auth
      window.location.href = `${import.meta.env.VITE_API_URL}/auth/github`;
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

export const getRepositories = async () => {
  try {
    const response = await api.get('/api/repositories');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch repositories:', error);
    throw error;
  }
};

export const checkAuthStatus = async () => {
  try {
    const response = await api.get('/auth/status');
    return response.data;
  } catch (error) {
    console.error('Failed to check auth status:', error);
    throw error;
  }
};