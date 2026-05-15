import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { getDashboardPath } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';

const notificationsPathByRole = {
  super_admin: '/admin/notifications',
  admin: '/admin/notifications',
  manager: '/manager/notifications',
  employee: '/employee/notifications'
};

const profilePathByRole = {
  employee: '/employee/profile'
};

const initialsFromName = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

const Navbar = ({ onMenu }) => {
  const { user } = useAuth();
  const { unreadCount, loadNotifications } = useNotifications();
  const notificationsPath = notificationsPathByRole[user?.role] || '/admin/notifications';
  const dashboardPath = getDashboardPath(user?.role);
  const profilePath = profilePathByRole[user?.role] || dashboardPath;
  const avatarSrc = user?.photoUrl || '';
  const avatarAlt = user?.name ? `${user.name} profile` : 'Profile';

  useEffect(() => {
    loadNotifications().catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link
            aria-label="Open dashboard"
            className="rounded-md border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-50"
            to={dashboardPath}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75h7.5v7.5h-7.5zm9 0h7.5v4.5h-7.5zm0 6h7.5v10.5h-7.5zm-9 3h7.5v7.5h-7.5z" />
            </svg>
          </Link>
          <button
            aria-label="Open sidebar menu"
            className="btn-secondary inline-flex items-center justify-center md:hidden"
            type="button"
            onClick={onMenu}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <input className="form-field hidden w-80 md:block" id="workspace-navbar-search" name="workspaceNavbarSearch" placeholder="Search workspace..." />
        </div>
        <div className="flex items-center gap-3">
          <Link
            aria-label="Open notifications"
            className="relative rounded-md border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-50"
            to={notificationsPath}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 20.25a2.25 2.25 0 01-4.5 0m8.79-5.21A1.5 1.5 0 0117 16.5H7a1.5 1.5 0 01-1.04-2.46 6 6 0 001.79-4.29V9a4.25 4.25 0 018.5 0v.75a6 6 0 001.79 4.29z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[1.25rem] rounded-full bg-blue-700 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                {unreadCount}
              </span>
            )}
          </Link>
          <Link
            aria-label="Open profile"
            className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700"
            to={profilePath}
          >
            {avatarSrc ? (
              <img
                alt={avatarAlt}
                className="h-full w-full object-cover"
                src={avatarSrc}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23e2e8f0'/><text x='50%' y='56%' text-anchor='middle' font-family='Arial, sans-serif' font-size='24' font-weight='700' fill='%23334155'>${initialsFromName(user?.name)}</text></svg>`)}`;
                }}
              />
            ) : (
              initialsFromName(user?.name)
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
