import { Link } from 'react-router-dom';

const AlertsSection = ({ alerts }) => {
  const AlertBadge = ({ count, label, icon, color }) => (
    <div className={`rounded-lg border-l-4 ${color} bg-opacity-5 p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-600">{label}</div>
          <div className="text-2xl font-bold text-slate-900">{count}</div>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 font-bold text-slate-950">Notifications & Alerts</h3>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <AlertBadge 
          count={alerts?.notLoggedIn?.count || 0}
          label="Not Logged In"
          icon="🚪"
          color="border-red-500 bg-red-500"
        />
        <AlertBadge 
          count={alerts?.tasksNearingDeadline?.count || 0}
          label="Tasks Near Deadline"
          icon="⏰"
          color="border-orange-500 bg-orange-500"
        />
        <AlertBadge 
          count={alerts?.overdueProjects?.count || 0}
          label="Overdue Projects"
          icon="📋"
          color="border-red-500 bg-red-500"
        />
        <AlertBadge 
          count={alerts?.leaveRequests?.count || 0}
          label="Leave Requests"
          icon="📅"
          color="border-blue-500 bg-blue-500"
        />
        <AlertBadge 
          count={alerts?.incompleteUpdates?.count || 0}
          label="Incomplete Updates"
          icon="📝"
          color="border-yellow-500 bg-yellow-500"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Employees Not Logged In */}
        {alerts?.notLoggedIn && alerts.notLoggedIn.count > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h4 className="mb-3 font-semibold text-red-900">Employees Not Logged In</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alerts.notLoggedIn.employees.slice(0, 5).map((emp) => (
                <div key={emp._id} className="flex items-center justify-between rounded bg-white p-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{emp.name}</div>
                    <div className="text-xs text-slate-600">{emp.email}</div>
                  </div>
                </div>
              ))}
              {alerts.notLoggedIn.count > 5 && (
                <Link to="/admin/attendance" className="text-xs text-red-600 hover:underline">
                  +{alerts.notLoggedIn.count - 5} more
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Tasks Nearing Deadline */}
        {alerts?.tasksNearingDeadline && alerts.tasksNearingDeadline.count > 0 && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <h4 className="mb-3 font-semibold text-orange-900">Tasks Nearing Deadline</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alerts.tasksNearingDeadline.tasks.slice(0, 5).map((task) => (
                <div key={task._id} className="rounded bg-white p-2 text-sm">
                  <Link to={`/admin/tasks/${task._id}`} className="font-medium text-slate-900 hover:text-blue-600">
                    {task.title}
                  </Link>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{task.project}</span>
                    <span className="font-medium text-orange-600">📅 {task.dueDate}</span>
                  </div>
                </div>
              ))}
              {alerts.tasksNearingDeadline.count > 5 && (
                <Link to="/admin/tasks" className="text-xs text-orange-600 hover:underline">
                  +{alerts.tasksNearingDeadline.count - 5} more
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Pending Leave Requests */}
        {alerts?.leaveRequests && alerts.leaveRequests.count > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-3 font-semibold text-blue-900">Pending Leave Requests</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alerts.leaveRequests.requests.slice(0, 5).map((request) => (
                <div key={request._id} className="rounded bg-white p-2 text-sm">
                  <div className="font-medium text-slate-900">{request.employee}</div>
                  <div className="text-xs text-slate-600">
                    {request.leaveType} • {request.fromDate} to {request.toDate}
                  </div>
                </div>
              ))}
              {alerts.leaveRequests.count > 5 && (
                <Link to="/admin/leaves" className="text-xs text-blue-600 hover:underline">
                  +{alerts.leaveRequests.count - 5} more
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Incomplete Daily Updates */}
        {alerts?.incompleteUpdates && alerts.incompleteUpdates.count > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <h4 className="mb-3 font-semibold text-yellow-900">Incomplete Daily Updates</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alerts.incompleteUpdates.employees.slice(0, 5).map((emp) => (
                <div key={emp._id} className="rounded bg-white p-2 text-sm">
                  <div className="font-medium text-slate-900">{emp.employee}</div>
                  <div className="text-xs text-slate-600">Due on {emp.date}</div>
                </div>
              ))}
              {alerts.incompleteUpdates.count > 5 && (
                <Link to="/admin/daily-updates" className="text-xs text-yellow-600 hover:underline">
                  +{alerts.incompleteUpdates.count - 5} more
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AlertsSection;
