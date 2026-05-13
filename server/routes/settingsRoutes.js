import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize, superAdminRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/', authorize(...superAdminRoles), getSettings);
router.put('/', authorize(...superAdminRoles), updateSettings);

export default router;
