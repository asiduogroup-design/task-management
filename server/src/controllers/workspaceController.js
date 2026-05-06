import asyncHandler from 'express-async-handler';
import Workspace from '../models/Workspace.js';

export const createWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace.create({
    ...req.body,
    createdBy: req.user._id
  });

  res.status(201).json({ workspace });
});

export const getWorkspaces = asyncHandler(async (req, res) => {
  const query = req.user.role === 'admin' ? {} : { members: req.user._id };
  const workspaces = await Workspace.find(query)
    .populate('members', 'name email department jobTitle')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ workspaces });
});
