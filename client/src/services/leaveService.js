import api from './api.js';

export const leaveService = {
  summary: () => api.get('/leaves/summary'),
  balance: (params) => api.get('/leaves/balance', { params }),
  list: (params) => api.get('/leaves', { params }),
  detail: (id) => api.get(`/leaves/${id}`),
  create: (payload) => api.post('/leaves', payload),
  approve: (id, payload) => api.patch(`/leaves/${id}/approve`, payload),
  reject: (id, payload) => api.patch(`/leaves/${id}/reject`, payload)
};
