import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DataTable from '../../components/common/DataTable.jsx';
import SearchFilterBar from '../../components/common/SearchFilterBar.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { employeeService } from '../../services/employeeService.js';
import { projectService } from '../../services/projectService.js';
import { taskService } from '../../services/taskService.js';
import ModulePage from '../shared/ModulePage.jsx';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');

const TaskManagement = () => {
	const [searchParams] = useSearchParams();
	const [tasks, setTasks] = useState([]);
	const [projects, setProjects] = useState([]);
	const [employees, setEmployees] = useState([]);
	const [search, setSearch] = useState('');
	const [filters, setFilters] = useState({
		employeeId: searchParams.get('employeeId') || '',
		projectId: '',
		status: ''
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

	const loadTasks = async () => {
		setLoading(true);
		setError('');
		try {
			const { data } = await taskService.list({
				search: search || undefined,
				employeeId: filters.employeeId || undefined,
				projectId: filters.projectId || undefined,
				status: filters.status || undefined
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
	}, [search, filters.employeeId, filters.projectId, filters.status]);

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

	return (
		<ModulePage title="Task Management" actions={<Link className="btn-primary" to="/admin/tasks/add">Add task</Link>}>
			<SearchFilterBar search={search} setSearch={setSearch}>
				<select className="form-field md:max-w-xs" value={filters.employeeId} onChange={(event) => setFilter('employeeId', event.target.value)}>
					<option value="">All employees</option>
					{employees.map((employee) => (
						<option key={employee._id} value={employee._id}>{employee.userId?.name || employee.employeeCode}</option>
					))}
				</select>
				<select className="form-field md:max-w-xs" value={filters.projectId} onChange={(event) => setFilter('projectId', event.target.value)}>
					<option value="">All projects</option>
					{projects.map((project) => (
						<option key={project._id} value={project._id}>{project.name || project.projectCode}</option>
					))}
				</select>
				<select className="form-field md:max-w-xs" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
					<option value="">All statuses</option>
					<option value="to_do">To do</option>
					<option value="in_progress">In progress</option>
					<option value="under_review">Under review</option>
					<option value="completed">Completed</option>
					<option value="reopened">Reopened</option>
					<option value="overdue">Overdue</option>
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
								<button className="font-bold text-red-700" type="button" onClick={() => handleDelete(row)}>Delete</button>
							</div>
						)
					}
				]}
				rows={tasks}
			/>
		</ModulePage>
	);
};

export default TaskManagement;
