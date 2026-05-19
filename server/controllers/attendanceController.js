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
  const attendance = await Attendance.findOne({ employeeId: employee._id, date: today }) || new Attendance({ employeeId: employee._id, date: today });

  // If last session is open (no logout), block new login
  const lastSession = attendance.sessions.length > 0 ? attendance.sessions[attendance.sessions.length - 1] : null;
  if (lastSession && !lastSession.logoutTime) {
    res.status(409);
    throw new Error('Already logged in. Please logout before new login.');
  }

  const settings = await Settings.findOne();
  const now = new Date();
  const lateLimit = settings?.attendanceSettings?.lateLoginLimit || settings?.lateLoginLimit || employee.lateLoginRule || '09:45';
  const [hour, minute] = lateLimit.split(':').map(Number);
  const lateDate = new Date(today);
  lateDate.setHours(hour, minute, 0, 0);

  attendance.sessions.push({ loginTime: now });
  attendance.status = now > lateDate ? 'late' : 'logged_in';
  attendance.ipAddress = req.ip;
  attendance.deviceInfo = req.headers['user-agent'] || '';
  await attendance.save();

  res.status(201).json({ attendance });
});

export const attendanceLogout = asyncHandler(async (req, res) => {
  const employee = requireEmployee(req);
  const attendance = await Attendance.findOne({ employeeId: employee._id, date: dateOnly() });

  if (!attendance || attendance.sessions.length === 0) {
    res.status(400);
    throw new Error('Login is required before logout');
  }
  const lastSession = attendance.sessions[attendance.sessions.length - 1];
  if (!lastSession || lastSession.logoutTime) {
    res.status(409);
    throw new Error('No active session to logout');
  }

  const now = new Date();
  const settings = await Settings.findOne();
  const earlyEndTime = settings?.attendanceSettings?.workEndTime || settings?.workEndTime || employee.shiftEndTime || '18:30';
  const [eh, em] = earlyEndTime.split(':').map(Number);
  const shiftEnd = new Date(dateOnly());
  shiftEnd.setHours(eh, em, 0, 0);

  lastSession.logoutTime = now;
  lastSession.durationMinutes = Math.max(0, Math.round((now - new Date(lastSession.loginTime)) / 60000));
  attendance.earlyLogout = now < shiftEnd;
  attendance.status = 'logged_out';
  // Sum all session durations for totalWorkingHours
  const totalSessionMinutes = attendance.sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  attendance.totalWorkingHours = Number(((totalSessionMinutes - (attendance.totalBreakMinutes || 0)) / 60).toFixed(2));
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

  // If employeeId is present, filter by employee
  const { employeeId } = req.query;
  let records = [];
  let totalEmployees = 1;
  if (employeeId) {
    // Per-employee summary for the week
    const startOfWeek = new Date(day);
    startOfWeek.setDate(day.getDate() - day.getDay()); // Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    records = await Attendance.find({ employeeId, date: { $gte: startOfWeek, $lt: endOfWeek } });
    totalEmployees = 1;
  } else {
    // Admin summary for all employees for a single day
    totalEmployees = await (await import('../models/Employee.js')).default.countDocuments();
    records = await Attendance.find({ date: { $gte: day, $lt: nextDay } });
  }

  // Calculate stats
  let present = 0, onLeave = 0, lateLogin = 0, earlyLogoutCount = 0, absent = 0, notMarked = 0, totalWorkingHours = 0;
  if (employeeId) {
    // Per-employee weekly summary
    present = records.filter((r) => ['logged_in', 'on_break', 'logged_out', 'late'].includes(r.status)).length;
    onLeave = records.filter((r) => r.status === 'on_leave').length;
    lateLogin = records.filter((r) => r.status === 'late').length;
    earlyLogoutCount = records.filter((r) => r.earlyLogout).length;
    absent = records.filter((r) => r.status === 'absent').length;
    totalWorkingHours = records.reduce((sum, r) => sum + (r.totalWorkingHours || 0), 0);
    notMarked = 7 - records.length;
    res.json({
      summary: {
        present,
        leaves: onLeave,
        absents: absent + notMarked,
        lateLogin,
        earlyLogout: earlyLogoutCount,
        workingHours: Number(totalWorkingHours.toFixed(2)),
        totalDays: 7,
        maxWorkingHours: 40 // Assume 8h x 5d
      }
    });
    return;
  } else {
    // Admin summary for a single day
    present = records.filter((r) => ['logged_in', 'on_break', 'logged_out', 'late'].includes(r.status)).length;
    onLeave = records.filter((r) => r.status === 'on_leave').length;
    lateLogin = records.filter((r) => r.status === 'late').length;
    earlyLogoutCount = records.filter((r) => r.earlyLogout).length;
    absent = records.filter((r) => r.status === 'absent').length;
    notMarked = totalEmployees - records.length;
    res.json({
      totalEmployees,
      present,
      absent: absent + notMarked,
      lateLogin,
      earlyLogout: earlyLogoutCount,
      onLeave
    });
  }
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

  const formatTime = (val) => (val ? new Date(val).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '');
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
