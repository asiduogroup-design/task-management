import asyncHandler from 'express-async-handler';
import LeaveRequest from '../models/LeaveRequest.js';
import Notification from '../models/Notification.js';
import Employee from '../models/Employee.js';
import { ROLES } from '../middleware/roleMiddleware.js';

const leaveDays = (fromDate, toDate) => {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  return Math.floor((end - start) / 86400000) + 1;
};

const isAdmin = (role) => [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(role);

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const applyRange = (query, fromDate, toDate) => {
  if (!fromDate && !toDate) return;
  query.fromDate = {
    $gte: fromDate ? startOfDay(fromDate) : startOfDay('1970-01-01'),
    $lte: toDate ? endOfDay(toDate) : endOfDay(new Date())
  };
};

export const getLeaveSummary = asyncHandler(async (req, res) => {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const [pendingLeaveRequests, approvedLeaves, rejectedLeaves, employeesOnLeaveToday] = await Promise.all([
    LeaveRequest.countDocuments({ status: 'pending' }),
    LeaveRequest.countDocuments({ status: 'approved' }),
    LeaveRequest.countDocuments({ status: 'rejected' }),
    LeaveRequest.distinct('employeeId', {
      status: 'approved',
      fromDate: { $lte: todayEnd },
      toDate: { $gte: todayStart }
    }).then((employeeIds) => employeeIds.length)
  ]);

  res.json({
    summary: {
      pendingLeaveRequests,
      approvedLeaves,
      rejectedLeaves,
      employeesOnLeaveToday
    }
  });
});

export const getLeaves = asyncHandler(async (req, res) => {
  const { status, employeeId, leaveType, fromDate, toDate } = req.query;
  const query = isAdmin(req.user.role) ? {} : { employeeId: req.employee?._id };

  if (isAdmin(req.user.role) && employeeId) query.employeeId = employeeId;
  if (status) query.status = status;
  if (leaveType) query.leaveType = leaveType;
  applyRange(query, fromDate, toDate);

  const leaves = await LeaveRequest.find(query)
    .populate({
      path: 'employeeId',
      select: 'employeeCode department designation joiningDate userId',
      populate: { path: 'userId', select: 'name email' }
    })
    .populate('approvedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ leaves });
});

export const createLeave = asyncHandler(async (req, res) => {
  if (!req.employee) {
    res.status(400);
    throw new Error('Employee profile required');
  }
  if (new Date(req.body.toDate) < new Date(req.body.fromDate)) {
    res.status(400);
    throw new Error('Leave to date cannot be before from date');
  }
  const leave = await LeaveRequest.create({ ...req.body, employeeId: req.employee._id, numberOfDays: leaveDays(req.body.fromDate, req.body.toDate) });
  res.status(201).json({ leave });
});

export const getLeaveById = asyncHandler(async (req, res) => {
  const leave = await LeaveRequest.findById(req.params.id)
    .populate({
      path: 'employeeId',
      select: 'employeeCode department designation joiningDate email phone userId',
      populate: { path: 'userId', select: 'name email' }
    })
    .populate('approvedBy', 'name email');

  if (!leave) {
    res.status(404);
    throw new Error('Leave request not found');
  }

  const employeeId = String(leave.employeeId?._id || leave.employeeId);
  const isOwner = req.employee?._id && String(req.employee._id) === employeeId;

  if (!isAdmin(req.user.role) && !isOwner) {
    res.status(403);
    throw new Error('Forbidden: insufficient role');
  }

  const previousLeaves = await LeaveRequest.find({
    employeeId,
    _id: { $ne: leave._id }
  })
    .sort({ fromDate: -1 })
    .limit(10)
    .select('leaveType fromDate toDate numberOfDays status reason adminRemarks createdAt');

  res.json({ leave, previousLeaves });
});

const updateLeaveDecision = async (req, status) => {
  const leave = await LeaveRequest.findById(req.params.id);
  if (!leave) {
    req.res.status(404);
    throw new Error('Leave request not found');
  }

  leave.status = status;
  leave.adminRemarks = req.body.adminRemarks || '';
  leave.approvedBy = req.user._id;
  await leave.save();

  const employee = await Employee.findById(leave.employeeId);
  if (employee) {
    await Notification.create({
      userId: employee.userId,
      title: `Leave ${status}`,
      message: `Your leave request was ${status}.`,
      type: 'leave',
      referenceId: leave._id
    });
  }
  return leave;
};

export const approveLeave = asyncHandler(async (req, res) => {
  res.json({ leave: await updateLeaveDecision(req, 'approved') });
});

export const rejectLeave = asyncHandler(async (req, res) => {
  res.json({ leave: await updateLeaveDecision(req, 'rejected') });
});
