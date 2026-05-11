import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge.jsx';

const TasksSection = ({ tasks, stats }) => {
  const getPriorityBadge = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const TaskCard = ({ task, label }) => (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex-1">
          <Link 
            to={`/admin/tasks/${task._id}`}
            className="font-medium text-slate-900 hover:text-blue-600"
          >
            {task.title}
          </Link>
          <div className="mt-1 text-xs text-slate-500">{task.taskCode}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${getPriorityBadge(task.priority)}`}>
          {task.priority}
        </span>
        <StatusBadge status={task.status} />
        <span className="inline-block text-xs text-slate-600">
          📅 {task.dueDate || 'No deadline'}
        </span>
      </div>
    </div>
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-slate-950">Task Overview</h3>
        <Link to="/admin/tasks" className="text-sm text-blue-600 hover:underline">
          View all
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg bg-blue-50 p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats?.todayCount || 0}</div>
          <div className="text-xs text-blue-700">Today's Tasks</div>
        </div>
        <div className="rounded-lg bg-yellow-50 p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats?.pendingCount || 0}</div>
          <div className="text-xs text-yellow-700">Pending</div>
        </div>
        <div className="rounded-lg bg-green-50 p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats?.completedCount || 0}</div>
          <div className="text-xs text-green-700">Completed</div>
        </div>
        <div className="rounded-lg bg-red-50 p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats?.overdueCount || 0}</div>
          <div className="text-xs text-red-700">Overdue</div>
        </div>
        <div className="rounded-lg bg-orange-50 p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats?.highPriorityCount || 0}</div>
          <div className="text-xs text-orange-700">High Priority</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700">High Priority Tasks</h4>
          <div className="space-y-2">
            {tasks?.highPriority && tasks.highPriority.length > 0 ? (
              tasks.highPriority.slice(0, 3).map((task) => (
                <TaskCard key={task._id} task={task} />
              ))
            ) : (
              <div className="py-4 text-center text-xs text-slate-500">No high priority tasks</div>
            )}
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700">Overdue Tasks</h4>
          <div className="space-y-2">
            {tasks?.overdue && tasks.overdue.length > 0 ? (
              tasks.overdue.slice(0, 3).map((task) => (
                <TaskCard key={task._id} task={task} />
              ))
            ) : (
              <div className="py-4 text-center text-xs text-slate-500">No overdue tasks</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TasksSection;
