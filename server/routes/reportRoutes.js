import express from 'express';
import { attendanceReport, dailyWorkReport, employeeReport, loginLogoutReport, projectReport, taskReport } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminRoles, authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect, authorize(...adminRoles));
router.get('/attendance', attendanceReport);
router.get('/employees', employeeReport);
router.get('/projects', projectReport);
router.get('/tasks', taskReport);
router.get('/daily-work', dailyWorkReport);
router.get('/login-logout', loginLogoutReport);

export default router;
