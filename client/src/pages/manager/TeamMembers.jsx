import { useEffect, useMemo, useState } from 'react';
import SearchFilterBar from '../../components/common/SearchFilterBar.jsx';
import { projectService } from '../../services/projectService.js';
import ModulePage from '../shared/ModulePage.jsx';

const TeamMembers = () => {
	const [projects, setProjects] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [search, setSearch] = useState('');
	const [roleFilter, setRoleFilter] = useState('');

	useEffect(() => {
		let active = true;

		const loadProjects = async () => {
			setLoading(true);
			setError('');

			try {
				const { data } = await projectService.list();
				if (!active) return;
				setProjects(data.projects || []);
			} catch (loadError) {
				if (!active) return;
				setError(loadError.response?.data?.message || 'Unable to load team members.');
			} finally {
				if (active) setLoading(false);
			}
		};

		loadProjects();

		return () => {
			active = false;
		};
	}, []);

	const members = useMemo(() => {
		const map = new Map();

		projects.forEach((project) => {
			(project.assignedEmployees || []).forEach((member) => {
				const key = member?._id ? String(member._id) : `${member?.name || 'member'}:${member?.role || 'member'}`;
				if (!map.has(key)) {
					map.set(key, {
						id: key,
						name: member?.name || 'Unassigned member',
						role: member?.role || 'member',
						projects: []
					});
				}

				map.get(key).projects.push({
					id: project._id,
					name: project.name || project.projectCode || 'Project',
					code: project.projectCode || '',
					status: project.displayStatus || project.status || 'active'
				});
			});
		});

		return Array.from(map.values()).sort((left, right) => left.name.localeCompare(right.name));
	}, [projects]);

	const roleOptions = useMemo(() => {
		const roles = Array.from(new Set(members.map((member) => member.role).filter(Boolean)));
		return roles.sort();
	}, [members]);

	const filteredMembers = useMemo(() => {
		return members.filter((member) => {
			const matchesSearch = !search || member.name.toLowerCase().includes(search.toLowerCase());
			const matchesRole = !roleFilter || member.role === roleFilter;
			return matchesSearch && matchesRole;
		});
	}, [members, roleFilter, search]);

	return (
		<ModulePage title="Team Members">
			<section className="mb-4 grid gap-4 sm:grid-cols-3">
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Projects managed</p><p className="mt-2 text-2xl font-bold text-slate-900">{projects.length}</p></article>
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Distinct team members</p><p className="mt-2 text-2xl font-bold text-slate-900">{members.length}</p></article>
				<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">Filtered results</p><p className="mt-2 text-2xl font-bold text-slate-900">{filteredMembers.length}</p></article>
			</section>

			<SearchFilterBar search={search} setSearch={setSearch}>
				<select className="form-field md:max-w-xs" id="managerTeamRole" name="managerTeamRole" onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}>
					<option value="">All roles</option>
					{roleOptions.map((role) => (
						<option key={role} value={role}>{role}</option>
					))}
				</select>
			</SearchFilterBar>

			{error ? <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
			{loading ? <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">Loading team members...</p> : null}
			{!loading && !filteredMembers.length ? <p className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">No team members found.</p> : null}

			<section className="space-y-3">
				{filteredMembers.map((member) => (
					<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" key={member.id}>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div>
								<h3 className="text-lg font-black text-slate-900">{member.name}</h3>
								<p className="text-sm capitalize text-slate-600">Role: {member.role.replaceAll('_', ' ')}</p>
							</div>
							<p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{member.projects.length} project(s)</p>
						</div>

						<div className="mt-3 flex flex-wrap gap-2">
							{member.projects.map((project) => (
								<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700" key={`${member.id}-${project.id}`}>
									{project.code ? `${project.code} - ` : ''}{project.name}
								</span>
							))}
						</div>
					</article>
				))}
			</section>
		</ModulePage>
	);
};

export default TeamMembers;
