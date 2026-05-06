import asyncHandler from 'express-async-handler';
import Settings from '../models/Settings.js';

export const getSettings = asyncHandler(async (req, res) => {
  const settings = (await Settings.findOne()) || (await Settings.create({}));
  res.json({ settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true, runValidators: true });
  res.json({ settings });
});
