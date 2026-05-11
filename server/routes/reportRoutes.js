import express from 'express';
import {
	adminReportPreview,
	attendanceReport,
	dailyWorkReport,
	emailDailyWorkReport,
	emailAdminReport,
	employeeReport,
	exportAdminReport,
	exportDailyWorkReport,
	loginLogoutReport,
	projectReport,
	taskReport
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminRoles, authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect, authorize(...adminRoles));
router.get('/attendance', attendanceReport);
router.get('/employees', employeeReport);
router.get('/projects', projectReport);
router.get('/tasks', taskReport);
router.get('/daily-work', dailyWorkReport);
router.get('/daily-work/export', exportDailyWorkReport);
router.post('/daily-work/email', emailDailyWorkReport);
router.get('/login-logout', loginLogoutReport);
router.get('/preview', adminReportPreview);
router.get('/export', exportAdminReport);
router.post('/email', emailAdminReport);

export default router;
