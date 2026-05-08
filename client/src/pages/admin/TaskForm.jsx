import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FormInput from '../../components/common/FormInput.jsx';
import { employeeService } from '../../services/employeeService.js';
import { projectService } from '../../services/projectService.js';
import { taskService } from '../../services/taskService.js';
import ModulePage from '../shared/ModulePage.jsx';

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const TaskForm = () => {
	const navigate = useNavigate();
	const { id } = useParams();
	const [searchParams] = useSearchParams();
	const isEdit = Boolean(id);

	const [projects, setProjects] = useState([]);
	const [employees, setEmployees] = useState([]);
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState({
		taskCode: '',
		projectId: searchParams.get('projectId') || '',
		title: '',
		description: '',
		assignedTo: searchParams.get('employeeId') || '',
		department: '',
		priority: 'medium',
		status: 'to_do',
		startDate: '',
		dueDate: '',
		estimatedHours: ''
	});

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

	useEffect(() => {
		if (!isEdit) return;

		taskService.detail(id).then(({ data }) => {
			const task = data.task || {};
			setForm((current) => ({
				...current,
				taskCode: task.taskCode || '',
				projectId: task.projectId?._id || task.projectId || '',
				title: task.title || '',
				description: task.description || '',
				assignedTo: task.assignedTo?._id || task.assignedTo || '',
				department: task.department || '',
				priority: task.priority || 'medium',
				status: task.status || 'to_do',
				startDate: toDateInput(task.startDate),
				dueDate: toDateInput(task.dueDate),
				estimatedHours: task.estimatedHours || ''
			}));
		}).catch(() => setError('Unable to load task details'));
	}, [id, isEdit]);

	const employeeOptions = useMemo(
		() => [
			{ value: '', label: 'Select employee' },
			...employees.map((employee) => ({ value: employee._id, label: `${employee.userId?.name || 'Unnamed'} (${employee.employeeCode})` }))
		],
		[employees]
	);

	const projectOptions = useMemo(
		() => [
			{ value: '', label: 'Select project' },
			...projects.map((project) => ({ value: project._id, label: `${project.name || 'Project'} (${project.projectCode || '-'})` }))
		],
		[projects]
	);

	const update = (event) => {
		const { name, value } = event.target;
		setForm((current) => ({ ...current, [name]: value }));
	};

	const submit = async (event) => {
		event.preventDefault();
		setError('');
		setSaving(true);

		const payload = {
			...form,
			estimatedHours: Number(form.estimatedHours || 0),
			startDate: form.startDate || undefined,
			dueDate: form.dueDate || undefined
		};

		try {
			if (isEdit) await taskService.update(id, payload);
			else await taskService.create(payload);
			navigate('/admin/tasks');
		} catch (err) {
			setError(err.response?.data?.message || 'Unable to save task');
		} finally {
			setSaving(false);
		}
	};

	return (
		<ModulePage title={isEdit ? 'Edit Task' : 'Add Task'}>
			<form className="grid gap-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2" onSubmit={submit}>
				{error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700 lg:col-span-2">{error}</p>}

				<FormInput label="Task ID" name="taskCode" value={form.taskCode} onChange={update} required />
				<FormInput as="select" label="Project" name="projectId" value={form.projectId} onChange={update} options={projectOptions} required />
				<FormInput label="Task title" name="title" value={form.title} onChange={update} required />
				<FormInput as="select" label="Assign to" name="assignedTo" value={form.assignedTo} onChange={update} options={employeeOptions} required />
				<FormInput label="Department" name="department" value={form.department} onChange={update} />
				<FormInput
					as="select"
					label="Priority"
					name="priority"
					value={form.priority}
					onChange={update}
					options={[
						{ value: 'low', label: 'Low' },
						{ value: 'medium', label: 'Medium' },
						{ value: 'high', label: 'High' },
						{ value: 'urgent', label: 'Urgent' }
					]}
				/>
				<FormInput
					as="select"
					label="Status"
					name="status"
					value={form.status}
					onChange={update}
					options={[
						{ value: 'to_do', label: 'To do' },
						{ value: 'in_progress', label: 'In progress' },
						{ value: 'under_review', label: 'Under review' },
						{ value: 'completed', label: 'Completed' },
						{ value: 'reopened', label: 'Reopened' },
						{ value: 'overdue', label: 'Overdue' }
					]}
				/>
				<FormInput label="Estimated hours" name="estimatedHours" type="number" min="0" value={form.estimatedHours} onChange={update} />
				<FormInput label="Start date" name="startDate" type="date" value={form.startDate} onChange={update} />
				<FormInput label="Due date" name="dueDate" type="date" value={form.dueDate} onChange={update} />

				<label className="block lg:col-span-2">
					<span className="mb-1 block text-sm font-bold text-slate-700">Description</span>
					<textarea className="form-field min-h-24" name="description" value={form.description} onChange={update} />
				</label>

				<div className="flex gap-3 lg:col-span-2">
					<button className="btn-primary" disabled={saving} type="submit">{isEdit ? 'Update task' : 'Create task'}</button>
					<button className="btn-secondary" type="button" onClick={() => navigate('/admin/tasks')}>Cancel</button>
				</div>
			</form>
		</ModulePage>
	);
};

export default TaskForm;
