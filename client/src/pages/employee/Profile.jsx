import { useAuth } from '../../context/AuthContext.jsx';
// import EmployeeSettingsPanels from '../../components/employees/EmployeeSettingsPanels.jsx';
import {
  fallbackAvatar,
  formatDate,
  formatDateTime,
  initialsFromName,
  useEmployeeProfileSettings
} from '../../hooks/useEmployeeProfileSettings.js';
import ModulePage from '../shared/ModulePage.jsx';

const Profile = () => {
	const { refreshUser } = useAuth();
	const settings = useEmployeeProfileSettings({ refreshUser });

	const employeeName = settings.personalForm.name || settings.profile.user?.name || 'Employee';
	const currentPhoto = settings.personalForm.photoUrl || settings.profile.photoUrl || fallbackAvatar;
	const contactItems = [
		{ label: 'Email', value: settings.personalForm.email || '-' },
		{ label: 'Phone', value: settings.personalForm.phone || '-' },
		{ label: 'Joined', value: formatDate(settings.profile.joiningDate) },
		{ label: 'Manager', value: settings.profile.reportingManager?.name || '-' }
	];
	const workspaceStats = [
		{
			label: 'Employee ID',
			value: settings.profile.employeeCode || '--',
			accent: 'from-sky-500/20 via-blue-500/10 to-white',
			border: 'border-sky-200/80',
			badge: 'bg-sky-100 text-sky-700',
			shadow: 'shadow-[0_16px_30px_rgba(14,165,233,0.14)]',
			icon: (
				<svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
					<rect x="4.5" y="5.5" width="15" height="13" rx="2.5" />
					<path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5" />
				</svg>
			)
		},
		{
			label: 'Department',
			value: settings.profile.department || '--',
			accent: 'from-emerald-500/20 via-teal-500/10 to-white',
			border: 'border-emerald-200/80',
			badge: 'bg-emerald-100 text-emerald-700',
			shadow: 'shadow-[0_16px_30px_rgba(16,185,129,0.14)]',
			icon: (
				<svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" d="M4.75 18.25h14.5M6.25 18.25V9.5l5-3 5 3v8.75M9.5 18.25v-4.5h5v4.5" />
				</svg>
			)
		},
		{
			label: 'Designation',
			value: settings.profile.designation || '--',
			accent: 'from-violet-500/20 via-fuchsia-500/10 to-white',
			border: 'border-violet-200/80',
			badge: 'bg-violet-100 text-violet-700',
			shadow: 'shadow-[0_16px_30px_rgba(139,92,246,0.16)]',
			icon: (
				<svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75l7.5 4.25v8.25L12 20.5l-7.5-4.25V8zm0 0v8.25m0 0l7.5-4.25M12 12L4.5 7.75" />
				</svg>
			)
		}
	];
	const preferenceCount = Object.values(settings.preferencesForm).filter(Boolean).length;
	const activityItems = [
		{
			title: settings.profile.department ? `Assigned to ${settings.profile.department}` : 'Department pending',
			description: settings.profile.designation || 'Role details will appear here once assigned.',
			meta: settings.profile.employeeCode || 'Workspace record'
		},
		{
			title: settings.profile.reportingManager?.name ? `Reporting to ${settings.profile.reportingManager.name}` : 'Manager not assigned',
			description: settings.profile.reportingManager?.designation || 'Manager details will appear here.',
			meta: settings.profile.reportingManager?.employeeCode || 'Team structure'
		},
		{
			title: `${preferenceCount} notification channel${preferenceCount === 1 ? '' : 's'} active`,
			description: 'In-app and email preferences are synced with your workspace account.',
			meta: 'Preferences'
		},
		{
			title: settings.profile.photoUrl ? 'Profile photo added' : 'Add a profile photo',
			description: settings.profile.photoUrl ? 'Your avatar is visible across the workspace.' : 'Upload a photo URL for a complete profile card.',
			meta: formatDateTime(settings.profile.joiningDate)
		}
	];

	return (
		<ModulePage title="My Profile">
			{/* Only display info, no edit or settings panels */}
			<div className="space-y-6">
				<section className="surface-card-strong page-enter overflow-hidden rounded-[2rem]">
					<div className="h-32 bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 sm:h-40" />
					<div className="relative px-5 pb-6 sm:px-8">
						<div className="flex flex-col gap-5 sm:-mt-10 sm:flex-row sm:items-end sm:justify-between">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
								<div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.6rem] border-4 border-white bg-gradient-to-br from-indigo-200 to-violet-300 text-xl font-black text-slate-800 shadow-lg sm:h-28 sm:w-28">
									<img
										alt="Profile"
										className="h-full w-full object-cover"
										onError={(event) => {
											event.currentTarget.onerror = null;
											event.currentTarget.src = fallbackAvatar;
										}}
										src={currentPhoto}
									/>
								</div>
								<div className="space-y-1.5 pt-1">
									<div className="inline-flex w-fit items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-indigo-700">
										Employee profile
									</div>
									<h2 className="text-3xl font-semibold text-slate-950">{employeeName}</h2>
									<p className="text-sm text-slate-600">{settings.profile.designation || 'Team member'} {settings.profile.department ? `· ${settings.profile.department}` : ''}</p>
									<p className="text-sm text-slate-500">{settings.personalForm.address || 'Add your location and address details to complete your profile card.'}</p>
								</div>
							</div>
							{/* Removed edit and message buttons */}
						</div>

						<div className="mt-6 grid gap-3 sm:grid-cols-3">
							{workspaceStats.map((item) => (
								<div
									className={`group rounded-[1.7rem] border bg-gradient-to-br ${item.accent} px-4 py-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:${item.shadow} ${item.border}`}
									key={item.label}
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
											<p className="mt-2 text-lg font-semibold text-slate-900">{item.value}</p>
										</div>
										<div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${item.badge} transition duration-300 group-hover:scale-110`}>
											{item.icon}
										</div>
									</div>
									<div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/70">
										<div className="h-full w-2/3 rounded-full bg-slate-900/15 transition duration-300 group-hover:w-full" />
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				<div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
					<section className="surface-card group relative overflow-hidden rounded-[1.75rem] border border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/70 p-5 sm:p-6">
						<div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-indigo-400/10 blur-3xl transition duration-500 group-hover:scale-125" />
						<div className="pointer-events-none absolute -bottom-10 left-0 h-24 w-24 rounded-full bg-violet-400/10 blur-3xl transition duration-500 group-hover:scale-125" />
						<div className="relative flex items-center justify-between gap-3">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Identity overview</p>
								<h3 className="mt-1 text-2xl font-semibold text-slate-950">Personal</h3>
							</div>
							<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-black text-white shadow-[0_14px_26px_rgba(99,102,241,0.28)] transition duration-300 group-hover:scale-105 group-hover:rotate-3">
								{initialsFromName(employeeName)}
							</div>
						</div>
						<div className="relative mt-5 space-y-3">
							{contactItems.map((item) => (
								<div className="flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-[0_14px_26px_rgba(99,102,241,0.12)]" key={item.label}>
									<div>
										<span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</span>
										<div className="mt-2 h-1 w-10 rounded-full bg-gradient-to-r from-indigo-400/60 to-violet-400/50" />
									</div>
									<span className="text-right text-sm font-semibold text-slate-900">{item.value}</span>
								</div>
							))}
						</div>
						<div className="relative mt-5 overflow-hidden rounded-[1.4rem] border border-indigo-100/80 bg-gradient-to-r from-indigo-600 to-violet-600 p-[1px] shadow-[0_16px_28px_rgba(99,102,241,0.14)]">
							<div className="rounded-[1.32rem] bg-white/95 p-4">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Address</p>
										<p className="mt-2 text-sm text-slate-700">{settings.personalForm.address || 'No address added yet.'}</p>
									</div>
									<div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
										<svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25s6-5.272 6-10.125a6 6 0 10-12 0c0 4.853 6 10.125 6 10.125z" />
											<circle cx="12" cy="10.125" r="2.25" />
										</svg>
									</div>
								</div>
							</div>
						</div>
					</section>

					<section className="surface-card group relative overflow-hidden rounded-[1.75rem] border border-violet-100/80 bg-gradient-to-br from-white via-violet-50/55 to-fuchsia-50/70 p-5 sm:p-6">
						<div className="pointer-events-none absolute left-0 top-0 h-28 w-28 rounded-full bg-violet-400/10 blur-3xl transition duration-500 group-hover:scale-125" />
						<div className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 rounded-full bg-fuchsia-400/10 blur-3xl transition duration-500 group-hover:scale-125" />
						<div className="relative flex items-center justify-between gap-3">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Workspace timeline</p>
								<h3 className="mt-1 text-2xl font-semibold text-slate-950">Recent activity</h3>
							</div>
							<div className="rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-violet-700 shadow-sm">
								{activityItems.length} updates
							</div>
						</div>
						<div className="relative mt-5 space-y-3">
							{activityItems.map((item, index) => (
								<div className="flex gap-4 rounded-[1.4rem] border border-white/80 bg-white/75 px-4 py-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white hover:shadow-[0_16px_30px_rgba(168,85,247,0.14)]" key={`${item.title}-${index}`}>
									<div className="flex flex-col items-center">
										<span className="mt-1 h-3.5 w-3.5 rounded-full border-2 border-violet-200 bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_0_0_4px_rgba(245,243,255,1)]" />
										{index < activityItems.length - 1 ? <span className="mt-2 h-full w-px bg-gradient-to-b from-violet-200 via-fuchsia-100 to-transparent" /> : null}
									</div>
									<div className="min-w-0 flex-1 pb-1">
										<p className="text-base font-semibold text-slate-900">{item.title}</p>
										<p className="text-sm text-slate-600">{item.description}</p>
										<div className="mt-2 inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
											{item.meta}
										</div>
									</div>
								</div>
							))}
						</div>
					</section>
				</div>
				{/* Removed EmployeeSettingsPanels and all edit/account/job/profile photo sections */}
			</div>
		</ModulePage>
	);
};

export default Profile;