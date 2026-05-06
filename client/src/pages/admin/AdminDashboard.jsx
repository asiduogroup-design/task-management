import { useEffect, useState } from 'react';
import DashboardShell from '../../components/DashboardShell.jsx';
import StatCard from '../../components/StatCard.jsx';
import api from '../../config/api.js';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalEmployees: 0, activeEmployees: 0, inactiveEmployees: 0 });
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const loadAdminData = async () => {
      const [statsResponse, employeesResponse, tasksResponse] = await Promise.all([
        api.get('/users/stats'),
        api.get('/users/employees'),
        api.get('/tasks')
      ]);

      setStats(statsResponse.data);
      setEmployees(employeesResponse.data.employees);
      setTasks(tasksResponse.data.tasks);
    };

    loadAdminData().catch(() => {});
  }, []);

  return (
    <DashboardShell title="Admin Dashboard" subtitle="Workspace overview">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Employees" value={stats.totalEmployees} tone="brand" />
        <StatCard label="Active" value={stats.activeEmployees} tone="mint" />
        <StatCard label="Inactive" value={stats.inactiveEmployees} tone="amber" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-bold text-ink">Employees</h3>
          <div className="mt-4 space-y-3">
            {employees.length === 0 && <p className="text-sm text-slate-500">No employees found.</p>}
            {employees.map((employee) => (
              <div className="rounded-md border border-slate-100 bg-slate-50 p-3" key={employee._id}>
                <p className="font-semibold text-ink">{employee.name}</p>
                <p className="text-sm text-slate-500">{employee.jobTitle || 'Employee'} · {employee.department || 'Unassigned'}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-bold text-ink">Recent tasks</h3>
          <div className="mt-4 space-y-3">
            {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks created yet.</p>}
            {tasks.map((task) => (
              <div className="rounded-md border border-slate-100 bg-slate-50 p-3" key={task._id}>
                <p className="font-semibold text-ink">{task.title}</p>
                <p className="text-sm capitalize text-slate-500">{task.status} · {task.priority} priority</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
};

export default AdminDashboard;
