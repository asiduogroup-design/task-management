import asyncHandler from 'express-async-handler';
import DailyWorkUpdate from '../models/DailyWorkUpdate.js';
import { ROLES } from '../middleware/roleMiddleware.js';
import { dateOnly } from '../utils/calculateHours.js';

export const getDailyUpdates = asyncHandler(async (req, res) => {
  const query = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(req.user.role) ? {} : { employeeId: req.employee?._id };
  const updates = await DailyWorkUpdate.find(query).populate('employeeId').populate('projectId', 'name').populate('taskId', 'title').sort({ date: -1 });
  res.json({ updates });
});

export const createDailyUpdate = asyncHandler(async (req, res) => {
  if (!req.employee) {
    res.status(400);
    throw new Error('Employee profile required');
  }
  const date = dateOnly(req.body.date || new Date());
  const exists = await DailyWorkUpdate.findOne({ employeeId: req.employee._id, date });
  if (exists) {
    res.status(409);
    throw new Error('Daily update already submitted for this date');
  }
  const update = await DailyWorkUpdate.create({ ...req.body, employeeId: req.employee._id, date });
  res.status(201).json({ update });
});

export const getDailyUpdateById = asyncHandler(async (req, res) => {
  const update = await DailyWorkUpdate.findById(req.params.id).populate('employeeId').populate('projectId').populate('taskId');
  if (!update) {
    res.status(404);
    throw new Error('Daily update not found');
  }
  res.json({ update });
});

export const updateDailyUpdate = asyncHandler(async (req, res) => {
  const update = await DailyWorkUpdate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!update) {
    res.status(404);
    throw new Error('Daily update not found');
  }
  res.json({ update });
});
