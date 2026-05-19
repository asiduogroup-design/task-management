import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PriorityBadge from '../../components/common/PriorityBadge.jsx';
import SearchFilterBar from '../../components/common/SearchFilterBar.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { projectService } from '../../services/projectService.js';
import { taskService } from '../../services/taskService.js';
import { todoService } from '../../services/todoService.js';
import ModulePage from '../shared/ModulePage.jsx';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');
const isSameDay = (left, right) => {
	if (!left || !right) return false;
	const a = new Date(left);
	const b = new Date(right);
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const categoryOptions = [
	{ key: 'all', label: 'All todos' },
	{ key: 'personal', label: 'Personal todos' },
	{ key: 'project', label: 'Project todos' },
	{ key: 'task', label: 'Task todos' },
	{ key: 'today', label: "Today's todos" },
	{ key: 'overdue', label: 'Overdue todos' },
	{ key: 'completed', label: 'Completed todos' }
];

const initialForm = {
	title: '',
	description: '',
	projectId: '',
	taskId: '',
	dueDate: '',
	priority: 'medium'
};

const TodoList = () => {
	const [todos, setTodos] = useState([]);
	const [projects, setProjects] = useState([]);
	const [tasks, setTasks] = useState([]);
	const [form, setForm] = useState(initialForm);
	const [search, setSearch] = useState('');
	const [activeCategory, setActiveCategory] = useState('all');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState('');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const loadData = async () => {
		setLoading(true);
		setError('');

		try {
			const [todosRes, projectsRes, tasksRes] = await Promise.all([todoService.list(), projectService.list(), taskService.list()]);
			setTodos(todosRes.data?.todos || []);
			setProjects(projectsRes.data?.projects || []);
			setTasks(tasksRes.data?.tasks || []);
		} catch (loadError) {
			setError(loadError.response?.data?.message || 'Unable to load todos.');
			setTodos([]);
			setProjects([]);
			setTasks([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadData();
	}, []);

	const projectOptions = useMemo(
		() => projects.map((project) => ({ value: project._id, label: project.name || project.projectCode || 'Project' })),
		[projects]
	);

	const taskOptions = useMemo(() => {
		const selectedProjectId = form.projectId;
		return tasks
			.filter((task) => !selectedProjectId || String(task.projectId?._id || task.projectId) === String(selectedProjectId))
			.map((task) => ({
				value: task._id,
				label: `${task.title}${task.projectId?.name ? ` (${task.projectId.name})` : ''}`,
				projectId: task.projectId?._id || task.projectId || ''
			}));
	}, [form.projectId, tasks]);

	const normalizedTodos = useMemo(() => {
		const now = new Date();
		const query = search.trim().toLowerCase();

		return todos
			.filter((todo) => {
				if (!query) return true;
				const projectName = todo.projectId?.name || todo.projectId?.projectCode || '';
				const taskName = todo.taskId?.title || '';
				return [todo.title, todo.description, projectName, taskName].some((field) => String(field || '').toLowerCase().includes(query));
			})
			.map((todo) => {
				const isOverdue = todo.dueDate && todo.status !== 'completed' && new Date(todo.dueDate) < now;
				const isToday = todo.dueDate ? isSameDay(todo.dueDate, now) : false;
				const category = todo.status === 'completed'
					? 'completed'
					: todo.taskId
						? 'task'
						: todo.projectId
							? 'project'
							: 'personal';

				return {
					...todo,
					category,
					isOverdue,
					isToday
				};
			});
	}, [search, todos]);

	const summary = useMemo(() => {
		const today = new Date();
		return {
			total: normalizedTodos.length,
			personal: normalizedTodos.filter((todo) => todo.category === 'personal').length,
			project: normalizedTodos.filter((todo) => todo.category === 'project').length,
			task: normalizedTodos.filter((todo) => todo.category === 'task').length,
			today: normalizedTodos.filter((todo) => todo.isToday && todo.status !== 'completed').length,
			overdue: normalizedTodos.filter((todo) => todo.isOverdue).length,
			completed: normalizedTodos.filter((todo) => todo.status === 'completed').length,
			pending: normalizedTodos.filter((todo) => todo.status === 'pending').length,
			in_progress: normalizedTodos.filter((todo) => todo.status === 'in_progress').length,
			completedToday: normalizedTodos.filter((todo) => todo.status === 'completed' && todo.completedAt && isSameDay(todo.completedAt, today)).length
		};
	}, [normalizedTodos]);

	const filteredTodos = useMemo(() => {
		return normalizedTodos.filter((todo) => {
			if (activeCategory === 'all') return true;
			if (activeCategory === 'today') return todo.isToday && todo.status !== 'completed';
			if (activeCategory === 'overdue') return todo.isOverdue;
			return todo.category === activeCategory;
		});
	}, [activeCategory, normalizedTodos]);

	const completedTodos = useMemo(() => normalizedTodos.filter((todo) => todo.status === 'completed'), [normalizedTodos]);

	const statusCounts = useMemo(
		() => ({
			pending: summary.pending,
			in_progress: summary.in_progress,
			completed: summary.completed
		}),
		[summary]
	);

	const onFormChange = (field, value) => setForm((current) => ({ ...current, [field]: value }));

	const handleProjectChange = (value) => {
		onFormChange('projectId', value);
		const matchedTask = tasks.find((task) => String(task._id) === String(form.taskId));
		if (matchedTask && String(matchedTask.projectId?._id || matchedTask.projectId || '') !== String(value)) {
			onFormChange('taskId', '');
		}
	};

	const handleTaskChange = (value) => {
		onFormChange('taskId', value);
		const matchedTask = tasks.find((task) => String(task._id) === String(value));
		if (matchedTask?.projectId?._id && !form.projectId) {
			onFormChange('projectId', matchedTask.projectId._id);
		}
	};

	const resetForm = () => setForm(initialForm);

	const createTodo = async (event) => {
		event.preventDefault();
		if (!form.title.trim()) return;

		setSaving('create');
		setError('');
		setSuccess('');

		try {
			await todoService.create({
				title: form.title.trim(),
				description: form.description.trim(),
				projectId: form.projectId || undefined,
				taskId: form.taskId || undefined,
				dueDate: form.dueDate || undefined,
				priority: form.priority,
				status: 'pending'
			});
			resetForm();
			setSuccess('Todo created successfully.');
			await loadData();
		} catch (createError) {
			setError(createError.response?.data?.message || 'Unable to create todo.');
		} finally {
			setSaving('');
		}
	};

	const updateStatus = async (todo, status) => {
		setSaving(`status-${todo._id}`);
		setError('');
		setSuccess('');

		try {
			await todoService.status(todo._id, status);
			await loadData();
		} catch (statusError) {
			setError(statusError.response?.data?.message || 'Unable to update todo status.');
		} finally {
			setSaving('');
		}
	};

	const toggleComplete = async (todo) => {
		await updateStatus(todo, todo.status === 'completed' ? 'pending' : 'completed');
	};

	const removeTodo = async (todo) => {
		const confirmed = window.confirm(`Delete todo ${todo.title}?`);
		if (!confirmed) return;

		setSaving(`delete-${todo._id}`);
		setError('');

		try {
			await todoService.remove(todo._id);
			await loadData();
		} catch (deleteError) {
			setError(deleteError.response?.data?.message || 'Unable to delete todo.');
		} finally {
			setSaving('');
		}
	};

	const todoCard = (todo) => (
		<article className={`employee-todo-item rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${todo.status === 'completed' ? 'employee-todo-item-completed' : ''}`} key={todo._id}>
			<div className="flex items-start gap-3">
				<input
					aria-label={`Mark ${todo.title} completed`}
					checked={todo.status === 'completed'}
					className="employee-todo-check mt-1"
					id={`todo-${todo._id}`}
					name={`todo-${todo._id}`}
					onChange={() => toggleComplete(todo)}
					type="checkbox"
				/>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<h3 className="employee-todo-item-title text-sm font-black text-slate-900">{todo.title}</h3>
							<p className="mt-1 text-xs text-slate-600">{todo.description || 'No description provided.'}</p>
						</div>
						<PriorityBadge priority={todo.priority} />
					</div>

					<div className="employee-todo-meta mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2 xl:grid-cols-4">
						<p>Due date: <span className="font-semibold text-slate-800">{formatDate(todo.dueDate)}</span></p>
						<p>Status: <StatusBadge status={todo.status} /></p>
						<p>Project: <span className="font-semibold text-slate-800">{todo.projectId?.name || todo.projectId?.projectCode || '-'}</span></p>
						<p>Task: <span className="font-semibold text-slate-800">{todo.taskId?.title || '-'}</span></p>
					</div>

					<div className="mt-3 flex flex-wrap gap-2">
						<button className="employee-todo-action employee-todo-action-muted text-xs font-bold text-slate-700" disabled={saving === `status-${todo._id}` || todo.status === 'pending'} onClick={() => updateStatus(todo, 'pending')} type="button">
							Pending
						</button>
						<button className="employee-todo-action employee-todo-action-blue text-xs font-bold text-blue-700" disabled={saving === `status-${todo._id}` || todo.status === 'in_progress'} onClick={() => updateStatus(todo, 'in_progress')} type="button">
							In progress
						</button>
						<button className="employee-todo-action employee-todo-action-green text-xs font-bold text-emerald-700" disabled={saving === `status-${todo._id}` || todo.status === 'completed'} onClick={() => updateStatus(todo, 'completed')} type="button">
							Completed
						</button>
						<button className="employee-todo-action employee-todo-action-danger text-xs font-bold text-red-700" disabled={saving === `delete-${todo._id}`} onClick={() => removeTodo(todo)} type="button">
							Delete
						</button>
					</div>
				</div>
			</div>
		</article>
	);

	return (
		<ModulePage title="Todo List">
			<div className="employee-todo-page space-y-5">
			<section className="employee-todo-kpis mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
				<StatCard label="Total todos" value={loading ? '...' : summary.total} />
				<StatCard label="Personal todos" value={loading ? '...' : summary.personal} />
				<StatCard label="Project todos" value={loading ? '...' : summary.project} />
				<StatCard label="Task todos" value={loading ? '...' : summary.task} />
				<StatCard label="Overdue todos" value={loading ? '...' : summary.overdue} />
			</section>

			<section className="employee-todo-hero rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">Personal and project planning</p>
						<h2 className="mt-1 text-2xl font-black text-ink">Manage your todos</h2>
						<p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
							Keep your personal items, project follow-ups, and task-specific reminders in one place. Use the checkbox to complete a todo quickly, or switch status as work progresses.
						</p>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
						<div className="employee-todo-mini-stat rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
							<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Pending</p>
							<p className="mt-1 text-2xl font-black text-ink">{statusCounts.pending}</p>
						</div>
						<div className="employee-todo-mini-stat rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
							<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">In progress</p>
							<p className="mt-1 text-2xl font-black text-ink">{statusCounts.in_progress}</p>
						</div>
						<div className="employee-todo-mini-stat rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
							<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Completed</p>
							<p className="mt-1 text-2xl font-black text-ink">{statusCounts.completed}</p>
						</div>
					</div>
				</div>

				{success ? <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</p> : null}
				{error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

				<form className="employee-todo-form mt-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5" onSubmit={createTodo}>
					<div className="flex items-center justify-between gap-3">
						<div>
							<h3 className="text-lg font-black text-slate-950">Add Todo</h3>
							<p className="text-sm text-slate-600">Create a personal, project, or task-linked todo.</p>
						</div>
						<button className="btn-secondary" type="button" onClick={resetForm}>Reset</button>
					</div>

					<div className="employee-todo-form-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<label className="block">
							<span className="mb-1 block text-sm font-bold text-slate-700">Todo title</span>
							<input className="form-field" id="todoTitle" name="title" onChange={(event) => onFormChange('title', event.target.value)} placeholder="Add todo title" required value={form.title} />
						</label>

						<label className="block md:col-span-2 xl:col-span-3">
							<span className="mb-1 block text-sm font-bold text-slate-700">Description</span>
							<textarea className="form-field min-h-24" id="todoDescription" name="description" onChange={(event) => onFormChange('description', event.target.value)} placeholder="Describe the todo" value={form.description} />
						</label>

						<label className="employee-todo-form-row-field block">
							<span className="mb-1 block text-sm font-bold text-slate-700">Related project</span>
							<select className="form-field" id="todoProjectId" name="projectId" onChange={(event) => handleProjectChange(event.target.value)} value={form.projectId}>
								<option value="">No related project</option>
								{projectOptions.map((project) => (
									<option key={project.value} value={project.value}>{project.label}</option>
								))}
							</select>
						</label>

						<label className="employee-todo-form-row-field block">
							<span className="mb-1 block text-sm font-bold text-slate-700">Related task</span>
							<select className="form-field" id="todoTaskId" name="taskId" onChange={(event) => handleTaskChange(event.target.value)} value={form.taskId}>
								<option value="">No related task</option>
								{taskOptions.map((task) => (
									<option key={task.value} value={task.value}>{task.label}</option>
								))}
							</select>
						</label>

						<label className="employee-todo-form-row-field block">
							<span className="mb-1 block text-sm font-bold text-slate-700">Due date</span>
							<input className="form-field" id="todoDueDate" name="dueDate" onChange={(event) => onFormChange('dueDate', event.target.value)} type="date" value={form.dueDate} />
						</label>

						<label className="employee-todo-form-row-field block">
							<span className="mb-1 block text-sm font-bold text-slate-700">Priority</span>
							<select className="form-field" id="todoPriority" name="priority" onChange={(event) => onFormChange('priority', event.target.value)} value={form.priority}>
								<option value="low">Low</option>
								<option value="medium">Medium</option>
								<option value="high">High</option>
								<option value="urgent">Urgent</option>
							</select>
						</label>
					</div>

					<div className="flex flex-wrap gap-3">
						<button className="btn-primary" disabled={saving === 'create'} type="submit">{saving === 'create' ? 'Saving...' : 'Add todo'}</button>
						<Link className="btn-secondary" to="/employee/projects">Browse projects</Link>
						<Link className="btn-secondary" to="/employee/tasks">Browse tasks</Link>
					</div>
				</form>
			</section>

			<div className="employee-todo-filterbar">
			<SearchFilterBar search={search} setSearch={setSearch} searchId="todoSearch" searchName="todoSearch">
				<div className="flex flex-wrap gap-2">
					{categoryOptions.map((option) => {
						const isActive = activeCategory === option.key;
						return (
							<button
								className={`employee-todo-filter-pill rounded-full border px-4 py-2 text-sm font-semibold transition ${isActive ? 'employee-todo-filter-pill-active border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-ink'}`}
								key={option.key}
								onClick={() => setActiveCategory(option.key)}
								type="button"
							>
								{option.label}
							</button>
						);
					})}
				</div>
			</SearchFilterBar>
			</div>

			<section className="grid gap-4 xl:grid-cols-2">
				<div className="employee-todo-list-panel rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
					<h3 className="text-lg font-black text-slate-950">Todo List</h3>
					<p className="mt-1 text-sm text-slate-600">Each todo includes a checkbox, due date, priority, and status controls.</p>

					<div className="mt-4 space-y-3">
						{loading ? (
							<p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Loading todos...</p>
						) : filteredTodos.length ? (
							filteredTodos.map(todoCard)
						) : (
							<p className="employee-todo-empty rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">No todos match the current category or search.</p>
						)}
					</div>
				</div>

				<div className="space-y-4">
					<section className="employee-todo-side-panel rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
						<h3 className="text-lg font-black text-slate-950">Todo Categories</h3>
						<div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
							{[
								['Personal todos', summary.personal],
								['Project todos', summary.project],
								['Task todos', summary.task],
								["Today's todos", summary.today],
								['Overdue todos', summary.overdue],
								['Completed todos', summary.completed]
							].map(([label, value]) => (
								<button className="employee-todo-category-card rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left" key={label} type="button" onClick={() => setActiveCategory(label.toLowerCase().includes('today') ? 'today' : label.toLowerCase().includes('overdue') ? 'overdue' : label.toLowerCase().includes('personal') ? 'personal' : label.toLowerCase().includes('project') ? 'project' : label.toLowerCase().includes('task') ? 'task' : label.toLowerCase().includes('completed') ? 'completed' : 'all')}>
									<p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
									<p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
								</button>
							))}
						</div>
					</section>

					<section className="employee-todo-side-panel rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
						<h3 className="text-lg font-black text-slate-950">Completed Todo Section</h3>
						<div className="mt-4 space-y-3">
							{completedTodos.length ? (
								completedTodos.map((todo) => (
									<article className="employee-todo-completed-card rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4" key={todo._id}>
										<div className="flex flex-wrap items-start justify-between gap-3">
											<div>
												<p className="text-sm font-black text-slate-950">{todo.title}</p>
												<p className="mt-1 text-xs text-slate-600">Completion date: <span className="font-semibold text-slate-800">{formatDate(todo.completedAt)}</span></p>
												<p className="mt-1 text-xs text-slate-600">Related project/task: <span className="font-semibold text-slate-800">{todo.projectId?.name || todo.projectId?.projectCode || '-'} / {todo.taskId?.title || '-'}</span></p>
											</div>
											<StatusBadge status={todo.status} />
										</div>
									</article>
								))
							) : (
								<p className="employee-todo-empty rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No completed todos yet.</p>
							)}
						</div>
					</section>
				</div>
			</section>
			</div>
		</ModulePage>
	);
};

export default TodoList;
