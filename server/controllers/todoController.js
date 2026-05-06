import asyncHandler from 'express-async-handler';
import Todo from '../models/Todo.js';

export const getTodos = asyncHandler(async (req, res) => {
  const todos = await Todo.find({ employeeId: req.employee?._id }).populate('projectId', 'name').populate('taskId', 'title').sort({ dueDate: 1 });
  res.json({ todos });
});

export const createTodo = asyncHandler(async (req, res) => {
  if (!req.employee) {
    res.status(400);
    throw new Error('Employee profile required');
  }
  const todo = await Todo.create({ ...req.body, employeeId: req.employee._id });
  res.status(201).json({ todo });
});

export const updateTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findOneAndUpdate({ _id: req.params.id, employeeId: req.employee?._id }, req.body, { new: true, runValidators: true });
  if (!todo) {
    res.status(404);
    throw new Error('Todo not found');
  }
  res.json({ todo });
});

export const deleteTodo = asyncHandler(async (req, res) => {
  await Todo.deleteOne({ _id: req.params.id, employeeId: req.employee?._id });
  res.json({ message: 'Todo deleted' });
});

export const updateTodoStatus = asyncHandler(async (req, res) => {
  const update = { status: req.body.status };
  if (req.body.status === 'completed') update.completedAt = new Date();
  const todo = await Todo.findOneAndUpdate({ _id: req.params.id, employeeId: req.employee?._id }, update, { new: true });
  if (!todo) {
    res.status(404);
    throw new Error('Todo not found');
  }
  res.json({ todo });
});
