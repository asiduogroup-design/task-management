import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../../components/common/StatCard.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { dailyUpdateService } from '../../services/dailyUpdateService.js';
import { projectService } from '../../services/projectService.js';
import { taskService } from '../../services/taskService.js';
import ModulePage from '../shared/ModulePage.jsx';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');

const ManagerDashboard = () => {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [projects, setProjects] = useState([]);
	const [taskSummary, setTaskSummary] = useState({});
	const [tasksForReview, setTasksForReview] = useState([]);
	const [updates, setUpdates] = useState([]);

	useEffect(() => {
		let active = true;

		const loadDashboard = async () => {
			setLoading(true);
			setError('');

			try {
				const [projectRes, summaryRes, tasksRes, updatesRes] = await Promise.all([
					projectService.list(),
					taskService.summary(),
					taskService.list({ status: 'under_review' }),
					dailyUpdateService.list()
				]);

				if (!active) return;

				setProjects(projectRes.data?.projects || []);
				setTaskSummary(summaryRes.data?.summary || {});
				setTasksForReview(tasksRes.data?.tasks || []);
				setUpdates(updatesRes.data?.updates || []);
			} catch (loadError) {
				if (!active) return;
				setError(loadError.response?.data?.message || 'Unable to load manager dashboard data.');
			} finally {
				if (active) setLoading(false);
			}
		};

		loadDashboard();

		return () => {
			active = false;
		};
	}, []);

	const dashboardStats = useMemo(() => {
		const now = new Date();
		const activeProjects = projects.filter((project) => ['not_started', 'active', 'planning'].includes(project.status)).length;
		const overdueProjects = projects.filter(
			(project) => project.deadline && !['completed', 'cancelled', 'archived'].includes(project.status) && new Date(project.deadline) < now
		).length;

		const teamMembers = new Set();
		projects.forEach((project) => {
			(project.assignedEmployees || []).forEach((member) => {
				if (member?._id) teamMembers.add(String(member._id));
			});
		});

		return {
			totalProjects: projects.length,
			activeProjects,
			overdueProjects,
			tasksForReview: tasksForReview.length,
			teamMembers: teamMembers.size,
			openTasks: taskSummary.notStartedTasks || 0,
			inProgressTasks: taskSummary.inProgressTasks || 0
		};
	}, [projects, taskSummary, tasksForReview]);

	const recentUpdates = useMemo(() => updates.slice(0, 5), [updates]);
	const projectSpotlight = useMemo(() => projects.slice(0, 4), [projects]);

	return (
		<ModulePage title="Manager Dashboard">
			{error ? <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}

			<section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard label="Assigned projects" value={loading ? '...' : dashboardStats.totalProjects} />
				<StatCard label="Active projects" value={loading ? '...' : dashboardStats.activeProjects} />
				<StatCard label="Tasks in review" value={loading ? '...' : dashboardStats.tasksForReview} />
				<StatCard label="Team members" value={loading ? '...' : dashboardStats.teamMembers} />
			</section>

			<section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<StatCard label="Overdue projects" value={loading ? '...' : dashboardStats.overdueProjects} />
				<StatCard label="To do tasks" value={loading ? '...' : dashboardStats.openTasks} />
				<StatCard label="In progress tasks" value={loading ? '...' : dashboardStats.inProgressTasks} />
			</section>

			<section className="mb-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h3 className="text-lg font-black text-slate-900">Quick actions</h3>
					<div className="flex flex-wrap gap-2">
						<Link className="btn-primary" to="/manager/tasks/add">Create task</Link>
						<Link className="btn-secondary" to="/manager/review-tasks">Review queue</Link>
						<Link className="btn-secondary" to="/manager/daily-updates">Daily updates</Link>
					</div>
				</div>
			</section>

			<div className="grid gap-6 xl:grid-cols-2">
				<section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
					<div className="mb-3 flex items-center justify-between gap-3">
						<h3 className="text-lg font-black text-slate-900">Projects spotlight</h3>
						<Link className="text-sm font-semibold text-blue-700" to="/manager/projects">View all</Link>
					</div>

					{loading ? <p className="text-sm text-slate-600">Loading projects...</p> : null}
					{!loading && !projectSpotlight.length ? <p className="text-sm text-slate-500">No assigned projects found.</p> : null}

					<div className="space-y-3">
						{projectSpotlight.map((project) => (
							<article className="rounded-md border border-slate-200 bg-slate-50 p-3" key={project._id}>
								<div className="flex items-start justify-between gap-3">
									<div>
										<h4 className="font-bold text-slate-900">{project.name}</h4>
										<p className="text-xs text-slate-600">{project.projectCode || 'Project'}</p>
									</div>
									<StatusBadge status={project.displayStatus || project.status} />
								</div>
								<p className="mt-2 text-xs text-slate-600">Deadline: {formatDate(project.deadline)}</p>
							</article>
						))}
					</div>
				</section>

				<section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
					<div className="mb-3 flex items-center justify-between gap-3">
						<h3 className="text-lg font-black text-slate-900">Recent daily updates</h3>
						<Link className="text-sm font-semibold text-blue-700" to="/manager/daily-updates">View all</Link>
					</div>

					{loading ? <p className="text-sm text-slate-600">Loading updates...</p> : null}
					{!loading && !recentUpdates.length ? <p className="text-sm text-slate-500">No updates submitted yet.</p> : null}

					<div className="space-y-3">
						{recentUpdates.map((item) => (
							<article className="rounded-md border border-slate-200 bg-slate-50 p-3" key={item._id}>
								<p className="text-sm font-semibold text-slate-900">{item.employeeId?.userId?.name || item.employeeId?.employeeCode || 'Employee update'}</p>
								<p className="text-xs text-slate-600">Project: {item.projectId?.name || item.taskId?.projectId?.name || '-'}</p>
								<p className="text-xs text-slate-600">Date: {formatDate(item.date)}</p>
							</article>
						))}
					</div>
				</section>
			</div>
		</ModulePage>
	);
};

export default ManagerDashboard;
