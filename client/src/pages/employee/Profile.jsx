import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { employeeService } from '../../services/employeeService.js';
import ModulePage from '../shared/ModulePage.jsx';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');
const fallbackAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#e2e8f0"/><circle cx="60" cy="46" r="22" fill="#94a3b8"/><rect x="22" y="78" width="76" height="30" rx="15" fill="#94a3b8"/></svg>'
)}`;

const defaultProfile = {
	user: {
		name: '',
		email: '',
		notificationPreferences: {
			inAppNotifications: true,
			emailNotifications: true,
			taskUpdates: true,
			leaveUpdates: true
		}
	},
	employeeCode: '',
	department: '',
	designation: '',
	joiningDate: '',
	reportingManager: null,
	phone: '',
	address: '',
	photoUrl: ''
};

const Profile = () => {
	const { refreshUser } = useAuth();
	const [profile, setProfile] = useState(defaultProfile);
	const [personalForm, setPersonalForm] = useState({
		name: '',
		email: '',
		phone: '',
		address: '',
		photoUrl: ''
	});
	const [photoForm, setPhotoForm] = useState({ photoUrl: '' });
	const [passwordForm, setPasswordForm] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	});
	const [preferencesForm, setPreferencesForm] = useState({
		inAppNotifications: true,
		emailNotifications: true,
		taskUpdates: true,
		leaveUpdates: true
	});
	const [loading, setLoading] = useState(false);
	const [busy, setBusy] = useState('');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const loadProfile = async () => {
		setLoading(true);
		setError('');

		try {
			const { data } = await employeeService.myProfile();
			const nextProfile = data.profile || defaultProfile;

			setProfile(nextProfile);
			setPersonalForm({
				name: nextProfile.user?.name || '',
				email: nextProfile.user?.email || '',
				phone: nextProfile.phone || '',
				address: nextProfile.address || '',
				photoUrl: nextProfile.photoUrl || ''
			});
			setPhotoForm({ photoUrl: nextProfile.photoUrl || '' });
			setPreferencesForm({
				inAppNotifications: nextProfile.user?.notificationPreferences?.inAppNotifications ?? true,
				emailNotifications: nextProfile.user?.notificationPreferences?.emailNotifications ?? true,
				taskUpdates: nextProfile.user?.notificationPreferences?.taskUpdates ?? true,
				leaveUpdates: nextProfile.user?.notificationPreferences?.leaveUpdates ?? true
			});
		} catch (err) {
			setError(err.response?.data?.message || 'Unable to load profile.');
			setProfile(defaultProfile);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadProfile();
	}, []);

	const onSavePersonalDetails = async (event) => {
		event.preventDefault();
		setBusy('personal');
		setError('');
		setSuccess('');

		try {
			await employeeService.updateMyProfile({
				name: personalForm.name,
				email: personalForm.email,
				phone: personalForm.phone,
				address: personalForm.address,
				photoUrl: personalForm.photoUrl
			});
			await refreshUser();
			setSuccess('Personal details updated successfully.');
			await loadProfile();
		} catch (err) {
			setError(err.response?.data?.message || 'Unable to update personal details.');
		} finally {
			setBusy('');
		}
	};

	const onChangePassword = async (event) => {
		event.preventDefault();
		setBusy('password');
		setError('');
		setSuccess('');

		try {
			await employeeService.changeMyPassword(passwordForm);
			setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
			setSuccess('Password changed successfully.');
		} catch (err) {
			setError(err.response?.data?.message || 'Unable to change password.');
		} finally {
			setBusy('');
		}
	};

	const onSavePreferences = async (event) => {
		event.preventDefault();
		setBusy('preferences');
		setError('');
		setSuccess('');

		try {
			await employeeService.updateMyNotificationPreferences(preferencesForm);
			setSuccess('Notification preferences updated successfully.');
			await loadProfile();
		} catch (err) {
			setError(err.response?.data?.message || 'Unable to update notification preferences.');
		} finally {
			setBusy('');
		}
	};

	const onUpdatePhoto = async (event) => {
		event.preventDefault();
		setBusy('photo');
		setError('');
		setSuccess('');

		try {
			await employeeService.updateMyProfile({ photoUrl: photoForm.photoUrl });
			setSuccess('Profile photo updated successfully.');
			await loadProfile();
		} catch (err) {
			setError(err.response?.data?.message || 'Unable to update profile photo.');
		} finally {
			setBusy('');
		}
	};

	return (
		<ModulePage title="My Profile">
			{error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
			{success ? <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</p> : null}

			<section className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
				<h2 className="text-lg font-black text-slate-950">1. Personal Details</h2>

				<div className="mt-3 flex flex-wrap items-center gap-4 rounded-md bg-slate-50 p-4">
					<img
						alt="Profile"
						className="h-20 w-20 rounded-full border border-slate-200 object-cover"
						onError={(event) => {
							event.currentTarget.onerror = null;
							event.currentTarget.src = fallbackAvatar;
						}}
						src={personalForm.photoUrl || fallbackAvatar}
					/>
					<div>
						<p className="text-sm font-semibold text-slate-900">{personalForm.name || 'Employee'}</p>
						<p className="text-sm text-slate-600">{personalForm.email || '-'}</p>
					</div>
				</div>

				<form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onSavePersonalDetails}>
					<label className="block">
						<span className="mb-1 block text-sm font-bold text-slate-700">Name</span>
						<input className="form-field" id="profileName" name="name" onChange={(event) => setPersonalForm((current) => ({ ...current, name: event.target.value }))} required value={personalForm.name} />
					</label>

					<label className="block">
						<span className="mb-1 block text-sm font-bold text-slate-700">Email</span>
						<input className="form-field" id="profileEmail" name="email" onChange={(event) => setPersonalForm((current) => ({ ...current, email: event.target.value }))} required type="email" value={personalForm.email} />
					</label>

					<label className="block">
						<span className="mb-1 block text-sm font-bold text-slate-700">Phone number</span>
						<input className="form-field" id="profilePhone" name="phone" onChange={(event) => setPersonalForm((current) => ({ ...current, phone: event.target.value }))} value={personalForm.phone} />
					</label>

					<label className="block">
						<span className="mb-1 block text-sm font-bold text-slate-700">Photo URL</span>
						<input className="form-field" id="profilePhotoUrl" name="photoUrl" onChange={(event) => setPersonalForm((current) => ({ ...current, photoUrl: event.target.value }))} value={personalForm.photoUrl} />
					</label>

					<label className="block md:col-span-2">
						<span className="mb-1 block text-sm font-bold text-slate-700">Address</span>
						<textarea className="form-field min-h-20" id="profileAddress" name="address" onChange={(event) => setPersonalForm((current) => ({ ...current, address: event.target.value }))} value={personalForm.address} />
					</label>

					<div className="md:col-span-2">
						<button className="btn-primary" disabled={busy === 'personal' || loading} type="submit">{busy === 'personal' ? 'Saving...' : 'Save personal details'}</button>
					</div>
				</form>
			</section>

			<section className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
				<h2 className="text-lg font-black text-slate-950">2. Job Details</h2>

				<div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					<article className="rounded-md bg-slate-50 p-3">
						<p className="text-xs font-bold uppercase text-slate-500">Employee ID</p>
						<p className="mt-1 text-sm font-semibold text-slate-900">{profile.employeeCode || '-'}</p>
					</article>
					<article className="rounded-md bg-slate-50 p-3">
						<p className="text-xs font-bold uppercase text-slate-500">Department</p>
						<p className="mt-1 text-sm font-semibold text-slate-900">{profile.department || '-'}</p>
					</article>
					<article className="rounded-md bg-slate-50 p-3">
						<p className="text-xs font-bold uppercase text-slate-500">Designation</p>
						<p className="mt-1 text-sm font-semibold text-slate-900">{profile.designation || '-'}</p>
					</article>
					<article className="rounded-md bg-slate-50 p-3">
						<p className="text-xs font-bold uppercase text-slate-500">Joining date</p>
						<p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(profile.joiningDate)}</p>
					</article>
					<article className="rounded-md bg-slate-50 p-3 md:col-span-2 xl:col-span-2">
						<p className="text-xs font-bold uppercase text-slate-500">Reporting manager</p>
						<p className="mt-1 text-sm font-semibold text-slate-900">{profile.reportingManager?.name || '-'}</p>
						<p className="text-xs text-slate-600">{profile.reportingManager?.employeeCode || '-'} {profile.reportingManager?.designation ? `| ${profile.reportingManager.designation}` : ''}</p>
					</article>
				</div>
			</section>

			<section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
				<h2 className="text-lg font-black text-slate-950">3. Account Settings</h2>

				<div className="mt-3 grid gap-4 xl:grid-cols-3">
					<form className="rounded-md border border-slate-200 p-4" onSubmit={onChangePassword}>
						<h3 className="text-sm font-black uppercase tracking-wide text-slate-700">Change password</h3>
						<label className="mt-3 block">
							<span className="mb-1 block text-xs font-bold uppercase text-slate-500">Current password</span>
							<input className="form-field" id="profileCurrentPassword" name="currentPassword" onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} required type="password" value={passwordForm.currentPassword} />
						</label>
						<label className="mt-3 block">
							<span className="mb-1 block text-xs font-bold uppercase text-slate-500">New password</span>
							<input className="form-field" id="profileNewPassword" name="newPassword" onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} required type="password" value={passwordForm.newPassword} />
						</label>
						<label className="mt-3 block">
							<span className="mb-1 block text-xs font-bold uppercase text-slate-500">Confirm password</span>
							<input className="form-field" id="profileConfirmPassword" name="confirmPassword" onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} required type="password" value={passwordForm.confirmPassword} />
						</label>
						<button className="btn-primary mt-3" disabled={busy === 'password'} type="submit">{busy === 'password' ? 'Updating...' : 'Update password'}</button>
					</form>

					<form className="rounded-md border border-slate-200 p-4" onSubmit={onSavePreferences}>
						<h3 className="text-sm font-black uppercase tracking-wide text-slate-700">Notification preferences</h3>
						<label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
							<input checked={preferencesForm.inAppNotifications} id="profilePrefInApp" name="inAppNotifications" onChange={(event) => setPreferencesForm((current) => ({ ...current, inAppNotifications: event.target.checked }))} type="checkbox" />
							In-app notifications
						</label>
						<label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
							<input checked={preferencesForm.emailNotifications} id="profilePrefEmail" name="emailNotifications" onChange={(event) => setPreferencesForm((current) => ({ ...current, emailNotifications: event.target.checked }))} type="checkbox" />
							Email notifications
						</label>
						<label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
							<input checked={preferencesForm.taskUpdates} id="profilePrefTask" name="taskUpdates" onChange={(event) => setPreferencesForm((current) => ({ ...current, taskUpdates: event.target.checked }))} type="checkbox" />
							Task updates
						</label>
						<label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
							<input checked={preferencesForm.leaveUpdates} id="profilePrefLeave" name="leaveUpdates" onChange={(event) => setPreferencesForm((current) => ({ ...current, leaveUpdates: event.target.checked }))} type="checkbox" />
							Leave updates
						</label>
						<button className="btn-primary mt-3" disabled={busy === 'preferences'} type="submit">{busy === 'preferences' ? 'Saving...' : 'Save preferences'}</button>
					</form>

					<form className="rounded-md border border-slate-200 p-4" onSubmit={onUpdatePhoto}>
						<h3 className="text-sm font-black uppercase tracking-wide text-slate-700">Profile photo update</h3>
						<img
							alt="Profile preview"
							className="mt-3 h-20 w-20 rounded-full border border-slate-200 object-cover"
							onError={(event) => {
								event.currentTarget.onerror = null;
								event.currentTarget.src = fallbackAvatar;
							}}
							src={photoForm.photoUrl || profile.photoUrl || fallbackAvatar}
						/>
						<label className="mt-3 block">
							<span className="mb-1 block text-xs font-bold uppercase text-slate-500">Photo URL</span>
							<input className="form-field" id="profilePhotoUpdateUrl" name="photoUpdateUrl" onChange={(event) => setPhotoForm({ photoUrl: event.target.value })} value={photoForm.photoUrl} />
						</label>
						<button className="btn-primary mt-3" disabled={busy === 'photo'} type="submit">{busy === 'photo' ? 'Updating...' : 'Update photo'}</button>
					</form>
				</div>
			</section>
		</ModulePage>
	);
};

export default Profile;
