import StatusBadge from '../common/StatusBadge.jsx';

const AttendanceCard = ({ attendance }) => (
  <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-sm font-semibold text-slate-500">Current attendance</p>
    <div className="mt-3"><StatusBadge status={attendance?.status || 'not_logged_in'} /></div>
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <span className="text-slate-500">Login</span>
      <span className="font-semibold text-slate-800">{attendance?.loginTime ? new Date(attendance.loginTime).toLocaleTimeString() : '-'}</span>
      <span className="text-slate-500">Logout</span>
      <span className="font-semibold text-slate-800">{attendance?.logoutTime ? new Date(attendance.logoutTime).toLocaleTimeString() : '-'}</span>
      <span className="text-slate-500">Hours</span>
      <span className="font-semibold text-slate-800">{attendance?.totalWorkingHours || 0}</span>
    </div>
  </article>
);

export default AttendanceCard;
