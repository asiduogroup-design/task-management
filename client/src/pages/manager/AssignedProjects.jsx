import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchFilterBar from '../../components/common/SearchFilterBar.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { projectService } from '../../services/projectService.js';
import ModulePage from '../shared/ModulePage.jsx';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');

const AssignedProjects = () => {
	const [projects, setProjects] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState('');

	useEffect(() => {
		let active = true;

		const loadProjects = async () => {
			setLoading(true);
			setError('');

			try {
				const { data } = await projectService.list({
					search: search || undefined,
					status: status || undefined
				});

				if (!active) return;
				setProjects(data.projects || []);
			} catch (loadError) {
				if (!active) return;
				setError(loadError.response?.data?.message || 'Unable to load assigned projects.');
				setProjects([]);
			} finally {
				if (active) setLoading(false);
			}
		};

		loadProjects();

		return () => {
			active = false;
		};
	}, [search, status]);

	const summary = useMemo(
		() =>
			projects.reduce(
				(accumulator, project) => {
					accumulator.total += 1;

					if ((project.displayStatus || project.status) === 'overdue') {
						accumulator.overdue += 1;
					}

					if (['active', 'not_started', 'planning'].includes(project.status)) {
						accumulator.active += 1;
					}

					if (project.status === 'completed') {
						accumulator.completed += 1;
					}

					return accumulator;
				},
				{ total: 0, active: 0, completed: 0, overdue: 0 }
			),
		[projects]
	);

	return (
		<ModulePage title="Assigned Projects">
			<section className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Total projects</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary.total}</p></article>
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Active projects</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary.active}</p></article>
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Completed projects</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary.completed}</p></article>
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Overdue projects</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary.overdue}</p></article>
			</section>

			<SearchFilterBar search={search} setSearch={setSearch}>
				<select className="form-field md:max-w-xs" id="managerProjectStatus" name="managerProjectStatus" onChange={(event) => setStatus(event.target.value)} value={status}>
					<option value="">All statuses</option>
					<option value="active">Active</option>
					<option value="not_started">Not started</option>
					<option value="planning">Planning</option>
					<option value="completed">Completed</option>
					<option value="overdue">Overdue</option>
					<option value="on_hold">On hold</option>
				</select>
			</SearchFilterBar>

			{error ? <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}

			{loading ? <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">Loading projects...</p> : null}

			{!loading && !projects.length ? (
				<p className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">No assigned projects match your filters.</p>
			) : null}

			<div className="grid gap-4 xl:grid-cols-2">
				{projects.map((project) => (
					<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" key={project._id}>
						<div className="flex flex-wrap items-start justify-between gap-2">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{project.projectCode || 'Project'}</p>
								<h3 className="text-lg font-black text-slate-900">{project.name}</h3>
							</div>
							<StatusBadge status={project.displayStatus || project.status} />
						</div>

						<p className="mt-2 text-sm text-slate-600">{project.description || 'No description provided.'}</p>

						<div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
							<p>Department: <span className="font-semibold text-slate-900">{project.department || '-'}</span></p>
							<p>Deadline: <span className="font-semibold text-slate-900">{formatDate(project.deadline)}</span></p>
							<p>Team members: <span className="font-semibold text-slate-900">{project.assignedEmployeesCount || 0}</span></p>
							<p>Task progress: <span className="font-semibold text-slate-900">{project.taskSummary?.completed || 0}/{project.taskSummary?.total || 0}</span></p>
						</div>

						<div className="mt-4 flex flex-wrap gap-2">
							<Link className="btn-primary" to={`/manager/projects/${project._id}`}>Open project</Link>
							<Link className="btn-secondary" to={`/manager/tasks?projectId=${project._id}`}>View tasks</Link>
						</div>
					</article>
				))}
			</div>
		</ModulePage>
	);
};

export default AssignedProjects;
