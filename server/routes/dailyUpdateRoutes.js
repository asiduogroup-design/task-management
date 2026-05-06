import express from 'express';
import { createDailyUpdate, getDailyUpdateById, getDailyUpdates, updateDailyUpdate } from '../controllers/dailyUpdateController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.route('/').get(getDailyUpdates).post(createDailyUpdate);
router.route('/:id').get(getDailyUpdateById).put(updateDailyUpdate);

export default router;
