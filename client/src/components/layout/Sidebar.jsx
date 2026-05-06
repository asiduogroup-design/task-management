import { NavLink } from 'react-router-dom';
import { menuForRole } from './menuItems.js';
import { useAuth } from '../../context/AuthContext.jsx';

const Sidebar = ({ open, onClose }) => {
  const { user, logout } = useAuth();
  const menu = menuForRole(user?.role);

  return (
    <aside className={`${open ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white transition md:static md:translate-x-0`}>
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Employee Workspace</p>
          <h1 className="mt-1 text-lg font-black text-slate-950">Management System</h1>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {menu.map(([label, path]) => (
            <NavLink
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-bold ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`
              }
              key={path}
              onClick={onClose}
              to={path}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button className="btn-secondary w-full" type="button" onClick={logout}>Logout</button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
