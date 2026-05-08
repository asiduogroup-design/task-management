import express from 'express';
import { createEmployee, deleteEmployee, getEmployeeById, getEmployeeProfile, getEmployees, updateEmployee, updateEmployeeStatus } from '../controllers/employeeController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminRoles, authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.route('/').get(authorize(...adminRoles), getEmployees).post(authorize(...adminRoles), createEmployee);
router.get('/:id/profile', authorize(...adminRoles), getEmployeeProfile);
router.route('/:id').get(authorize(...adminRoles), getEmployeeById).put(authorize(...adminRoles), updateEmployee).delete(authorize(...adminRoles), deleteEmployee);
router.patch('/:id/status', authorize(...adminRoles), updateEmployeeStatus);

export default router;
