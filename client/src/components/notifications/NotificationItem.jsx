const NotificationItem = ({ notification, onRead }) => (
  <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-bold text-slate-950">{notification.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
      </div>
      {!notification.isRead && <button className="btn-secondary" type="button" onClick={() => onRead(notification._id)}>Mark read</button>}
    </div>
  </article>
);

export default NotificationItem;
