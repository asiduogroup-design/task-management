import { useEffect, useMemo, useState } from 'react';
import DataTable from '../../components/common/DataTable.jsx';
import { employeeService } from '../../services/employeeService.js';
import { projectService } from '../../services/projectService.js';
import { reportService } from '../../services/reportService.js';
import ModulePage from '../shared/ModulePage.jsx';

const toIsoDate = (value) => {
	const date = new Date(value);
	date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
	return date.toISOString().slice(0, 10);
};

const buildParams = (filters) => {
	const params = {
		employeeId: filters.employeeId || undefined,
		department: filters.department || undefined,
		projectId: filters.projectId || undefined,
		taskStatus: filters.taskStatus || undefined,
		datePreset: filters.datePreset || undefined
	};

	if (filters.datePreset === 'custom') {
		params.from = filters.from || undefined;
		params.to = filters.to || undefined;
	}

	return params;
};

const downloadBlobResponse = (response, fallbackName) => {
	const blob = response.data;
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement('a');
	const disposition = response.headers?.['content-disposition'] || '';
	const fileNameMatch = disposition.match(/filename="?([^\"]+)"?/i);

	link.href = url;
	link.download = fileNameMatch?.[1] || fallbackName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.URL.revokeObjectURL(url);
};

const DailyWorkReports = () => {
	const todayIso = toIsoDate(new Date());
	const yesterdayDate = new Date();
	yesterdayDate.setDate(yesterdayDate.getDate() - 1);
	const yesterdayIso = toIsoDate(yesterdayDate);

	const [employees, setEmployees] = useState([]);
	const [projects, setProjects] = useState([]);
	const [filters, setFilters] = useState({
		datePreset: 'today',
		from: todayIso,
		to: todayIso,
		employeeId: '',
		department: '',
		projectId: '',
		taskStatus: ''
	});
	const [tableRows, setTableRows] = useState([]);
	const [details, setDetails] = useState([]);
	const [meta, setMeta] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [actionMessage, setActionMessage] = useState('');
	const [actionLoading, setActionLoading] = useState('');
	const [emailRecipients, setEmailRecipients] = useState('');

	const departments = useMemo(() => {
		const unique = [...new Set(employees.map((employee) => employee.department).filter(Boolean))];
		return unique.sort((left, right) => left.localeCompare(right));
	}, [employees]);

	const setFilter = (key, value) => {
		setFilters((current) => ({ ...current, [key]: value }));
	};

	const applyDatePreset = (preset) => {
		if (preset === 'today') {
			setFilters((current) => ({ ...current, datePreset: 'today', from: todayIso, to: todayIso }));
			return;
		}

		if (preset === 'yesterday') {
			setFilters((current) => ({ ...current, datePreset: 'yesterday', from: yesterdayIso, to: yesterdayIso }));
			return;
		}

		setFilters((current) => ({ ...current, datePreset: 'custom' }));
	};

	useEffect(() => {
		Promise.all([employeeService.list(), projectService.list()])
			.then(([employeeResponse, projectResponse]) => {
				setEmployees(employeeResponse.data.employees || []);
				setProjects(projectResponse.data.projects || []);
			})
			.catch(() => {
				setEmployees([]);
				setProjects([]);
			});
	}, []);

	useEffect(() => {
		const loadReport = async () => {
			setLoading(true);
			setError('');
			try {
				const { data } = await reportService.dailyWork(buildParams(filters));
				setTableRows(data.table || []);
				setDetails(data.details || []);
				setMeta(data.meta || null);
			} catch {
				setTableRows([]);
				setDetails([]);
				setMeta(null);
				setError('Unable to load daily work report for selected filters.');
			} finally {
				setLoading(false);
			}
		};

		loadReport();
	}, [filters]);

	const exportReport = async (format) => {
		setActionLoading(format);
		setActionMessage('');
		try {
			const response = await reportService.exportDailyWork(format, buildParams(filters));
			downloadBlobResponse(response, format === 'excel' ? 'daily-work-report.csv' : 'daily-work-report.pdf');
			setActionMessage(`Report exported as ${format.toUpperCase()}.`);
		} catch {
			setActionMessage(`Unable to export ${format.toUpperCase()} report.`);
		} finally {
			setActionLoading('');
		}
	};

	const emailReport = async () => {
		const recipients = emailRecipients
			.split(',')
			.map((value) => value.trim())
			.filter(Boolean);

		if (!recipients.length) {
			setActionMessage('Please enter at least one recipient email.');
			return;
		}

		setActionLoading('email');
		setActionMessage('');
		try {
			const { data } = await reportService.emailDailyWork({ recipients }, buildParams(filters));
			setActionMessage(data.message || 'Report email queued.');
		} catch (err) {
			setActionMessage(err.response?.data?.message || 'Unable to send email report.');
		} finally {
			setActionLoading('');
		}
	};

	return (
		<ModulePage title="Daily Work Reports">
			<section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
				<h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Date Selector</h2>
				<div className="flex flex-wrap gap-2">
					<button className={`btn-secondary ${filters.datePreset === 'today' ? 'ring-2 ring-blue-500' : ''}`} type="button" onClick={() => applyDatePreset('today')}>Today</button>
					<button className={`btn-secondary ${filters.datePreset === 'yesterday' ? 'ring-2 ring-blue-500' : ''}`} type="button" onClick={() => applyDatePreset('yesterday')}>Yesterday</button>
					<button className={`btn-secondary ${filters.datePreset === 'custom' ? 'ring-2 ring-blue-500' : ''}`} type="button" onClick={() => applyDatePreset('custom')}>Custom range</button>
				</div>

				{filters.datePreset === 'custom' && (
					<div className="mt-3 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
						<label className="block">
							<span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">From date</span>
							<input className="form-field" type="date" value={filters.from} onChange={(event) => setFilter('from', event.target.value)} />
						</label>
						<label className="block">
							<span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">To date</span>
							<input className="form-field" type="date" value={filters.to} onChange={(event) => setFilter('to', event.target.value)} />
						</label>
					</div>
				)}
			</section>

			<section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
				<h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Filters</h2>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<select className="form-field" value={filters.employeeId} onChange={(event) => setFilter('employeeId', event.target.value)}>
						<option value="">All employees</option>
						{employees.map((employee) => (
							<option key={employee._id} value={employee._id}>{employee.userId?.name || employee.employeeCode}</option>
						))}
					</select>

					<select className="form-field" value={filters.department} onChange={(event) => setFilter('department', event.target.value)}>
						<option value="">All departments</option>
						{departments.map((department) => (
							<option key={department} value={department}>{department}</option>
						))}
					</select>

					<select className="form-field" value={filters.projectId} onChange={(event) => setFilter('projectId', event.target.value)}>
						<option value="">All projects</option>
						{projects.map((project) => (
							<option key={project._id} value={project._id}>{project.name || project.projectCode}</option>
						))}
					</select>

					<select className="form-field" value={filters.taskStatus} onChange={(event) => setFilter('taskStatus', event.target.value)}>
						<option value="">All task statuses</option>
						<option value="draft">Draft</option>
						<option value="to_do">Not started</option>
						<option value="in_progress">In progress</option>
						<option value="under_review">Under review</option>
						<option value="completed">Completed</option>
						<option value="reopened">Reopened</option>
						<option value="overdue">Overdue</option>
					</select>

					<input className="form-field" type="date" value={filters.from} onChange={(event) => { setFilter('datePreset', 'custom'); setFilter('from', event.target.value); }} />
					<input className="form-field" type="date" value={filters.to} onChange={(event) => { setFilter('datePreset', 'custom'); setFilter('to', event.target.value); }} />
				</div>
			</section>

			<section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
				<h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Export Options</h2>
				<div className="flex flex-wrap items-center gap-3">
					<button className="btn-secondary" disabled={actionLoading === 'pdf'} type="button" onClick={() => exportReport('pdf')}>
						{actionLoading === 'pdf' ? 'Exporting...' : 'Export as PDF'}
					</button>
					<button className="btn-secondary" disabled={actionLoading === 'excel'} type="button" onClick={() => exportReport('excel')}>
						{actionLoading === 'excel' ? 'Exporting...' : 'Export as Excel'}
					</button>
					<input
						className="form-field min-w-72"
						placeholder="Email recipients (comma separated)"
						type="text"
						value={emailRecipients}
						onChange={(event) => setEmailRecipients(event.target.value)}
					/>
					<button className="btn-primary" disabled={actionLoading === 'email'} type="button" onClick={emailReport}>
						{actionLoading === 'email' ? 'Sending...' : 'Email report'}
					</button>
				</div>
				{actionMessage && <p className="mt-3 text-sm font-semibold text-slate-600">{actionMessage}</p>}
			</section>

			<section className="mb-6">
				<h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Employee Work Report Table</h2>
				{meta && (
					<p className="mb-3 text-xs font-semibold text-slate-500">
						Generated {new Date(meta.generatedAt).toLocaleString()} for {meta.totalEmployees} employee(s)
					</p>
				)}
				{error && <p className="mb-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
				<DataTable
					empty={loading ? 'Loading daily work report...' : 'No report records found for current filters.'}
					columns={[
						{ key: 'employeeName', label: 'Employee name' },
						{ key: 'loginTime', label: 'Login time' },
						{ key: 'logoutTime', label: 'Logout time' },
						{ key: 'projectWorkedOn', label: 'Project worked on' },
						{ key: 'tasksWorkedOn', label: 'Tasks worked on' },
						{ key: 'completedTasks', label: 'Completed tasks' },
						{ key: 'pendingTasks', label: 'Pending tasks' },
						{ key: 'timeSpent', label: 'Time spent' },
						{ key: 'blockers', label: 'Blockers' }
					]}
					rows={tableRows}
				/>
			</section>

			<section className="space-y-4">
				<h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Detailed Daily Update</h2>
				{!details.length && (
					<div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
						No detailed updates for selected filters.
					</div>
				)}

				{details.map((employeeDetail) => (
					<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" key={employeeDetail.employeeId}>
						<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
							<h3 className="text-base font-black text-slate-900">{employeeDetail.employeeName}</h3>
							<span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
								Files submitted: {employeeDetail.filesSubmitted || 0}
							</span>
						</div>

						{!employeeDetail.updates?.length && <p className="text-sm text-slate-500">No daily updates submitted.</p>}

						<div className="space-y-3">
							{(employeeDetail.updates || []).map((entry, index) => (
								<div className="rounded-md border border-slate-100 bg-slate-50 p-3" key={`${employeeDetail.employeeId}-${index}`}>
									<p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
										{entry.date ? new Date(entry.date).toLocaleDateString() : 'No date'}
									</p>
									<div className="grid gap-2 text-sm text-slate-700 lg:grid-cols-2">
										<p><span className="font-bold text-slate-900">What was done today:</span> {entry.whatWasDoneToday}</p>
										<p><span className="font-bold text-slate-900">What is pending:</span> {entry.whatIsPending}</p>
										<p><span className="font-bold text-slate-900">What will be done tomorrow:</span> {entry.whatWillBeDoneTomorrow}</p>
										<p><span className="font-bold text-slate-900">Issues/blockers:</span> {entry.issuesBlockers}</p>
										<p><span className="font-bold text-slate-900">Files submitted:</span> {entry.filesSubmitted || 0}</p>
									</div>
								</div>
							))}
						</div>
					</article>
				))}
			</section>
		</ModulePage>
	);
};

export default DailyWorkReports;
