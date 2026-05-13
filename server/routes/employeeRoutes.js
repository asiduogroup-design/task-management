import express from 'express';
import {
	changeMyPassword,
	createEmployee,
	deleteEmployee,
	getEmployeeById,
	getEmployeeProfile,
	getEmployees,
	getMyProfile,
	updateEmployee,
	updateEmployeeStatus,
	updateMyNotificationPreferences,
	updateMyProfile
} from '../controllers/employeeController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminRoles, authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/me/profile', getMyProfile);
router.patch('/me/profile', updateMyProfile);
router.patch('/me/password', changeMyPassword);
router.patch('/me/notification-preferences', updateMyNotificationPreferences);
router.route('/').get(authorize(...adminRoles), getEmployees).post(authorize(...adminRoles), createEmployee);
router.get('/:id/profile', authorize(...adminRoles), getEmployeeProfile);
router.route('/:id').get(authorize(...adminRoles), getEmployeeById).put(authorize(...adminRoles), updateEmployee).delete(authorize(...adminRoles), deleteEmployee);
router.patch('/:id/status', authorize(...adminRoles), updateEmployeeStatus);

export default router;
