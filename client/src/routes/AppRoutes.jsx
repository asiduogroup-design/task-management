import { Navigate, Route, Routes } from 'react-router-dom';
import { getDashboardPath, useAuth } from '../context/AuthContext.jsx';
import Login from '../pages/auth/Login.jsx';
import ForgotPassword from '../pages/auth/ForgotPassword.jsx';
import AdminDashboard from '../pages/admin/AdminDashboard.jsx';
import EmployeeManagement from '../pages/admin/EmployeeManagement.jsx';
import EmployeeForm from '../pages/admin/EmployeeForm.jsx';
import EmployeeProfileAdmin from '../pages/admin/EmployeeProfileAdmin.jsx';
import AttendanceManagement from '../pages/admin/AttendanceManagement.jsx';
import ProjectManagement from '../pages/admin/ProjectManagement.jsx';
import ProjectForm from '../pages/admin/ProjectForm.jsx';
import ProjectDetails from '../pages/admin/ProjectDetails.jsx';
import TaskManagement from '../pages/admin/TaskManagement.jsx';
import TaskForm from '../pages/admin/TaskForm.jsx';
import TaskDetails from '../pages/admin/TaskDetails.jsx';
import DailyWorkReports from '../pages/admin/DailyWorkReports.jsx';
import LeaveManagement from '../pages/admin/LeaveManagement.jsx';
import Reports from '../pages/admin/Reports.jsx';
import Notifications from '../pages/shared/Notifications.jsx';
import Settings from '../pages/admin/Settings.jsx';
import EmployeeDashboard from '../pages/employee/EmployeeDashboard.jsx';
import MyAttendance from '../pages/employee/MyAttendance.jsx';
import MyProjects from '../pages/employee/MyProjects.jsx';
import MyTasks from '../pages/employee/MyTasks.jsx';
import EmployeeTaskDetails from '../pages/employee/EmployeeTaskDetails.jsx';
import TodoList from '../pages/employee/TodoList.jsx';
import DailyWorkUpdate from '../pages/employee/DailyWorkUpdate.jsx';
import CompletedTasks from '../pages/employee/CompletedTasks.jsx';
import LeaveRequest from '../pages/employee/LeaveRequest.jsx';
import Profile from '../pages/employee/Profile.jsx';
import ManagerDashboard from '../pages/manager/ManagerDashboard.jsx';
import AssignedProjects from '../pages/manager/AssignedProjects.jsx';
import ProjectTasks from '../pages/manager/ProjectTasks.jsx';
import TeamMembers from '../pages/manager/TeamMembers.jsx';
import ManagerDailyUpdates from '../pages/manager/ManagerDailyUpdates.jsx';
import ReviewTasks from '../pages/manager/ReviewTasks.jsx';
import RoleBasedRoute from './RoleBasedRoute.jsx';

const adminRoles = ['super_admin', 'admin'];
const superAdminRoles = ['super_admin'];
const superAdminAndManagerRoles = ['super_admin', 'manager'];

const HomeRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={isAuthenticated ? getDashboardPath(user.role) : '/login'} replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<HomeRedirect />} />
    <Route path="/login" element={<Login />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />

    <Route path="/admin/dashboard" element={<RoleBasedRoute roles={adminRoles}><AdminDashboard /></RoleBasedRoute>} />
    <Route path="/admin/employees" element={<RoleBasedRoute roles={adminRoles}><EmployeeManagement /></RoleBasedRoute>} />
    <Route path="/admin/employees/add" element={<RoleBasedRoute roles={adminRoles}><EmployeeForm /></RoleBasedRoute>} />
    <Route path="/admin/employees/:id/edit" element={<RoleBasedRoute roles={adminRoles}><EmployeeForm /></RoleBasedRoute>} />
    <Route path="/admin/employees/:id" element={<RoleBasedRoute roles={adminRoles}><EmployeeProfileAdmin /></RoleBasedRoute>} />
    <Route path="/admin/attendance" element={<RoleBasedRoute roles={adminRoles}><AttendanceManagement /></RoleBasedRoute>} />
    <Route path="/admin/projects" element={<RoleBasedRoute roles={superAdminRoles}><ProjectManagement /></RoleBasedRoute>} />
    <Route path="/admin/projects/add" element={<RoleBasedRoute roles={superAdminRoles}><ProjectForm /></RoleBasedRoute>} />
    <Route path="/admin/projects/:id/edit" element={<RoleBasedRoute roles={superAdminRoles}><ProjectForm /></RoleBasedRoute>} />
    <Route path="/admin/projects/:id" element={<RoleBasedRoute roles={superAdminAndManagerRoles}><ProjectDetails /></RoleBasedRoute>} />
    <Route path="/admin/tasks" element={<RoleBasedRoute roles={superAdminRoles}><TaskManagement /></RoleBasedRoute>} />
    <Route path="/admin/tasks/add" element={<RoleBasedRoute roles={superAdminAndManagerRoles}><TaskForm /></RoleBasedRoute>} />
    <Route path="/admin/tasks/:id/edit" element={<RoleBasedRoute roles={superAdminAndManagerRoles}><TaskForm /></RoleBasedRoute>} />
    <Route path="/admin/tasks/:id" element={<RoleBasedRoute roles={superAdminAndManagerRoles}><TaskDetails /></RoleBasedRoute>} />
    <Route path="/admin/daily-work-reports" element={<RoleBasedRoute roles={adminRoles}><DailyWorkReports /></RoleBasedRoute>} />
    <Route path="/admin/leaves" element={<RoleBasedRoute roles={adminRoles}><LeaveManagement /></RoleBasedRoute>} />
    <Route path="/admin/reports" element={<RoleBasedRoute roles={adminRoles}><Reports /></RoleBasedRoute>} />
    <Route path="/admin/notifications" element={<RoleBasedRoute roles={adminRoles}><Notifications title="Notifications" /></RoleBasedRoute>} />
    <Route path="/admin/settings" element={<RoleBasedRoute roles={superAdminRoles}><Settings /></RoleBasedRoute>} />

    <Route path="/employee/dashboard" element={<RoleBasedRoute roles={['employee']}><EmployeeDashboard /></RoleBasedRoute>} />
    <Route path="/employee/attendance" element={<RoleBasedRoute roles={['employee']}><MyAttendance /></RoleBasedRoute>} />
    <Route path="/employee/projects" element={<RoleBasedRoute roles={['employee']}><MyProjects /></RoleBasedRoute>} />
    <Route path="/employee/projects/:id" element={<RoleBasedRoute roles={['employee']}><ProjectDetails employeeView /></RoleBasedRoute>} />
    <Route path="/employee/tasks" element={<RoleBasedRoute roles={['employee']}><MyTasks /></RoleBasedRoute>} />
    <Route path="/employee/tasks/:id" element={<RoleBasedRoute roles={['employee']}><EmployeeTaskDetails /></RoleBasedRoute>} />
    <Route path="/employee/todos" element={<RoleBasedRoute roles={['employee']}><TodoList /></RoleBasedRoute>} />
    <Route path="/employee/daily-update" element={<RoleBasedRoute roles={['employee']}><DailyWorkUpdate /></RoleBasedRoute>} />
    <Route path="/employee/completed-tasks" element={<RoleBasedRoute roles={['employee']}><CompletedTasks /></RoleBasedRoute>} />
    <Route path="/employee/leaves" element={<RoleBasedRoute roles={['employee']}><LeaveRequest /></RoleBasedRoute>} />
    <Route path="/employee/profile" element={<RoleBasedRoute roles={['employee']}><Profile /></RoleBasedRoute>} />
    <Route path="/employee/notifications" element={<RoleBasedRoute roles={['employee']}><Notifications title="My Notifications" /></RoleBasedRoute>} />

    <Route path="/manager/dashboard" element={<RoleBasedRoute roles={['manager']}><ManagerDashboard /></RoleBasedRoute>} />
    <Route path="/manager/projects" element={<RoleBasedRoute roles={['manager']}><AssignedProjects /></RoleBasedRoute>} />
    <Route path="/manager/projects/:id" element={<RoleBasedRoute roles={['manager']}><ProjectDetails /></RoleBasedRoute>} />
    <Route path="/manager/tasks" element={<RoleBasedRoute roles={['manager']}><ProjectTasks /></RoleBasedRoute>} />
    <Route path="/manager/tasks/add" element={<RoleBasedRoute roles={['manager']}><TaskForm /></RoleBasedRoute>} />
    <Route path="/manager/team-members" element={<RoleBasedRoute roles={['manager']}><TeamMembers /></RoleBasedRoute>} />
    <Route path="/manager/daily-updates" element={<RoleBasedRoute roles={['manager']}><ManagerDailyUpdates /></RoleBasedRoute>} />
    <Route path="/manager/review-tasks" element={<RoleBasedRoute roles={['manager']}><ReviewTasks /></RoleBasedRoute>} />
    <Route path="/manager/notifications" element={<RoleBasedRoute roles={['manager']}><Notifications title="Manager Notifications" /></RoleBasedRoute>} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
