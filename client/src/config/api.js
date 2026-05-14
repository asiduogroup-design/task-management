import axios from 'axios';

const api = axios.create({
  baseURL: 'https://task-management-5aro.onrender.com/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ewms_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
