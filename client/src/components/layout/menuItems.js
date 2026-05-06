export const adminMenu = [
  ['Dashboard', '/admin/dashboard'],
  ['Employees', '/admin/employees'],
  ['Attendance', '/admin/attendance'],
  ['Projects', '/admin/projects'],
  ['Tasks', '/admin/tasks'],
  ['Daily Work Reports', '/admin/daily-work-reports'],
  ['Leave Management', '/admin/leaves'],
  ['Reports', '/admin/reports'],
  ['Notifications', '/admin/notifications'],
  ['Settings', '/admin/settings']
];

export const employeeMenu = [
  ['Dashboard', '/employee/dashboard'],
  ['My Attendance', '/employee/attendance'],
  ['My Projects', '/employee/projects'],
  ['My Tasks', '/employee/tasks'],
  ['Todo List', '/employee/todos'],
  ['Daily Work Update', '/employee/daily-update'],
  ['Completed Tasks', '/employee/completed-tasks'],
  ['Leave Request', '/employee/leaves'],
  ['Profile', '/employee/profile'],
  ['Notifications', '/employee/notifications']
];

export const managerMenu = [
  ['Dashboard', '/manager/dashboard'],
  ['Assigned Projects', '/manager/projects'],
  ['Project Tasks', '/manager/tasks'],
  ['Team Members', '/manager/team-members'],
  ['Daily Updates', '/manager/daily-updates'],
  ['Review Tasks', '/manager/review-tasks'],
  ['Notifications', '/manager/notifications']
];

export const menuForRole = (role) => {
  if (role === 'manager') return managerMenu;
  if (role === 'employee') return employeeMenu;
  return adminMenu;
};
