import express from 'express';
import { createWorkspace, getWorkspaces } from '../controllers/workspaceController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getWorkspaces).post(protect, authorize('admin'), createWorkspace);

export default router;
