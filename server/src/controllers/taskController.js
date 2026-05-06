import asyncHandler from 'express-async-handler';
import Task from '../models/Task.js';

export const createTask = asyncHandler(async (req, res) => {
  const task = await Task.create({
    ...req.body,
    assignedBy: req.user._id
  });

  res.status(201).json({ task });
});

export const getTasks = asyncHandler(async (req, res) => {
  const query = req.user.role === 'admin' ? {} : { assignedTo: req.user._id };
  const tasks = await Task.find(query)
    .populate('assignedTo', 'name email department jobTitle')
    .populate('assignedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ tasks });
});

export const updateTaskStatus = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const isAdmin = req.user.role === 'admin';
  const isAssignee = task.assignedTo.toString() === req.user._id.toString();

  if (!isAdmin && !isAssignee) {
    res.status(403);
    throw new Error('Forbidden: task is not assigned to you');
  }

  task.status = req.body.status || task.status;
  await task.save();

  res.json({ task });
});
