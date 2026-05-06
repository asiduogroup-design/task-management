import express from 'express';
import { forgotPassword, getMe, login, logout } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/forgot-password', forgotPassword);
router.get('/me', protect, getMe);

export default router;
