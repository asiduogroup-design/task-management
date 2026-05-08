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

  attendance.logoutTime = new Date();
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
  attendance.breakEndTime = new Date();
  attendance.totalBreakMinutes += minutesBetween(attendance.breakStartTime, attendance.breakEndTime);
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
  const { employeeId, status, fromDate, toDate, search } = req.query;
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

  if (search) {
    const normalized = String(search).toLowerCase().trim();
    records = records.filter((record) =>
      record.employeeId?.employeeCode?.toLowerCase().includes(normalized) ||
      record.employeeId?.userId?.name?.toLowerCase().includes(normalized) ||
      record.employeeId?.userId?.email?.toLowerCase().includes(normalized)
    );
  }

  res.json({ records });
});

export const updateAttendance = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!attendance) {
    res.status(404);
    throw new Error('Attendance not found');
  }
  res.json({ attendance });
});
