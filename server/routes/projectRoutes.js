import express from 'express';
import { addProjectMember, createProject, deleteProject, getProjectById, getProjects, removeProjectMember, updateProject, updateProjectMember } from '../controllers/projectController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize, managerAndAdminRoles, managerRoles, ROLES } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE));
router.route('/').get(getProjects).post(authorize(...managerRoles), createProject);
router.route('/:id').get(getProjectById).put(authorize(...managerRoles), updateProject).delete(authorize(...managerRoles), deleteProject);
router.post('/:id/members', authorize(...managerAndAdminRoles), addProjectMember);
router.patch('/:id/members/:employeeId', authorize(...managerAndAdminRoles), updateProjectMember);
router.delete('/:id/members/:employeeId', authorize(...managerAndAdminRoles), removeProjectMember);

export default router;
