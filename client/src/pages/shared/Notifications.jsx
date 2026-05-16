import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationItem from '../../components/notifications/NotificationItem.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import ModulePage from './ModulePage.jsx';

const sections = [
  {
    key: 'deadline_reminder',
    title: 'Deadline Reminders',
    subtypes: ['task_deadline_reminder', 'task_deadline_approaching', 'project_deadline_approaching', 'project_deadline_update', 'deadline_reminder']
  },
  {
    key: 'admin_comments',
    title: 'Admin Comments',
    subtypes: ['leave_admin_remarks', 'task_comment_added', 'admin_comment', 'manager_comment', 'comment_added']
  },
  {
    key: 'attendance',
    title: 'Attendance Notifications',
    subtypes: ['late_login', 'no_login', 'early_logout', 'missing_logout']
  },
  {
    key: 'task',
    title: 'Task Notifications',
    subtypes: ['task_completed', 'task_overdue', 'task_review', 'task_deadline_approaching']
  },
  {
    key: 'project',
    title: 'Project Notifications',
    subtypes: ['project_deadline_approaching', 'project_completed', 'project_delayed', 'milestone_completed']
  },
  {
    key: 'leave',
    title: 'Leave Notifications',
    subtypes: ['leave_requested', 'leave_approved', 'leave_rejected']
  }
];

const employeeSections = [
  {
    key: 'deadline_reminder',
    title: 'Deadline Reminders',
    subtypes: ['task_deadline_reminder', 'task_deadline_approaching', 'project_deadline_approaching', 'project_deadline_update', 'deadline_reminder']
  },
  {
    key: 'admin_comments',
    title: 'Admin Comments',
    subtypes: ['leave_admin_remarks', 'task_comment_added', 'admin_comment', 'manager_comment', 'comment_added']
  },
  {
    key: 'task',
    title: 'Task Notifications',
    subtypes: ['task_assigned', 'task_deadline_reminder', 'task_comment_added', 'task_approved', 'task_reopened']
  },
  {
    key: 'project',
    title: 'Project Notifications',
    subtypes: ['project_added', 'project_deadline_update', 'project_status_changed']
  },
  {
    key: 'attendance',
    title: 'Attendance Notifications',
    subtypes: ['missing_logout_reminder', 'late_login_notice', 'daily_update_reminder']
  },
  {
    key: 'leave',
    title: 'Leave Notifications',
    subtypes: ['leave_approved', 'leave_rejected', 'leave_admin_remarks']
  }
];

const Notifications = ({ title = 'Notifications' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, loadNotifications, markRead, removeNotification } = useNotifications();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);
  const isEmployee = user?.role === 'employee';
  const activeSections = isEmployee ? employeeSections : sections;

  useEffect(() => {
    loadNotifications().catch(() => {});
  }, []);

  const grouped = useMemo(() => {
    const bucket = activeSections.reduce((accumulator, section) => ({ ...accumulator, [section.key]: [] }), {});
    notifications.forEach((notification) => {
      const lowerMsg = String(notification?.message || '').toLowerCase();
      const section =
        activeSections.find((item) => item.subtypes.includes(notification.subtype)) ||
        ((lowerMsg.includes('due') || lowerMsg.includes('deadline')) ? activeSections.find((item) => item.key === 'deadline_reminder') : null) ||
        ((notification?.type === 'system' || notification?.type === 'daily_update' || lowerMsg.includes('comment')) ? activeSections.find((item) => item.key === 'admin_comments') : null) ||
        activeSections.find((item) => item.key === notification.type) ||
        (notification.type === 'daily_update' ? activeSections.find((item) => item.key === 'attendance') : null);
      if (section) {
        bucket[section.key].push(notification);
      }
    });
    return bucket;
  }, [activeSections, notifications]);

  const viewDetails = async (notification) => {
    if (!notification.isRead) {
      await markRead(notification._id);
    }
    if (notification.actionPath) {
      navigate(notification.actionPath);
    }
  };

  const removeItem = async (id) => {
    await removeNotification(id);
  };

  return (
    <ModulePage title={title}>
      {notifications.length === 0 && <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">No notifications available.</p>}

      {isAdmin || isEmployee ? (
        <div className="space-y-5">
          {activeSections.map((section) => (
            <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" key={section.key}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-black text-slate-900">{section.title}</h3>
                <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-extrabold text-orange-700">{(grouped[section.key] || []).length}</span>
              </div>
              <div className="mt-3 space-y-3">
                {(grouped[section.key] || []).length ? (grouped[section.key] || []).map((notification) => (
                  <NotificationItem
                    key={notification._id}
                    notification={notification}
                    onDelete={removeItem}
                    onRead={markRead}
                    onView={viewDetails}
                  />
                )) : <p className="text-sm text-slate-500">No alerts in this section.</p>}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification._id}
              notification={notification}
              onDelete={removeItem}
              onRead={markRead}
              onView={viewDetails}
            />
          ))}
        </div>
      )}
    </ModulePage>
  );
};

export default Notifications;
