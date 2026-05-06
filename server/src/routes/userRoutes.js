import express from 'express';
import { getEmployees, getUserStats } from '../controllers/userController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/employees', protect, authorize('admin'), getEmployees);
router.get('/stats', protect, authorize('admin'), getUserStats);

export default router;
