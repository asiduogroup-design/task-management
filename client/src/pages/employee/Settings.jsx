import { useAuth } from '../../context/AuthContext.jsx';
import EmployeeSettingsPanels from '../../components/employees/EmployeeSettingsPanels.jsx';
import { useEmployeeProfileSettings } from '../../hooks/useEmployeeProfileSettings.js';
import ModulePage from '../shared/ModulePage.jsx';

const Settings = () => {
  const { refreshUser } = useAuth();
  const settings = useEmployeeProfileSettings({ refreshUser });
  const employeeName = settings.personalForm.name || settings.profile.user?.name || 'Employee';

  return (
    <ModulePage title="Settings">
      {settings.error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{settings.error}</p> : null}
      {settings.success ? <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{settings.success}</p> : null}

      <div className="settings-page space-y-6">
        <section className="surface-card-strong page-enter overflow-hidden rounded-[1.65rem]">
          <div className="bg-gradient-to-r from-indigo-800 via-violet-600 to-fuchsia-500 px-6 py-8 sm:px-9 sm:py-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-100">Workspace settings</p>
            <h2 className="settings-heading mt-1.5 text-[2.15rem] font-bold text-white">Manage your account</h2>
            <p className="mt-1.5 max-w-2xl text-[13px] text-indigo-100/95">
              Update your personal details, profile photo, password, and notification preferences from one dedicated sidebar page.
            </p>
          </div>
          <div className="grid gap-3 bg-slate-100/55 px-6 py-5 sm:px-8 sm:grid-cols-3">
            <div className="rounded-2xl border border-indigo-100/80 bg-slate-100 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">Profile owner</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{employeeName}</p>
            </div>
            <div className="rounded-2xl border border-violet-100/80 bg-slate-100 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600">Sections</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Edit details, profile photo, account settings</p>
            </div>
            <div className="rounded-2xl border border-emerald-100/80 bg-emerald-50/55 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">Sync status</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {settings.loading ? 'Refreshing profile' : 'Ready to update'}
              </p>
            </div>
          </div>
        </section>

        <EmployeeSettingsPanels {...settings} employeeName={employeeName} formIdPrefix="settings" includeJobDetails={false} />
      </div>
    </ModulePage>
  );
};

export default Settings;