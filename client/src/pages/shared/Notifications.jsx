import { useEffect } from 'react';
import NotificationItem from '../../components/notifications/NotificationItem.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import ModulePage from './ModulePage.jsx';

const Notifications = ({ title = 'Notifications' }) => {
  const { notifications, loadNotifications, markRead } = useNotifications();

  useEffect(() => {
    loadNotifications().catch(() => {});
  }, []);

  return (
    <ModulePage title={title}>
      <div className="space-y-3">
        {notifications.length === 0 && <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">No notifications available.</p>}
        {notifications.map((notification) => (
          <NotificationItem key={notification._id} notification={notification} onRead={markRead} />
        ))}
      </div>
    </ModulePage>
  );
};

export default Notifications;
