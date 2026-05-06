import api from './api.js';

export const projectService = {
  list: (params) => api.get('/projects', { params }),
  create: (payload) => api.post('/projects', payload),
  detail: (id) => api.get(`/projects/${id}`),
  update: (id, payload) => api.put(`/projects/${id}`, payload),
  remove: (id) => api.delete(`/projects/${id}`),
  addMember: (id, payload) => api.post(`/projects/${id}/members`, payload),
  removeMember: (id, employeeId) => api.delete(`/projects/${id}/members/${employeeId}`)
};
