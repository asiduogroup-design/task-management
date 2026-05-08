import asyncHandler from 'express-async-handler';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Settings from '../models/Settings.js';
import { calculateWorkingHours, dateOnly, minutesBetween } from '../utils/calculateHours.js';

const requireEmployee = (req) => {
  if (!req.employee) {
    throw new Error('Employee profile required for attendance');
  }
  return req.employee;
};

export const attendanceLogin = asyncHandler(async (req, res) => {
  const employee = requireEmployee(req);
  const today = dateOnly();
  const existing = await Attendance.findOne({ employeeId: employee._id, date: today });

  if (existing?.loginTime) {
    res.status(409);
    throw new Error('Employee already logged in today');
  }

  const settings = await Settings.findOne();
  const now = new Date();
  const lateLimit = settings?.lateLoginLimit || employee.lateLoginRule || '09:45';
  const [hour, minute] = lateLimit.split(':').map(Number);
  const lateDate = new Date(today);
  lateDate.setHours(hour, minute, 0, 0);

  const attendance = existing || new Attendance({ employeeId: employee._id, date: today });
  attendance.loginTime = now;
  attendance.status = now > lateDate ? 'late' : 'logged_in';
  attendance.ipAddress = req.ip;
  attendance.deviceInfo = req.headers['user-agent'] || '';
  await attendance.save();

  res.status(201).json({ attendance });
});

export const attendanceLogout = asyncHandler(async (req, res) => {
  const employee = requireEmployee(req);
  const attendance = await Attendance.findOne({ employeeId: employee._id, date: dateOnly() });

  if (!attendance?.loginTime) {
    res.status(400);
    throw new Error('Login is required before logout');
  }
  if (attendance.logoutTime) {
    res.status(409);
    throw new Error('Employee already logged out today');
  }

  const now = new Date();
  const settings = await Settings.findOne();
  const earlyEndTime = settings?.workEndTime || employee.shiftEndTime || '18:30';
  const [eh, em] = earlyEndTime.split(':').map(Number);
  const shiftEnd = new Date(dateOnly());
  shiftEnd.setHours(eh, em, 0, 0);

  attendance.logoutTime = now;
  attendance.earlyLogout = now < shiftEnd;
  attendance.status = 'logged_out';
  attendance.totalWorkingHours = calculateWorkingHours(attendance.loginTime, attendance.logoutTime, attendance.totalBreakMinutes);
  await attendance.save();

  res.json({ attendance });
});

export const breakStart = asyncHandler(async (req, res) => {
  const employee = requireEmployee(req);
  const attendance = await Attendance.findOne({ employeeId: employee._id, date: dateOnly() });
  if (!attendance?.loginTime || attendance.logoutTime) {
    res.status(400);
    throw new Error('Break can start only after login and before logout');
  }
  if (attendance.breakStartTime && !attendance.breakEndTime) {
    res.status(409);
    throw new Error('Break already started');
  }
  attendance.breakStartTime = new Date();
  attendance.breakEndTime = undefined;
  attendance.status = 'on_break';
  await attendance.save();
  res.json({ attendance });
});

export const breakEnd = asyncHandler(async (req, res) => {
  const employee = requireEmployee(req);
  const attendance = await Attendance.findOne({ employeeId: employee._id, date: dateOnly() });
  if (!attendance?.breakStartTime || attendance.breakEndTime) {
    res.status(400);
    throw new Error('Break start is required before break end');
  }
  const end = new Date();
  attendance.breakEndTime = end;
  const mins = minutesBetween(attendance.breakStartTime, end);
  attendance.totalBreakMinutes += mins;
  attendance.breaks.push({ startTime: attendance.breakStartTime, endTime: end, durationMinutes: mins });
  attendance.status = 'logged_in';
  await attendance.save();
  res.json({ attendance });
});

export const getTodayAttendance = asyncHandler(async (req, res) => {
  const employee = requireEmployee(req);
  const attendance = await Attendance.findOne({ employeeId: employee._id, date: dateOnly() });
  res.json({ attendance, status: attendance?.status || 'not_logged_in' });
});

export const getAttendanceHistory = asyncHandler(async (req, res) => {
  const employee = requireEmployee(req);
  const records = await Attendance.find({ employeeId: employee._id }).sort({ date: -1 });
  res.json({ records });
});

export const getAdminAttendance = asyncHandler(async (req, res) => {
  const { employeeId, status, fromDate, toDate, search, department, lateLogin, earlyLogout } = req.query;
  const query = {};

  if (employeeId) query.employeeId = employeeId;
  if (status) query.status = status;
  if (lateLogin === 'true') query.status = 'late';
  if (earlyLogout === 'true') query.earlyLogout = true;

  if (fromDate || toDate) {
    query.date = {};
    if (fromDate) {
      const from = new Date(fromDate);
      if (!Number.isNaN(from.getTime())) query.date.$gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        query.date.$lte = to;
      }
    }
    if (!Object.keys(query.date).length) delete query.date;
  }

  let records = await Attendance.find(query)
    .populate({ path: 'employeeId', select: 'employeeCode department designation', populate: { path: 'userId', select: 'name email' } })
    .sort({ date: -1 });

  if (search) {
    const normalized = String(search).toLowerCase().trim();
    records = records.filter((record) =>
      record.employeeId?.employeeCode?.toLowerCase().includes(normalized) ||
      record.employeeId?.userId?.name?.toLowerCase().includes(normalized) ||
      record.employeeId?.userId?.email?.toLowerCase().includes(normalized)
    );
  }

  if (department) {
    const normalized = String(department).toLowerCase().trim();
    records = records.filter((record) => record.employeeId?.department?.toLowerCase() === normalized);
  }

  res.json({ records });
});

export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const targetDate = req.query.date ? new Date(req.query.date) : new Date();
  const day = dateOnly(targetDate);
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);

  const totalEmployees = await (await import('../models/Employee.js')).default.countDocuments();
  const todayRecords = await Attendance.find({ date: { $gte: day, $lt: nextDay } });

  const present = todayRecords.filter((r) => ['logged_in', 'on_break', 'logged_out', 'late'].includes(r.status)).length;
  const onLeave = todayRecords.filter((r) => r.status === 'on_leave').length;
  const lateLogin = todayRecords.filter((r) => r.status === 'late').length;
  const earlyLogoutCount = todayRecords.filter((r) => r.earlyLogout).length;
  const absent = todayRecords.filter((r) => r.status === 'absent').length;
  const notMarked = totalEmployees - todayRecords.length;

  res.json({
    totalEmployees,
    present,
    absent: absent + notMarked,
    lateLogin,
    earlyLogout: earlyLogoutCount,
    onLeave
  });
});

export const markAbsent = asyncHandler(async (req, res) => {
  const { employeeId, date, remarks } = req.body;
  if (!employeeId || !date) {
    res.status(400);
    throw new Error('employeeId and date are required');
  }
  const day = dateOnly(new Date(date));
  const attendance = await Attendance.findOneAndUpdate(
    { employeeId, date: day },
    { $set: { employeeId, date: day, status: 'absent', remarks: remarks || '' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ attendance });
});

export const exportAttendance = asyncHandler(async (req, res) => {
  const { employeeId, status, fromDate, toDate, department } = req.query;
  const query = {};

  if (employeeId) query.employeeId = employeeId;
  if (status) query.status = status;

  if (fromDate || toDate) {
    query.date = {};
    if (fromDate) {
      const from = new Date(fromDate);
      if (!Number.isNaN(from.getTime())) query.date.$gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        query.date.$lte = to;
      }
    }
    if (!Object.keys(query.date).length) delete query.date;
  }

  let records = await Attendance.find(query)
    .populate({ path: 'employeeId', select: 'employeeCode department designation', populate: { path: 'userId', select: 'name email' } })
    .sort({ date: -1 });

  if (department) {
    const normalized = String(department).toLowerCase().trim();
    records = records.filter((r) => r.employeeId?.department?.toLowerCase() === normalized);
  }

  const formatTime = (val) => (val ? new Date(val).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '');
  const formatDate = (val) => (val ? new Date(val).toLocaleDateString('en-IN') : '');

  const headers = ['Date', 'Employee ID', 'Employee Name', 'Department', 'Designation', 'Login Time', 'Logout Time', 'Total Working Hours', 'Break Minutes', 'Status', 'Early Logout', 'Remarks'];
  const rows = records.map((r) => [
    formatDate(r.date),
    r.employeeId?.employeeCode || '',
    r.employeeId?.userId?.name || '',
    r.employeeId?.department || '',
    r.employeeId?.designation || '',
    formatTime(r.loginTime),
    formatTime(r.logoutTime),
    r.totalWorkingHours ?? '',
    r.totalBreakMinutes ?? '',
    r.status || '',
    r.earlyLogout ? 'Yes' : 'No',
    r.remarks || ''
  ]);

  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"');
  res.send(csv);
});

export const updateAttendance = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!attendance) {
    res.status(404);
    throw new Error('Attendance not found');
  }
  res.json({ attendance });
});
