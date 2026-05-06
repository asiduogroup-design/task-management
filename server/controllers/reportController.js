import asyncHandler from 'express-async-handler';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import DailyWorkUpdate from '../models/DailyWorkUpdate.js';

const dateRangeQuery = (query) => {
  if (!query.from && !query.to) return {};
  return {
    $gte: query.from ? new Date(query.from) : new Date('1970-01-01'),
    $lte: query.to ? new Date(query.to) : new Date()
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
  const updates = await DailyWorkUpdate.find({}).populate('employeeId').populate('projectId', 'name').populate('taskId', 'title');
  res.json({ updates });
});

export const loginLogoutReport = asyncHandler(async (req, res) => {
  const records = await Attendance.find({}).select('employeeId date loginTime logoutTime totalWorkingHours status').populate('employeeId');
  res.json({ records });
});
