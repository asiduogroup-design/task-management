import { useEffect, useMemo, useState } from 'react';
import DataTable from '../../components/common/DataTable.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import { employeeService } from '../../services/employeeService.js';
import { projectService } from '../../services/projectService.js';
import { reportService } from '../../services/reportService.js';
import ModulePage from '../shared/ModulePage.jsx';

const reportTypes = [
	{ value: 'attendance_report', label: 'Attendance report' },
	{ value: 'employee_report', label: 'Employee report' },
	{ value: 'project_report', label: 'Project report' },
	{ value: 'task_report', label: 'Task report' },
	{ value: 'daily_work_report', label: 'Daily work report' },
	{ value: 'completed_task_report', label: 'Completed task report' },
	{ value: 'overdue_task_report', label: 'Overdue task report' },
	{ value: 'login_logout_report', label: 'Login/logout report' }
];

const defaultFilters = {
	reportType: 'attendance_report',
	fromDate: '',
	toDate: '',
	employeeId: '',
	department: '',
	projectId: '',
	taskStatus: ''
};

const taskStatuses = [
	'draft',
	'to_do',
	'in_progress',
	'under_review',
	'completed',
	'reopened',
	'overdue'
];

const normalizeLabel = (value) => String(value || '').replaceAll('_', ' ');

const downloadBlobResponse = (response, fallbackName) => {
	const blob = response.data;
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement('a');
	const disposition = response.headers?.['content-disposition'] || '';
	const match = disposition.match(/filename="?([^\"]+)"?/i);

	link.href = url;
	link.download = match?.[1] || fallbackName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.URL.revokeObjectURL(url);
};

const Reports = () => {
	const [filters, setFilters] = useState(defaultFilters);
	const [employees, setEmployees] = useState([]);
	const [projects, setProjects] = useState([]);

	const [title, setTitle] = useState('');
	const [columns, setColumns] = useState([]);
	const [rows, setRows] = useState([]);
	const [summaryCards, setSummaryCards] = useState([]);
	const [chartData, setChartData] = useState([]);
	const [generatedAt, setGeneratedAt] = useState('');

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [actionMessage, setActionMessage] = useState('');
	const [actionLoading, setActionLoading] = useState('');
	const [emailRecipients, setEmailRecipients] = useState('');

	const departments = useMemo(() => {
		const values = [...new Set(employees.map((employee) => employee.department).filter(Boolean))];
		return values.sort((left, right) => left.localeCompare(right));
	}, [employees]);

	const setFilter = (key, value) => {
		setFilters((current) => ({ ...current, [key]: value }));
	};

	const buildParams = () => ({
		reportType: filters.reportType,
		fromDate: filters.fromDate || undefined,
		toDate: filters.toDate || undefined,
		employeeId: filters.employeeId || undefined,
		department: filters.department || undefined,
		projectId: filters.projectId || undefined,
		taskStatus: filters.taskStatus || undefined
	});

	const loadPreview = async () => {
		setLoading(true);
		setError('');
		try {
			const { data } = await reportService.preview(buildParams());
			setTitle(data.title || 'Report Preview');
			setColumns(data.columns || []);
			setRows(data.rows || []);
			setSummaryCards(data.summaryCards || []);
			setChartData(data.chartData || []);
			setGeneratedAt(data.generatedAt || '');
		} catch {
			setTitle('');
			setColumns([]);
			setRows([]);
			setSummaryCards([]);
			setChartData([]);
			setGeneratedAt('');
			setError('Unable to load report preview.');
		} finally {
			setLoading(false);
		}
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
		loadPreview();
	}, [filters.reportType, filters.fromDate, filters.toDate, filters.employeeId, filters.department, filters.projectId, filters.taskStatus]);

	const exportReport = async (format) => {
		setActionLoading(format);
		setActionMessage('');
		try {
			const response = await reportService.exportReport(format, buildParams());
			downloadBlobResponse(response, format === 'excel' ? 'report.csv' : 'report.pdf');
			setActionMessage(`Report exported as ${format.toUpperCase()}.`);
		} catch {
			setActionMessage(`Unable to export ${format.toUpperCase()} report.`);
		} finally {
			setActionLoading('');
		}
	};

	const sendByEmail = async () => {
		const recipients = emailRecipients
			.split(',')
			.map((value) => value.trim())
			.filter(Boolean);

		if (!recipients.length) {
			setActionMessage('Please add at least one email recipient.');
			return;
		}

		setActionLoading('email');
		setActionMessage('');
		try {
			const { data } = await reportService.emailReport({ recipients }, buildParams());
			setActionMessage(data.message || 'Report email queued.');
		} catch (err) {
			setActionMessage(err.response?.data?.message || 'Unable to send report by email.');
		} finally {
			setActionLoading('');
		}
	};

	const handlePrint = () => {
		window.print();
	};

	const chartMax = chartData.length ? Math.max(...chartData.map((entry) => Number(entry.value || 0)), 1) : 1;

	return (
		<ModulePage title="Reports">
			<section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
				<h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Report Types</h2>
				<select className="form-field max-w-md" value={filters.reportType} onChange={(event) => setFilter('reportType', event.target.value)}>
					{reportTypes.map((reportType) => (
						<option key={reportType.value} value={reportType.value}>{reportType.label}</option>
					))}
				</select>
			</section>

			<section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
				<h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Filters</h2>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<input className="form-field" type="date" value={filters.fromDate} onChange={(event) => setFilter('fromDate', event.target.value)} />
					<input className="form-field" type="date" value={filters.toDate} onChange={(event) => setFilter('toDate', event.target.value)} />

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
						{taskStatuses.map((status) => (
							<option key={status} value={status}>{normalizeLabel(status)}</option>
						))}
					</select>
				</div>
			</section>

			<section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
				<h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Export Options</h2>
				<div className="flex flex-wrap items-center gap-3">
					<button className="btn-secondary" disabled={actionLoading === 'pdf'} type="button" onClick={() => exportReport('pdf')}>
						{actionLoading === 'pdf' ? 'Downloading...' : 'Download PDF'}
					</button>
					<button className="btn-secondary" disabled={actionLoading === 'excel'} type="button" onClick={() => exportReport('excel')}>
						{actionLoading === 'excel' ? 'Downloading...' : 'Download Excel'}
					</button>
					<input
						className="form-field min-w-72"
						type="text"
						placeholder="Email recipients (comma separated)"
						value={emailRecipients}
						onChange={(event) => setEmailRecipients(event.target.value)}
					/>
					<button className="btn-primary" disabled={actionLoading === 'email'} type="button" onClick={sendByEmail}>
						{actionLoading === 'email' ? 'Sending...' : 'Send by email'}
					</button>
					<button className="btn-secondary" type="button" onClick={handlePrint}>Print report</button>
				</div>
				{actionMessage && <p className="mt-3 text-sm font-semibold text-slate-600">{actionMessage}</p>}
			</section>

			<section>
				<h2 className="mb-2 text-sm font-black uppercase tracking-wide text-slate-700">Report Preview</h2>
				{title && <h3 className="mb-1 text-lg font-black text-slate-900">{title}</h3>}
				{generatedAt && <p className="mb-4 text-xs font-semibold text-slate-500">Generated {new Date(generatedAt).toLocaleString()}</p>}
				{error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

				<div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{summaryCards.map((card) => (
						<StatCard key={card.label} label={card.label} value={card.value} />
					))}
				</div>

				{!!chartData.length && (
					<section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
						<h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Charts (optional)</h3>
						<div className="space-y-3">
							{chartData.map((entry) => {
								const value = Number(entry.value || 0);
								const width = Math.max(8, Math.round((value / chartMax) * 100));
								return (
									<div key={entry.label}>
										<div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-600">
											<span className="capitalize">{normalizeLabel(entry.label)}</span>
											<span>{value}</span>
										</div>
										<div className="h-2 rounded bg-slate-100">
											<div className="h-2 rounded bg-blue-600" style={{ width: `${width}%` }} />
										</div>
									</div>
								);
							})}
						</div>
					</section>
				)}

				<DataTable
					empty={loading ? 'Loading report preview...' : 'No records found for selected filters.'}
					columns={columns}
					rows={rows}
				/>
			</section>
		</ModulePage>
	);
};

export default Reports;
