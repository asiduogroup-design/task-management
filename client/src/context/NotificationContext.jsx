import { createContext, useContext, useMemo, useState } from 'react';
import { notificationService } from '../services/notificationService.js';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    const { data } = await notificationService.list();
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
  };

  const markRead = async (id) => {
    await notificationService.read(id);
    await loadNotifications();
  };

  const value = useMemo(
    () => ({ notifications, unreadCount, loadNotifications, markRead }),
    [notifications, unreadCount]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside NotificationProvider');
  return context;
};
