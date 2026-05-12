import express from 'express';
import {
  getDashboardSummary,
  getAttendanceOverview,
  getProjectOverview,
  getTaskOverview,
  getAlerts,
  getEmployeeProjects,
  getEmployeeDashboardOverview
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminRoles, authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/employee-projects', getEmployeeProjects);
router.get('/employee-overview', getEmployeeDashboardOverview);
router.get('/summary', authorize(...adminRoles), getDashboardSummary);
router.get('/attendance', authorize(...adminRoles), getAttendanceOverview);
router.get('/projects', authorize(...adminRoles), getProjectOverview);
router.get('/tasks', authorize(...adminRoles), getTaskOverview);
router.get('/alerts', authorize(...adminRoles), getAlerts);

export default router;
