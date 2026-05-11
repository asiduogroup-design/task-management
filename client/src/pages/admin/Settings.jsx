import { useEffect, useState } from 'react';
import { settingsService } from '../../services/settingsService.js';
import ModulePage from '../shared/ModulePage.jsx';

const defaultSettings = {
	companySettings: {
		companyName: '',
		logo: '',
		address: '',
		contactEmail: ''
	},
	attendanceSettings: {
		workStartTime: '09:30',
		workEndTime: '18:30',
		lateLoginLimit: '09:45',
		minimumWorkingHours: 8,
		autoLogoutEnabled: false,
		autoLogoutAfterMinutes: 0
	},
	rolePermissionSettings: {
		adminPermissions: {
			viewDashboard: true,
			manageEmployees: true,
			manageAttendance: true,
			manageProjects: true,
			manageTasks: true,
			manageLeaves: true,
			manageReports: true,
			manageSettings: true
		},
		managerPermissions: {
			viewDashboard: true,
			manageEmployees: false,
			manageAttendance: false,
			manageProjects: true,
			manageTasks: true,
			manageLeaves: false,
			manageReports: true,
			manageSettings: false
		},
		employeePermissions: {
			viewDashboard: true,
			manageEmployees: false,
			manageAttendance: false,
			manageProjects: false,
			manageTasks: true,
			manageLeaves: true,
			manageReports: false,
			manageSettings: false
		}
	},
	taskSettings: {
		defaultTaskStatuses: ['draft', 'to_do', 'in_progress', 'under_review', 'completed', 'reopened', 'overdue'],
		priorityLevels: ['low', 'medium', 'high', 'urgent'],
		deadlineReminderHours: 24
	},
	notificationSettings: {
		emailNotifications: true,
		inAppNotifications: true,
		dailyReportReminders: false
	}
};

const normalizeSettings = (value = {}) => {
	const source = value || {};

	return {
		companySettings: {
			...defaultSettings.companySettings,
			...(source.companySettings || {}),
			companyName: source.companySettings?.companyName || source.companyName || defaultSettings.companySettings.companyName,
			logo: source.companySettings?.logo || source.companyLogo || defaultSettings.companySettings.logo,
			address: source.companySettings?.address || source.companyAddress || defaultSettings.companySettings.address,
			contactEmail: source.companySettings?.contactEmail || source.contactEmail || defaultSettings.companySettings.contactEmail
		},
		attendanceSettings: {
			...defaultSettings.attendanceSettings,
			...(source.attendanceSettings || {}),
			workStartTime: source.attendanceSettings?.workStartTime || source.workStartTime || defaultSettings.attendanceSettings.workStartTime,
			workEndTime: source.attendanceSettings?.workEndTime || source.workEndTime || defaultSettings.attendanceSettings.workEndTime,
			lateLoginLimit: source.attendanceSettings?.lateLoginLimit || source.lateLoginLimit || defaultSettings.attendanceSettings.lateLoginLimit,
			minimumWorkingHours: Number(source.attendanceSettings?.minimumWorkingHours ?? source.minimumWorkingHours ?? defaultSettings.attendanceSettings.minimumWorkingHours),
			autoLogoutEnabled: Boolean(source.attendanceSettings?.autoLogoutEnabled ?? source.autoLogoutEnabled ?? defaultSettings.attendanceSettings.autoLogoutEnabled),
			autoLogoutAfterMinutes: Number(source.attendanceSettings?.autoLogoutAfterMinutes ?? defaultSettings.attendanceSettings.autoLogoutAfterMinutes)
		},
		rolePermissionSettings: {
			adminPermissions: {
				...defaultSettings.rolePermissionSettings.adminPermissions,
				...(source.rolePermissionSettings?.adminPermissions || {})
			},
			managerPermissions: {
				...defaultSettings.rolePermissionSettings.managerPermissions,
				...(source.rolePermissionSettings?.managerPermissions || {})
			},
			employeePermissions: {
				...defaultSettings.rolePermissionSettings.employeePermissions,
				...(source.rolePermissionSettings?.employeePermissions || {})
			}
		},
		taskSettings: {
			...defaultSettings.taskSettings,
			...(source.taskSettings || {}),
			defaultTaskStatuses:
				Array.isArray(source.taskSettings?.defaultTaskStatuses) && source.taskSettings.defaultTaskStatuses.length
					? source.taskSettings.defaultTaskStatuses
					: defaultSettings.taskSettings.defaultTaskStatuses,
			priorityLevels:
				Array.isArray(source.taskSettings?.priorityLevels) && source.taskSettings.priorityLevels.length
					? source.taskSettings.priorityLevels
					: defaultSettings.taskSettings.priorityLevels,
			deadlineReminderHours: Number(source.taskSettings?.deadlineReminderHours ?? defaultSettings.taskSettings.deadlineReminderHours)
		},
		notificationSettings: {
			...defaultSettings.notificationSettings,
			...(source.notificationSettings || {})
		}
	};
};

const permissionFields = [
	{ key: 'viewDashboard', label: 'View dashboard' },
	{ key: 'manageEmployees', label: 'Manage employees' },
	{ key: 'manageAttendance', label: 'Manage attendance' },
	{ key: 'manageProjects', label: 'Manage projects' },
	{ key: 'manageTasks', label: 'Manage tasks' },
	{ key: 'manageLeaves', label: 'Manage leaves' },
	{ key: 'manageReports', label: 'Manage reports' },
	{ key: 'manageSettings', label: 'Manage settings' }
];

const parseList = (value, fallback) => {
	const next = String(value || '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
	return next.length ? next : fallback;
};

const Toggle = ({ checked, label, onChange }) => (
	<label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
		<span>{label}</span>
		<input checked={checked} onChange={onChange} type="checkbox" />
	</label>
);

const Settings = () => {
	const [form, setForm] = useState(defaultSettings);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');

	const [statusesInput, setStatusesInput] = useState(defaultSettings.taskSettings.defaultTaskStatuses.join(', '));
	const [prioritiesInput, setPrioritiesInput] = useState(defaultSettings.taskSettings.priorityLevels.join(', '));

	const loadSettings = async () => {
		setLoading(true);
		setError('');
		try {
			const { data } = await settingsService.get();
			const settings = normalizeSettings(data.settings || defaultSettings);
			setForm(settings);
			setStatusesInput((settings.taskSettings?.defaultTaskStatuses || defaultSettings.taskSettings.defaultTaskStatuses).join(', '));
			setPrioritiesInput((settings.taskSettings?.priorityLevels || defaultSettings.taskSettings.priorityLevels).join(', '));
		} catch {
			setError('Unable to load settings.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadSettings();
	}, []);

	const setSectionField = (section, key, value) => {
		setForm((current) => ({
			...current,
			[section]: {
				...(current[section] || defaultSettings[section] || {}),
				[key]: value
			}
		}));
	};

	const setPermission = (roleKey, permissionKey, value) => {
		setForm((current) => ({
			...current,
			rolePermissionSettings: {
				...(current.rolePermissionSettings || defaultSettings.rolePermissionSettings),
				[roleKey]: {
					...((current.rolePermissionSettings && current.rolePermissionSettings[roleKey]) || defaultSettings.rolePermissionSettings[roleKey]),
					[permissionKey]: value
				}
			}
		}));
	};

	const handleSave = async () => {
		setSaving(true);
		setError('');
		setMessage('');

		try {
			const payload = {
				...form,
				attendanceSettings: {
					...form.attendanceSettings,
					minimumWorkingHours: Number(form.attendanceSettings.minimumWorkingHours || 0),
					autoLogoutAfterMinutes: Number(form.attendanceSettings.autoLogoutAfterMinutes || 0)
				},
				taskSettings: {
					...form.taskSettings,
					defaultTaskStatuses: parseList(statusesInput, defaultSettings.taskSettings.defaultTaskStatuses),
					priorityLevels: parseList(prioritiesInput, defaultSettings.taskSettings.priorityLevels),
					deadlineReminderHours: Number(form.taskSettings.deadlineReminderHours || 0)
				}
			};

			const { data } = await settingsService.update(payload);
			const normalized = normalizeSettings(data.settings || payload);
			setForm(normalized);
			setStatusesInput((normalized.taskSettings?.defaultTaskStatuses || payload.taskSettings.defaultTaskStatuses).join(', '));
			setPrioritiesInput((normalized.taskSettings?.priorityLevels || payload.taskSettings.priorityLevels).join(', '));
			setMessage('Settings updated successfully.');
		} catch (err) {
			setError(err.response?.data?.message || 'Unable to update settings.');
		} finally {
			setSaving(false);
		}
	};

	return (
		<ModulePage
			title="Settings"
			actions={(
				<button className="btn-primary" disabled={saving || loading} onClick={handleSave} type="button">
					{saving ? 'Saving...' : 'Save settings'}
				</button>
			)}
		>
			{error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
			{message && <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p>}

			<section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
				<h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Company Settings</h2>
				<div className="grid gap-3 sm:grid-cols-2">
					<input className="form-field" placeholder="Company name" value={form.companySettings.companyName} onChange={(e) => setSectionField('companySettings', 'companyName', e.target.value)} />
					<input className="form-field" placeholder="Logo URL" value={form.companySettings.logo} onChange={(e) => setSectionField('companySettings', 'logo', e.target.value)} />
					<input className="form-field sm:col-span-2" placeholder="Address" value={form.companySettings.address} onChange={(e) => setSectionField('companySettings', 'address', e.target.value)} />
					<input className="form-field sm:col-span-2" placeholder="Contact email" type="email" value={form.companySettings.contactEmail} onChange={(e) => setSectionField('companySettings', 'contactEmail', e.target.value)} />
				</div>
			</section>

			<section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
				<h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Attendance Settings</h2>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<label className="block">
						<span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Work start time</span>
						<input className="form-field" type="time" value={form.attendanceSettings.workStartTime} onChange={(e) => setSectionField('attendanceSettings', 'workStartTime', e.target.value)} />
					</label>
					<label className="block">
						<span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Work end time</span>
						<input className="form-field" type="time" value={form.attendanceSettings.workEndTime} onChange={(e) => setSectionField('attendanceSettings', 'workEndTime', e.target.value)} />
					</label>
					<label className="block">
						<span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Late login limit</span>
						<input className="form-field" type="time" value={form.attendanceSettings.lateLoginLimit} onChange={(e) => setSectionField('attendanceSettings', 'lateLoginLimit', e.target.value)} />
					</label>
					<label className="block">
						<span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Minimum working hours</span>
						<input className="form-field" min="0" step="0.5" type="number" value={form.attendanceSettings.minimumWorkingHours} onChange={(e) => setSectionField('attendanceSettings', 'minimumWorkingHours', e.target.value)} />
					</label>
					<label className="block">
						<span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Auto logout after minutes</span>
						<input className="form-field" min="0" step="1" type="number" value={form.attendanceSettings.autoLogoutAfterMinutes} onChange={(e) => setSectionField('attendanceSettings', 'autoLogoutAfterMinutes', e.target.value)} />
					</label>
					<div className="flex items-end">
						<Toggle
							checked={!!form.attendanceSettings.autoLogoutEnabled}
							label="Auto logout setting"
							onChange={(e) => setSectionField('attendanceSettings', 'autoLogoutEnabled', e.target.checked)}
						/>
					</div>
				</div>
			</section>

			<section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
				<h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Role and Permission Settings</h2>
				<div className="grid gap-4 lg:grid-cols-3">
					{[
						['adminPermissions', 'Admin permissions'],
						['managerPermissions', 'Manager permissions'],
						['employeePermissions', 'Employee permissions']
					].map(([roleKey, title]) => (
						<article className="rounded-md border border-slate-200 p-3" key={roleKey}>
							<h3 className="mb-2 text-sm font-black text-slate-900">{title}</h3>
							<div className="space-y-2">
								{permissionFields.map((field) => (
									<Toggle
										checked={!!form.rolePermissionSettings[roleKey][field.key]}
										key={field.key}
										label={field.label}
										onChange={(e) => setPermission(roleKey, field.key, e.target.checked)}
									/>
								))}
							</div>
						</article>
					))}
				</div>
			</section>

			<section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
				<h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Task Settings</h2>
				<div className="grid gap-3 sm:grid-cols-2">
					<label className="block sm:col-span-2">
						<span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Default task statuses (comma separated)</span>
						<input className="form-field" placeholder="draft, to_do, in_progress" value={statusesInput} onChange={(e) => setStatusesInput(e.target.value)} />
					</label>
					<label className="block sm:col-span-2">
						<span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Priority levels (comma separated)</span>
						<input className="form-field" placeholder="low, medium, high, urgent" value={prioritiesInput} onChange={(e) => setPrioritiesInput(e.target.value)} />
					</label>
					<label className="block">
						<span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Deadline reminder settings (hours before deadline)</span>
						<input className="form-field" min="0" step="1" type="number" value={form.taskSettings.deadlineReminderHours} onChange={(e) => setSectionField('taskSettings', 'deadlineReminderHours', e.target.value)} />
					</label>
				</div>
			</section>

			<section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
				<h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">Notification Settings</h2>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<Toggle checked={!!form.notificationSettings.emailNotifications} label="Email notifications" onChange={(e) => setSectionField('notificationSettings', 'emailNotifications', e.target.checked)} />
					<Toggle checked={!!form.notificationSettings.inAppNotifications} label="In-app notifications" onChange={(e) => setSectionField('notificationSettings', 'inAppNotifications', e.target.checked)} />
					<Toggle checked={!!form.notificationSettings.dailyReportReminders} label="Daily report reminders" onChange={(e) => setSectionField('notificationSettings', 'dailyReportReminders', e.target.checked)} />
				</div>
			</section>
		</ModulePage>
	);
};

export default Settings;
