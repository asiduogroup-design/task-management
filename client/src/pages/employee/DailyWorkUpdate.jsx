import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ModulePage from '../shared/ModulePage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { dailyUpdateService } from '../../services/dailyUpdateService.js';
import { projectService } from '../../services/projectService.js';

const DailyWorkUpdate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    projectId: searchParams.get('projectId') || '',
    workDescription: '',
    completedWork: '',
    timeSpent: '',
    blockers: '',
    tomorrowPlan: ''
  });

  useEffect(() => {
    let active = true;

    const loadProjects = async () => {
      try {
        const { data } = await projectService.list();
        if (!active) return;
        setProjects(data.projects || []);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.response?.data?.message || 'Unable to load your projects');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProjects();

    return () => {
      active = false;
    };
  }, []);

  const selectedProject = useMemo(
    () => projects.find((project) => project._id === form.projectId) || null,
    [form.projectId, projects]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await dailyUpdateService.create({
        projectId: form.projectId || undefined,
        workDescription: form.workDescription.trim(),
        completedWork: form.completedWork.trim(),
        timeSpent: form.timeSpent ? Number(form.timeSpent) : 0,
        blockers: form.blockers.trim(),
        tomorrowPlan: form.tomorrowPlan.trim(),
        date: new Date().toISOString(),
        status: 'submitted'
      });

      setSuccess('Daily update submitted successfully.');
      setForm((current) => ({
        ...current,
        workDescription: '',
        completedWork: '',
        timeSpent: '',
        blockers: '',
        tomorrowPlan: ''
      }));

      setTimeout(() => navigate('/employee/projects'), 1200);
    } catch (submitError) {
      setError(submitError.response?.data?.message || 'Unable to submit daily update');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModulePage title="Daily Work Update">
      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
      {success && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</div>}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">{user?.name || 'Employee'}</p>
              <h2 className="mt-1 text-2xl font-black text-ink">Submit today's progress</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Capture what you finished, what is still pending, and anything blocking your work.</p>
            </div>
            <Link className="btn-secondary" to="/employee/projects">Back to projects</Link>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-semibold text-slate-700" htmlFor="projectId">Project</label>
              <select
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-brand"
                disabled={loading}
                id="projectId"
                onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}
                value={form.projectId}
              >
                <option value="">General update</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name} {project.role ? `(${project.role})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-700" htmlFor="workDescription">What did you work on?</label>
                <textarea
                  className="mt-1 min-h-32 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-brand"
                  id="workDescription"
                  onChange={(event) => setForm((current) => ({ ...current, workDescription: event.target.value }))}
                  placeholder="Summarize the work completed today"
                  required
                  value={form.workDescription}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700" htmlFor="completedWork">Completed work</label>
                <textarea
                  className="mt-1 min-h-32 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-brand"
                  id="completedWork"
                  onChange={(event) => setForm((current) => ({ ...current, completedWork: event.target.value }))}
                  placeholder="List deliverables or milestones completed"
                  value={form.completedWork}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-semibold text-slate-700" htmlFor="timeSpent">Time spent (hours)</label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-brand"
                  id="timeSpent"
                  min="0"
                  onChange={(event) => setForm((current) => ({ ...current, timeSpent: event.target.value }))}
                  placeholder="0"
                  step="0.5"
                  type="number"
                  value={form.timeSpent}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700" htmlFor="blockers">Blockers</label>
                <textarea
                  className="mt-1 min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-brand"
                  id="blockers"
                  onChange={(event) => setForm((current) => ({ ...current, blockers: event.target.value }))}
                  placeholder="Mention anything slowing you down"
                  value={form.blockers}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700" htmlFor="tomorrowPlan">Tomorrow's plan</label>
                <textarea
                  className="mt-1 min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-brand"
                  id="tomorrowPlan"
                  onChange={(event) => setForm((current) => ({ ...current, tomorrowPlan: event.target.value }))}
                  placeholder="What will you tackle next?"
                  value={form.tomorrowPlan}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={submitting} type="submit">
                {submitting ? 'Submitting...' : 'Submit update'}
              </button>
              <Link className="btn-secondary" to={selectedProject ? `/employee/projects/${selectedProject._id}#project-tasks` : '/employee/projects'}>
                {selectedProject ? 'Review project tasks' : 'Browse projects'}
              </Link>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-ink">Update preview</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p><span className="font-semibold text-ink">Project:</span> {selectedProject?.name || 'General update'}</p>
              <p><span className="font-semibold text-ink">Role:</span> {selectedProject?.role || '-'}</p>
              <p><span className="font-semibold text-ink">Deadline:</span> {selectedProject?.deadline ? new Date(selectedProject.deadline).toLocaleDateString() : '-'}</p>
              <p><span className="font-semibold text-ink">Progress:</span> {selectedProject?.progressPercentage ?? 0}%</p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-ink">Recent guidance</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Keep the work description specific, note blockers early, and include the next plan so the project lead can review quickly.
            </p>
          </section>
        </aside>
      </div>
    </ModulePage>
  );
};

export default DailyWorkUpdate;