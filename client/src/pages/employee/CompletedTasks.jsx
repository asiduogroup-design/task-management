import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchFilterBar from '../../components/common/SearchFilterBar.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { taskService } from '../../services/taskService.js';
import ModulePage from '../shared/ModulePage.jsx';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');
const formatHours = (value) => `${Number(value || 0).toFixed(2)}h`;

const approvalLabelFromTask = (task) => {
	if (task.approvalStatus === 'approved') return 'approved';
	if (task.status === 'under_review') return 'pending';
	return task.approvalStatus || 'pending';
};

const defaultFilters = {
	projectId: '',
	fromDate: '',
	toDate: '',
	approvalStatus: ''
};

const CompletedTasks = () => {
	const [search, setSearch] = useState('');
	const [filters, setFilters] = useState(defaultFilters);
	const [tasks, setTasks] = useState([]);
	const [projectOptions, setProjectOptions] = useState([]);
	const [selectedTaskId, setSelectedTaskId] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const loadCompletedTasks = async () => {
		setLoading(true);
		setError('');

		try {
			const { data } = await taskService.completedHistory({
				search: search || undefined,
				projectId: filters.projectId || undefined,
				fromDate: filters.fromDate || undefined,
				toDate: filters.toDate || undefined,
				approvalStatus: filters.approvalStatus || undefined
			});

			const nextTasks = data.tasks || [];
			const nextProjectOptions = data.filters?.projects || [];

			setTasks(nextTasks);
			setProjectOptions(nextProjectOptions);

			setSelectedTaskId((current) => {
				if (current && nextTasks.some((task) => task._id === current)) {
					return current;
				}
				return nextTasks[0]?._id || '';
			});
		} catch (err) {
			setTasks([]);
			setProjectOptions([]);
			setSelectedTaskId('');
			setError(err.response?.data?.message || 'Unable to load completed tasks.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadCompletedTasks();
	}, [search, filters.projectId, filters.fromDate, filters.toDate, filters.approvalStatus]);

	const selectedTask = useMemo(
		() => tasks.find((task) => task._id === selectedTaskId) || null,
		[tasks, selectedTaskId]
	);

	return (
		<ModulePage title="Completed Tasks History">
			<SearchFilterBar
				singleRowDesktop
				search={search}
				setSearch={setSearch}
				searchId="completedTaskSearch"
				searchName="completedTaskSearch"
			>
				<select
					className="form-field w-full"
					id="completedTaskProjectId"
					name="projectId"
					onChange={(event) => setFilters((current) => ({ ...current, projectId: event.target.value }))}
					value={filters.projectId}
				>
					<option value="">All projects</option>
					{projectOptions.map((project) => (
						<option key={project.value} value={project.value}>{project.label}</option>
					))}
				</select>

				<input
					className="form-field w-full"
					id="completedTaskFromDate"
					name="fromDate"
					onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
					type="date"
					value={filters.fromDate}
				/>

				<input
					className="form-field w-full"
					id="completedTaskToDate"
					name="toDate"
					onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
					type="date"
					value={filters.toDate}
				/>

				<select
					className="form-field w-full"
					id="completedTaskApprovalStatus"
					name="approvalStatus"
					onChange={(event) => setFilters((current) => ({ ...current, approvalStatus: event.target.value }))}
					value={filters.approvalStatus}
				>
					<option value="">Approved + pending approval</option>
					<option value="approved">Approved</option>
					<option value="pending">Pending approval</option>
				</select>
			</SearchFilterBar>

			{error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

			{loading ? (
				<section className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading completed history...</section>
			) : (
				<div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
					<section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
						<div className="hidden grid-cols-[2fr_1.3fr_1fr_1.1fr_.9fr_1fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-700 md:grid">
							<span>Task title</span>
							<span>Project name</span>
							<span>Completed date</span>
							<span>Approved by</span>
							<span>Time spent</span>
							<span>Status</span>
						</div>

						<div className="divide-y divide-slate-100">
							{tasks.length ? (
								tasks.map((task) => {
									const selected = task._id === selectedTaskId;
									const approvalLabel = approvalLabelFromTask(task);

									return (
										<button
											className={`w-full px-4 py-3 text-left transition ${selected ? 'bg-blue-50/60' : 'bg-white hover:bg-slate-50'}`}
											key={task._id}
											onClick={() => setSelectedTaskId(task._id)}
											type="button"
										>
											<div className="grid gap-2 md:grid-cols-[2fr_1.3fr_1fr_1.1fr_.9fr_1fr] md:items-center md:gap-3">
												<p className="text-sm font-semibold text-slate-900">{task.title}</p>
												<p className="text-sm text-slate-700">{task.projectName}</p>
												<p className="text-sm text-slate-700">{formatDate(task.completedDate)}</p>
												<p className="text-sm text-slate-700">{task.approvedByName || '-'}</p>
												<p className="text-sm font-semibold text-slate-800">{formatHours(task.timeSpent)}</p>
												<div className="flex flex-wrap gap-2">
													<StatusBadge status={task.status} />
													<StatusBadge status={approvalLabel} />
												</div>
											</div>
										</button>
									);
								})
							) : (
								<p className="p-4 text-sm text-slate-600">No completed task history found for your filters.</p>
							)}
						</div>
					</section>

					<section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
						<h2 className="text-lg font-black text-slate-950">Task Details</h2>

						{!selectedTask ? (
							<p className="mt-3 text-sm text-slate-600">Select a task to view completion notes, uploaded files, admin feedback, and reopened history.</p>
						) : (
							<div className="mt-3 space-y-4">
								<article className="rounded-md bg-slate-50 p-3">
									<p className="text-xs font-bold uppercase text-slate-500">Completion notes</p>
									<p className="mt-1 text-sm text-slate-700">{selectedTask.details?.completionNotes || 'No completion notes provided.'}</p>
								</article>

								<article className="rounded-md bg-slate-50 p-3">
									<p className="text-xs font-bold uppercase text-slate-500">Uploaded files</p>
									<div className="mt-2 space-y-2">
										{(selectedTask.details?.uploadedFiles || []).length ? (
											selectedTask.details.uploadedFiles.map((file) => (
												<a className="block text-sm font-semibold text-blue-700" href={file.fileUrl} key={file._id} rel="noreferrer" target="_blank">
													{file.fileName}
												</a>
											))
										) : (
											<p className="text-sm text-slate-600">No uploaded files.</p>
										)}
									</div>
								</article>

								<article className="rounded-md bg-slate-50 p-3">
									<p className="text-xs font-bold uppercase text-slate-500">Admin feedback</p>
									<div className="mt-2 space-y-2">
										{(selectedTask.details?.adminFeedback || []).length ? (
											selectedTask.details.adminFeedback.map((feedback) => (
												<div className="rounded border border-slate-200 bg-white p-2" key={feedback._id}>
													<p className="text-sm font-semibold text-slate-900">{feedback.userId?.name || 'Admin'}</p>
													<p className="text-sm text-slate-700">{feedback.comment}</p>
													<p className="text-xs text-slate-500">{formatDateTime(feedback.createdAt)}</p>
												</div>
											))
										) : (
											<p className="text-sm text-slate-600">No admin feedback yet.</p>
										)}
									</div>
								</article>

								<article className="rounded-md bg-slate-50 p-3">
									<p className="text-xs font-bold uppercase text-slate-500">Reopened history</p>
									<div className="mt-2 space-y-2">
										{(selectedTask.details?.reopenedHistory || []).length ? (
											selectedTask.details.reopenedHistory.map((entry, index) => (
												<div className="rounded border border-slate-200 bg-white p-2" key={`${entry.reopenedAt || index}-${index}`}>
													<p className="text-sm text-slate-700">
														Reopened by <span className="font-semibold text-slate-900">{entry.reopenedBy?.name || entry.reopenedBy?.email || 'User'}</span> on{' '}
														<span className="font-semibold text-slate-900">{formatDateTime(entry.reopenedAt)}</span>
													</p>
													<p className="text-sm text-slate-700">Reason: {entry.reason || 'No reason provided.'}</p>
												</div>
											))
										) : (
											<p className="text-sm text-slate-600">No reopen events.</p>
										)}
									</div>
								</article>

								<div>
									<Link className="text-sm font-bold text-blue-700" to={`/employee/tasks/${selectedTask._id}`}>
										Open full task page
									</Link>
								</div>
							</div>
						)}
					</section>
				</div>
			)}
		</ModulePage>
	);
};

export default CompletedTasks;
