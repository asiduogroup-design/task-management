import express from 'express';
import {
  getDashboardSummary,
  getAttendanceOverview,
  getProjectOverview,
  getTaskOverview,
  getAlerts
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminRoles, authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize(...adminRoles));

router.get('/summary', getDashboardSummary);
router.get('/attendance', getAttendanceOverview);
router.get('/projects', getProjectOverview);
router.get('/tasks', getTaskOverview);
router.get('/alerts', getAlerts);

export default router;
