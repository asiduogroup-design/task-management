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

export const getLeaves = asyncHandler(async (req, res) => {
  const query = [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role) ? {} : { employeeId: req.employee?._id };
  const leaves = await LeaveRequest.find(query).populate({ path: 'employeeId', populate: { path: 'userId', select: 'name email' } }).sort({ createdAt: -1 });
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

const updateLeaveDecision = async (req, status) => {
  const leave = await LeaveRequest.findByIdAndUpdate(
    req.params.id,
    { status, adminRemarks: req.body.adminRemarks || '', approvedBy: req.user._id },
    { new: true }
  );
  if (!leave) {
    req.res.status(404);
    throw new Error('Leave request not found');
  }
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
