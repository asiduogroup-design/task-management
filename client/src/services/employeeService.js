import api from './api.js';

export const employeeService = {
  list: (params) => api.get('/employees', { params }),
  create: (payload) => api.post('/employees', payload),
  detail: (id) => api.get(`/employees/${id}`),
  update: (id, payload) => api.put(`/employees/${id}`, payload),
  remove: (id) => api.delete(`/employees/${id}`),
  status: (id, status) => api.patch(`/employees/${id}/status`, { status })
};
