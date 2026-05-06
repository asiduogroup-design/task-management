import express from 'express';
import { addProjectMember, createProject, deleteProject, getProjectById, getProjects, removeProjectMember, updateProject } from '../controllers/projectController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize, managerRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.route('/').get(getProjects).post(authorize(...managerRoles), createProject);
router.route('/:id').get(getProjectById).put(authorize(...managerRoles), updateProject).delete(authorize(...managerRoles), deleteProject);
router.post('/:id/members', authorize(...managerRoles), addProjectMember);
router.delete('/:id/members/:employeeId', authorize(...managerRoles), removeProjectMember);

export default router;
