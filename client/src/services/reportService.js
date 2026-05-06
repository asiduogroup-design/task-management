import api from './api.js';

export const reportService = {
  attendance: (params) => api.get('/reports/attendance', { params }),
  employees: (params) => api.get('/reports/employees', { params }),
  projects: (params) => api.get('/reports/projects', { params }),
  tasks: (params) => api.get('/reports/tasks', { params }),
  dailyWork: (params) => api.get('/reports/daily-work', { params }),
  loginLogout: (params) => api.get('/reports/login-logout', { params })
};
