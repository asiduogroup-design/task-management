import api from './api.js';

export const dashboardService = {
  getEmployeeOverview: () => api.get('/dashboard/employee-overview'),
  getSummary: () => api.get('/dashboard/summary'),
  getAttendance: () => api.get('/dashboard/attendance'),
  getProjects: () => api.get('/dashboard/projects'),
  getTasks: () => api.get('/dashboard/tasks'),
  getAlerts: () => api.get('/dashboard/alerts')
};
