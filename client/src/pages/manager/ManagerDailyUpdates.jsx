import { useEffect, useMemo, useState } from 'react';
import SearchFilterBar from '../../components/common/SearchFilterBar.jsx';
import { dailyUpdateService } from '../../services/dailyUpdateService.js';
import { projectService } from '../../services/projectService.js';
import ModulePage from '../shared/ModulePage.jsx';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');

const ManagerDailyUpdates = () => {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [updates, setUpdates] = useState([]);
	const [projectOptions, setProjectOptions] = useState([]);
	const [search, setSearch] = useState('');
	const [projectId, setProjectId] = useState('');
	const [reportType, setReportType] = useState('');

	useEffect(() => {
		let active = true;

		const loadUpdates = async () => {
			setLoading(true);
			setError('');

			try {
				const [projectsRes, updatesRes] = await Promise.all([projectService.list(), dailyUpdateService.list()]);
				if (!active) return;

				const projects = projectsRes.data?.projects || [];
				const allowedProjectIds = new Set(projects.map((project) => String(project._id)));
				const scopedUpdates = (updatesRes.data?.updates || []).filter((update) => {
					const directProjectId = update.projectId?._id || update.projectId;
					const taskProjectId = update.taskId?.projectId?._id || update.taskId?.projectId;

					if (!allowedProjectIds.size) return true;
					if (directProjectId && allowedProjectIds.has(String(directProjectId))) return true;
					if (taskProjectId && allowedProjectIds.has(String(taskProjectId))) return true;
					return false;
				});

				setProjectOptions(projects.map((project) => ({ value: project._id, label: project.name || project.projectCode || 'Project' })));
				setUpdates(scopedUpdates);
			} catch (loadError) {
				if (!active) return;
				setError(loadError.response?.data?.message || 'Unable to load daily updates.');
			} finally {
				if (active) setLoading(false);
			}
		};

		loadUpdates();

		return () => {
			active = false;
		};
	}, []);

	const filteredUpdates = useMemo(() => {
		return updates.filter((update) => {
			const employeeName = update.employeeId?.userId?.name || update.employeeId?.employeeCode || '';
			const project = update.projectId?.name || update.taskId?.projectId?.name || '';
			const content = [employeeName, project, update.workDescription || ''].join(' ').toLowerCase();
			const matchesSearch = !search || content.includes(search.toLowerCase());
			const matchesProject = !projectId || String(update.projectId?._id || update.projectId || update.taskId?.projectId?._id || update.taskId?.projectId || '') === projectId;
			const matchesType = !reportType || update.reportType === reportType;
			return matchesSearch && matchesProject && matchesType;
		});
	}, [projectId, reportType, search, updates]);

	return (
		<ModulePage title="Daily Updates">
			<section className="mb-4 grid gap-4 sm:grid-cols-3">
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Visible updates</p><p className="mt-2 text-2xl font-bold text-slate-900">{filteredUpdates.length}</p></article>
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Daily reports</p><p className="mt-2 text-2xl font-bold text-slate-900">{filteredUpdates.filter((item) => item.reportType === 'daily_report').length}</p></article>
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Task logs</p><p className="mt-2 text-2xl font-bold text-slate-900">{filteredUpdates.filter((item) => item.reportType === 'task_log').length}</p></article>
			</section>

			<SearchFilterBar search={search} setSearch={setSearch}>
				<select className="form-field md:max-w-xs" id="managerDailyProject" name="managerDailyProject" onChange={(event) => setProjectId(event.target.value)} value={projectId}>
					<option value="">All projects</option>
					{projectOptions.map((project) => (
						<option key={project.value} value={project.value}>{project.label}</option>
					))}
				</select>

				<select className="form-field md:max-w-xs" id="managerDailyType" name="managerDailyType" onChange={(event) => setReportType(event.target.value)} value={reportType}>
					<option value="">All report types</option>
					<option value="daily_report">Daily report</option>
					<option value="task_log">Task log</option>
				</select>
			</SearchFilterBar>

			{error ? <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
			{loading ? <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">Loading daily updates...</p> : null}
			{!loading && !filteredUpdates.length ? <p className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">No daily updates found.</p> : null}

			<section className="space-y-3">
				{filteredUpdates.map((update) => (
					<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" key={update._id}>
						<div className="flex flex-wrap items-start justify-between gap-2">
							<div>
								<h3 className="text-lg font-black text-slate-900">{update.employeeId?.userId?.name || update.employeeId?.employeeCode || 'Team update'}</h3>
								<p className="text-sm text-slate-600">Project: {update.projectId?.name || update.taskId?.projectId?.name || '-'}</p>
							</div>
							<div className="text-right text-xs text-slate-600">
								<p className="font-semibold uppercase tracking-wide">{(update.reportType || 'daily_report').replaceAll('_', ' ')}</p>
								<p>{formatDate(update.date)}</p>
							</div>
						</div>

						{update.workDescription ? <p className="mt-3 text-sm text-slate-700">{update.workDescription}</p> : null}

						<div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-3">
							<p>Time spent: <span className="font-semibold text-slate-900">{Number(update.timeSpent || 0).toFixed(2)} h</span></p>
							<p>Status: <span className="font-semibold text-slate-900">{(update.status || 'submitted').replaceAll('_', ' ')}</span></p>
							<p>Task: <span className="font-semibold text-slate-900">{update.taskId?.title || '-'}</span></p>
						</div>
					</article>
				))}
			</section>
		</ModulePage>
	);
};

export default ManagerDailyUpdates;
