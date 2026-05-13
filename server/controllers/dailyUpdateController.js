import asyncHandler from 'express-async-handler';
import DailyWorkUpdate from '../models/DailyWorkUpdate.js';
import { ROLES } from '../middleware/roleMiddleware.js';
import { dateOnly } from '../utils/calculateHours.js';

const normalizeText = (value) => String(value || '').trim();

const normalizeFileEntries = (files = []) =>
  files
    .filter((file) => normalizeText(file?.fileName) && normalizeText(file?.fileUrl))
    .map((file) => ({
      fileName: normalizeText(file.fileName),
      fileUrl: normalizeText(file.fileUrl)
    }));

const normalizeDailyReportPayload = (body) => {
  const workDoneToday = Array.isArray(body.workDoneToday) ? body.workDoneToday : [];
  const completedTasks = Array.isArray(body.completedTasks) ? body.completedTasks : [];
  const pendingTasks = Array.isArray(body.pendingTasks) ? body.pendingTasks : [];
  const blockersIssues = Array.isArray(body.blockersIssues) ? body.blockersIssues : [];
  const tomorrowPlanItems = Array.isArray(body.tomorrowPlanItems) ? body.tomorrowPlanItems : [];

  const firstWork = workDoneToday[0] || {};
  const firstCompleted = completedTasks[0] || {};
  const firstPending = pendingTasks[0] || {};
  const firstBlocker = blockersIssues[0] || {};
  const firstTomorrow = tomorrowPlanItems[0] || {};

  return {
    projectId: body.projectId || firstWork.projectId || firstTomorrow.projectId || undefined,
    taskId: body.taskId || firstWork.taskId || firstCompleted.taskId || undefined,
    workDescription: normalizeText(body.workDescription || firstWork.workDescription || firstCompleted.completionNotes || ''),
    timeSpent: Number(body.timeSpent ?? firstWork.timeSpent ?? 0),
    completedWork: normalizeText(body.completedWork || completedTasks.map((item) => item.taskName || item.completionNotes).filter(Boolean).join('; ')),
    pendingWork: normalizeText(body.pendingWork || pendingTasks.map((item) => `${item.taskName || ''}${item.reason ? ` - ${item.reason}` : ''}`).filter(Boolean).join('; ')),
    blockers: normalizeText(body.blockers || blockersIssues.map((item) => `${item.issueDescription || ''}${item.helpNeeded ? ` - ${item.helpNeeded}` : ''}`).filter(Boolean).join('; ')),
    tomorrowPlan: normalizeText(body.tomorrowPlan || tomorrowPlanItems.map((item) => `${item.projectName || ''}${item.plannedTasks ? `: ${item.plannedTasks}` : ''}`).filter(Boolean).join('; ')),
    workDoneToday: workDoneToday.map((item) => ({
      projectId: item.projectId || undefined,
      taskId: item.taskId || undefined,
      projectName: normalizeText(item.projectName),
      taskName: normalizeText(item.taskName),
      workDescription: normalizeText(item.workDescription),
      timeSpent: Number(item.timeSpent || 0),
      status: normalizeText(item.status)
    })),
    completedTasks: completedTasks.map((item) => ({
      taskId: item.taskId || undefined,
      taskName: normalizeText(item.taskName),
      completionNotes: normalizeText(item.completionNotes),
      files: normalizeFileEntries(item.files)
    })),
    pendingTasks: pendingTasks.map((item) => ({
      taskName: normalizeText(item.taskName),
      reason: normalizeText(item.reason),
      expectedCompletionDate: item.expectedCompletionDate || undefined
    })),
    blockersIssues: blockersIssues.map((item) => ({
      issueDescription: normalizeText(item.issueDescription),
      helpNeeded: normalizeText(item.helpNeeded),
      priority: item.priority || 'medium'
    })),
    tomorrowPlanItems: tomorrowPlanItems.map((item) => ({
      projectId: item.projectId || undefined,
      projectName: normalizeText(item.projectName),
      plannedTasks: normalizeText(item.plannedTasks),
      estimatedHours: Number(item.estimatedHours || 0)
    })),
    status: body.status === 'draft' ? 'draft' : 'submitted',
    reportType: 'daily_report'
  };
};

export const getDailyUpdates = asyncHandler(async (req, res) => {
  const query = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(req.user.role) ? {} : { employeeId: req.employee?._id };
  const updates = await DailyWorkUpdate.find(query)
    .populate('employeeId')
    .populate('projectId', 'name projectCode')
    .populate({ path: 'taskId', select: 'title projectId', populate: { path: 'projectId', select: 'name projectCode' } })
    .sort({ date: -1, createdAt: -1 });
  res.json({ updates });
});

export const createDailyUpdate = asyncHandler(async (req, res) => {
  if (!req.employee) {
    res.status(400);
    throw new Error('Employee profile required');
  }
  const date = dateOnly(req.body.date || new Date());
  const exists = await DailyWorkUpdate.findOne({ employeeId: req.employee._id, date, reportType: 'daily_report' });
  if (exists) {
    res.status(409);
    throw new Error('Daily update already submitted for this date');
  }

  const payload = normalizeDailyReportPayload(req.body);
  const update = await DailyWorkUpdate.create({ ...payload, employeeId: req.employee._id, date });
  res.status(201).json({ update });
});

export const getDailyUpdateById = asyncHandler(async (req, res) => {
  const update = await DailyWorkUpdate.findById(req.params.id)
    .populate('employeeId')
    .populate('projectId', 'name projectCode')
    .populate({ path: 'taskId', select: 'title projectId', populate: { path: 'projectId', select: 'name projectCode' } });
  if (!update) {
    res.status(404);
    throw new Error('Daily update not found');
  }
  res.json({ update });
});

export const updateDailyUpdate = asyncHandler(async (req, res) => {
  const update = await DailyWorkUpdate.findById(req.params.id);
  if (!update) {
    res.status(404);
    throw new Error('Daily update not found');
  }

  const payload = normalizeDailyReportPayload(req.body);
  Object.assign(update, payload, { date: req.body.date ? dateOnly(req.body.date) : update.date });
  await update.save();

  res.json({ update });
});
