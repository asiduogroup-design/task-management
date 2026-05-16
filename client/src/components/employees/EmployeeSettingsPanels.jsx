import { fallbackAvatar, formatDate } from '../../hooks/useEmployeeProfileSettings.js';

const EmployeeSettingsPanels = ({
  busy,
  employeeName,
  loading,
  onChangePassword,
  onSavePersonalDetails,
  onSavePreferences,
  onUpdatePhoto,
  passwordForm,
  personalForm,
  photoForm,
  preferencesForm,
  profile,
  setPasswordForm,
  setPersonalForm,
  setPhotoForm,
  setPreferencesForm,
  formIdPrefix = 'profile',
  includeJobDetails = true
}) => {
  return (
    <>
      <div className={`settings-panels grid gap-6 ${includeJobDetails ? 'xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]' : 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'}`}>
        <section className="surface-card relative overflow-hidden rounded-[1.2rem] border border-slate-200/80 bg-slate-100/75 p-5 sm:p-6">
          <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-indigo-400/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">Edit details</p>
              <h3 className="settings-heading mt-1 text-[2rem] font-semibold text-slate-950">Profile details</h3>
            </div>
            <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm">{loading ? 'Refreshing...' : 'Live profile data'}</span>
          </div>

          <form className="relative mt-5 grid gap-4 md:grid-cols-2" id={`${formIdPrefix}-personal-form`} onSubmit={onSavePersonalDetails}>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Name</span>
              <input className="form-field settings-input" id={`${formIdPrefix}Name`} name="name" onChange={(event) => setPersonalForm((current) => ({ ...current, name: event.target.value }))} required value={personalForm.name} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Email</span>
              <input className="form-field settings-input" id={`${formIdPrefix}Email`} name="email" onChange={(event) => setPersonalForm((current) => ({ ...current, email: event.target.value }))} required type="email" value={personalForm.email} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Phone number</span>
              <input className="form-field settings-input" id={`${formIdPrefix}Phone`} name="phone" onChange={(event) => setPersonalForm((current) => ({ ...current, phone: event.target.value }))} value={personalForm.phone} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Photo URL</span>
              <input className="form-field settings-input" id={`${formIdPrefix}PhotoUrl`} name="photoUrl" onChange={(event) => setPersonalForm((current) => ({ ...current, photoUrl: event.target.value }))} placeholder="https://..." value={personalForm.photoUrl} />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Address</span>
              <textarea className="form-field settings-input min-h-24" id={`${formIdPrefix}Address`} name="address" onChange={(event) => setPersonalForm((current) => ({ ...current, address: event.target.value }))} value={personalForm.address} />
            </label>

            <div className="md:col-span-2">
              <button className="btn-primary settings-cta" disabled={busy === 'personal' || loading} type="submit">{busy === 'personal' ? 'Saving...' : 'Save personal details'}</button>
            </div>
          </form>
        </section>

        <section className="space-y-6">
          {includeJobDetails ? (
            <section className="surface-card rounded-[1.75rem] border border-slate-200 bg-white/85 p-5 sm:p-6">
              <h3 className="text-2xl font-semibold text-slate-950">Job details</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <article className="rounded-2xl bg-slate-50/90 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Joining date</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(profile.joiningDate)}</p>
                </article>
                <article className="rounded-2xl bg-slate-50/90 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Reporting manager</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{profile.reportingManager?.name || '-'}</p>
                  <p className="text-xs text-slate-500">{profile.reportingManager?.designation || 'Manager details unavailable'}</p>
                </article>
              </div>
            </section>
          ) : null}

          <section className="surface-card relative overflow-hidden rounded-[1.2rem] border border-slate-200/80 bg-slate-100/75 p-5 sm:p-6">
            <div className="pointer-events-none absolute left-0 top-0 h-24 w-24 rounded-full bg-violet-400/10 blur-3xl" />
            <div className="relative">
              <h3 className="settings-heading text-[2rem] font-semibold text-slate-950">Profile photo</h3>
              <form className="mt-5" onSubmit={onUpdatePhoto}>
                <div className="rounded-2xl bg-white/90 p-5 shadow-sm">
                  <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100">
                    <img
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = fallbackAvatar;
                      }}
                      src={photoForm.photoUrl || profile.photoUrl || fallbackAvatar}
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-base font-semibold text-slate-900">{employeeName}</p>
                    <p className="mx-auto mt-1 max-w-52 text-xs text-slate-500">Use a direct image URL for the profile card.</p>
                  </div>
                </div>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Photo URL</span>
                  <input className="form-field settings-input" id={`${formIdPrefix}PhotoUpdateUrl`} name="photoUpdateUrl" onChange={(event) => setPhotoForm({ photoUrl: event.target.value })} placeholder="Enter URL..." value={photoForm.photoUrl} />
                </label>
                <button className="btn-primary settings-cta mt-4 w-full" disabled={busy === 'photo'} type="submit">{busy === 'photo' ? 'Updating...' : 'Update photo'}</button>
              </form>
            </div>
          </section>
        </section>
      </div>

      <section className="surface-card rounded-[1.2rem] border border-slate-200/80 bg-slate-100/75 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">Account settings</p>
            <h3 className="settings-heading mt-1 text-[2rem] font-semibold text-slate-950">Security and notifications</h3>
          </div>
          <p className="max-w-sm text-xs text-slate-500">Manage password access and workspace alerts to keep your account secure and updated.</p>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <form className="rounded-[1rem] border border-slate-200/80 bg-white/80 p-5" onSubmit={onChangePassword}>
            <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Change password</h4>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Current password</span>
              <input className="form-field settings-input" id={`${formIdPrefix}CurrentPassword`} name="currentPassword" onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} required type="password" value={passwordForm.currentPassword} />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">New password</span>
              <input className="form-field settings-input" id={`${formIdPrefix}NewPassword`} name="newPassword" onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} required type="password" value={passwordForm.newPassword} />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Confirm password</span>
              <input className="form-field settings-input" id={`${formIdPrefix}ConfirmPassword`} name="confirmPassword" onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} required type="password" value={passwordForm.confirmPassword} />
            </label>
            <button className="btn-primary settings-cta mt-4" disabled={busy === 'password'} type="submit">{busy === 'password' ? 'Updating...' : 'Update password'}</button>
          </form>

          <form className="rounded-[1rem] border border-slate-200/80 bg-white/80 p-5" onSubmit={onSavePreferences}>
            <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Notification preferences</h4>
            <div className="mt-4 space-y-3">
              <label className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/90 px-4 py-3 text-sm text-slate-700">
                <span>In-app notifications</span>
                <span className="relative inline-flex h-6 w-11 items-center">
                  <input checked={preferencesForm.inAppNotifications} className="peer sr-only" id={`${formIdPrefix}PrefInApp`} name="inAppNotifications" onChange={(event) => setPreferencesForm((current) => ({ ...current, inAppNotifications: event.target.checked }))} type="checkbox" />
                  <span className="h-6 w-11 rounded-full bg-violet-200 transition peer-checked:bg-violet-600" />
                  <span className="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:left-6" />
                </span>
              </label>
              <label className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/90 px-4 py-3 text-sm text-slate-700">
                <span>Email notifications</span>
                <span className="relative inline-flex h-6 w-11 items-center">
                  <input checked={preferencesForm.emailNotifications} className="peer sr-only" id={`${formIdPrefix}PrefEmail`} name="emailNotifications" onChange={(event) => setPreferencesForm((current) => ({ ...current, emailNotifications: event.target.checked }))} type="checkbox" />
                  <span className="h-6 w-11 rounded-full bg-violet-200 transition peer-checked:bg-violet-600" />
                  <span className="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:left-6" />
                </span>
              </label>
              <label className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/90 px-4 py-3 text-sm text-slate-700">
                <span>Task updates</span>
                <span className="relative inline-flex h-6 w-11 items-center">
                  <input checked={preferencesForm.taskUpdates} className="peer sr-only" id={`${formIdPrefix}PrefTask`} name="taskUpdates" onChange={(event) => setPreferencesForm((current) => ({ ...current, taskUpdates: event.target.checked }))} type="checkbox" />
                  <span className="h-6 w-11 rounded-full bg-violet-200 transition peer-checked:bg-violet-600" />
                  <span className="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:left-6" />
                </span>
              </label>
              <label className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/90 px-4 py-3 text-sm text-slate-700">
                <span>Leave updates</span>
                <span className="relative inline-flex h-6 w-11 items-center">
                  <input checked={preferencesForm.leaveUpdates} className="peer sr-only" id={`${formIdPrefix}PrefLeave`} name="leaveUpdates" onChange={(event) => setPreferencesForm((current) => ({ ...current, leaveUpdates: event.target.checked }))} type="checkbox" />
                  <span className="h-6 w-11 rounded-full bg-violet-200 transition peer-checked:bg-violet-600" />
                  <span className="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:left-6" />
                </span>
              </label>
            </div>
            <button className="btn-primary settings-cta mt-4 w-full" disabled={busy === 'preferences'} type="submit">{busy === 'preferences' ? 'Saving...' : 'Save preferences'}</button>
          </form>
        </div>
      </section>
    </>
  );
};

export default EmployeeSettingsPanels;