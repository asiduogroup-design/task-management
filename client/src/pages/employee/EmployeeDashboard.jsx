import { useEffect, useState } from 'react';
import DashboardShell from '../../components/DashboardShell.jsx';
import StatCard from '../../components/StatCard.jsx';
import api from '../../config/api.js';

const EmployeeDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    const loadEmployeeData = async () => {
      const [tasksResponse, workspacesResponse] = await Promise.all([
        api.get('/tasks'),
        api.get('/workspaces')
      ]);

      setTasks(tasksResponse.data.tasks);
      setWorkspaces(workspacesResponse.data.workspaces);
    };

    loadEmployeeData().catch(() => {});
  }, []);

  const completed = tasks.filter((task) => task.status === 'completed').length;
  const inProgress = tasks.filter((task) => task.status === 'in-progress').length;

  return (
    <DashboardShell title="Employee Dashboard" subtitle="My workspace">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Assigned tasks" value={tasks.length} tone="brand" />
        <StatCard label="In progress" value={inProgress} tone="amber" />
        <StatCard label="Completed" value={completed} tone="mint" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-bold text-ink">My tasks</h3>
          <div className="mt-4 space-y-3">
            {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks assigned yet.</p>}
            {tasks.map((task) => (
              <div className="rounded-md border border-slate-100 bg-slate-50 p-3" key={task._id}>
                <p className="font-semibold text-ink">{task.title}</p>
                <p className="text-sm capitalize text-slate-500">{task.status} · {task.priority} priority</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-bold text-ink">My workspaces</h3>
          <div className="mt-4 space-y-3">
            {workspaces.length === 0 && <p className="text-sm text-slate-500">No workspace memberships yet.</p>}
            {workspaces.map((workspace) => (
              <div className="rounded-md border border-slate-100 bg-slate-50 p-3" key={workspace._id}>
                <p className="font-semibold text-ink">{workspace.name}</p>
                <p className="text-sm text-slate-500">{workspace.description || 'Team workspace'}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
};

export default EmployeeDashboard;
