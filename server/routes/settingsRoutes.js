import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminRoles, authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/', authorize(...adminRoles), getSettings);
router.put('/', authorize(...adminRoles), updateSettings);

export default router;
