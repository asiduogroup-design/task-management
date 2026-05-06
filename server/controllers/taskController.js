import asyncHandler from 'express-async-handler';
import Task from '../models/Task.js';
import TaskComment from '../models/TaskComment.js';
import TaskAttachment from '../models/TaskAttachment.js';
import Notification from '../models/Notification.js';
import Employee from '../models/Employee.js';
import { ROLES } from '../middleware/roleMiddleware.js';

const taskQueryForUser = (req) => {
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(req.user.role)) return {};
  return { assignedTo: req.employee?._id };
};

export const getTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find(taskQueryForUser(req))
    .populate('projectId', 'name projectCode')
    .populate({ path: 'assignedTo', populate: { path: 'userId', select: 'name email' } })
    .populate('assignedBy', 'name email')
    .sort({ createdAt: -1 });
  res.json({ tasks });
});

export const createTask = asyncHandler(async (req, res) => {
  if (req.body.dueDate && req.body.startDate && new Date(req.body.dueDate) < new Date(req.body.startDate)) {
    res.status(400);
    throw new Error('Due date cannot be before start date');
  }
  const task = await Task.create({ ...req.body, assignedBy: req.user._id });
  const employee = await Employee.findById(task.assignedTo);
  if (employee) {
    await Notification.create({
      userId: employee.userId,
      title: 'Task assigned',
      message: `You were assigned "${task.title}".`,
      type: 'task',
      referenceId: task._id
    });
  }
  res.status(201).json({ task });
});

export const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('projectId').populate('assignedTo').populate('assignedBy', 'name email');
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  const comments = await TaskComment.find({ taskId: task._id }).populate('userId', 'name role');
  const attachments = await TaskAttachment.find({ taskId: task._id });
  res.json({ task, comments, attachments });
});

export const updateTask = asyncHandler(async (req, res) => {
  if (req.body.dueDate && req.body.startDate && new Date(req.body.dueDate) < new Date(req.body.startDate)) {
    res.status(400);
    throw new Error('Due date cannot be before start date');
  }
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  res.json({ task });
});

export const deleteTask = asyncHandler(async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: 'Task deleted' });
});

export const updateTaskStatus = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const isAssignee = task.assignedTo.toString() === req.employee?._id?.toString();
  const isApprover = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(req.user.role);
  const nextStatus = req.body.status;

  if (!isAssignee && !isApprover) {
    res.status(403);
    throw new Error('You cannot update this task');
  }

  if (isAssignee && !['in_progress', 'under_review'].includes(nextStatus) && !isApprover) {
    res.status(403);
    throw new Error('Employees can start tasks or submit them for review');
  }

  task.status = nextStatus;
  if (nextStatus === 'completed') {
    task.completedAt = new Date();
    task.approvedBy = req.user._id;
  }
  await task.save();
  res.json({ task });
});

export const addTaskComment = asyncHandler(async (req, res) => {
  const comment = await TaskComment.create({ taskId: req.params.id, userId: req.user._id, comment: req.body.comment });
  res.status(201).json({ comment });
});

export const addTaskAttachment = asyncHandler(async (req, res) => {
  const attachment = await TaskAttachment.create({ ...req.body, taskId: req.params.id, uploadedBy: req.user._id });
  res.status(201).json({ attachment });
});
