import api from './api.js';

export const taskService = {
  list: (params) => api.get('/tasks', { params }),
  create: (payload) => api.post('/tasks', payload),
  detail: (id) => api.get(`/tasks/${id}`),
  update: (id, payload) => api.put(`/tasks/${id}`, payload),
  remove: (id) => api.delete(`/tasks/${id}`),
  status: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  comment: (id, comment) => api.post(`/tasks/${id}/comments`, { comment })
};
