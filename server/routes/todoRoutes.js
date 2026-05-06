import express from 'express';
import { createTodo, deleteTodo, getTodos, updateTodo, updateTodoStatus } from '../controllers/todoController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.route('/').get(getTodos).post(createTodo);
router.route('/:id').put(updateTodo).delete(deleteTodo);
router.patch('/:id/status', updateTodoStatus);

export default router;
