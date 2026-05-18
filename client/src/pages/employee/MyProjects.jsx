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

const filterTextColorMap = {
  all: '#0f766e',
  active: '#1d4ed8',
  completed: '#15803d',
  overdue: '#b45309',
  on_hold: '#7c3aed'
};

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

      <section className="employee-project-hero rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
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
            ].map(([label, value]) => {
              const colorMap = {
                'Total': { bg: '#ecfeff', border: '#06b6d4', text: '#0f766e' },
                'Active': { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
                'Completed': { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
                'Overdue': { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
                'On hold': { bg: '#f5f3ff', border: '#8b5cf6', text: '#6d28d9' }
              };
              const colors = colorMap[label] || colorMap['Total'];
              return (
              <div 
                className="employee-project-kpi min-w-[120px] rounded-2xl border px-4 py-3"
                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                key={label}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: colors.text }}>{label}</p>
                <p className="mt-1 text-2xl font-black text-ink">{value}</p>
              </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const isActive = selectedFilter === option.key;
            const inactiveTextColor = filterTextColorMap[option.key] || '#475569';
            return (
              <button
                className={`employee-filter-pill rounded-full border px-4 py-2 text-sm font-semibold transition ${isActive ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                key={option.key}
                onClick={() => setSelectedFilter(option.key)}
                style={isActive ? undefined : { color: inactiveTextColor }}
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
          {filteredProjects.map((project) => {
            const borderColors = {
              completed: '#2d9d78',
              overdue: '#b7791f',
              active: '#2458d3',
              on_hold: '#94a3b8'
            };
            const borderColor = borderColors[project.status] || '#2458d3';
            return (
            <article 
              className="employee-project-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" 
              style={{ borderLeft: `4px solid ${borderColor}` }}
              key={project._id}
            >
              <div className="p-5 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand">{project.projectCode || 'Project'}</p>
                    <h3 className="mt-1 text-lg font-black text-ink">{project.name}</h3>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <p className="mt-2 text-sm leading-5 text-slate-600">{project.description || 'No description provided.'}</p>
              </div>

              <div className="grid gap-0 px-5 py-3 md:grid-cols-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Your assignment</p>
                  <p className="mt-1 text-sm text-slate-700"><span className="font-semibold">Role:</span> {project.role || 'Member'}</p>
                  <p className="mt-1 text-sm text-slate-700"><span className="font-semibold">Dept:</span> {project.department || '-'}</p>
                </div>

                <div className="mt-3 md:mt-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Schedule</p>
                  <p className="mt-1 text-sm text-slate-700"><span className="font-semibold">Start:</span> {formatDate(project.startDate)}</p>
                  <p className="mt-1 text-sm text-slate-700"><span className="font-semibold">Deadline:</span> {formatDate(project.deadline)}</p>
                </div>
              </div>

              <div className="px-5 py-3">
                <div className="flex items-center justify-between gap-2 text-sm text-slate-600 mb-2">
                  <p>Progress: <span className="font-semibold text-ink">{project.progressPercentage || 0}%</span></p>
                  <p><span className="font-semibold">{project.taskSummary?.completed || 0} of {project.taskSummary?.total || 0}</span> tasks complete</p>
                </div>
                <div className="employee-progress-track h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="employee-progress-bar h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all" style={{ width: `${project.progressPercentage || 0}%` }} />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap gap-2">
                <Link className="btn-primary" to={`/employee/projects/${project._id}`}>View project</Link>
                <Link className="btn-secondary" to={`/employee/projects/${project._id}#project-tasks`}>View tasks</Link>
                <Link className="btn-secondary" to={`/employee/daily-update?projectId=${project._id}`}>Submit update</Link>
              </div>
            </article>
            );
          })}
        </div>
      )}
    </ModulePage>
  );
};

export default MyProjects;