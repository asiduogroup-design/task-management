import express from 'express';
import { attendanceLogin, attendanceLogout, breakEnd, breakStart, exportAttendance, getAdminAttendance, getAttendanceHistory, getAttendanceSummary, getTodayAttendance, markAbsent, updateAttendance } from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminRoles, authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.post('/login', attendanceLogin);
router.post('/logout', attendanceLogout);
router.post('/break-start', breakStart);
router.post('/break-end', breakEnd);
router.get('/today', getTodayAttendance);
router.get('/history', getAttendanceHistory);
router.get('/admin/summary', authorize(...adminRoles), getAttendanceSummary);
router.get('/admin/export', authorize(...adminRoles), exportAttendance);
router.post('/admin/mark-absent', authorize(...adminRoles), markAbsent);
router.get('/admin', authorize(...adminRoles), getAdminAttendance);
router.put('/:id', authorize(...adminRoles), updateAttendance);

export default router;
