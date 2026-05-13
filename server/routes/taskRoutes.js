import express from 'express';
import {
	addTaskAttachment,
	addTaskComment,
	addTaskWorkLog,
	changeTaskDeadline,
	createTask,
	deleteTask,
	getCompletedTaskHistory,
	getTaskById,
	getTaskSummary,
	getTasks,
	markTaskCompleted,
	reopenTask,
	reassignTask,
	updateSubtaskStatus,
	updateTask,
	updateTaskStatus
} from '../controllers/taskController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize, managerRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/summary', getTaskSummary);
router.get('/completed-history', getCompletedTaskHistory);
router.route('/').get(getTasks).post(authorize(...managerRoles), createTask);
router.route('/:id([0-9a-fA-F]{24})').get(getTaskById).put(authorize(...managerRoles), updateTask).delete(authorize(...managerRoles), deleteTask);
router.patch('/:id([0-9a-fA-F]{24})/status', updateTaskStatus);
router.patch('/:id([0-9a-fA-F]{24})/reassign', authorize(...managerRoles), reassignTask);
router.patch('/:id([0-9a-fA-F]{24})/deadline', authorize(...managerRoles), changeTaskDeadline);
router.patch('/:id([0-9a-fA-F]{24})/complete', authorize(...managerRoles), markTaskCompleted);
router.patch('/:id([0-9a-fA-F]{24})/reopen', authorize(...managerRoles), reopenTask);
router.post('/:id([0-9a-fA-F]{24})/comments', addTaskComment);
router.post('/:id([0-9a-fA-F]{24})/attachments', addTaskAttachment);
router.post('/:id([0-9a-fA-F]{24})/work-logs', addTaskWorkLog);
router.patch('/:id([0-9a-fA-F]{24})/subtasks/:subtaskId([0-9a-fA-F]{24})/status', updateSubtaskStatus);

export default router;
