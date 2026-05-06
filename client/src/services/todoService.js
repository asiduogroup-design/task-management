import api from './api.js';

export const todoService = {
  list: () => api.get('/todos'),
  create: (payload) => api.post('/todos', payload),
  update: (id, payload) => api.put(`/todos/${id}`, payload),
  remove: (id) => api.delete(`/todos/${id}`),
  status: (id, status) => api.patch(`/todos/${id}/status`, { status })
};
