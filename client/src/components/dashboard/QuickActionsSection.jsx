import { Link } from 'react-router-dom';

const QuickActionsSection = () => {
  const actions = [
    {
      icon: '👤',
      label: 'Add Employee',
      path: '/admin/employees/add',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      icon: '📋',
      label: 'Create Project',
      path: '/admin/projects/add',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      icon: '✓',
      label: 'Assign Task',
      path: '/admin/tasks/add',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      icon: '📊',
      label: 'View Attendance',
      path: '/admin/attendance',
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      icon: '📈',
      label: 'Generate Report',
      path: '/admin/reports',
      color: 'bg-indigo-500 hover:bg-indigo-600'
    },
    {
      icon: '⚙️',
      label: 'Settings',
      path: '/admin/settings',
      color: 'bg-gray-600 hover:bg-gray-700'
    }
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 font-bold text-slate-950">Quick Actions</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {actions.map((action) => (
          <Link
            key={action.path}
            to={action.path}
            className={`flex flex-col items-center justify-center gap-2 rounded-lg p-4 text-white transition-colors ${action.color}`}
          >
            <div className="text-2xl">{action.icon}</div>
            <div className="text-center text-sm font-medium">{action.label}</div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default QuickActionsSection;
