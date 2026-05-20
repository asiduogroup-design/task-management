import api from './api.js';

export const projectService = {
  list: (params) => api.get('/projects', { params }),
  create: (payload) => api.post('/projects', payload),
  detail: (id) => api.get(`/projects/${id}`),
  update: (id, payload) => api.put(`/projects/${id}`, payload),
  remove: (id) => api.delete(`/projects/${id}`),
  addMember: (id, payload) => api.post(`/projects/${id}/members`, payload),
  updateMember: (id, employeeId, payload) => api.patch(`/projects/${id}/members/${employeeId}`, payload),
  removeMember: (id, employeeId) => api.delete(`/projects/${id}/members/${employeeId}`)
};
