import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../../components/common/DataTable.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { attendanceService } from '../../services/attendanceService.js';
import { employeeService } from '../../services/employeeService.js';
import { projectService } from '../../services/projectService.js';
import { taskService } from '../../services/taskService.js';

const AdminDashboard = () => {
  const [state, setState] = useState({ employees: [], attendance: [], projects: [], tasks: [] });

  useEffect(() => {
    Promise.all([employeeService.list(), attendanceService.admin(), projectService.list(), taskService.list()])
      .then(([employees, attendance, projects, tasks]) => {
        setState({
          employees: employees.data.employees || [],
          attendance: attendance.data.records || [],
          projects: projects.data.projects || [],
          tasks: tasks.data.tasks || []
        });
      })
      .catch(() => {});
  }, []);

  const completed = state.tasks.filter((task) => task.status === 'completed').length;
  const pending = state.tasks.filter((task) => !['completed'].includes(task.status)).length;
  const overdue = state.tasks.filter((task) => task.status === 'overdue' || (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed')).length;

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total employees" value={state.employees.length} />
        <StatCard label="Logged in today" value={state.attendance.filter((row) => row.loginTime).length} />
        <StatCard label="Active projects" value={state.projects.filter((project) => project.status === 'active').length} />
        <StatCard label="Pending tasks" value={pending} helper={`${completed} completed · ${overdue} overdue`} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section>
          <h3 className="mb-3 font-black text-slate-950">Today attendance</h3>
          <DataTable
            columns={[
              { key: 'employee', label: 'Employee', render: (row) => row.employeeId?.userId?.name || '-' },
              { key: 'loginTime', label: 'Login', render: (row) => row.loginTime ? new Date(row.loginTime).toLocaleTimeString() : '-' },
              { key: 'logoutTime', label: 'Logout', render: (row) => row.logoutTime ? new Date(row.logoutTime).toLocaleTimeString() : '-' },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> }
            ]}
            rows={state.attendance.slice(0, 6)}
          />
        </section>
        <section>
          <h3 className="mb-3 font-black text-slate-950">Quick actions</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link className="btn-primary" to="/admin/employees/add">Add employee</Link>
            <Link className="btn-primary" to="/admin/projects/add">Create project</Link>
            <Link className="btn-primary" to="/admin/tasks/add">Assign task</Link>
            <Link className="btn-secondary" to="/admin/reports">View reports</Link>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
