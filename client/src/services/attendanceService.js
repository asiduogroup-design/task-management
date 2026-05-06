import api from './api.js';

export const attendanceService = {
  login: () => api.post('/attendance/login'),
  logout: () => api.post('/attendance/logout'),
  breakStart: () => api.post('/attendance/break-start'),
  breakEnd: () => api.post('/attendance/break-end'),
  today: () => api.get('/attendance/today'),
  history: () => api.get('/attendance/history'),
  admin: (params) => api.get('/attendance/admin', { params }),
  update: (id, payload) => api.put(`/attendance/${id}`, payload)
};
