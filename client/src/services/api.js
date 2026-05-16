import axios from 'axios';

const DEFAULT_API_BASE_URL = 'https://task-management-5aro.onrender.com/api';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ewms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
