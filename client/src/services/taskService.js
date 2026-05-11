import api from './api.js';

export const taskService = {
  summary: () => api.get('/tasks/summary'),
  list: (params) => api.get('/tasks', { params }),
  create: (payload) => api.post('/tasks', payload),
  detail: (id) => api.get(`/tasks/${id}`),
  update: (id, payload) => api.put(`/tasks/${id}`, payload),
  remove: (id) => api.delete(`/tasks/${id}`),
  status: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  reassign: (id, employeeId) => api.patch(`/tasks/${id}/reassign`, { employeeId }),
  changeDeadline: (id, dueDate) => api.patch(`/tasks/${id}/deadline`, { dueDate }),
  markCompleted: (id) => api.patch(`/tasks/${id}/complete`),
  reopen: (id) => api.patch(`/tasks/${id}/reopen`),
  comment: (id, comment) => api.post(`/tasks/${id}/comments`, { comment })
};
