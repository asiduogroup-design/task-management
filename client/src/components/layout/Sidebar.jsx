import { NavLink } from 'react-router-dom';
import { menuForRole } from './menuItems.js';
import { useAuth } from '../../context/AuthContext.jsx';

const iconToneByName = {
  dashboard: 'text-blue-600',
  employees: 'text-sky-600',
  teamMembers: 'text-cyan-600',
  attendance: 'text-teal-600',
  projects: 'text-violet-600',
  tasks: 'text-indigo-600',
  todoList: 'text-fuchsia-600',
  dailyReports: 'text-emerald-600',
  dailyUpdate: 'text-emerald-600',
  completedTasks: 'text-green-600',
  leaveManagement: 'text-rose-600',
  leaveRequest: 'text-rose-600',
  reports: 'text-orange-600',
  notifications: 'text-amber-600',
  settings: 'text-slate-600',
  profile: 'text-purple-600',
  reviewTasks: 'text-lime-600'
};

const SidebarIcon = ({ name, className = '' }) => {
  const commonProps = {
    className: `h-5 w-5 shrink-0 ${className}`,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
    'aria-hidden': true
  };

  switch (name) {
    case 'dashboard':
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75h7.5v7.5h-7.5zm9 0h7.5v4.5h-7.5zm0 6h7.5v10.5h-7.5zm-9 3h7.5v7.5h-7.5z" />
        </svg>
      );
    case 'employees':
    case 'teamMembers':
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5a3 3 0 11-6 0 3 3 0 016 0zm-8.25 1.5a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zm0 1.5c-2.485 0-4.5 1.79-4.5 4v.75h9v-.75c0-2.21-2.015-4-4.5-4zm6.75 1.5c1.84.205 3.25 1.617 3.25 3.31v.94h2v-.94c0-2.523-2.07-4.57-4.75-4.81" />
        </svg>
      );
    case 'attendance':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5v5l3 1.5" />
        </svg>
      );
    case 'projects':
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75A2.25 2.25 0 016 4.5h3l1.5 1.5h7.5a2.25 2.25 0 012.25 2.25v9A2.25 2.25 0 0118 19.5H6a2.25 2.25 0 01-2.25-2.25v-10.5z" />
        </svg>
      );
    case 'tasks':
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h9m-9 5.25h9m-9 5.25h9M5.25 7.125l1.5 1.5 2.25-2.25M5.25 12.375l1.5 1.5 2.25-2.25M5.25 17.625l1.5 1.5 2.25-2.25" />
        </svg>
      );
    case 'dailyReports':
    case 'dailyUpdate':
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h6l4.5 4.5v12a1.5 1.5 0 01-1.5 1.5h-9a1.5 1.5 0 01-1.5-1.5v-15a1.5 1.5 0 011.5-1.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 3.75v4.5H18M9 12h6m-6 3h6" />
        </svg>
      );
    case 'leaveManagement':
    case 'leaveRequest':
      return (
        <svg {...commonProps}>
          <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 3.75v3.5m8-3.5v3.5M4 9.5h16" />
        </svg>
      );
    case 'reports':
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15M7.5 16.5V12m4.5 4.5V9m4.5 7.5V6" />
        </svg>
      );
    case 'notifications':
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 20.25a2.25 2.25 0 01-4.5 0m8.79-5.21A1.5 1.5 0 0117 16.5H7a1.5 1.5 0 01-1.04-2.46 6 6 0 001.79-4.29V9a4.25 4.25 0 018.5 0v.75a6 6 0 001.79 4.29z" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.573 1.066 1.724 1.724 0 012.356 2.356 1.724 1.724 0 001.066 2.573 1.724 1.724 0 010 3.35 1.724 1.724 0 00-1.066 2.573 1.724 1.724 0 01-2.356 2.356 1.724 1.724 0 00-2.573 1.066 1.724 1.724 0 01-3.35 0 1.724 1.724 0 00-2.573-1.066 1.724 1.724 0 01-2.356-2.356 1.724 1.724 0 00-1.066-2.573 1.724 1.724 0 010-3.35 1.724 1.724 0 001.066-2.573A1.724 1.724 0 017.752 5.383a1.724 1.724 0 002.573-1.066z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'todoList':
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5h10.5M6.75 12h10.5M6.75 16.5h10.5M4.5 7.5h.01M4.5 12h.01M4.5 16.5h.01" />
        </svg>
      );
    case 'completedTasks':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12.25l2.5 2.5 5-5" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8.5" r="3.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a7 7 0 0114 0" />
        </svg>
      );
    case 'reviewTasks':
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h9a1.5 1.5 0 011.5 1.5v14.25L15 17.25l-3 2.25-3-2.25-3 2.25V5.25a1.5 1.5 0 011.5-1.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10.5l2 2 4-4" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8.5" />
        </svg>
      );
  }
};

const Sidebar = ({ collapsed, open, onClose, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const menu = menuForRole(user?.role);

  return (
    <aside
      className={`${open ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200/80 bg-white/90 shadow-soft backdrop-blur-lg transition-all duration-300 md:static md:translate-x-0 ${collapsed ? 'md:w-20' : 'md:w-72'}`}
    >
      <div className="flex h-full flex-col">
        <div className={`${collapsed ? 'px-2 py-4' : 'px-5 py-4'} border-b border-slate-200/80 transition-all duration-300`}>
          <div className="hidden items-start justify-between gap-2 md:flex">
            <div className={`${collapsed ? 'hidden' : 'block'}`}>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Employee Workspace</p>
              <h1 className="mt-1 text-lg font-bold text-slate-950">Management System</h1>
            </div>
            <button
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-base font-black leading-none text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/70"
              type="button"
              onClick={onToggleCollapse}
            >
              {collapsed ? '>' : '<'}
            </button>
          </div>
          <div className="md:hidden">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Employee Workspace</p>
            <h1 className="mt-1 text-lg font-bold text-slate-950">Management System</h1>
          </div>
          <div className={`${collapsed ? 'mt-1 flex justify-center md:flex' : 'hidden'}`}>
            <span className="text-lg font-black text-blue-700">EW</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
          {menu.map(([label, path, icon]) => (
            <NavLink
              className={({ isActive }) =>
                `block rounded-xl px-3 py-2.5 text-sm font-bold transition ${isActive ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'}`
              }
              key={path}
              onClick={onClose}
              to={path}
              title={collapsed ? label : undefined}
            >
              {({ isActive }) => {
                const iconTone = isActive ? 'text-white' : (iconToneByName[icon] || 'text-slate-500');
                return (
                  <span className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
                    <SidebarIcon name={icon} className={iconTone} />
                    <span className={`${collapsed ? 'hidden' : 'inline'}`}>{label}</span>
                  </span>
                );
              }}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200/80 p-3">
          <button className={`btn-secondary ${collapsed ? 'w-auto px-3' : 'w-full'}`} title={collapsed ? 'Logout' : undefined} type="button" onClick={logout}>
            {collapsed ? 'Out' : 'Logout'}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
