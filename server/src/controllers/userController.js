import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

export const getEmployees = asyncHandler(async (req, res) => {
  const employees = await User.find({ role: 'employee' }).select('-password').sort({ createdAt: -1 });
  res.json({ employees });
});

export const getUserStats = asyncHandler(async (req, res) => {
  const [totalEmployees, activeEmployees, inactiveEmployees] = await Promise.all([
    User.countDocuments({ role: 'employee' }),
    User.countDocuments({ role: 'employee', status: 'active' }),
    User.countDocuments({ role: 'employee', status: 'inactive' })
  ]);

  res.json({
    totalEmployees,
    activeEmployees,
    inactiveEmployees
  });
});
