import api from './api.js';

export const employeeService = {
  list: (params) => api.get('/employees', { params }),
  myProfile: () => api.get('/employees/me/profile'),
  updateMyProfile: (payload) => api.patch('/employees/me/profile', payload),
  changeMyPassword: (payload) => api.patch('/employees/me/password', payload),
  updateMyNotificationPreferences: (payload) => api.patch('/employees/me/notification-preferences', payload),
  create: (payload) => api.post('/employees', payload),
  detail: (id) => api.get(`/employees/${id}`),
  profile: (id) => api.get(`/employees/${id}/profile`),
  update: (id, payload) => api.put(`/employees/${id}`, payload),
  remove: (id) => api.delete(`/employees/${id}`),
  status: (id, status) => api.patch(`/employees/${id}/status`, { status })
};
