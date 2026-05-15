import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/common/Modal.jsx';
import CelebrationOverlay from '../../components/common/CelebrationOverlay.jsx';
import PriorityBadge from '../../components/common/PriorityBadge.jsx';
import SearchFilterBar from '../../components/common/SearchFilterBar.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { taskService } from '../../services/taskService.js';
import ModulePage from '../shared/ModulePage.jsx';

const statusColumns = [
	{ key: 'to_do', label: 'To Do' },
	{ key: 'in_progress', label: 'In Progress' },
	{ key: 'under_review', label: 'Review' },
	{ key: 'completed', label: 'Completed' }
];

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : 'No deadline');

const projectOptionsFromTasks = (tasks) => {
	const options = new Map();

	tasks.forEach((task) => {
		if (task.projectId?._id) {
			options.set(task.projectId._id, task.projectId.name || task.projectId.projectCode || 'Project');
		}
	});

	return Array.from(options.entries()).map(([value, label]) => ({ value, label }));
};

const defaultSummary = {
	totalTasks: 0,
	notStartedTasks: 0,
	inProgressTasks: 0,
	completedTasks: 0,
	overdueTasks: 0
};

const fallbackSummaryFromTasks = (tasks) => ({
	totalTasks: tasks.length,
	notStartedTasks: tasks.filter((task) => task.status === 'to_do').length,
	inProgressTasks: tasks.filter((task) => task.status === 'in_progress').length,
	completedTasks: tasks.filter((task) => task.status === 'completed').length,
	overdueTasks: tasks.filter((task) => task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < new Date()).length
});

const TaskCard = ({ task, actionBusy, onStatusChange, onAddComment }) => {
	const isBusy = actionBusy === task._id;

	return (
		<article className="employee-task-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h3 className="text-sm font-black text-slate-900">{task.title}</h3>
					<p className="mt-1 text-xs font-semibold text-slate-600">{task.projectId?.name || task.projectId?.projectCode || 'No project'}</p>
				</div>
				<PriorityBadge priority={task.priority} />
			</div>

			<div className="mt-3 space-y-1 text-xs text-slate-600">
				<p>Due date: <span className="font-semibold text-slate-800">{formatDate(task.dueDate)}</span></p>
				<p>Status: <StatusBadge status={task.status} /></p>
				<p>Assigned by: <span className="font-semibold text-slate-800">{task.assignedBy?.name || task.assignedBy?.email || '-'}</span></p>
			</div>

			<div className="mt-4 flex flex-wrap gap-2">
				<Link className="employee-link text-xs font-bold text-blue-700" to={`/employee/tasks/${task._id}`}>View task</Link>

				{['to_do', 'reopened'].includes(task.status) ? (
					<button className="employee-link text-xs font-bold text-cyan-700" disabled={isBusy} onClick={() => onStatusChange(task._id, 'in_progress')} type="button">
						Start task
					</button>
				) : null}

				{task.status === 'in_progress' ? (
					<button className="employee-link text-xs font-bold text-violet-700" disabled={isBusy} onClick={() => onStatusChange(task._id, 'under_review')} type="button">
						Submit for review
					</button>
				) : null}

				{task.status === 'under_review' ? (
					<button className="employee-link text-xs font-bold text-emerald-700" disabled={isBusy} onClick={() => onStatusChange(task._id, 'completed')} type="button">
						Mark completed
					</button>
				) : null}

				<button className="employee-link text-xs font-bold text-slate-700" disabled={isBusy} onClick={() => onAddComment(task)} type="button">
					Add comment
				</button>
			</div>
		</article>
	);
};

const MyTasks = () => {
	const [tasks, setTasks] = useState([]);
	const [summary, setSummary] = useState(defaultSummary);
	const [search, setSearch] = useState('');
	const [filters, setFilters] = useState({
		projectId: '',
		priority: '',
		deadlineFilter: '',
		status: ''
	});
	const [loading, setLoading] = useState(false);
	const [summaryLoading, setSummaryLoading] = useState(false);
	const [error, setError] = useState('');
	const [actionBusy, setActionBusy] = useState('');
	const [commentModal, setCommentModal] = useState({ open: false, task: null, text: '' });
	const [celebration, setCelebration] = useState({ active: false, title: '', message: '', variant: 'task' });

	const projectOptions = useMemo(() => projectOptionsFromTasks(tasks), [tasks]);

	const tasksByColumn = useMemo(() => {
		const grouped = {
			to_do: [],
			in_progress: [],
			under_review: [],
			completed: []
		};

		tasks.forEach((task) => {
			if (grouped[task.status]) {
				grouped[task.status].push(task);
			}
		});

		return grouped;
	}, [tasks]);

	const loadTasks = async () => {
		setLoading(true);
		setError('');

		try {
			const { data } = await taskService.list({
				search: search || undefined,
				projectId: filters.projectId || undefined,
				priority: filters.priority || undefined,
				deadlineFilter: filters.deadlineFilter || undefined,
				status: filters.status || undefined
			});
			const list = data.tasks || [];
			setTasks(list);
			if (!summaryLoading) {
				setSummary((current) => (current.totalTasks ? current : fallbackSummaryFromTasks(list)));
			}
		} catch (err) {
			setTasks([]);
			setSummary(defaultSummary);
			setError(err.response?.data?.message || 'Unable to load your tasks.');
		} finally {
			setLoading(false);
		}
	};

	const loadSummary = async () => {
		setSummaryLoading(true);

		try {
			const { data } = await taskService.summary();
			setSummary(data.summary || defaultSummary);
		} catch {
			setSummary((current) => (current.totalTasks ? current : fallbackSummaryFromTasks(tasks)));
		} finally {
			setSummaryLoading(false);
		}
	};

	useEffect(() => {
		loadTasks();
	}, [search, filters.projectId, filters.priority, filters.deadlineFilter, filters.status]);

	useEffect(() => {
		loadSummary();
	}, []);

	const handleStatusChange = async (taskId, status) => {
		setActionBusy(taskId);
		setError('');
		const taskTitle = tasks.find((task) => task._id === taskId)?.title || 'Task';

		try {
			await taskService.status(taskId, status);
			if (status === 'completed') {
				setCelebration({
					active: true,
					title: 'Boom! Task Completed',
					message: `${taskTitle} is done. Great momentum, keep it going!`,
					variant: 'task'
				});
			}
			await Promise.all([loadTasks(), loadSummary()]);
		} catch (err) {
			setError(err.response?.data?.message || 'Unable to update task status.');
		} finally {
			setActionBusy('');
		}
	};

	const openCommentModal = (task) => {
		setCommentModal({ open: true, task, text: '' });
	};

	const closeCommentModal = () => {
		setCommentModal({ open: false, task: null, text: '' });
	};

	const submitComment = async (event) => {
		event.preventDefault();
		const text = commentModal.text.trim();
		if (!commentModal.task?._id || !text) return;

		setActionBusy(commentModal.task._id);
		setError('');

		try {
			await taskService.comment(commentModal.task._id, text);
			closeCommentModal();
		} catch (err) {
			setError(err.response?.data?.message || 'Unable to add comment.');
		} finally {
			setActionBusy('');
		}
	};

	return (
		<ModulePage title="My Tasks">
			<CelebrationOverlay
				active={celebration.active}
				message={celebration.message}
				onDone={() => setCelebration((current) => ({ ...current, active: false }))}
				title={celebration.title}
				variant={celebration.variant}
			/>

			<section className="employee-tasks-kpi mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
				<StatCard label="Total assigned tasks" value={summaryLoading ? '...' : summary.totalTasks || 0} />
				<StatCard label="To Do tasks" value={summaryLoading ? '...' : summary.notStartedTasks || 0} />
				<StatCard label="In Progress tasks" value={summaryLoading ? '...' : summary.inProgressTasks || 0} />
				<StatCard label="Completed tasks" value={summaryLoading ? '...' : summary.completedTasks || 0} />
				<StatCard label="Overdue tasks" value={summaryLoading ? '...' : summary.overdueTasks || 0} />
			</section>

			<SearchFilterBar search={search} setSearch={setSearch}>
					<select className="form-field md:max-w-xs" id="myTasksProjectId" name="projectId" onChange={(event) => setFilters((current) => ({ ...current, projectId: event.target.value }))} value={filters.projectId}>
					<option value="">All projects</option>
					{projectOptions.map((project) => (
						<option key={project.value} value={project.value}>{project.label}</option>
					))}
				</select>

					<select className="form-field md:max-w-xs" id="myTasksPriority" name="priority" onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))} value={filters.priority}>
					<option value="">All priorities</option>
					<option value="low">Low</option>
					<option value="medium">Medium</option>
					<option value="high">High</option>
					<option value="urgent">Urgent</option>
				</select>

				<select className="form-field md:max-w-xs" id="myTasksDeadlineFilter" name="deadlineFilter" onChange={(event) => setFilters((current) => ({ ...current, deadlineFilter: event.target.value }))} value={filters.deadlineFilter}>
					<option value="">All deadlines</option>
					<option value="today">Due today</option>
					<option value="this_week">Due this week</option>
					<option value="overdue">Overdue deadline</option>
					<option value="no_due_date">No due date</option>
				</select>

				<select className="form-field md:max-w-xs" id="myTasksStatus" name="status" onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} value={filters.status}>
					<option value="">All statuses</option>
					<option value="to_do">To Do</option>
					<option value="in_progress">In Progress</option>
					<option value="under_review">Review</option>
					<option value="completed">Completed</option>
				</select>
			</SearchFilterBar>

			{error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

			{loading ? (
				<section className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading tasks...</section>
			) : (
				<section className="grid gap-4 xl:grid-cols-4">
					{statusColumns.map((column) => (
						<div className="employee-task-column rounded-2xl border border-slate-200 bg-slate-50/50 p-3" key={column.key}>
							<div className="mb-3 flex items-center justify-between">
								<h2 className="text-sm font-black uppercase tracking-wide text-slate-800">{column.label}</h2>
								<span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-600">{tasksByColumn[column.key].length}</span>
							</div>

							<div className="space-y-3">
								{tasksByColumn[column.key].length ? (
									tasksByColumn[column.key].map((task) => (
										<TaskCard
											actionBusy={actionBusy}
											key={task._id}
											onAddComment={openCommentModal}
											onStatusChange={handleStatusChange}
											task={task}
										/>
									))
								) : (
									<p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-500">No tasks in this column.</p>
								)}
							</div>
						</div>
					))}
				</section>
			)}

			{commentModal.open && commentModal.task ? (
				<Modal onClose={closeCommentModal} title={`Add comment: ${commentModal.task.title}`}>
					<form className="space-y-3" onSubmit={submitComment}>
						<textarea
							className="form-field min-h-24"
							id="myTasksComment"
							name="comment"
							onChange={(event) => setCommentModal((current) => ({ ...current, text: event.target.value }))}
							placeholder="Share an update or note"
							value={commentModal.text}
						/>
						<div className="flex gap-2">
							<button className="btn-primary" disabled={actionBusy === commentModal.task._id || !commentModal.text.trim()} type="submit">
								{actionBusy === commentModal.task._id ? 'Saving...' : 'Add comment'}
							</button>
							<button className="btn-secondary" onClick={closeCommentModal} type="button">Cancel</button>
						</div>
					</form>
				</Modal>
			) : null}
		</ModulePage>
	);
};

export default MyTasks;
