import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationItem from '../../components/notifications/NotificationItem.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import ModulePage from './ModulePage.jsx';

const sections = [
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

const Notifications = ({ title = 'Notifications' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, loadNotifications, markRead, removeNotification } = useNotifications();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);

  useEffect(() => {
    loadNotifications().catch(() => {});
  }, []);

  const grouped = useMemo(() => {
    const bucket = sections.reduce((accumulator, section) => ({ ...accumulator, [section.key]: [] }), {});
    notifications.forEach((notification) => {
      const section = sections.find((item) => item.subtypes.includes(notification.subtype));
      if (section) bucket[section.key].push(notification);
    });
    return bucket;
  }, [notifications]);

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

      {isAdmin ? (
        <div className="space-y-5">
          {sections.map((section) => (
            <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" key={section.key}>
              <h3 className="text-lg font-black text-slate-900">{section.title}</h3>
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
