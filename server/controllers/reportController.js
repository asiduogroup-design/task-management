import asyncHandler from 'express-async-handler';
import PDFDocument from 'pdfkit';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import DailyWorkUpdate from '../models/DailyWorkUpdate.js';
import TaskAttachment from '../models/TaskAttachment.js';

const dateRangeQuery = (query) => {
  if (!query.from && !query.to) return {};
  return {
    $gte: query.from ? new Date(query.from) : new Date('1970-01-01'),
    $lte: query.to ? new Date(query.to) : new Date()
  };
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const resolveDateRange = ({ datePreset, from, to }) => {
  if (datePreset === 'today') {
    const today = new Date();
    return { from: startOfDay(today), to: endOfDay(today), datePreset: 'today' };
  }

  if (datePreset === 'yesterday') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return { from: startOfDay(yesterday), to: endOfDay(yesterday), datePreset: 'yesterday' };
  }

  if (from || to) {
    return {
      from: from ? startOfDay(from) : startOfDay('1970-01-01'),
      to: to ? endOfDay(to) : endOfDay(new Date()),
      datePreset: 'custom'
    };
  }

  return { from: null, to: null, datePreset: 'all' };
};

const safeText = (value) => String(value || '').trim();

const formatTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const hoursLabel = (value) => `${Number(value || 0).toFixed(2)} hrs`;

const csvValue = (value) => {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const buildDailyWorkReportPayload = async (query) => {
  const { employeeId, department, projectId, taskStatus } = query;
  const range = resolveDateRange(query);

  const employeeFilter = {};
  if (employeeId) employeeFilter._id = employeeId;
  if (department) employeeFilter.department = department;

  const employees = await Employee.find(employeeFilter)
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });

  if (!employees.length) {
    return {
      meta: {
        generatedAt: new Date(),
        datePreset: range.datePreset,
        from: range.from,
        to: range.to,
        totalEmployees: 0
      },
      table: [],
      details: []
    };
  }

  const employeeIds = employees.map((employee) => employee._id);
  const employeeById = new Map(employees.map((employee) => [String(employee._id), employee]));
  const userIdToEmployeeId = new Map(
    employees
      .filter((employee) => employee.userId?._id)
      .map((employee) => [String(employee.userId._id), String(employee._id)])
  );

  const updateQuery = { employeeId: { $in: employeeIds } };
  if (projectId) updateQuery.projectId = projectId;
  if (range.from && range.to) updateQuery.date = { $gte: range.from, $lte: range.to };

  const attendanceQuery = { employeeId: { $in: employeeIds } };
  if (range.from && range.to) attendanceQuery.date = { $gte: range.from, $lte: range.to };

  const taskQuery = { assignedTo: { $in: employeeIds } };
  if (projectId) taskQuery.projectId = projectId;
  if (taskStatus) taskQuery.status = taskStatus;
  if (range.from && range.to) {
    taskQuery.$or = [
      { completedAt: { $gte: range.from, $lte: range.to } },
      { updatedAt: { $gte: range.from, $lte: range.to } }
    ];
  }

  const [updates, attendanceRecords, tasks] = await Promise.all([
    DailyWorkUpdate.find(updateQuery)
      .populate({ path: 'employeeId', select: 'employeeCode department designation', populate: { path: 'userId', select: 'name email' } })
      .populate('projectId', 'name projectCode')
      .populate('taskId', 'title')
      .sort({ date: -1, createdAt: -1 }),
    Attendance.find(attendanceQuery).sort({ date: -1 }),
    Task.find(taskQuery).populate('projectId', 'name projectCode').sort({ updatedAt: -1 })
  ]);

  const taskIdsFromUpdates = [...new Set(updates.map((update) => String(update.taskId?._id || '')).filter(Boolean))];
  const attachmentQuery = {
    taskId: { $in: taskIdsFromUpdates }
  };

  if (range.from && range.to) {
    attachmentQuery.createdAt = { $gte: range.from, $lte: range.to };
  }

  if (userIdToEmployeeId.size) {
    attachmentQuery.uploadedBy = { $in: [...userIdToEmployeeId.keys()] };
  }

  const attachments = taskIdsFromUpdates.length ? await TaskAttachment.find(attachmentQuery).select('uploadedBy') : [];

  const employeeAccumulator = new Map(
    employeeIds.map((id) => {
      const employee = employeeById.get(String(id));
      return [String(id), {
        employeeId: String(id),
        employeeName: employee?.userId?.name || employee?.employeeCode || 'Unknown employee',
        department: employee?.department || '-',
        designation: employee?.designation || '-',
        loginTime: null,
        logoutTime: null,
        projectSet: new Set(),
        taskSet: new Set(),
        completedTasks: 0,
        pendingTasks: 0,
        timeSpentFromUpdates: 0,
        timeSpentFromAttendance: 0,
        blockers: new Set(),
        filesSubmitted: 0,
        detailedUpdates: []
      }];
    })
  );

  attendanceRecords.forEach((record) => {
    const key = String(record.employeeId);
    const slot = employeeAccumulator.get(key);
    if (!slot) return;

    if (record.loginTime && (!slot.loginTime || new Date(record.loginTime) < new Date(slot.loginTime))) {
      slot.loginTime = record.loginTime;
    }

    if (record.logoutTime && (!slot.logoutTime || new Date(record.logoutTime) > new Date(slot.logoutTime))) {
      slot.logoutTime = record.logoutTime;
    }

    slot.timeSpentFromAttendance += Number(record.totalWorkingHours || 0);
  });

  updates.forEach((update) => {
    const key = String(update.employeeId?._id || update.employeeId);
    const slot = employeeAccumulator.get(key);
    if (!slot) return;

    const projectName = update.projectId?.name || update.projectId?.projectCode;
    if (projectName) slot.projectSet.add(projectName);

    const taskTitle = update.taskId?.title;
    if (taskTitle) slot.taskSet.add(taskTitle);

    slot.timeSpentFromUpdates += Number(update.timeSpent || 0);

    const blockers = safeText(update.blockers);
    if (blockers) slot.blockers.add(blockers);

    slot.detailedUpdates.push({
      date: update.date,
      whatWasDoneToday: safeText(update.workDescription) || '-',
      whatIsPending: safeText(update.pendingWork) || '-',
      whatWillBeDoneTomorrow: safeText(update.tomorrowPlan) || '-',
      issuesBlockers: blockers || '-',
      filesSubmitted: 0
    });
  });

  tasks.forEach((task) => {
    const key = String(task.assignedTo);
    const slot = employeeAccumulator.get(key);
    if (!slot) return;

    const projectName = task.projectId?.name || task.projectId?.projectCode;
    if (projectName) slot.projectSet.add(projectName);
    if (task.title) slot.taskSet.add(task.title);

    if (task.status === 'completed') {
      slot.completedTasks += 1;
    } else {
      slot.pendingTasks += 1;
    }
  });

  attachments.forEach((attachment) => {
    const employeeIdFromUser = userIdToEmployeeId.get(String(attachment.uploadedBy));
    if (!employeeIdFromUser) return;
    const slot = employeeAccumulator.get(employeeIdFromUser);
    if (!slot) return;
    slot.filesSubmitted += 1;

    if (slot.detailedUpdates.length) {
      slot.detailedUpdates[0].filesSubmitted += 1;
    }
  });

  const table = [...employeeAccumulator.values()].map((entry) => {
    const timeSpent = entry.timeSpentFromUpdates > 0 ? entry.timeSpentFromUpdates : entry.timeSpentFromAttendance;
    return {
      employeeId: entry.employeeId,
      employeeName: entry.employeeName,
      department: entry.department,
      designation: entry.designation,
      loginTime: formatTime(entry.loginTime),
      logoutTime: formatTime(entry.logoutTime),
      projectWorkedOn: [...entry.projectSet].join(', ') || '-',
      tasksWorkedOn: [...entry.taskSet].join(', ') || '-',
      completedTasks: entry.completedTasks,
      pendingTasks: entry.pendingTasks,
      timeSpentHours: Number(timeSpent.toFixed(2)),
      timeSpent: hoursLabel(timeSpent),
      blockers: [...entry.blockers].join('; ') || '-',
      filesSubmitted: entry.filesSubmitted
    };
  });

  const details = [...employeeAccumulator.values()].map((entry) => ({
    employeeId: entry.employeeId,
    employeeName: entry.employeeName,
    filesSubmitted: entry.filesSubmitted,
    updates: entry.detailedUpdates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }));

  return {
    meta: {
      generatedAt: new Date(),
      datePreset: range.datePreset,
      from: range.from,
      to: range.to,
      totalEmployees: table.length
    },
    table,
    details
  };
};

const resolveFilterDateRange = (query) => {
  const from = query.fromDate || query.from;
  const to = query.toDate || query.to;
  if (!from && !to) return { from: null, to: null };

  return {
    from: from ? startOfDay(from) : startOfDay('1970-01-01'),
    to: to ? endOfDay(to) : endOfDay(new Date())
  };
};

const normalizeReportType = (value) => {
  const reportType = String(value || 'attendance_report').toLowerCase();
  const allowed = new Set([
    'attendance_report',
    'employee_report',
    'project_report',
    'task_report',
    'daily_work_report',
    'completed_task_report',
    'overdue_task_report',
    'login_logout_report'
  ]);

  return allowed.has(reportType) ? reportType : 'attendance_report';
};

const csvFromReport = (payload) => {
  const headers = payload.columns.map((column) => column.label);
  const lines = [headers.map(csvValue).join(',')];

  payload.rows.forEach((row) => {
    lines.push(
      payload.columns
        .map((column) => csvValue(row[column.key]))
        .join(',')
    );
  });

  return lines.join('\n');
};

const buildAttendanceReport = async (query, dateRange) => {
  const attendanceQuery = {};
  if (query.employeeId) attendanceQuery.employeeId = query.employeeId;
  if (dateRange.from && dateRange.to) attendanceQuery.date = { $gte: dateRange.from, $lte: dateRange.to };

  let records = await Attendance.find(attendanceQuery)
    .populate({ path: 'employeeId', select: 'employeeCode department designation userId', populate: { path: 'userId', select: 'name email status' } })
    .sort({ date: -1 });

  if (query.department) {
    records = records.filter((record) => record.employeeId?.department === query.department);
  }

  const rows = records.map((record) => ({
    employeeName: record.employeeId?.userId?.name || record.employeeId?.employeeCode || '-',
    department: record.employeeId?.department || '-',
    date: record.date ? new Date(record.date).toLocaleDateString() : '-',
    loginTime: record.loginTime ? new Date(record.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    logoutTime: record.logoutTime ? new Date(record.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    totalWorkingHours: Number(record.totalWorkingHours || 0).toFixed(2),
    status: record.status || 'not_logged_in'
  }));

  const statusCount = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

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
    chartData: Object.entries(statusCount).map(([label, value]) => ({ label, value }))
  };
};

const buildEmployeeReport = async (query, dateRange) => {
  const employeeQuery = {};
  if (query.employeeId) employeeQuery._id = query.employeeId;
  if (query.department) employeeQuery.department = query.department;
  if (dateRange.from && dateRange.to) employeeQuery.joiningDate = { $gte: dateRange.from, $lte: dateRange.to };

  const employees = await Employee.find(employeeQuery)
    .populate('userId', 'name email role status')
    .sort({ createdAt: -1 });

  const rows = employees.map((employee) => ({
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
    chartData: [
      { label: 'Active', value: rows.filter((row) => row.status === 'active').length },
      { label: 'Inactive', value: rows.filter((row) => row.status === 'inactive').length }
    ]
  };
};

const buildProjectReport = async (query, dateRange) => {
  const projectQuery = {};
  if (query.projectId) projectQuery._id = query.projectId;
  if (query.department) projectQuery.department = query.department;
  if (dateRange.from && dateRange.to) projectQuery.startDate = { $gte: dateRange.from, $lte: dateRange.to };

  const projects = await Project.find(projectQuery).sort({ createdAt: -1 });

  const rows = projects.map((project) => ({
    projectCode: project.projectCode || '-',
    projectName: project.name || '-',
    department: project.department || '-',
    status: project.status || '-',
    priority: project.priority || '-',
    startDate: project.startDate ? new Date(project.startDate).toLocaleDateString() : '-',
    deadline: project.deadline ? new Date(project.deadline).toLocaleDateString() : '-'
  }));

  const statusCount = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

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
    chartData: Object.entries(statusCount).map(([label, value]) => ({ label, value }))
  };
};

const buildTaskBasedReport = async (query, dateRange, mode = 'all') => {
  const taskQuery = {};

  if (query.employeeId) taskQuery.assignedTo = query.employeeId;
  if (query.projectId) taskQuery.projectId = query.projectId;
  if (query.taskStatus && mode === 'all') taskQuery.status = query.taskStatus;

  if (mode === 'completed') {
    taskQuery.status = 'completed';
  }

  if (mode === 'overdue') {
    taskQuery.dueDate = { $lt: endOfDay(new Date()) };
    taskQuery.status = { $ne: 'completed' };
  }

  if (dateRange.from && dateRange.to) {
    if (mode === 'completed') {
      taskQuery.completedAt = { $gte: dateRange.from, $lte: dateRange.to };
    } else {
      taskQuery.createdAt = { $gte: dateRange.from, $lte: dateRange.to };
    }
  }

  let tasks = await Task.find(taskQuery)
    .populate('projectId', 'name projectCode department')
    .populate({ path: 'assignedTo', select: 'employeeCode department userId', populate: { path: 'userId', select: 'name email' } })
    .sort({ createdAt: -1 });

  if (query.department) {
    tasks = tasks.filter((task) => (task.department || task.assignedTo?.department || task.projectId?.department) === query.department);
  }

  const rows = tasks.map((task) => {
    const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    return {
      taskCode: task.taskCode || '-',
      title: task.title || '-',
      employeeName: task.assignedTo?.userId?.name || task.assignedTo?.employeeCode || '-',
      department: task.department || task.assignedTo?.department || '-',
      project: task.projectId?.name || task.projectId?.projectCode || '-',
      status: overdue ? 'overdue' : task.status,
      priority: task.priority || '-',
      dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-',
      completedAt: task.completedAt ? new Date(task.completedAt).toLocaleDateString() : '-'
    };
  });

  const statusCount = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

  const titleByMode = {
    all: 'Task Report',
    completed: 'Completed Task Report',
    overdue: 'Overdue Task Report'
  };

  return {
    title: titleByMode[mode] || 'Task Report',
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
    chartData: Object.entries(statusCount).map(([label, value]) => ({ label, value }))
  };
};

const buildLoginLogoutReport = async (query, dateRange) => {
  const attendanceQuery = {};
  if (query.employeeId) attendanceQuery.employeeId = query.employeeId;
  if (dateRange.from && dateRange.to) attendanceQuery.date = { $gte: dateRange.from, $lte: dateRange.to };

  let records = await Attendance.find(attendanceQuery)
    .select('employeeId date loginTime logoutTime totalWorkingHours status')
    .populate({ path: 'employeeId', select: 'employeeCode department userId', populate: { path: 'userId', select: 'name email' } })
    .sort({ date: -1 });

  if (query.department) {
    records = records.filter((record) => record.employeeId?.department === query.department);
  }

  const rows = records.map((record) => ({
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
      { key: 'loginTime', label: 'Login time' },
      { key: 'logoutTime', label: 'Logout time' },
      { key: 'totalWorkingHours', label: 'Hours' },
      { key: 'status', label: 'Status' }
    ],
    rows,
    summaryCards: [
      { label: 'Total records', value: rows.length },
      { label: 'Logged in', value: rows.filter((row) => ['logged_in', 'on_break', 'late'].includes(row.status)).length },
      { label: 'Logged out', value: rows.filter((row) => row.status === 'logged_out').length },
      { label: 'Missing logout', value: rows.filter((row) => row.status === 'missing_logout').length }
    ],
    chartData: [
      { label: 'Logged out', value: rows.filter((row) => row.status === 'logged_out').length },
      { label: 'Missing logout', value: rows.filter((row) => row.status === 'missing_logout').length }
    ]
  };
};

const buildDailyWorkPreviewReport = async (query) => {
  const payload = await buildDailyWorkReportPayload(query);
  const totalHours = payload.table.reduce((sum, row) => sum + Number(row.timeSpentHours || 0), 0);
  const completed = payload.table.reduce((sum, row) => sum + Number(row.completedTasks || 0), 0);
  const pending = payload.table.reduce((sum, row) => sum + Number(row.pendingTasks || 0), 0);

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
    rows: payload.table,
    summaryCards: [
      { label: 'Employees', value: payload.table.length },
      { label: 'Completed tasks', value: completed },
      { label: 'Pending tasks', value: pending },
      { label: 'Total hours', value: Number(totalHours.toFixed(2)) }
    ],
    chartData: [
      { label: 'Completed', value: completed },
      { label: 'Pending', value: pending }
    ]
  };
};

const buildAdminReportPayload = async (query) => {
  const reportType = normalizeReportType(query.reportType);
  const dateRange = resolveFilterDateRange(query);

  let report;

  if (reportType === 'attendance_report') {
    report = await buildAttendanceReport(query, dateRange);
  } else if (reportType === 'employee_report') {
    report = await buildEmployeeReport(query, dateRange);
  } else if (reportType === 'project_report') {
    report = await buildProjectReport(query, dateRange);
  } else if (reportType === 'task_report') {
    report = await buildTaskBasedReport(query, dateRange, 'all');
  } else if (reportType === 'daily_work_report') {
    report = await buildDailyWorkPreviewReport(query);
  } else if (reportType === 'completed_task_report') {
    report = await buildTaskBasedReport(query, dateRange, 'completed');
  } else if (reportType === 'overdue_task_report') {
    report = await buildTaskBasedReport(query, dateRange, 'overdue');
  } else {
    report = await buildLoginLogoutReport(query, dateRange);
  }

  return {
    reportType,
    title: report.title,
    generatedAt: new Date(),
    columns: report.columns,
    rows: report.rows,
    summaryCards: report.summaryCards,
    chartData: report.chartData
  };
};

export const attendanceReport = asyncHandler(async (req, res) => {
  const dateQuery = dateRangeQuery(req.query);
  const records = await Attendance.find(Object.keys(dateQuery).length ? { date: dateQuery } : {}).populate({ path: 'employeeId', populate: { path: 'userId', select: 'name email' } });
  res.json({ records });
});

export const employeeReport = asyncHandler(async (req, res) => {
  const employees = await Employee.find({}).populate('userId', 'name email role status');
  res.json({ employees });
});

export const projectReport = asyncHandler(async (req, res) => {
  const projects = await Project.find({});
  res.json({ projects });
});

export const taskReport = asyncHandler(async (req, res) => {
  const tasks = await Task.find({}).populate('projectId', 'name').populate('assignedTo');
  res.json({ tasks });
});

export const dailyWorkReport = asyncHandler(async (req, res) => {
  const payload = await buildDailyWorkReportPayload(req.query);
  res.json(payload);
});

export const exportDailyWorkReport = asyncHandler(async (req, res) => {
  const format = String(req.query.format || '').toLowerCase();
  const payload = await buildDailyWorkReportPayload(req.query);

  if (format === 'excel') {
    const columns = [
      'Employee name',
      'Login time',
      'Logout time',
      'Project worked on',
      'Tasks worked on',
      'Completed tasks',
      'Pending tasks',
      'Time spent',
      'Blockers',
      'Department',
      'Files submitted'
    ];

    const lines = [columns.map(csvValue).join(',')];
    payload.table.forEach((row) => {
      lines.push(
        [
          row.employeeName,
          row.loginTime,
          row.logoutTime,
          row.projectWorkedOn,
          row.tasksWorkedOn,
          row.completedTasks,
          row.pendingTasks,
          row.timeSpent,
          row.blockers,
          row.department,
          row.filesSubmitted
        ]
          .map(csvValue)
          .join(',')
      );
    });

    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="daily-work-report.csv"');
    res.send(csv);
    return;
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="daily-work-report.pdf"');

    doc.pipe(res);
    doc.fontSize(18).text('Daily Work Report', { underline: true });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .text(`Generated: ${new Date(payload.meta.generatedAt).toLocaleString()}`)
      .text(`Employees: ${payload.meta.totalEmployees}`)
      .text(`Date preset: ${payload.meta.datePreset}`);

    if (payload.meta.from || payload.meta.to) {
      doc
        .text(`From: ${payload.meta.from ? new Date(payload.meta.from).toLocaleDateString() : '-'}`)
        .text(`To: ${payload.meta.to ? new Date(payload.meta.to).toLocaleDateString() : '-'}`);
    }

    doc.moveDown(1);

    payload.table.forEach((row, index) => {
      doc.fontSize(12).text(`${index + 1}. ${row.employeeName}`, { continued: false });
      doc
        .fontSize(10)
        .text(`Login: ${row.loginTime} | Logout: ${row.logoutTime} | Time: ${row.timeSpent}`)
        .text(`Project: ${row.projectWorkedOn}`)
        .text(`Tasks: ${row.tasksWorkedOn}`)
        .text(`Completed: ${row.completedTasks} | Pending: ${row.pendingTasks}`)
        .text(`Blockers: ${row.blockers}`)
        .text(`Files submitted: ${row.filesSubmitted}`);
      doc.moveDown(0.8);
    });

    doc.end();
    return;
  }

  res.status(400);
  throw new Error('Unsupported export format. Use format=excel or format=pdf.');
});

export const emailDailyWorkReport = asyncHandler(async (req, res) => {
  const recipients = Array.isArray(req.body?.recipients)
    ? req.body.recipients.filter((value) => safeText(value))
    : [];

  if (!recipients.length) {
    res.status(400);
    throw new Error('At least one recipient email is required');
  }

  const payload = await buildDailyWorkReportPayload({ ...req.query, ...req.body });

  res.json({
    message: 'Email dispatch placeholder completed. Connect SMTP provider to deliver this report in production.',
    recipients,
    preview: {
      totalEmployees: payload.meta.totalEmployees,
      generatedAt: payload.meta.generatedAt,
      datePreset: payload.meta.datePreset,
      from: payload.meta.from,
      to: payload.meta.to
    }
  });
});

export const loginLogoutReport = asyncHandler(async (req, res) => {
  const records = await Attendance.find({}).select('employeeId date loginTime logoutTime totalWorkingHours status').populate('employeeId');
  res.json({ records });
});

export const adminReportPreview = asyncHandler(async (req, res) => {
  const payload = await buildAdminReportPayload(req.query);
  res.json(payload);
});

export const exportAdminReport = asyncHandler(async (req, res) => {
  const format = String(req.query.format || '').toLowerCase();
  const payload = await buildAdminReportPayload(req.query);
  const safeReportType = String(payload.reportType || 'report').replace(/[^a-z_]/gi, '_');

  if (format === 'excel') {
    const csv = csvFromReport(payload);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeReportType}.csv"`);
    res.send(csv);
    return;
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeReportType}.pdf"`);

    doc.pipe(res);
    doc.fontSize(18).text(payload.title, { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10).text(`Generated: ${new Date(payload.generatedAt).toLocaleString()}`);
    doc.moveDown(0.4);

    payload.summaryCards.forEach((card) => {
      doc.fontSize(10).text(`${card.label}: ${card.value}`);
    });

    doc.moveDown(0.8);
    payload.rows.forEach((row, index) => {
      doc.fontSize(11).text(`${index + 1}.`, { continued: true }).text(' ', { continued: true });
      const firstColumn = payload.columns[0]?.key;
      doc.fontSize(11).text(String(row[firstColumn] ?? '-'));
      payload.columns.slice(1).forEach((column) => {
        doc.fontSize(9).text(`${column.label}: ${String(row[column.key] ?? '-')}`);
      });
      doc.moveDown(0.4);
    });

    doc.end();
    return;
  }

  res.status(400);
  throw new Error('Unsupported export format. Use format=excel or format=pdf.');
});

export const emailAdminReport = asyncHandler(async (req, res) => {
  const recipients = Array.isArray(req.body?.recipients)
    ? req.body.recipients.filter((value) => safeText(value))
    : [];

  if (!recipients.length) {
    res.status(400);
    throw new Error('At least one recipient email is required');
  }

  const payload = await buildAdminReportPayload({ ...req.query, ...req.body });

  res.json({
    message: 'Email dispatch placeholder completed. Connect SMTP provider to deliver this report in production.',
    recipients,
    preview: {
      reportType: payload.reportType,
      title: payload.title,
      generatedAt: payload.generatedAt,
      rows: payload.rows.length
    }
  });
});
