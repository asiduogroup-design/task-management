import asyncHandler from 'express-async-handler';
import Task from '../models/Task.js';
import TaskComment from '../models/TaskComment.js';
import TaskAttachment from '../models/TaskAttachment.js';
import Subtask from '../models/Subtask.js';
import DailyWorkUpdate from '../models/DailyWorkUpdate.js';
import Notification from '../models/Notification.js';
import Employee from '../models/Employee.js';
import { ROLES } from '../middleware/roleMiddleware.js';

const taskQueryForUser = (req) => {
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(req.user.role)) return {};
  return { assignedTo: req.employee?._id };
};

const appendAndCondition = (query, condition) => {
  query.$and = query.$and || [];
  query.$and.push(condition);
};

const normalizeSubtasks = (subtasks = []) =>
  subtasks
    .filter((subtask) => String(subtask?.title || '').trim())
    .map((subtask) => {
      const status = subtask.status || 'pending';
      return {
        title: String(subtask.title).trim(),
        assignedTo: subtask.assignedTo || undefined,
        dueDate: subtask.dueDate || undefined,
        status,
        completedAt: status === 'completed' ? (subtask.completedAt || new Date()) : undefined
      };
    });

const normalizeAttachments = (attachments = []) =>
  attachments
    .filter((attachment) => String(attachment?.fileName || '').trim() && String(attachment?.fileUrl || '').trim())
    .map((attachment) => ({
      category: attachment.category || 'reference_file',
      fileName: String(attachment.fileName).trim(),
      fileUrl: String(attachment.fileUrl).trim()
    }));

const userTaskPermissions = (task, req) => {
  const isApprover = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(req.user.role);
  const assignedToId = task?.assignedTo?._id || task?.assignedTo;
  const isAssignee = String(assignedToId || '') === String(req.employee?._id || '');
  return { isApprover, isAssignee };
};

export const getTasks = asyncHandler(async (req, res) => {
  const { search, status, employeeId, projectId, priority, deadlineFilter } = req.query;
  const query = taskQueryForUser(req);

  if (status && status !== 'overdue') query.status = status;
  if (employeeId) query.assignedTo = employeeId;
  if (projectId) query.projectId = projectId;
  if (priority) query.priority = priority;

  if (status === 'overdue' || deadlineFilter === 'overdue') {
    appendAndCondition(query, {
      dueDate: { $lt: new Date() },
      status: { $ne: 'completed' }
    });
  }

  if (deadlineFilter === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    query.dueDate = { $gte: start, $lt: end };
  }

  if (deadlineFilter === 'this_week') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    query.dueDate = { $gte: start, $lt: end };
  }

  if (deadlineFilter === 'no_due_date') {
    appendAndCondition(query, {
      $or: [{ dueDate: { $exists: false } }, { dueDate: null }]
    });
  }

  if (search) {
    const normalized = String(search).trim();
    appendAndCondition(query, {
      $or: [
        { taskCode: { $regex: normalized, $options: 'i' } },
        { title: { $regex: normalized, $options: 'i' } },
        { description: { $regex: normalized, $options: 'i' } }
      ]
    });
  }

  const tasks = await Task.find(query)
    .populate('projectId', 'name projectCode')
    .populate({ path: 'assignedTo', select: 'employeeCode department', populate: { path: 'userId', select: 'name email' } })
    .populate('assignedBy', 'name email')
    .sort({ createdAt: -1 });
  res.json({ tasks });
});

export const getTaskSummary = asyncHandler(async (req, res) => {
  const baseQuery = taskQueryForUser(req);
  const now = new Date();

  const [
    totalTasks,
    notStartedTasks,
    inProgressTasks,
    underReviewTasks,
    completedTasks,
    overdueTasks
  ] = await Promise.all([
    Task.countDocuments(baseQuery),
    Task.countDocuments({ ...baseQuery, status: 'to_do' }),
    Task.countDocuments({ ...baseQuery, status: 'in_progress' }),
    Task.countDocuments({ ...baseQuery, status: 'under_review' }),
    Task.countDocuments({ ...baseQuery, status: 'completed' }),
    Task.countDocuments({
      ...baseQuery,
      dueDate: { $lt: now },
      status: { $ne: 'completed' }
    })
  ]);

  res.json({
    summary: {
      totalTasks,
      notStartedTasks,
      inProgressTasks,
      underReviewTasks,
      completedTasks,
      overdueTasks
    }
  });
});

export const createTask = asyncHandler(async (req, res) => {
  const { subtasks = [], attachments = [], ...taskPayload } = req.body;

  if (taskPayload.dueDate && taskPayload.startDate && new Date(taskPayload.dueDate) < new Date(taskPayload.startDate)) {
    res.status(400);
    throw new Error('Due date cannot be before start date');
  }

  const task = await Task.create({ ...taskPayload, assignedBy: req.user._id });

  const normalizedSubtasks = normalizeSubtasks(subtasks);
  if (normalizedSubtasks.length) {
    await Subtask.insertMany(normalizedSubtasks.map((subtask) => ({ ...subtask, taskId: task._id })));
  }

  const normalizedAttachments = normalizeAttachments(attachments);
  if (normalizedAttachments.length) {
    await TaskAttachment.insertMany(
      normalizedAttachments.map((attachment) => ({
        ...attachment,
        taskId: task._id,
        uploadedBy: req.user._id
      }))
    );
  }

  const employee = await Employee.findById(task.assignedTo);
  if (employee && task.status !== 'draft') {
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
  const task = await Task.findById(req.params.id)
    .populate('projectId', 'name projectCode status priority deadline')
    .populate({ path: 'assignedTo', select: 'employeeCode department designation phone email', populate: { path: 'userId', select: 'name email role' } })
    .populate('assignedBy', 'name email');
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const { isApprover, isAssignee } = userTaskPermissions(task, req);
  if (!isApprover && !isAssignee) {
    res.status(403);
    throw new Error('You cannot view this task');
  }

  const comments = await TaskComment.find({ taskId: task._id }).populate('userId', 'name role');
  const subtasks = await Subtask.find({ taskId: task._id })
    .populate({ path: 'assignedTo', select: 'employeeCode', populate: { path: 'userId', select: 'name email' } })
    .sort({ createdAt: 1 });

  const workLogs = await DailyWorkUpdate.find({ taskId: task._id })
    .populate({ path: 'employeeId', select: 'employeeCode department designation', populate: { path: 'userId', select: 'name email' } })
    .sort({ date: -1, createdAt: -1 });

  const attachments = await TaskAttachment.find({ taskId: task._id }).populate('uploadedBy', 'name role').sort({ createdAt: 1 });
  res.json({ task, comments, subtasks, workLogs, attachments });
});

export const updateTask = asyncHandler(async (req, res) => {
  const { subtasks, attachments, ...taskPayload } = req.body;

  if (taskPayload.dueDate && taskPayload.startDate && new Date(taskPayload.dueDate) < new Date(taskPayload.startDate)) {
    res.status(400);
    throw new Error('Due date cannot be before start date');
  }

  const task = await Task.findByIdAndUpdate(req.params.id, taskPayload, { new: true, runValidators: true });
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  if (Array.isArray(subtasks)) {
    const normalizedSubtasks = normalizeSubtasks(subtasks);
    await Subtask.deleteMany({ taskId: task._id });
    if (normalizedSubtasks.length) {
      await Subtask.insertMany(normalizedSubtasks.map((subtask) => ({ ...subtask, taskId: task._id })));
    }
  }

  if (Array.isArray(attachments)) {
    const normalizedAttachments = normalizeAttachments(attachments);
    await TaskAttachment.deleteMany({ taskId: task._id });
    if (normalizedAttachments.length) {
      await TaskAttachment.insertMany(
        normalizedAttachments.map((attachment) => ({
          ...attachment,
          taskId: task._id,
          uploadedBy: req.user._id
        }))
      );
    }
  }

  res.json({ task });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  await Promise.all([
    Task.findByIdAndDelete(taskId),
    Subtask.deleteMany({ taskId }),
    TaskAttachment.deleteMany({ taskId }),
    TaskComment.deleteMany({ taskId })
  ]);
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
  const validStatuses = ['to_do', 'in_progress', 'under_review', 'completed', 'reopened'];

  if (!validStatuses.includes(nextStatus)) {
    res.status(400);
    throw new Error('Invalid task status');
  }

  if (!isAssignee && !isApprover) {
    res.status(403);
    throw new Error('You cannot update this task');
  }

  if (isAssignee && !isApprover) {
    const canStartTask = nextStatus === 'in_progress' && ['to_do', 'reopened'].includes(task.status);
    const canSubmitForReview = nextStatus === 'under_review' && task.status === 'in_progress';
    const canMarkCompleted = nextStatus === 'completed' && task.status === 'under_review';
    const canReopenTask = nextStatus === 'reopened' && task.status === 'completed';

    if (!canStartTask && !canSubmitForReview && !canMarkCompleted && !canReopenTask) {
      res.status(403);
      throw new Error('Employees can start tasks, submit for review, mark completed after review, and reopen completed tasks');
    }
  }

  task.status = nextStatus;
  if (nextStatus === 'completed') {
    task.completedAt = new Date();
    task.approvedBy = req.user._id;
  }
  await task.save();
  res.json({ task });
});

export const reassignTask = asyncHandler(async (req, res) => {
  const { employeeId } = req.body;
  if (!employeeId) {
    res.status(400);
    throw new Error('Employee is required for reassignment');
  }

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    res.status(404);
    throw new Error('Employee not found');
  }

  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  task.assignedTo = employeeId;
  await task.save();

  await Notification.create({
    userId: employee.userId,
    title: 'Task reassigned',
    message: `You were assigned "${task.title}".`,
    type: 'task',
    referenceId: task._id
  });

  res.json({ task });
});

export const changeTaskDeadline = asyncHandler(async (req, res) => {
  const { dueDate } = req.body;
  if (!dueDate) {
    res.status(400);
    throw new Error('Due date is required');
  }

  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const nextDueDate = new Date(dueDate);
  if (task.startDate && nextDueDate < task.startDate) {
    res.status(400);
    throw new Error('Due date cannot be before start date');
  }

  task.dueDate = nextDueDate;
  await task.save();
  res.json({ task });
});

export const markTaskCompleted = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  task.status = 'completed';
  task.completedAt = new Date();
  task.approvedBy = req.user._id;
  await task.save();
  res.json({ task });
});

export const reopenTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  task.status = 'reopened';
  task.completedAt = undefined;
  task.approvedBy = undefined;
  await task.save();
  res.json({ task });
});

export const addTaskComment = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const { isApprover, isAssignee } = userTaskPermissions(task, req);
  if (!isApprover && !isAssignee) {
    res.status(403);
    throw new Error('You cannot comment on this task');
  }

  if (!String(req.body.comment || '').trim()) {
    res.status(400);
    throw new Error('Comment is required');
  }

  const comment = await TaskComment.create({ taskId: req.params.id, userId: req.user._id, comment: req.body.comment });
  res.status(201).json({ comment });
});

export const addTaskAttachment = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const { isApprover, isAssignee } = userTaskPermissions(task, req);
  if (!isApprover && !isAssignee) {
    res.status(403);
    throw new Error('You cannot add attachments to this task');
  }

  if (!String(req.body.fileName || '').trim() || !String(req.body.fileUrl || '').trim()) {
    res.status(400);
    throw new Error('Attachment file name and URL are required');
  }

  const attachment = await TaskAttachment.create({ ...req.body, taskId: req.params.id, uploadedBy: req.user._id });
  res.status(201).json({ attachment });
});

export const updateSubtaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'in_progress', 'completed'];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error('Invalid subtask status');
  }

  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const { isApprover, isAssignee } = userTaskPermissions(task, req);
  if (!isApprover && !isAssignee) {
    res.status(403);
    throw new Error('You cannot update subtasks for this task');
  }

  const subtask = await Subtask.findOne({ _id: req.params.subtaskId, taskId: req.params.id });
  if (!subtask) {
    res.status(404);
    throw new Error('Subtask not found');
  }

  subtask.status = status;
  subtask.completedAt = status === 'completed' ? new Date() : undefined;
  await subtask.save();

  res.json({ subtask });
});

export const addTaskWorkLog = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const { isApprover, isAssignee } = userTaskPermissions(task, req);
  if (!isApprover && !isAssignee) {
    res.status(403);
    throw new Error('You cannot log work for this task');
  }

  if (!req.employee) {
    res.status(400);
    throw new Error('Employee profile required');
  }

  if (!String(req.body.workCompleted || req.body.workDescription || '').trim()) {
    res.status(400);
    throw new Error('Work completed is required');
  }

  const date = req.body.date ? new Date(req.body.date) : new Date();
  const workLog = await DailyWorkUpdate.create({
    employeeId: req.employee._id,
    projectId: task.projectId,
    taskId: task._id,
    reportType: 'task_log',
    date,
    timeSpent: Number(req.body.timeSpent || 0),
    workDescription: String(req.body.workCompleted || req.body.workDescription || '').trim(),
    completedWork: String(req.body.workCompleted || '').trim(),
    pendingWork: String(req.body.pendingWork || '').trim(),
    blockers: String(req.body.blockers || '').trim(),
    status: 'submitted'
  });

  res.status(201).json({ workLog });
});
