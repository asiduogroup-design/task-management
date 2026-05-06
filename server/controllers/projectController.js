import asyncHandler from 'express-async-handler';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Task from '../models/Task.js';
import { ROLES } from '../middleware/roleMiddleware.js';

const projectAccessQuery = async (req) => {
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role)) return {};
  const memberRows = await ProjectMember.find({ employeeId: req.employee?._id }).select('projectId');
  return { _id: { $in: memberRows.map((row) => row.projectId) } };
};

export const getProjects = asyncHandler(async (req, res) => {
  const query = await projectAccessQuery(req);
  const projects = await Project.find(query).populate('managerId', 'employeeCode designation').sort({ createdAt: -1 });
  const taskCounts = await Task.aggregate([{ $group: { _id: '$projectId', total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } }]);
  const counts = new Map(taskCounts.map((item) => [item._id.toString(), item]));
  res.json({ projects: projects.map((project) => ({ ...project.toObject(), taskSummary: counts.get(project._id.toString()) || { total: 0, completed: 0 } })) });
});

export const createProject = asyncHandler(async (req, res) => {
  if (req.body.deadline && req.body.startDate && new Date(req.body.deadline) < new Date(req.body.startDate)) {
    res.status(400);
    throw new Error('Deadline cannot be before start date');
  }
  const project = await Project.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ project });
});

export const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('managerId');
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }
  const members = await ProjectMember.find({ projectId: project._id }).populate({ path: 'employeeId', populate: { path: 'userId', select: 'name email' } });
  const tasks = await Task.find({ projectId: project._id }).populate('assignedTo');
  res.json({ project, members, tasks });
});

export const updateProject = asyncHandler(async (req, res) => {
  if (req.body.deadline && req.body.startDate && new Date(req.body.deadline) < new Date(req.body.startDate)) {
    res.status(400);
    throw new Error('Deadline cannot be before start date');
  }
  const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }
  res.json({ project });
});

export const deleteProject = asyncHandler(async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  await ProjectMember.deleteMany({ projectId: req.params.id });
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
