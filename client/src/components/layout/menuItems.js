export const superAdminMenu = [
  ['Dashboard', '/admin/dashboard', 'dashboard'],
  ['Employees', '/admin/employees', 'employees'],
  ['Attendance', '/admin/attendance', 'attendance'],
  ['Projects', '/admin/projects', 'projects'],
  ['Tasks', '/admin/tasks', 'tasks'],
  ['Daily Work Reports', '/admin/daily-work-reports', 'dailyReports'],
  ['Leave Management', '/admin/leaves', 'leaveManagement'],
  ['Reports', '/admin/reports', 'reports'],
  ['Notifications', '/admin/notifications', 'notifications'],
  ['Settings', '/admin/settings', 'settings']
];

export const adminMenu = [
  ['Dashboard', '/admin/dashboard', 'dashboard'],
  ['Employees', '/admin/employees', 'employees'],
  ['Attendance', '/admin/attendance', 'attendance'],
  ['Assign Projects', '/admin/assign-projects', 'projects'],
  ['Assign Tasks', '/admin/assign-tasks', 'tasks'],
  ['Leave Management', '/admin/leaves', 'leaveManagement'],
  ['Reports', '/admin/reports', 'reports'],
  ['Notifications', '/admin/notifications', 'notifications']
];

export const employeeMenu = [
  ['Dashboard', '/employee/dashboard', 'dashboard'],
  ['My Attendance', '/employee/attendance', 'attendance'],
  ['My Projects', '/employee/projects', 'projects'],
  ['My Tasks', '/employee/tasks', 'tasks'],
  ['Todo List', '/employee/todos', 'todoList'],
  ['Daily Work Update', '/employee/daily-update', 'dailyUpdate'],
  ['Completed Tasks', '/employee/completed-tasks', 'completedTasks'],
  ['Leave Request', '/employee/leaves', 'leaveRequest'],
  ['Profile', '/employee/profile', 'profile'],
  ['Settings', '/employee/settings', 'settings'],
  ['Notifications', '/employee/notifications', 'notifications']
];

export const managerMenu = [
  ['Dashboard', '/manager/dashboard', 'dashboard'],
  ['Assigned Projects', '/manager/projects', 'projects'],
  ['Project Tasks', '/manager/tasks', 'tasks'],
  ['Team Members', '/manager/team-members', 'teamMembers'],
  ['Daily Updates', '/manager/daily-updates', 'dailyUpdate'],
  ['Review Tasks', '/manager/review-tasks', 'reviewTasks'],
  ['Notifications', '/manager/notifications', 'notifications']
];

export const menuForRole = (role) => {
  if (role === 'manager') return managerMenu;
  if (role === 'employee') return employeeMenu;
  if (role === 'super_admin') return superAdminMenu;
  return adminMenu;
};
