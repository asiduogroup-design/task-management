import asyncHandler from 'express-async-handler';
import Employee from '../models/Employee.js';
import User from '../models/User.js';

const populateEmployee = (query) => query.populate('userId', 'name email role status').populate('reportingManagerId', 'employeeCode designation');

export const getEmployees = asyncHandler(async (req, res) => {
  const { search, department, designation, status } = req.query;
  const employeeQuery = {};

  if (department) employeeQuery.department = department;
  if (designation) employeeQuery.designation = designation;

  let employees = await populateEmployee(Employee.find(employeeQuery).sort({ createdAt: -1 })).lean();

  if (status) employees = employees.filter((employee) => employee.userId?.status === status);
  if (search) {
    const normalized = search.toLowerCase();
    employees = employees.filter(
      (employee) =>
        employee.employeeCode.toLowerCase().includes(normalized) ||
        employee.userId?.name?.toLowerCase().includes(normalized) ||
        employee.userId?.email?.toLowerCase().includes(normalized)
    );
  }

  res.json({ employees });
});

export const createEmployee = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    temporaryPassword,
    role = 'employee',
    status = 'active',
    employeeCode,
    department,
    designation
  } = req.body;

  if (!name || !email || !temporaryPassword || !employeeCode || !department || !designation) {
    res.status(400);
    throw new Error('Name, email, password, employee ID, department, and designation are required');
  }

  if (temporaryPassword.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters');
  }

  const exists = await User.findOne({ email });
  const codeExists = await Employee.findOne({ employeeCode });
  if (exists || codeExists) {
    res.status(409);
    throw new Error('Employee email or employee ID already exists');
  }

  const user = await User.create({ name, email, passwordHash: temporaryPassword, role, status });
  const employee = await Employee.create({ ...req.body, userId: user._id });
  res.status(201).json({ employee: await populateEmployee(Employee.findById(employee._id)) });
});

export const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await populateEmployee(Employee.findById(req.params.id));
  if (!employee) {
    res.status(404);
    throw new Error('Employee not found');
  }
  res.json({ employee });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    res.status(404);
    throw new Error('Employee not found');
  }

  Object.assign(employee, req.body);
  await employee.save();

  if (req.body.name || req.body.email || req.body.role || req.body.status) {
    await User.findByIdAndUpdate(employee.userId, {
      ...(req.body.name && { name: req.body.name }),
      ...(req.body.email && { email: req.body.email }),
      ...(req.body.role && { role: req.body.role }),
      ...(req.body.status && { status: req.body.status })
    });
  }

  res.json({ employee: await populateEmployee(Employee.findById(employee._id)) });
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    res.status(404);
    throw new Error('Employee not found');
  }
  await User.findByIdAndDelete(employee.userId);
  await employee.deleteOne();
  res.json({ message: 'Employee deleted' });
});

export const updateEmployeeStatus = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    res.status(404);
    throw new Error('Employee not found');
  }

  await User.findByIdAndUpdate(employee.userId, { status: req.body.status });
  res.json({ employee: await populateEmployee(Employee.findById(employee._id)) });
});
