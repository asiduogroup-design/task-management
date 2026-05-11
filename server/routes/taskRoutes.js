import express from 'express';
import {
	addTaskAttachment,
	addTaskComment,
	changeTaskDeadline,
	createTask,
	deleteTask,
	getTaskById,
	getTaskSummary,
	getTasks,
	markTaskCompleted,
	reopenTask,
	reassignTask,
	updateTask,
	updateTaskStatus
} from '../controllers/taskController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize, managerRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/summary', authorize(...managerRoles), getTaskSummary);
router.route('/').get(getTasks).post(authorize(...managerRoles), createTask);
router.route('/:id').get(getTaskById).put(authorize(...managerRoles), updateTask).delete(authorize(...managerRoles), deleteTask);
router.patch('/:id/status', updateTaskStatus);
router.patch('/:id/reassign', authorize(...managerRoles), reassignTask);
router.patch('/:id/deadline', authorize(...managerRoles), changeTaskDeadline);
router.patch('/:id/complete', authorize(...managerRoles), markTaskCompleted);
router.patch('/:id/reopen', authorize(...managerRoles), reopenTask);
router.post('/:id/comments', addTaskComment);
router.post('/:id/attachments', authorize(...managerRoles), addTaskAttachment);

export default router;
