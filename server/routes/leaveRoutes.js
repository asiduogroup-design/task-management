import express from 'express';
import { approveLeave, createLeave, getLeaveById, getLeaves, getLeaveSummary, rejectLeave } from '../controllers/leaveController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminRoles, authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/summary', authorize(...adminRoles), getLeaveSummary);
router.route('/').get(getLeaves).post(createLeave);
router.get('/:id', getLeaveById);
router.patch('/:id/approve', authorize(...adminRoles), approveLeave);
router.patch('/:id/reject', authorize(...adminRoles), rejectLeave);

export default router;
