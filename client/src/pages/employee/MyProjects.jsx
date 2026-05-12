import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ModulePage from '../shared/ModulePage.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { projectService } from '../../services/projectService.js';

const filterOptions = [
  { key: 'all', label: 'All projects' },
  { key: 'active', label: 'Active projects' },
  { key: 'completed', label: 'Completed projects' },
  { key: 'overdue', label: 'Overdue projects' },
  { key: 'on_hold', label: 'On-hold projects' }
];

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');

const normalizeStatus = (status, deadline) => {
  if (!status) return 'active';
  if (status === 'on_hold') return 'on_hold';
  if (['planning', 'not_started', 'active'].includes(status)) {
    const isOverdue = deadline && new Date(deadline) < new Date();
    return isOverdue ? 'overdue' : 'active';
  }
  return status;
};

const summaryFromProjects = (projects) => projects.reduce(
  (summary, project) => {
    summary.total += 1;
    summary[project.status] = (summary[project.status] || 0) + 1;
    return summary;
  },
  { total: 0, active: 0, completed: 0, overdue: 0, on_hold: 0 }
);

const mapProjectCard = (project, currentEmployeeId) => {
  const totalTasks = project.taskSummary?.total || 0;
  const completedTasks = project.taskSummary?.completed || 0;
  const progressPercentage = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const assignedEmployees = project.assignedEmployees || [];
  const assignedRole = assignedEmployees.find((member) => String(member._id) === String(currentEmployeeId))?.role;

  return {
    _id: project._id,
    projectCode: project.projectCode || 'Project',
    name: project.name,
    description: project.description || '',
    role: assignedRole || 'member',
    department: project.department,
    startDate: project.startDate,
    deadline: project.deadline,
    assignedDate: null,
    progressPercentage,
    status: normalizeStatus(project.displayStatus || project.status, project.deadline),
    taskSummary: {
      total: totalTasks,
      completed: completedTasks
    }
  };
};

const MyProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, completed: 0, overdue: 0, on_hold: 0 });
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadProjects = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await projectService.list();
        if (!active) return;
        const mappedProjects = (data.projects || []).map((project) => mapProjectCard(project, user?.employee?._id));
        setProjects(mappedProjects);
        setSummary(summaryFromProjects(mappedProjects));
      } catch (loadError) {
        if (!active) return;
        setError(loadError.response?.data?.message || 'Unable to load assigned projects');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProjects();

    return () => {
      active = false;
    };
  }, [user?.employee?._id]);

  const filteredProjects = useMemo(() => {
    if (selectedFilter === 'all') return projects;
    return projects.filter((project) => project.status === selectedFilter);
  }, [projects, selectedFilter]);

  return (
    <ModulePage title="My Projects">
      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">Assigned to {user?.name || 'you'}</p>
            <h2 className="mt-1 text-2xl font-black text-ink">Project portfolio</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review the projects you are working on, check role-specific assignment details, and jump straight to the project board or update flow.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ['Total', summary.total],
              ['Active', summary.active],
              ['Completed', summary.completed],
              ['Overdue', summary.overdue],
              ['On hold', summary.on_hold]
            ].map(([label, value]) => (
              <div className="min-w-[120px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" key={label}>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const isActive = selectedFilter === option.key;
            return (
              <button
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${isActive ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-ink'}`}
                key={option.key}
                onClick={() => setSelectedFilter(option.key)}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading assigned projects...</section>
      ) : filteredProjects.length === 0 ? (
        <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <h3 className="text-lg font-bold text-ink">No projects found</h3>
          <p className="mt-2 text-sm text-slate-500">
            {selectedFilter === 'all' ? 'You do not have any assigned projects yet.' : 'Try a different filter to see more projects.'}
          </p>
        </section>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {filteredProjects.map((project) => (
            <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" key={project._id}>
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand">{project.projectCode || 'Project'}</p>
                    <h3 className="mt-1 text-xl font-black text-ink">{project.name}</h3>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{project.description || 'No description provided.'}</p>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Your assignment</p>
                  <p className="mt-2 text-sm font-semibold text-ink">Role: {project.role || 'Member'}</p>
                  <p className="mt-1 text-sm text-slate-600">Department: {project.department || '-'}</p>
                  <p className="mt-1 text-sm text-slate-600">Assigned on: {formatDate(project.assignedDate)}</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Schedule</p>
                  <p className="mt-2 text-sm text-slate-600">Start date: <span className="font-semibold text-ink">{formatDate(project.startDate)}</span></p>
                  <p className="mt-1 text-sm text-slate-600">Deadline: <span className="font-semibold text-ink">{formatDate(project.deadline)}</span></p>
                  <p className="mt-1 text-sm text-slate-600">Progress: <span className="font-semibold text-ink">{project.progressPercentage || 0}%</span></p>
                </div>
              </div>

              <div className="px-5 pb-5">
                <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${project.progressPercentage || 0}%` }} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                  <p>{project.taskSummary?.completed || 0} of {project.taskSummary?.total || 0} tasks complete</p>
                  <p className="font-semibold capitalize text-slate-700">Status: {project.status.replaceAll('_', ' ')}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link className="btn-primary" to={`/employee/projects/${project._id}`}>View project</Link>
                  <Link className="btn-secondary" to={`/employee/projects/${project._id}#project-tasks`}>View tasks</Link>
                  <Link className="btn-secondary" to={`/employee/daily-update?projectId=${project._id}`}>Submit update</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </ModulePage>
  );
};

export default MyProjects;