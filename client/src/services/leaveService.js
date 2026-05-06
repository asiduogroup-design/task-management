import api from './api.js';

export const leaveService = {
  list: () => api.get('/leaves'),
  create: (payload) => api.post('/leaves', payload),
  approve: (id, payload) => api.patch(`/leaves/${id}/approve`, payload),
  reject: (id, payload) => api.patch(`/leaves/${id}/reject`, payload)
};
