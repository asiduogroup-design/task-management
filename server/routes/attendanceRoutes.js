import express from 'express';
import { attendanceLogin, attendanceLogout, breakEnd, breakStart, getAdminAttendance, getAttendanceHistory, getTodayAttendance, updateAttendance } from '../controllers/attendanceController.js';
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
router.get('/admin', authorize(...adminRoles), getAdminAttendance);
router.put('/:id', authorize(...adminRoles), updateAttendance);

export default router;
