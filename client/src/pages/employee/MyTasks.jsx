import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/common/Modal.jsx';
import CelebrationOverlay from '../../components/common/CelebrationOverlay.jsx';
import PriorityBadge from '../../components/common/PriorityBadge.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { taskService } from '../../services/taskService.js';
import ModulePage from '../shared/ModulePage.jsx';

const statusColumns = [
	{ key: 'to_do', label: 'To Do' },
	{ key: 'in_progress', label: 'In Progress' },
	{ key: 'under_review', label: 'Review' },
	{ key: 'overdue', label: 'Overdue' },
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
		const now = new Date();
		const grouped = {
			to_do: [],
			in_progress: [],
			under_review: [],
			overdue: [],
			completed: []
		};

		tasks.forEach((task) => {
			const isOverdue = task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < now;
			if (isOverdue) {
				grouped.overdue.push(task);
			} else if (grouped[task.status]) {
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

	const columnStyles = {
		to_do:       { accent: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', label: '#b45309', badge: '#fef3c7' },
		in_progress: { accent: '#3b82f6', bg: '#eff6ff', border: '#93c5fd', label: '#1d4ed8', badge: '#dbeafe' },
		under_review:{ accent: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd', label: '#6d28d9', badge: '#ede9fe' },
		overdue:     { accent: '#f43f5e', bg: '#fff1f2', border: '#fda4af', label: '#be123c', badge: '#ffe4e6' },
		completed:   { accent: '#10b981', bg: '#f0fdf4', border: '#6ee7b7', label: '#065f46', badge: '#d1fae5' },
	};

	const kpiCards = [
		{ label: 'Total assigned tasks', value: summary.totalTasks || 0,    bg: '#f0f9ff', border: '#38bdf8', text: '#0369a1', accent: '#0ea5e9' },
		{ label: 'To Do tasks',          value: summary.notStartedTasks || 0, bg: '#fffbeb', border: '#fbbf24', text: '#b45309', accent: '#f59e0b' },
		{ label: 'In Progress tasks',    value: summary.inProgressTasks || 0, bg: '#eff6ff', border: '#60a5fa', text: '#1d4ed8', accent: '#3b82f6' },
		{ label: 'Completed tasks',      value: summary.completedTasks || 0,  bg: '#f0fdf4', border: '#34d399', text: '#065f46', accent: '#10b981' },
		{ label: 'Overdue tasks',        value: summary.overdueTasks || 0,    bg: '#fff1f2', border: '#fb7185', text: '#be123c', accent: '#f43f5e' },
	];

	return (
		<ModulePage title="My Tasks">
			<CelebrationOverlay
				active={celebration.active}
				message={celebration.message}
				onDone={() => setCelebration((current) => ({ ...current, active: false }))}
				title={celebration.title}
				variant={celebration.variant}
			/>

			{/* Subtitle: X tasks across Y projects */}
			<p className="mb-5 text-sm font-semibold" style={{ color: '#0ea5e9' }}>
				{summaryLoading ? '...' : `${summary.totalTasks || 0} task${(summary.totalTasks || 0) !== 1 ? 's' : ''} across ${projectOptions.length} project${projectOptions.length !== 1 ? 's' : ''}`}
			</p>

			{/* KPI Cards */}
			<section className="employee-tasks-kpi mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
				{kpiCards.map((card) => (
					<article
						key={card.label}
						className="rounded-2xl border p-5 shadow-sm"
						style={{ backgroundColor: card.bg, borderColor: card.border }}
					>
						<p className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: card.text }}>{card.label}</p>
						<p className="text-3xl font-extrabold" style={{ color: card.accent }}>{summaryLoading ? '...' : card.value}</p>
					</article>
				))}
			</section>

			{/* Filter Section */}
			<section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<div className="mb-4 flex items-center gap-2">
					<span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
					<p className="text-xs font-bold uppercase tracking-widest text-slate-500">Filter Tasks</p>
				</div>
				<div className="flex flex-wrap gap-4">
					{/* Search */}
					<div className="flex min-w-[180px] flex-1 flex-col gap-1">
						<label className="text-[11px] font-bold uppercase tracking-widest text-slate-400" htmlFor="myTasksSearch">Search</label>
						<input
							className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
							id="myTasksSearch"
							name="search"
							placeholder="Search tasks..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					{/* Project */}
					<div className="flex min-w-[160px] flex-col gap-1">
						<label className="text-[11px] font-bold uppercase tracking-widest text-slate-400" htmlFor="myTasksProjectId">Project</label>
						<select
							className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
							id="myTasksProjectId"
							name="projectId"
							value={filters.projectId}
							onChange={(e) => setFilters((c) => ({ ...c, projectId: e.target.value }))}
						>
							<option value="">All projects</option>
							{projectOptions.map((p) => (
								<option key={p.value} value={p.value}>{p.label}</option>
							))}
						</select>
					</div>
					{/* Priority */}
					<div className="flex min-w-[140px] flex-col gap-1">
						<label className="text-[11px] font-bold uppercase tracking-widest text-slate-400" htmlFor="myTasksPriority">Priority</label>
						<select
							className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
							id="myTasksPriority"
							name="priority"
							value={filters.priority}
							onChange={(e) => setFilters((c) => ({ ...c, priority: e.target.value }))}
						>
							<option value="">All priorities</option>
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
							<option value="urgent">Urgent</option>
						</select>
					</div>
					{/* Deadline */}
					<div className="flex min-w-[160px] flex-col gap-1">
						<label className="text-[11px] font-bold uppercase tracking-widest text-slate-400" htmlFor="myTasksDeadlineFilter">Deadline</label>
						<select
							className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
							id="myTasksDeadlineFilter"
							name="deadlineFilter"
							value={filters.deadlineFilter}
							onChange={(e) => setFilters((c) => ({ ...c, deadlineFilter: e.target.value }))}
						>
							<option value="">All deadlines</option>
							<option value="today">Due today</option>
							<option value="this_week">Due this week</option>
							<option value="overdue">Overdue deadline</option>
							<option value="no_due_date">No due date</option>
						</select>
					</div>
					{/* Status */}
					<div className="flex min-w-[140px] flex-col gap-1">
						<label className="text-[11px] font-bold uppercase tracking-widest text-slate-400" htmlFor="myTasksStatus">Status</label>
						<select
							className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
							id="myTasksStatus"
							name="status"
							value={filters.status}
							onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}
						>
							<option value="">All statuses</option>
							<option value="to_do">To Do</option>
							<option value="in_progress">In Progress</option>
							<option value="under_review">Review</option>
							<option value="completed">Completed</option>
						</select>
					</div>
				</div>
			</section>

			{error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

			{loading ? (
				<section className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading tasks...</section>
			) : (
				<section className="grid gap-4 xl:grid-cols-5">
					{statusColumns.map((column) => {
						const cs = columnStyles[column.key];
						return (
						<div
							className="employee-task-column overflow-hidden rounded-2xl border shadow-sm"
							key={column.key}
							style={{ backgroundColor: cs.bg, borderColor: cs.border }}
						>
							{/* Column header accent bar */}
							<div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `2px solid ${cs.border}` }}>
								<h2 className="text-sm font-black uppercase tracking-wide" style={{ color: cs.label }}>{column.label}</h2>
								<span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ backgroundColor: cs.badge, color: cs.label }}>{tasksByColumn[column.key].length}</span>
							</div>

							<div className="space-y-3 p-3">
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
									<p className="rounded-xl border border-dashed p-4 text-xs" style={{ borderColor: cs.border, color: cs.label, backgroundColor: 'white' }}>No tasks in this column.</p>
								)}
							</div>
						</div>
						);
					})}
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
