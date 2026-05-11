import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FormInput from '../../components/common/FormInput.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { employeeService } from '../../services/employeeService.js';
import { projectService } from '../../services/projectService.js';
import { taskService } from '../../services/taskService.js';
import ModulePage from '../shared/ModulePage.jsx';

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const TaskForm = () => {
	const navigate = useNavigate();
	const { id } = useParams();
	const [searchParams] = useSearchParams();
	const { user } = useAuth();
	const isEdit = Boolean(id);

	const [projects, setProjects] = useState([]);
	const [employees, setEmployees] = useState([]);
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const [submitMode, setSubmitMode] = useState('assign');
	const [subtasks, setSubtasks] = useState([{ title: '', assignedTo: '', dueDate: '', status: 'pending' }]);
	const [attachments, setAttachments] = useState([{ category: 'document', fileName: '', fileUrl: '' }]);
	const [form, setForm] = useState({
		taskCode: '',
		projectId: searchParams.get('projectId') || '',
		title: '',
		description: '',
		requirements: '',
		expectedOutput: '',
		notes: '',
		assignedTo: searchParams.get('employeeId') || '',
		department: '',
		priority: 'medium',
		status: 'to_do',
		startDate: '',
		dueDate: '',
		estimatedHours: ''
	});

	const sectionTitleClass = 'text-base font-black text-slate-900';
	const sectionCardClass = 'rounded-md border border-slate-200 bg-white p-5 shadow-sm';

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
				requirements: task.requirements || '',
				expectedOutput: task.expectedOutput || '',
				notes: task.notes || '',
				assignedTo: task.assignedTo?._id || task.assignedTo || '',
				department: task.department || '',
				priority: task.priority || 'medium',
				status: task.status || 'to_do',
				startDate: toDateInput(task.startDate),
				dueDate: toDateInput(task.dueDate),
				estimatedHours: task.estimatedHours || ''
			}));
			setSubtasks(
				(data.subtasks || []).length
					? data.subtasks.map((subtask) => ({
						title: subtask.title || '',
						assignedTo: subtask.assignedTo?._id || subtask.assignedTo || '',
						dueDate: toDateInput(subtask.dueDate),
						status: subtask.status || 'pending'
					}))
					: [{ title: '', assignedTo: '', dueDate: '', status: 'pending' }]
			);
			setAttachments(
				(data.attachments || []).length
					? data.attachments.map((attachment) => ({
						category: attachment.category || 'reference_file',
						fileName: attachment.fileName || '',
						fileUrl: attachment.fileUrl || ''
					}))
					: [{ category: 'document', fileName: '', fileUrl: '' }]
			);
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
		if (name === 'assignedTo') {
			const employee = employees.find((item) => item._id === value);
			setForm((current) => ({
				...current,
				assignedTo: value,
				department: employee?.department || current.department
			}));
			return;
		}

		setForm((current) => ({ ...current, [name]: value }));
	};

	const updateSubtask = (index, key, value) => {
		setSubtasks((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
	};

	const addSubtask = () => {
		setSubtasks((current) => [...current, { title: '', assignedTo: '', dueDate: '', status: 'pending' }]);
	};

	const removeSubtask = (index) => {
		setSubtasks((current) => {
			if (current.length === 1) return [{ title: '', assignedTo: '', dueDate: '', status: 'pending' }];
			return current.filter((_, itemIndex) => itemIndex !== index);
		});
	};

	const updateAttachment = (index, key, value) => {
		setAttachments((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
	};

	const addAttachment = () => {
		setAttachments((current) => [...current, { category: 'document', fileName: '', fileUrl: '' }]);
	};

	const removeAttachment = (index) => {
		setAttachments((current) => {
			if (current.length === 1) return [{ category: 'document', fileName: '', fileUrl: '' }];
			return current.filter((_, itemIndex) => itemIndex !== index);
		});
	};

	const validateAssign = () => {
		if (!form.taskCode.trim()) return 'Task ID is required.';
		if (!form.title.trim()) return 'Task title is required.';
		if (!form.projectId) return 'Project name is required.';
		if (!form.assignedTo) return 'Assigned employee is required.';
		return '';
	};

	const submit = async (event) => {
		event.preventDefault();
		const action = event.nativeEvent?.submitter?.dataset?.mode || 'assign';
		setSubmitMode(action);
		setError('');
		setSaving(true);

		if (action === 'assign') {
			const validationError = validateAssign();
			if (validationError) {
				setError(validationError);
				setSaving(false);
				return;
			}
		}

		const payload = {
			...form,
			status: action === 'draft' ? 'draft' : form.status || 'to_do',
			estimatedHours: Number(form.estimatedHours || 0),
			startDate: form.startDate || undefined,
			dueDate: form.dueDate || undefined,
			subtasks,
			attachments
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
			<form className="space-y-5" onSubmit={submit}>
				{error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

				<section className={sectionCardClass}>
					<h3 className={sectionTitleClass}>1. Task Basic Details</h3>
					<div className="mt-4 grid gap-4 lg:grid-cols-2">
						<FormInput label="Task title" name="title" value={form.title} onChange={update} />
						<FormInput label="Task ID" name="taskCode" value={form.taskCode} onChange={update} />
						<FormInput as="select" label="Project name" name="projectId" value={form.projectId} onChange={update} options={projectOptions} />
						<label className="block lg:col-span-2">
							<span className="mb-1 block text-sm font-bold text-slate-700">Task description</span>
							<textarea className="form-field min-h-24" name="description" value={form.description} onChange={update} />
						</label>
						<label className="block lg:col-span-2">
							<span className="mb-1 block text-sm font-bold text-slate-700">Requirements</span>
							<textarea className="form-field min-h-20" name="requirements" value={form.requirements} onChange={update} />
						</label>
						<label className="block lg:col-span-2">
							<span className="mb-1 block text-sm font-bold text-slate-700">Expected output</span>
							<textarea className="form-field min-h-20" name="expectedOutput" value={form.expectedOutput} onChange={update} />
						</label>
						<label className="block lg:col-span-2">
							<span className="mb-1 block text-sm font-bold text-slate-700">Notes</span>
							<textarea className="form-field min-h-20" name="notes" value={form.notes} onChange={update} />
						</label>
					</div>
				</section>

				<section className={sectionCardClass}>
					<h3 className={sectionTitleClass}>2. Assignment Details</h3>
					<div className="mt-4 grid gap-4 lg:grid-cols-2">
						<FormInput as="select" label="Assigned employee" name="assignedTo" value={form.assignedTo} onChange={update} options={employeeOptions} />
						<label className="block">
							<span className="mb-1 block text-sm font-bold text-slate-700">Assigned by</span>
							<input className="form-field bg-slate-50" readOnly value={user?.name || user?.email || 'Current user'} />
						</label>
						<FormInput label="Department" name="department" value={form.department} onChange={update} />
						<FormInput
							as="select"
							label="Task priority"
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
					</div>
				</section>

				<section className={sectionCardClass}>
					<h3 className={sectionTitleClass}>3. Timeline</h3>
					<div className="mt-4 grid gap-4 lg:grid-cols-3">
						<FormInput label="Start date" name="startDate" type="date" value={form.startDate} onChange={update} />
						<FormInput label="Due date" name="dueDate" type="date" value={form.dueDate} onChange={update} />
						<FormInput label="Estimated hours" name="estimatedHours" type="number" min="0" value={form.estimatedHours} onChange={update} />
					</div>
				</section>

				<section className={sectionCardClass}>
					<div className="flex items-center justify-between gap-3">
						<h3 className={sectionTitleClass}>4. Checklist / Subtasks</h3>
						<button className="btn-secondary" onClick={addSubtask} type="button">Add subtask</button>
					</div>
					<div className="mt-4 space-y-3">
						{subtasks.map((subtask, index) => (
							<div className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-4" key={`subtask-${index}`}>
								<FormInput label="Subtask title" value={subtask.title} onChange={(event) => updateSubtask(index, 'title', event.target.value)} />
								<FormInput as="select" label="Assigned person (optional)" value={subtask.assignedTo} onChange={(event) => updateSubtask(index, 'assignedTo', event.target.value)} options={employeeOptions} />
								<FormInput label="Due date" type="date" value={subtask.dueDate} onChange={(event) => updateSubtask(index, 'dueDate', event.target.value)} />
								<div className="flex items-end gap-2">
									<FormInput
										as="select"
										label="Status"
										value={subtask.status}
										onChange={(event) => updateSubtask(index, 'status', event.target.value)}
										options={[
											{ value: 'pending', label: 'Pending' },
											{ value: 'in_progress', label: 'In Progress' },
											{ value: 'completed', label: 'Completed' }
										]}
									/>
									<button className="btn-secondary text-red-700" onClick={() => removeSubtask(index)} type="button">Remove</button>
								</div>
							</div>
						))}
					</div>
				</section>

				<section className={sectionCardClass}>
					<div className="flex items-center justify-between gap-3">
						<h3 className={sectionTitleClass}>5. Attachments</h3>
						<button className="btn-secondary" onClick={addAttachment} type="button">Add attachment</button>
					</div>
					<div className="mt-4 space-y-3">
						{attachments.map((attachment, index) => (
							<div className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-4" key={`attachment-${index}`}>
								<FormInput
									as="select"
									label="File type"
									value={attachment.category}
									onChange={(event) => updateAttachment(index, 'category', event.target.value)}
									options={[
										{ value: 'document', label: 'Documents' },
										{ value: 'screenshot', label: 'Screenshots' },
										{ value: 'reference_file', label: 'Reference files' }
									]}
								/>
								<FormInput label="File name" value={attachment.fileName} onChange={(event) => updateAttachment(index, 'fileName', event.target.value)} />
								<FormInput label="File URL" value={attachment.fileUrl} onChange={(event) => updateAttachment(index, 'fileUrl', event.target.value)} />
								<div className="flex items-end">
									<button className="btn-secondary text-red-700" onClick={() => removeAttachment(index)} type="button">Remove</button>
								</div>
							</div>
						))}
					</div>
				</section>

				<section className={sectionCardClass}>
					<h3 className={sectionTitleClass}>6. Task Status</h3>
					<div className="mt-4 grid gap-4 lg:max-w-md">
						<FormInput
							as="select"
							label="Status"
							name="status"
							value={form.status}
							onChange={update}
							options={[
								{ value: 'to_do', label: 'To Do' },
								{ value: 'in_progress', label: 'In Progress' },
								{ value: 'under_review', label: 'Review' },
								{ value: 'completed', label: 'Completed' },
								{ value: 'reopened', label: 'Reopened' }
							]}
						/>
					</div>
				</section>

				<section className={sectionCardClass}>
					<h3 className={sectionTitleClass}>7. Submit Actions</h3>
					<div className="mt-4 flex flex-wrap gap-3">
						<button
							className="btn-primary"
							disabled={saving}
							data-mode="assign"
							type="submit"
						>
							{saving && submitMode === 'assign' ? 'Saving...' : isEdit ? 'Update and assign task' : 'Assign task'}
						</button>
						<button
							className="btn-secondary"
							disabled={saving}
							data-mode="draft"
							type="submit"
						>
							{saving && submitMode === 'draft' ? 'Saving...' : 'Save as draft'}
						</button>
						<button className="btn-secondary" type="button" onClick={() => navigate('/admin/tasks')}>Cancel</button>
					</div>
				</section>
			</form>
		</ModulePage>
	);
};

export default TaskForm;
