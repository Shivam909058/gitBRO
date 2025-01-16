import { api } from './api';

export const checkAuthStatus = async () => {
  try {
    const response = await api.get('/auth/status');
    return response.data;
  } catch (error) {
    return { authenticated: false };
  }
};

export const connectGithub = () => {
  window.location.href = `${import.meta.env.VITE_API_URL}/auth/github`;
};