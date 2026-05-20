import asyncHandler from 'express-async-handler';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Milestone from '../models/Milestone.js';
import Task from '../models/Task.js';
import DailyWorkUpdate from '../models/DailyWorkUpdate.js';
import Notification from '../models/Notification.js';
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

const memberUserIds = async (projectId) => {
  const members = await ProjectMember.find({ projectId }).populate('employeeId', 'userId');
  return members
    .map((member) => member.employeeId?.userId)
    .filter(Boolean)
    .map((value) => String(value));
};

const notifyProjectMembers = async (projectId, payloadBuilder) => {
  const userIds = await memberUserIds(projectId);
  if (!userIds.length) return;

  await Promise.all(
    userIds.map(async (userId) => {
      const payload = payloadBuilder(userId);

      if (payload.eventKey) {
        await Notification.findOneAndUpdate(
          { userId, eventKey: payload.eventKey },
          { $setOnInsert: { userId, type: 'project', actionPath: `/employee/projects/${projectId}`, referenceId: projectId, ...payload } },
          { upsert: true }
        );
        return;
      }

      await Notification.create({
        userId,
        type: 'project',
        actionPath: `/employee/projects/${projectId}`,
        referenceId: projectId,
        ...payload
      });
    })
  );
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

  await notifyProjectMembers(project._id, (userId) => ({
    title: 'Added to project',
    message: `You were added to project "${project.name}".`,
    subtype: 'project_added',
    eventKey: `project:added:${project._id}:${userId}`
  }));

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

  if ([ROLES.MANAGER, ROLES.EMPLOYEE].includes(req.user.role)) {
    if (!req.employee) {
      res.status(403);
      throw new Error('Forbidden: employee profile required');
    }

    const projectMember = await ProjectMember.findOne({ projectId: project._id, employeeId: req.employee._id });
    const isProjectManager = project.managerId?._id && String(project.managerId._id) === String(req.employee._id);

    if (!projectMember && !isProjectManager) {
      res.status(403);
      throw new Error('Forbidden: project access denied');
    }
  }

  const members = await ProjectMember.find({ projectId: project._id }).populate({
    path: 'employeeId',
    select: 'employeeCode phone email designation',
    populate: { path: 'userId', select: 'name email' }
  });
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

  const myTasks = req.employee
    ? tasks
      .filter((task) => String(task.assignedTo?._id) === String(req.employee._id))
      .map((task) => ({
        _id: task._id,
        title: task.title,
        priority: task.priority,
        startDate: task.startDate,
        dueDate: task.dueDate,
        status: task.status
      }))
    : [];

  const teamMembers = members.map((member) => ({
    _id: member.employeeId?._id,
    name: member.employeeId?.userId?.name || member.employeeId?.employeeCode || '-',
    role: member.role || 'member',
    contact: {
      email: member.employeeId?.email || member.employeeId?.userId?.email || '-',
      phone: member.employeeId?.phone || '-'
    }
  }));

  const timeline = {
    startDate: project.startDate || null,
    deadline: project.deadline || null,
    milestones: milestonesWithProgress.map((milestone) => ({
      _id: milestone._id,
      title: milestone.title,
      dueDate: milestone.dueDate,
      status: milestone.status,
      completionPercentage: milestone.completionPercentage
    }))
  };

  res.json({
    project,
    members,
    assignedEmployees,
    teamMembers,
    milestones: milestonesWithProgress,
    tasks,
    myTasks,
    taskBoard: taskColumns,
    timeline,
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

  const previousProject = await Project.findById(req.params.id);
  if (!previousProject) {
    res.status(404);
    throw new Error('Project not found');
  }

  if (projectFields.deadline && projectFields.startDate && new Date(projectFields.deadline) < new Date(projectFields.startDate)) {
    res.status(400);
    throw new Error('Deadline cannot be before start date');
  }
  const project = await Project.findByIdAndUpdate(req.params.id, projectFields, { new: true, runValidators: true }).populate('managerId', 'employeeCode designation');

  if (Array.isArray(req.body.members)) await syncProjectMembers(project._id, members);
  if (Array.isArray(req.body.milestones)) await syncProjectMilestones(project._id, milestones);

  const previousDeadline = previousProject.deadline ? new Date(previousProject.deadline).getTime() : null;
  const currentDeadline = project.deadline ? new Date(project.deadline).getTime() : null;

  if (previousDeadline !== currentDeadline && project.deadline) {
    await notifyProjectMembers(project._id, (userId) => ({
      title: 'Project deadline update',
      message: `Deadline for "${project.name}" was updated to ${new Date(project.deadline).toLocaleDateString()}.`,
      subtype: 'project_deadline_update',
      eventKey: `project:deadline_update:${project._id}:${new Date(project.deadline).toISOString().slice(0, 10)}:${userId}`
    }));
  }

  if (previousProject.status !== project.status) {
    await notifyProjectMembers(project._id, (userId) => ({
      title: 'Project status changed',
      message: `Status for "${project.name}" changed to ${String(project.status || '').replaceAll('_', ' ')}.`,
      subtype: 'project_status_changed',
      eventKey: `project:status_changed:${project._id}:${project.status}:${userId}`
    }));
  }

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

  const project = await Project.findById(req.params.id).select('name');
  const populatedMember = await ProjectMember.findById(member._id).populate('employeeId', 'userId');
  if (populatedMember?.employeeId?.userId) {
    const userId = String(populatedMember.employeeId.userId);
    await Notification.findOneAndUpdate(
      { userId, eventKey: `project:added:${req.params.id}:${userId}` },
      {
        $setOnInsert: {
          userId,
          title: 'Added to project',
          message: `You were added to project "${project?.name || 'Project'}".`,
          type: 'project',
          subtype: 'project_added',
          actionPath: `/employee/projects/${req.params.id}`,
          referenceId: req.params.id,
          eventKey: `project:added:${req.params.id}:${userId}`
        }
      },
      { upsert: true }
    );
  }

  res.status(201).json({ member });
});

export const updateProjectMember = asyncHandler(async (req, res) => {
  const member = await ProjectMember.findOneAndUpdate(
    { projectId: req.params.id, employeeId: req.params.employeeId },
    { role: req.body.role || 'member' },
    { new: true, runValidators: true }
  ).populate({ path: 'employeeId', populate: { path: 'userId', select: 'name email role' } });

  if (!member) {
    res.status(404);
    throw new Error('Project member not found');
  }

  res.json({ member });
});

export const removeProjectMember = asyncHandler(async (req, res) => {
  await ProjectMember.deleteOne({ projectId: req.params.id, employeeId: req.params.employeeId });
  res.json({ message: 'Project member removed' });
});
