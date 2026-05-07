import asyncHandler from 'express-async-handler';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Milestone from '../models/Milestone.js';
import Task from '../models/Task.js';
import DailyWorkUpdate from '../models/DailyWorkUpdate.js';
import { ROLES } from '../middleware/roleMiddleware.js';

const normalizeProjectPayload = (body) => {
  const { members = [], milestones = [], ...projectFields } = body;
  if (projectFields.managerId === '') projectFields.managerId = null;
  return { projectFields, members, milestones };
};

const syncProjectMembers = async (projectId, members = []) => {
  await ProjectMember.deleteMany({ projectId });
  const seenEmployeeIds = new Set();
  const normalizedMembers = [];

  members.filter((member) => member.employeeId).forEach((member) => {
    const employeeId = String(member.employeeId);
    if (seenEmployeeIds.has(employeeId)) return;
    seenEmployeeIds.add(employeeId);
    normalizedMembers.push({
      projectId,
      employeeId: member.employeeId,
      role: member.role || 'Developer'
    });
  });

  if (normalizedMembers.length) {
    await ProjectMember.insertMany(normalizedMembers);
  }
};

const syncProjectMilestones = async (projectId, milestones = []) => {
  await Milestone.deleteMany({ projectId });
  const normalizedMilestones = milestones
    .filter((milestone) => milestone.title)
    .map((milestone) => ({
      projectId,
      title: milestone.title,
      description: milestone.description || '',
      dueDate: milestone.dueDate || undefined,
      responsibleEmployeeId: milestone.responsibleEmployeeId || undefined,
      status: milestone.status || 'pending'
    }));

  if (normalizedMilestones.length) {
    await Milestone.insertMany(normalizedMilestones);
  }
};

const projectAccessQuery = async (req) => {
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role)) return {};
  const memberRows = await ProjectMember.find({ employeeId: req.employee?._id }).select('projectId');
  return { _id: { $in: memberRows.map((row) => row.projectId) } };
};

export const getProjects = asyncHandler(async (req, res) => {
  const {
    search,
    status,
    department,
    employeeId,
    deadlineFilter,
    deadline
  } = req.query;

  const query = await projectAccessQuery(req);

  if (search) {
    const term = String(search).trim();
    query.$or = [
      { name: { $regex: term, $options: 'i' } },
      { projectCode: { $regex: term, $options: 'i' } },
      { clientName: { $regex: term, $options: 'i' } }
    ];
  }

  if (department) query.department = department;

  if (employeeId) {
    const memberships = await ProjectMember.find({ employeeId }).select('projectId');
    const membershipProjectIds = memberships.map((member) => member.projectId);
    if (query._id?.$in) {
      query._id = { $in: query._id.$in.filter((id) => membershipProjectIds.some((memberId) => memberId.toString() === id.toString())) };
    } else {
      query._id = { $in: membershipProjectIds };
    }
  }

  if (deadline) {
    const start = new Date(deadline);
    if (!Number.isNaN(start.getTime())) {
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      query.deadline = { $gte: start, $lt: end };
    }
  }

  if (status && status !== 'overdue') {
    query.status = status === 'not_started'
      ? { $in: ['not_started', 'planning'] }
      : status;
  }

  const projects = await Project.find(query).populate('managerId', 'employeeCode designation').sort({ createdAt: -1 });
  const projectIds = projects.map((project) => project._id);

  const taskCounts = await Task.aggregate([
    { $match: { projectId: { $in: projectIds } } },
    {
      $group: {
        _id: '$projectId',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
      }
    }
  ]);

  const members = await ProjectMember.find({ projectId: { $in: projectIds } })
    .populate({ path: 'employeeId', select: 'employeeCode', populate: { path: 'userId', select: 'name' } });

  const taskCountMap = new Map(taskCounts.map((item) => [item._id.toString(), item]));
  const membersByProject = new Map();
  members.forEach((member) => {
    const key = member.projectId.toString();
    const list = membersByProject.get(key) || [];
    list.push(member);
    membersByProject.set(key, list);
  });

  const now = new Date();
  const withSummary = projects.map((project) => {
    const key = project._id.toString();
    const summary = taskCountMap.get(key) || { total: 0, completed: 0 };
    const assignedMembers = membersByProject.get(key) || [];

    const normalizedStatus = project.status === 'planning' ? 'not_started' : project.status;
    const isOverdue = ['completed', 'archived', 'cancelled'].includes(normalizedStatus)
      ? false
      : Boolean(project.deadline && new Date(project.deadline) < now);
    const displayStatus = isOverdue ? 'overdue' : normalizedStatus;

    return {
      ...project.toObject(),
      status: normalizedStatus,
      displayStatus,
      taskSummary: {
        total: summary.total || 0,
        completed: summary.completed || 0
      },
      assignedEmployees: assignedMembers.map((member) => ({
        _id: member.employeeId?._id,
        name: member.employeeId?.userId?.name || member.employeeId?.employeeCode || '-',
        role: member.role
      })),
      assignedEmployeesCount: assignedMembers.length
    };
  });

  let filtered = withSummary;

  if (status === 'overdue') {
    filtered = filtered.filter((project) => project.displayStatus === 'overdue');
  }

  if (deadlineFilter) {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    filtered = filtered.filter((project) => {
      if (!project.deadline) return false;
      const projectDeadline = new Date(project.deadline);
      if (deadlineFilter === 'overdue') return projectDeadline < startOfToday;
      if (deadlineFilter === 'today') return projectDeadline >= startOfToday && projectDeadline < endOfToday;
      if (deadlineFilter === 'this_week') return projectDeadline >= startOfToday && projectDeadline < endOfWeek;
      return true;
    });
  }

  res.json({ projects: filtered });
});

export const createProject = asyncHandler(async (req, res) => {
  const { projectFields, members, milestones } = normalizeProjectPayload(req.body);

  if (projectFields.deadline && projectFields.startDate && new Date(projectFields.deadline) < new Date(projectFields.startDate)) {
    res.status(400);
    throw new Error('Deadline cannot be before start date');
  }

  const project = await Project.create({ ...projectFields, createdBy: req.user._id });
  await syncProjectMembers(project._id, members);
  await syncProjectMilestones(project._id, milestones);

  const savedProject = await Project.findById(project._id).populate('managerId', 'employeeCode designation');
  const savedMembers = await ProjectMember.find({ projectId: project._id }).populate({ path: 'employeeId', populate: { path: 'userId', select: 'name email' } });
  const savedMilestones = await Milestone.find({ projectId: project._id }).populate('responsibleEmployeeId', 'employeeCode designation');
  res.status(201).json({ project: savedProject, members: savedMembers, milestones: savedMilestones });
});

export const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate({ path: 'managerId', populate: { path: 'userId', select: 'name email' } });
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }
  const members = await ProjectMember.find({ projectId: project._id }).populate({ path: 'employeeId', populate: { path: 'userId', select: 'name email' } });
  const milestones = await Milestone.find({ projectId: project._id }).populate({ path: 'responsibleEmployeeId', populate: { path: 'userId', select: 'name email' } });
  const tasks = await Task.find({ projectId: project._id })
    .populate({ path: 'assignedTo', populate: { path: 'userId', select: 'name email' } })
    .sort({ dueDate: 1, createdAt: -1 });
  const updates = await DailyWorkUpdate.find({ projectId: project._id })
    .populate({ path: 'employeeId', populate: { path: 'userId', select: 'name email' } })
    .sort({ date: -1, createdAt: -1 })
    .limit(30);

  const taskColumns = {
    to_do: [],
    in_progress: [],
    review: [],
    completed: [],
    overdue: []
  };

  const now = new Date();
  tasks.forEach((task) => {
    const plainTask = task.toObject();
    const effectiveStatus = task.status === 'under_review' ? 'review' : task.status;
    const isOverdue = task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < now;
    const boardStatus = isOverdue ? 'overdue' : effectiveStatus;
    if (!taskColumns[boardStatus]) taskColumns[boardStatus] = [];
    taskColumns[boardStatus].push({
      ...plainTask,
      boardStatus
    });
  });

  const completedTasks = taskColumns.completed.length;
  const overdueTasks = taskColumns.overdue.length;
  const totalTasks = tasks.length;
  const pendingTasks = Math.max(totalTasks - completedTasks, 0);
  const progressPercentage = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const activeTaskByEmployeeId = new Map();
  tasks.forEach((task) => {
    if (!task.assignedTo?._id) return;
    const employeeId = String(task.assignedTo._id);
    if (activeTaskByEmployeeId.has(employeeId)) return;
    if (task.status === 'completed') return;
    activeTaskByEmployeeId.set(employeeId, task);
  });

  const assignedEmployees = members.map((member) => {
    const employeeId = member.employeeId?._id ? String(member.employeeId._id) : '';
    const currentTask = employeeId ? activeTaskByEmployeeId.get(employeeId) : null;
    return {
      ...member.toObject(),
      currentTask: currentTask
        ? {
            _id: currentTask._id,
            title: currentTask.title,
            status: currentTask.status,
            dueDate: currentTask.dueDate,
            priority: currentTask.priority
          }
        : null,
      workStatus: currentTask ? currentTask.status : 'available'
    };
  });

  const milestonesWithProgress = milestones.map((milestone) => {
    let completionPercentage = 0;
    if (milestone.status === 'in_progress') completionPercentage = 50;
    if (milestone.status === 'completed') completionPercentage = 100;
    return {
      ...milestone.toObject(),
      completionPercentage
    };
  });

  res.json({
    project,
    members,
    assignedEmployees,
    milestones: milestonesWithProgress,
    tasks,
    taskBoard: taskColumns,
    progress: {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      progressPercentage
    },
    dailyUpdates: updates
  });
});

export const updateProject = asyncHandler(async (req, res) => {
  const { projectFields, members, milestones } = normalizeProjectPayload(req.body);

  if (projectFields.deadline && projectFields.startDate && new Date(projectFields.deadline) < new Date(projectFields.startDate)) {
    res.status(400);
    throw new Error('Deadline cannot be before start date');
  }
  const project = await Project.findByIdAndUpdate(req.params.id, projectFields, { new: true, runValidators: true }).populate('managerId', 'employeeCode designation');
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  if (Array.isArray(req.body.members)) await syncProjectMembers(project._id, members);
  if (Array.isArray(req.body.milestones)) await syncProjectMilestones(project._id, milestones);

  const savedMembers = await ProjectMember.find({ projectId: project._id }).populate({ path: 'employeeId', populate: { path: 'userId', select: 'name email' } });
  const savedMilestones = await Milestone.find({ projectId: project._id }).populate('responsibleEmployeeId', 'employeeCode designation');
  res.json({ project, members: savedMembers, milestones: savedMilestones });
});

export const deleteProject = asyncHandler(async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  await ProjectMember.deleteMany({ projectId: req.params.id });
  await Milestone.deleteMany({ projectId: req.params.id });
  res.json({ message: 'Project deleted' });
});

export const addProjectMember = asyncHandler(async (req, res) => {
  const member = await ProjectMember.create({ projectId: req.params.id, employeeId: req.body.employeeId, role: req.body.role || 'member' });
  res.status(201).json({ member });
});

export const removeProjectMember = asyncHandler(async (req, res) => {
  await ProjectMember.deleteOne({ projectId: req.params.id, employeeId: req.params.employeeId });
  res.json({ message: 'Project member removed' });
});
