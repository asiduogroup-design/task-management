import { useAuth } from '../context/AuthContext.jsx';

const DashboardShell = ({ title, subtitle, children }) => {
  const { logout, user } = useAuth();

  return (
    <main className="min-h-screen bg-field">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Employee Workspace</p>
            <h1 className="text-xl font-bold text-ink">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-ink">{user?.name}</p>
              <p className="text-xs capitalize text-slate-500">{user?.role}</p>
            </div>
            <button className="btn-secondary" type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-ink">{subtitle}</h2>
        </div>
        {children}
      </section>
    </main>
  );
};

export default DashboardShell;
