import api from './api.js';

const dateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const inDateRange = (value, fromDate, toDate) => {
  if (!value) return true;
  const date = dateOnly(value);
  const from = dateOnly(fromDate);
  const to = dateOnly(toDate);
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
};

const filterByCommon = (rows, params) => {
  return rows.filter((row) => {
    if (params.employeeId && String(row.employeeId || row.employee?._id || row.assignedTo?._id) !== String(params.employeeId)) return false;
    if (params.department && String(row.department || row.employeeId?.department || row.assignedTo?.department || row.projectId?.department || '') !== String(params.department)) return false;
    if (params.projectId && String(row.projectId?._id || row.projectId || '') !== String(params.projectId)) return false;
    return true;
  });
};

const mapAttendancePreview = (records, params) => {
  const filtered = filterByCommon(records, params).filter((record) => inDateRange(record.date, params.fromDate, params.toDate));
  const rows = filtered.map((record) => ({
    employeeName: record.employeeId?.userId?.name || record.employeeId?.employeeCode || '-',
    department: record.employeeId?.department || '-',
    date: record.date ? new Date(record.date).toLocaleDateString() : '-',
    loginTime: record.loginTime ? new Date(record.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    logoutTime: record.logoutTime ? new Date(record.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    totalWorkingHours: Number(record.totalWorkingHours || 0).toFixed(2),
    status: record.status || '-'
  }));

  return {
    title: 'Attendance Report',
    columns: [
      { key: 'employeeName', label: 'Employee' },
      { key: 'department', label: 'Department' },
      { key: 'date', label: 'Date' },
      { key: 'loginTime', label: 'Login' },
      { key: 'logoutTime', label: 'Logout' },
      { key: 'totalWorkingHours', label: 'Hours' },
      { key: 'status', label: 'Status' }
    ],
    rows,
    summaryCards: [
      { label: 'Total records', value: rows.length },
      { label: 'Present', value: rows.filter((row) => ['logged_in', 'logged_out', 'on_break', 'late'].includes(row.status)).length },
      { label: 'Late login', value: rows.filter((row) => row.status === 'late').length },
      { label: 'Absent', value: rows.filter((row) => row.status === 'absent').length }
    ],
    chartData: []
  };
};

const mapEmployeePreview = (employees, params) => {
  const filtered = employees.filter((employee) => {
    if (params.employeeId && String(employee._id) !== String(params.employeeId)) return false;
    if (params.department && String(employee.department || '') !== String(params.department)) return false;
    if (!inDateRange(employee.joiningDate, params.fromDate, params.toDate)) return false;
    return true;
  });

  const rows = filtered.map((employee) => ({
    employeeName: employee.userId?.name || employee.employeeCode || '-',
    employeeCode: employee.employeeCode || '-',
    department: employee.department || '-',
    designation: employee.designation || '-',
    role: employee.userId?.role || '-',
    status: employee.userId?.status || '-',
    joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : '-'
  }));

  return {
    title: 'Employee Report',
    columns: [
      { key: 'employeeName', label: 'Employee' },
      { key: 'employeeCode', label: 'Employee ID' },
      { key: 'department', label: 'Department' },
      { key: 'designation', label: 'Designation' },
      { key: 'role', label: 'Role' },
      { key: 'status', label: 'Status' },
      { key: 'joiningDate', label: 'Joining date' }
    ],
    rows,
    summaryCards: [
      { label: 'Total employees', value: rows.length },
      { label: 'Active', value: rows.filter((row) => row.status === 'active').length },
      { label: 'Inactive', value: rows.filter((row) => row.status === 'inactive').length },
      { label: 'Departments', value: new Set(rows.map((row) => row.department).filter((value) => value && value !== '-')).size }
    ],
    chartData: []
  };
};

const mapProjectPreview = (projects, params) => {
  const filtered = projects.filter((project) => {
    if (params.projectId && String(project._id) !== String(params.projectId)) return false;
    if (params.department && String(project.department || '') !== String(params.department)) return false;
    if (!inDateRange(project.startDate, params.fromDate, params.toDate)) return false;
    return true;
  });

  const rows = filtered.map((project) => ({
    projectCode: project.projectCode || '-',
    projectName: project.name || '-',
    department: project.department || '-',
    status: project.status || '-',
    priority: project.priority || '-',
    startDate: project.startDate ? new Date(project.startDate).toLocaleDateString() : '-',
    deadline: project.deadline ? new Date(project.deadline).toLocaleDateString() : '-'
  }));

  return {
    title: 'Project Report',
    columns: [
      { key: 'projectCode', label: 'Project ID' },
      { key: 'projectName', label: 'Project' },
      { key: 'department', label: 'Department' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'startDate', label: 'Start date' },
      { key: 'deadline', label: 'Deadline' }
    ],
    rows,
    summaryCards: [
      { label: 'Total projects', value: rows.length },
      { label: 'Active', value: rows.filter((row) => row.status === 'active').length },
      { label: 'Completed', value: rows.filter((row) => row.status === 'completed').length },
      { label: 'On hold', value: rows.filter((row) => row.status === 'on_hold').length }
    ],
    chartData: []
  };
};

const mapTaskPreview = (tasks, params, mode = 'all') => {
  let filtered = filterByCommon(tasks, params).filter((task) => inDateRange(task.createdAt, params.fromDate, params.toDate));

  if (mode === 'completed') {
    filtered = filtered.filter((task) => task.status === 'completed');
  } else if (mode === 'overdue') {
    filtered = filtered.filter((task) => task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < new Date());
  } else if (params.taskStatus) {
    filtered = filtered.filter((task) => task.status === params.taskStatus);
  }

  const rows = filtered.map((task) => ({
    taskCode: task.taskCode || '-',
    title: task.title || '-',
    employeeName: task.assignedTo?.userId?.name || task.assignedTo?.employeeCode || '-',
    department: task.department || task.assignedTo?.department || '-',
    project: task.projectId?.name || task.projectId?.projectCode || '-',
    status: task.status || '-',
    priority: task.priority || '-',
    dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-',
    completedAt: task.completedAt ? new Date(task.completedAt).toLocaleDateString() : '-'
  }));

  const titleMap = {
    all: 'Task Report',
    completed: 'Completed Task Report',
    overdue: 'Overdue Task Report'
  };

  return {
    title: titleMap[mode] || 'Task Report',
    columns: [
      { key: 'taskCode', label: 'Task ID' },
      { key: 'title', label: 'Task' },
      { key: 'employeeName', label: 'Employee' },
      { key: 'department', label: 'Department' },
      { key: 'project', label: 'Project' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'dueDate', label: 'Due date' },
      { key: 'completedAt', label: 'Completed at' }
    ],
    rows,
    summaryCards: [
      { label: 'Total tasks', value: rows.length },
      { label: 'Completed', value: rows.filter((row) => row.status === 'completed').length },
      { label: 'In progress', value: rows.filter((row) => row.status === 'in_progress').length },
      { label: 'Overdue', value: rows.filter((row) => row.status === 'overdue').length }
    ],
    chartData: []
  };
};

const mapDailyWorkPreview = (payload) => {
  const table = payload.table || [];
  const totalHours = table.reduce((sum, row) => sum + Number(row.timeSpentHours || 0), 0);
  const completed = table.reduce((sum, row) => sum + Number(row.completedTasks || 0), 0);
  const pending = table.reduce((sum, row) => sum + Number(row.pendingTasks || 0), 0);

  return {
    title: 'Daily Work Report',
    columns: [
      { key: 'employeeName', label: 'Employee' },
      { key: 'department', label: 'Department' },
      { key: 'loginTime', label: 'Login' },
      { key: 'logoutTime', label: 'Logout' },
      { key: 'projectWorkedOn', label: 'Projects' },
      { key: 'tasksWorkedOn', label: 'Tasks' },
      { key: 'completedTasks', label: 'Completed' },
      { key: 'pendingTasks', label: 'Pending' },
      { key: 'timeSpent', label: 'Time spent' },
      { key: 'blockers', label: 'Blockers' }
    ],
    rows: table,
    summaryCards: [
      { label: 'Employees', value: table.length },
      { label: 'Completed tasks', value: completed },
      { label: 'Pending tasks', value: pending },
      { label: 'Total hours', value: Number(totalHours.toFixed(2)) }
    ],
    chartData: []
  };
};

const mapLoginLogoutPreview = (records, params) => {
  const filtered = filterByCommon(records, params).filter((record) => inDateRange(record.date, params.fromDate, params.toDate));
  const rows = filtered.map((record) => ({
    employeeName: record.employeeId?.userId?.name || record.employeeId?.employeeCode || '-',
    department: record.employeeId?.department || '-',
    date: record.date ? new Date(record.date).toLocaleDateString() : '-',
    loginTime: record.loginTime ? new Date(record.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    logoutTime: record.logoutTime ? new Date(record.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    totalWorkingHours: Number(record.totalWorkingHours || 0).toFixed(2),
    status: record.status || '-'
  }));

  return {
    title: 'Login/Logout Report',
    columns: [
      { key: 'employeeName', label: 'Employee' },
      { key: 'department', label: 'Department' },
      { key: 'date', label: 'Date' },
      { key: 'loginTime', label: 'Login' },
      { key: 'logoutTime', label: 'Logout' },
      { key: 'totalWorkingHours', label: 'Hours' },
      { key: 'status', label: 'Status' }
    ],
    rows,
    summaryCards: [
      { label: 'Total records', value: rows.length },
      { label: 'Logged out', value: rows.filter((row) => row.status === 'logged_out').length },
      { label: 'Missing logout', value: rows.filter((row) => row.status === 'missing_logout').length },
      { label: 'Late', value: rows.filter((row) => row.status === 'late').length }
    ],
    chartData: []
  };
};

const normalizePreviewPayload = (preview, reportType) => ({
  reportType,
  title: preview.title,
  generatedAt: new Date().toISOString(),
  columns: preview.columns,
  rows: preview.rows,
  summaryCards: preview.summaryCards,
  chartData: preview.chartData
});

const fallbackPreview = async (params = {}) => {
  const reportType = String(params.reportType || 'attendance_report');

  if (reportType === 'attendance_report') {
    const { data } = await api.get('/reports/attendance', { params });
    return normalizePreviewPayload(mapAttendancePreview(data.records || [], params), reportType);
  }

  if (reportType === 'employee_report') {
    const { data } = await api.get('/reports/employees', { params });
    return normalizePreviewPayload(mapEmployeePreview(data.employees || [], params), reportType);
  }

  if (reportType === 'project_report') {
    const { data } = await api.get('/reports/projects', { params });
    return normalizePreviewPayload(mapProjectPreview(data.projects || [], params), reportType);
  }

  if (reportType === 'task_report') {
    const { data } = await api.get('/reports/tasks', { params });
    return normalizePreviewPayload(mapTaskPreview(data.tasks || [], params, 'all'), reportType);
  }

  if (reportType === 'daily_work_report') {
    const { data } = await api.get('/reports/daily-work', { params });
    return normalizePreviewPayload(mapDailyWorkPreview(data || {}), reportType);
  }

  if (reportType === 'completed_task_report') {
    const { data } = await api.get('/reports/tasks', { params });
    return normalizePreviewPayload(mapTaskPreview(data.tasks || [], params, 'completed'), reportType);
  }

  if (reportType === 'overdue_task_report') {
    const { data } = await api.get('/reports/tasks', { params });
    return normalizePreviewPayload(mapTaskPreview(data.tasks || [], params, 'overdue'), reportType);
  }

  const { data } = await api.get('/reports/login-logout', { params });
  return normalizePreviewPayload(mapLoginLogoutPreview(data.records || [], params), reportType);
};

export const reportService = {
  preview: async (params) => ({ data: await fallbackPreview(params) }),
  exportReport: (format, params) => api.get('/reports/export', { params: { ...params, format }, responseType: 'blob' }),
  emailReport: (payload, params) => api.post('/reports/email', payload, { params }),
  attendance: (params) => api.get('/reports/attendance', { params }),
  employees: (params) => api.get('/reports/employees', { params }),
  projects: (params) => api.get('/reports/projects', { params }),
  tasks: (params) => api.get('/reports/tasks', { params }),
  dailyWork: (params) => api.get('/reports/daily-work', { params }),
  exportDailyWork: (format, params) => api.get('/reports/daily-work/export', { params: { ...params, format }, responseType: 'blob' }),
  emailDailyWork: (payload, params) => api.post('/reports/daily-work/email', payload, { params }),
  loginLogout: (params) => api.get('/reports/login-logout', { params })
};
