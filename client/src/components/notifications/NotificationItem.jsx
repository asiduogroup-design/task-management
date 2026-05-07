const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '');

const NotificationItem = ({ notification, onRead, onDelete, onView }) => (
  <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-bold text-slate-950">{notification.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
        <p className="mt-2 text-xs font-semibold uppercase text-slate-500">{formatDateTime(notification.createdAt)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {!notification.isRead && <button className="btn-secondary" type="button" onClick={() => onRead(notification._id)}>Mark read</button>}
        <button className="btn-secondary" type="button" onClick={() => onView(notification)}>View details</button>
        <button className="btn-secondary" type="button" onClick={() => onDelete(notification._id)}>Delete</button>
      </div>
    </div>
  </article>
);

export default NotificationItem;
