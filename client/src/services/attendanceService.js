import api from './api.js';

export const attendanceService = {
  login: () => api.post('/attendance/login'),
  logout: () => api.post('/attendance/logout'),
  breakStart: () => api.post('/attendance/break-start'),
  breakEnd: () => api.post('/attendance/break-end'),
  today: () => api.get('/attendance/today'),
  history: () => api.get('/attendance/history'),
  admin: (params) => api.get('/attendance/admin', { params }),
  summary: (params) => api.get('/attendance/admin/summary', { params }),
  markAbsent: (payload) => api.post('/attendance/admin/mark-absent', payload),
  export: (params) => api.get('/attendance/admin/export', { params, responseType: 'blob' }),
  update: (id, payload) => api.put(`/attendance/${id}`, payload)
};
