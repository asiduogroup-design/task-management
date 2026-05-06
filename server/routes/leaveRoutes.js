import express from 'express';
import { approveLeave, createLeave, getLeaves, rejectLeave } from '../controllers/leaveController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminRoles, authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.route('/').get(getLeaves).post(createLeave);
router.patch('/:id/approve', authorize(...adminRoles), approveLeave);
router.patch('/:id/reject', authorize(...adminRoles), rejectLeave);

export default router;
