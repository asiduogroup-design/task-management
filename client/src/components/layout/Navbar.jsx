import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';

const notificationsPathByRole = {
  super_admin: '/admin/notifications',
  admin: '/admin/notifications',
  manager: '/manager/notifications',
  employee: '/employee/notifications'
};

const Navbar = ({ onMenu }) => {
  const { user } = useAuth();
  const { unreadCount, loadNotifications } = useNotifications();
  const notificationsPath = notificationsPathByRole[user?.role] || '/admin/notifications';

  useEffect(() => {
    loadNotifications().catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button className="btn-secondary md:hidden" type="button" onClick={onMenu}>Menu</button>
          <input className="form-field hidden w-80 md:block" placeholder="Search workspace..." />
        </div>
        <div className="flex items-center gap-4">
          <Link className="relative rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700" to={notificationsPath}>
            Notifications
            {unreadCount > 0 && <span className="ml-2 rounded bg-blue-700 px-2 py-0.5 text-xs text-white">{unreadCount}</span>}
          </Link>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-950">{user?.name}</p>
            <p className="text-xs capitalize text-slate-500">{String(user?.role || '').replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
