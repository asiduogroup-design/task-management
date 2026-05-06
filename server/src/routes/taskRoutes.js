import express from 'express';
import { createTask, getTasks, updateTaskStatus } from '../controllers/taskController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getTasks).post(protect, authorize('admin'), createTask);
router.patch('/:id/status', protect, updateTaskStatus);

export default router;
