import { useEffect, useMemo, useState } from 'react';
import SearchFilterBar from '../../components/common/SearchFilterBar.jsx';
import { taskService } from '../../services/taskService.js';
import ModulePage from '../shared/ModulePage.jsx';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');

const ReviewTasks = () => {
	const [tasks, setTasks] = useState([]);
	const [projectFilters, setProjectFilters] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [actionBusy, setActionBusy] = useState('');
	const [search, setSearch] = useState('');
	const [filters, setFilters] = useState({
		projectId: '',
		approvalStatus: 'pending'
	});

	const loadReviewTasks = async () => {
		setLoading(true);
		setError('');

		try {
			const { data } = await taskService.completedHistory({
				search: search || undefined,
				projectId: filters.projectId || undefined,
				approvalStatus: filters.approvalStatus || undefined
			});

			setTasks(data.tasks || []);
			setProjectFilters(data.filters?.projects || []);
		} catch (loadError) {
			setError(loadError.response?.data?.message || 'Unable to load review queue.');
			setTasks([]);
			setProjectFilters([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadReviewTasks();
	}, [search, filters.projectId, filters.approvalStatus]);

	const summary = useMemo(
		() => ({
			total: tasks.length,
			pending: tasks.filter((task) => task.approvalStatus === 'pending').length,
			approved: tasks.filter((task) => task.approvalStatus === 'approved').length,
			reopened: tasks.filter((task) => task.status === 'reopened').length
		}),
		[tasks]
	);

	const approveTask = async (taskId) => {
		setActionBusy(taskId);
		setError('');

		try {
			await taskService.markCompleted(taskId);
			await loadReviewTasks();
		} catch (actionError) {
			setError(actionError.response?.data?.message || 'Unable to approve task.');
		} finally {
			setActionBusy('');
		}
	};

	const reopenTask = async (taskId) => {
		setActionBusy(taskId);
		setError('');

		try {
			await taskService.reopen(taskId);
			await loadReviewTasks();
		} catch (actionError) {
			setError(actionError.response?.data?.message || 'Unable to reopen task.');
		} finally {
			setActionBusy('');
		}
	};

	return (
		<ModulePage title="Review Tasks">
			<section className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Total in queue</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary.total}</p></article>
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Pending approval</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary.pending}</p></article>
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Approved</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary.approved}</p></article>
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Reopened</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary.reopened}</p></article>
			</section>

			<SearchFilterBar search={search} setSearch={setSearch}>
				<select className="form-field md:max-w-xs" id="managerReviewProject" name="managerReviewProject" onChange={(event) => setFilters((current) => ({ ...current, projectId: event.target.value }))} value={filters.projectId}>
					<option value="">All projects</option>
					{projectFilters.map((project) => (
						<option key={project.value} value={project.value}>{project.label}</option>
					))}
				</select>

				<select className="form-field md:max-w-xs" id="managerReviewStatus" name="managerReviewStatus" onChange={(event) => setFilters((current) => ({ ...current, approvalStatus: event.target.value }))} value={filters.approvalStatus}>
					<option value="pending">Pending approval</option>
					<option value="approved">Approved</option>
					<option value="">All approval states</option>
				</select>
			</SearchFilterBar>

			{error ? <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
			{loading ? <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">Loading review queue...</p> : null}
			{!loading && !tasks.length ? <p className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">No tasks found for review.</p> : null}

			<section className="space-y-3">
				{tasks.map((task) => (
					<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" key={task._id}>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{task.taskCode || 'Task'}</p>
								<h3 className="text-lg font-black text-slate-900">{task.title}</h3>
								<p className="text-sm text-slate-600">{task.projectName || '-'}</p>
							</div>
							<div className="text-right text-xs text-slate-600">
								<p className="font-semibold uppercase tracking-wide">{(task.approvalStatus || 'pending').replaceAll('_', ' ')}</p>
								<p>Status: {(task.status || 'under_review').replaceAll('_', ' ')}</p>
							</div>
						</div>

						<div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
							<p>Completed date: <span className="font-semibold text-slate-900">{formatDate(task.completedDate)}</span></p>
							<p>Total logged time: <span className="font-semibold text-slate-900">{Number(task.timeSpent || 0).toFixed(2)} h</span></p>
						</div>

						{task.details?.completionNotes ? <p className="mt-3 text-sm text-slate-700">{task.details.completionNotes}</p> : null}

						<div className="mt-4 flex flex-wrap gap-2">
							{task.approvalStatus !== 'approved' ? (
								<button className="btn-primary" disabled={actionBusy === task._id} onClick={() => approveTask(task._id)} type="button">
									{actionBusy === task._id ? 'Saving...' : 'Approve completion'}
								</button>
							) : null}

							{task.status !== 'reopened' ? (
								<button className="btn-secondary" disabled={actionBusy === task._id} onClick={() => reopenTask(task._id)} type="button">
									{actionBusy === task._id ? 'Saving...' : 'Reopen task'}
								</button>
							) : null}
						</div>
					</article>
				))}
			</section>
		</ModulePage>
	);
};

export default ReviewTasks;
