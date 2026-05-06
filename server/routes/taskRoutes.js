import express from 'express';
import { addTaskAttachment, addTaskComment, createTask, deleteTask, getTaskById, getTasks, updateTask, updateTaskStatus } from '../controllers/taskController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize, managerRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.route('/').get(getTasks).post(authorize(...managerRoles), createTask);
router.route('/:id').get(getTaskById).put(authorize(...managerRoles), updateTask).delete(authorize(...managerRoles), deleteTask);
router.patch('/:id/status', updateTaskStatus);
router.post('/:id/comments', addTaskComment);
router.post('/:id/attachments', authorize(...managerRoles), addTaskAttachment);

export default router;
