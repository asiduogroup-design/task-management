import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PriorityBadge from '../../components/common/PriorityBadge.jsx';
import SearchFilterBar from '../../components/common/SearchFilterBar.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { taskService } from '../../services/taskService.js';
import ModulePage from '../shared/ModulePage.jsx';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : 'No due date');

const ProjectTasks = () => {
	const [searchParams] = useSearchParams();
	const [tasks, setTasks] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [actionBusy, setActionBusy] = useState('');
	const [search, setSearch] = useState('');
	const [filters, setFilters] = useState({
		projectId: searchParams.get('projectId') || '',
		status: '',
		priority: ''
	});

	const loadTasks = async () => {
		setLoading(true);
		setError('');

		try {
			const { data } = await taskService.list({
				search: search || undefined,
				projectId: filters.projectId || undefined,
				status: filters.status || undefined,
				priority: filters.priority || undefined
			});
			setTasks(data.tasks || []);
		} catch (loadError) {
			setError(loadError.response?.data?.message || 'Unable to load project tasks.');
			setTasks([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadTasks();
	}, [search, filters.projectId, filters.status, filters.priority]);

	const projectOptions = useMemo(() => {
		const map = new Map();
		tasks.forEach((task) => {
			if (task.projectId?._id) {
				map.set(task.projectId._id, task.projectId.name || task.projectId.projectCode || 'Project');
			}
		});
		return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
	}, [tasks]);

	const summary = useMemo(
		() => ({
			total: tasks.length,
			todo: tasks.filter((task) => ['to_do', 'reopened'].includes(task.status)).length,
			inProgress: tasks.filter((task) => task.status === 'in_progress').length,
			underReview: tasks.filter((task) => task.status === 'under_review').length,
			completed: tasks.filter((task) => task.status === 'completed').length
		}),
		[tasks]
	);

	const handleStatusChange = async (taskId, status) => {
		setActionBusy(taskId);
		setError('');

		try {
			await taskService.status(taskId, status);
			await loadTasks();
		} catch (actionError) {
			setError(actionError.response?.data?.message || 'Unable to update task status.');
		} finally {
			setActionBusy('');
		}
	};

	return (
		<ModulePage
			title="Project Tasks"
			actions={<Link className="btn-primary" to="/manager/tasks/add">Create task</Link>}
		>
			<section className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Total</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary.total}</p></article>
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">To do</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary.todo}</p></article>
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">In progress</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary.inProgress}</p></article>
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Under review</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary.underReview}</p></article>
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Completed</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary.completed}</p></article>
			</section>

			<SearchFilterBar search={search} setSearch={setSearch}>
				<select className="form-field md:max-w-xs" id="managerTaskProject" name="managerTaskProject" onChange={(event) => setFilters((current) => ({ ...current, projectId: event.target.value }))} value={filters.projectId}>
					<option value="">All projects</option>
					{projectOptions.map((project) => (
						<option key={project.value} value={project.value}>{project.label}</option>
					))}
				</select>

				<select className="form-field md:max-w-xs" id="managerTaskStatus" name="managerTaskStatus" onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} value={filters.status}>
					<option value="">All statuses</option>
					<option value="to_do">To do</option>
					<option value="in_progress">In progress</option>
					<option value="under_review">Under review</option>
					<option value="completed">Completed</option>
				</select>

				<select className="form-field md:max-w-xs" id="managerTaskPriority" name="managerTaskPriority" onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))} value={filters.priority}>
					<option value="">All priorities</option>
					<option value="low">Low</option>
					<option value="medium">Medium</option>
					<option value="high">High</option>
					<option value="urgent">Urgent</option>
				</select>
			</SearchFilterBar>

			{error ? <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}

			{loading ? <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">Loading tasks...</p> : null}
			{!loading && !tasks.length ? <p className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">No tasks found for the selected filters.</p> : null}

			<section className="space-y-3">
				{tasks.map((task) => (
					<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" key={task._id}>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{task.taskCode || 'Task'}</p>
								<h3 className="text-lg font-black text-slate-900">{task.title}</h3>
								<p className="mt-1 text-sm text-slate-600">{task.projectId?.name || task.projectId?.projectCode || '-'}</p>
							</div>
							<div className="flex items-center gap-2">
								<PriorityBadge priority={task.priority} />
								<StatusBadge status={task.status} />
							</div>
						</div>

						<div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
							<p>Assignee: <span className="font-semibold text-slate-900">{task.assignedTo?.userId?.name || task.assignedTo?.employeeCode || '-'}</span></p>
							<p>Due date: <span className="font-semibold text-slate-900">{formatDate(task.dueDate)}</span></p>
						</div>

						<div className="mt-4 flex flex-wrap gap-2">
							<Link className="btn-secondary" to={`/admin/tasks/${task._id}`}>View details</Link>
							{task.status !== 'completed' ? (
								<button className="btn-secondary" disabled={actionBusy === task._id} onClick={() => handleStatusChange(task._id, 'under_review')} type="button">
									{actionBusy === task._id ? 'Saving...' : 'Move to review'}
								</button>
							) : null}
							{task.status === 'under_review' ? (
								<button className="btn-primary" disabled={actionBusy === task._id} onClick={() => handleStatusChange(task._id, 'completed')} type="button">
									{actionBusy === task._id ? 'Saving...' : 'Approve complete'}
								</button>
							) : null}
						</div>
					</article>
				))}
			</section>
		</ModulePage>
	);
};

export default ProjectTasks;
