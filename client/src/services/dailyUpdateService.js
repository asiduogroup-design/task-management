import api from './api.js';

export const dailyUpdateService = {
  list: () => api.get('/daily-updates'),
  create: (payload) => api.post('/daily-updates', payload),
  detail: (id) => api.get(`/daily-updates/${id}`),
  update: (id, payload) => api.put(`/daily-updates/${id}`, payload)
};
