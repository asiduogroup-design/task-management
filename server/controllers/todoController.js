import asyncHandler from 'express-async-handler';
import Todo from '../models/Todo.js';

export const getTodos = asyncHandler(async (req, res) => {
  const todos = await Todo.find({ employeeId: req.employee?._id })
    .populate('projectId', 'name projectCode')
    .populate({ path: 'taskId', select: 'title projectId', populate: { path: 'projectId', select: 'name projectCode' } })
    .sort({ completedAt: 1, dueDate: 1, createdAt: -1 });
  res.json({ todos });
});

export const createTodo = asyncHandler(async (req, res) => {
  if (!req.employee) {
    res.status(400);
    throw new Error('Employee profile required');
  }

  const todoPayload = { ...req.body, employeeId: req.employee._id };
  if (todoPayload.status === 'completed') {
    todoPayload.completedAt = new Date();
  }

  const todo = await Todo.create(todoPayload);
  res.status(201).json({ todo });
});

export const updateTodo = asyncHandler(async (req, res) => {
  const update = { ...req.body };
  const updatePayload = {
    $set: { ...update },
    $unset: {}
  };

  if (update.status === 'completed') {
    updatePayload.$set.completedAt = update.completedAt || new Date();
  } else {
    updatePayload.$unset.completedAt = 1;
  }

  const todo = await Todo.findOneAndUpdate({ _id: req.params.id, employeeId: req.employee?._id }, updatePayload, { new: true, runValidators: true });
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
  const updatePayload = {
    $set: { status: req.body.status },
    $unset: {}
  };
  if (req.body.status === 'completed') {
    updatePayload.$set.completedAt = new Date();
  } else {
    updatePayload.$unset.completedAt = 1;
  }

  const todo = await Todo.findOneAndUpdate({ _id: req.params.id, employeeId: req.employee?._id }, updatePayload, { new: true });
  if (!todo) {
    res.status(404);
    throw new Error('Todo not found');
  }
  res.json({ todo });
});
