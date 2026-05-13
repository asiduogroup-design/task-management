import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DataTable from '../../components/common/DataTable.jsx';
import Modal from '../../components/common/Modal.jsx';
import SearchFilterBar from '../../components/common/SearchFilterBar.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { employeeService } from '../../services/employeeService.js';
import { projectService } from '../../services/projectService.js';
import { taskService } from '../../services/taskService.js';
import ModulePage from '../shared/ModulePage.jsx';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');

const TaskManagement = () => {
	const [searchParams] = useSearchParams();
	const [tasks, setTasks] = useState([]);
	const [summary, setSummary] = useState({
		totalTasks: 0,
		notStartedTasks: 0,
		inProgressTasks: 0,
		underReviewTasks: 0,
		completedTasks: 0,
		overdueTasks: 0
	});
	const [projects, setProjects] = useState([]);
	const [employees, setEmployees] = useState([]);
	const [search, setSearch] = useState('');
	const [filters, setFilters] = useState({
		employeeId: searchParams.get('employeeId') || '',
		projectId: '',
		priority: '',
		status: '',
		deadlineFilter: ''
	});
	const [loading, setLoading] = useState(false);
	const [summaryLoading, setSummaryLoading] = useState(false);
	const [error, setError] = useState('');
	const [actionModal, setActionModal] = useState({
		type: '',
		task: null
	});
	const [actionValue, setActionValue] = useState('');
	const [actionSaving, setActionSaving] = useState(false);

	const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

	const loadSummary = async () => {
		setSummaryLoading(true);
		try {
			const { data } = await taskService.summary();
			setSummary(data.summary || {});
		} catch {
			setSummary({
				totalTasks: 0,
				notStartedTasks: 0,
				inProgressTasks: 0,
				underReviewTasks: 0,
				completedTasks: 0,
				overdueTasks: 0
			});
		} finally {
			setSummaryLoading(false);
		}
	};

	const loadTasks = async () => {
		setLoading(true);
		setError('');
		try {
			const { data } = await taskService.list({
				search: search || undefined,
				employeeId: filters.employeeId || undefined,
				projectId: filters.projectId || undefined,
				priority: filters.priority || undefined,
				status: filters.status || undefined,
				deadlineFilter: filters.deadlineFilter || undefined
			});
			setTasks(data.tasks || []);
		} catch (err) {
			setTasks([]);
			setError('Unable to load tasks.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadTasks();
	}, [search, filters.employeeId, filters.projectId, filters.priority, filters.status, filters.deadlineFilter]);

	useEffect(() => {
		loadSummary();
	}, []);

	useEffect(() => {
		Promise.all([projectService.list(), employeeService.list()])
			.then(([projectRes, employeeRes]) => {
				setProjects(projectRes.data.projects || []);
				setEmployees(employeeRes.data.employees || []);
			})
			.catch(() => {
				setProjects([]);
				setEmployees([]);
			});
	}, []);

	const handleDelete = async (task) => {
		const confirmed = window.confirm(`Delete task ${task.taskCode}?`);
		if (!confirmed) return;
		try {
			await taskService.remove(task._id);
			await loadTasks();
		} catch (err) {
			setError(err.response?.data?.message || 'Unable to delete task.');
		}
	};

	const openActionModal = (type, task) => {
		setActionValue('');
		setActionModal({ type, task });
	};

	const closeActionModal = () => {
		setActionValue('');
		setActionModal({ type: '', task: null });
	};

	const handleMarkCompleted = async (task) => {
		const confirmed = window.confirm(`Mark task ${task.taskCode} as completed?`);
		if (!confirmed) return;
		try {
			await taskService.markCompleted(task._id);
			await Promise.all([loadTasks(), loadSummary()]);
		} catch (err) {
			setError(err.response?.data?.message || 'Unable to mark task as completed.');
		}
	};

	const submitActionModal = async (event) => {
		event.preventDefault();
		if (!actionModal.task) return;
		setActionSaving(true);
		setError('');

		try {
			if (actionModal.type === 'reassign') {
				if (!actionValue) {
					setError('Please select an employee for reassignment.');
					setActionSaving(false);
					return;
				}
				await taskService.reassign(actionModal.task._id, actionValue);
			}

			if (actionModal.type === 'deadline') {
				if (!actionValue) {
					setError('Please choose a due date.');
					setActionSaving(false);
					return;
				}
				await taskService.changeDeadline(actionModal.task._id, actionValue);
			}

			await Promise.all([loadTasks(), loadSummary()]);
			closeActionModal();
		} catch (err) {
			setError(err.response?.data?.message || 'Unable to apply action.');
		} finally {
			setActionSaving(false);
		}
	};

	return (
		<ModulePage title="Task Management" actions={<Link className="btn-primary" to="/admin/tasks/add">Add task</Link>}>
			<div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<StatCard label="Total tasks" value={summaryLoading ? '...' : summary.totalTasks || 0} />
				<StatCard label="Tasks not started" value={summaryLoading ? '...' : summary.notStartedTasks || 0} />
				<StatCard label="Tasks in progress" value={summaryLoading ? '...' : summary.inProgressTasks || 0} />
				<StatCard label="Tasks under review" value={summaryLoading ? '...' : summary.underReviewTasks || 0} />
				<StatCard label="Completed tasks" value={summaryLoading ? '...' : summary.completedTasks || 0} />
				<StatCard label="Overdue tasks" value={summaryLoading ? '...' : summary.overdueTasks || 0} />
			</div>

			<SearchFilterBar search={search} setSearch={setSearch}>
				<select className="form-field md:max-w-xs" id="taskFilterEmployee" name="employeeId" value={filters.employeeId} onChange={(event) => setFilter('employeeId', event.target.value)}>
					<option value="">All employees</option>
					{employees.map((employee) => (
						<option key={employee._id} value={employee._id}>{employee.userId?.name || employee.employeeCode}</option>
					))}
				</select>
				<select className="form-field md:max-w-xs" id="taskFilterProject" name="projectId" value={filters.projectId} onChange={(event) => setFilter('projectId', event.target.value)}>
					<option value="">All projects</option>
					{projects.map((project) => (
						<option key={project._id} value={project._id}>{project.name || project.projectCode}</option>
					))}
				</select>
				<select className="form-field md:max-w-xs" id="taskFilterPriority" name="priority" value={filters.priority} onChange={(event) => setFilter('priority', event.target.value)}>
					<option value="">All priorities</option>
					<option value="low">Low</option>
					<option value="medium">Medium</option>
					<option value="high">High</option>
					<option value="urgent">Urgent</option>
				</select>
				<select className="form-field md:max-w-xs" id="taskFilterStatus" name="status" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
					<option value="">All statuses</option>
					<option value="draft">Draft</option>
					<option value="to_do">Not started</option>
					<option value="in_progress">In progress</option>
					<option value="under_review">Under review</option>
					<option value="completed">Completed</option>
					<option value="reopened">Reopened</option>
					<option value="overdue">Overdue</option>
				</select>
				<select className="form-field md:max-w-xs" id="taskFilterDeadline" name="deadlineFilter" value={filters.deadlineFilter} onChange={(event) => setFilter('deadlineFilter', event.target.value)}>
					<option value="">All deadlines</option>
					<option value="today">Due today</option>
					<option value="this_week">Due this week</option>
					<option value="overdue">Overdue deadline</option>
					<option value="no_due_date">No due date</option>
				</select>
			</SearchFilterBar>
			{error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
			<DataTable
				empty={loading ? 'Loading tasks...' : 'No tasks found.'}
				columns={[
					{ key: 'taskCode', label: 'Task ID' },
					{ key: 'title', label: 'Task title' },
					{ key: 'project', label: 'Project', render: (row) => row.projectId?.name || row.projectId?.projectCode || '-' },
					{ key: 'employee', label: 'Assigned to', render: (row) => row.assignedTo?.userId?.name || row.assignedTo?.employeeCode || '-' },
					{ key: 'department', label: 'Department', render: (row) => row.department || row.assignedTo?.department || '-' },
					{ key: 'priority', label: 'Priority' },
					{ key: 'startDate', label: 'Start date', render: (row) => formatDate(row.startDate) },
					{ key: 'dueDate', label: 'Due date', render: (row) => formatDate(row.dueDate) },
					{ key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
					{
						key: 'actions',
						label: 'Actions',
						render: (row) => (
							<div className="flex flex-wrap gap-x-3 gap-y-1">
								<Link className="font-bold text-blue-700" to={`/admin/tasks/${row._id}`}>View</Link>
								<Link className="font-bold text-slate-700" to={`/admin/tasks/${row._id}/edit`}>Edit</Link>
								<button className="font-bold text-cyan-700" type="button" onClick={() => openActionModal('reassign', row)}>Reassign</button>
								<button className="font-bold text-violet-700" type="button" onClick={() => openActionModal('deadline', row)}>Change deadline</button>
								{row.status !== 'completed' && (
									<button className="font-bold text-emerald-700" type="button" onClick={() => handleMarkCompleted(row)}>Mark completed</button>
								)}
								<button className="font-bold text-red-700" type="button" onClick={() => handleDelete(row)}>Delete</button>
							</div>
						)
					}
				]}
				rows={tasks}
			/>

			{actionModal.type && actionModal.task && (
				<Modal
					title={actionModal.type === 'reassign' ? `Reassign ${actionModal.task.taskCode}` : `Change deadline for ${actionModal.task.taskCode}`}
					onClose={closeActionModal}
				>
					<form className="space-y-4" onSubmit={submitActionModal}>
						{actionModal.type === 'reassign' && (
							<label className="block">
								<span className="mb-1 block text-sm font-bold text-slate-700">Assigned employee</span>
								<select className="form-field" id={`taskAction-${actionModal.type}-employee`} name="employeeId" value={actionValue} onChange={(event) => setActionValue(event.target.value)} required>
									<option value="">Select employee</option>
									{employees.map((employee) => (
										<option key={employee._id} value={employee._id}>{employee.userId?.name || employee.employeeCode}</option>
									))}
								</select>
							</label>
						)}

						{actionModal.type === 'deadline' && (
							<label className="block">
								<span className="mb-1 block text-sm font-bold text-slate-700">New due date</span>
								<input className="form-field" id="taskActionDeadline" name="dueDate" type="date" value={actionValue} onChange={(event) => setActionValue(event.target.value)} required />
							</label>
						)}

						<div className="flex gap-3">
							<button className="btn-primary" disabled={actionSaving} type="submit">{actionSaving ? 'Saving...' : 'Apply'}</button>
							<button className="btn-secondary" type="button" onClick={closeActionModal}>Cancel</button>
						</div>
					</form>
				</Modal>
			)}
		</ModulePage>
	);
};

export default TaskManagement;
