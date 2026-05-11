const colors = {
  active: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-slate-100 text-slate-700',
  not_started: 'bg-slate-100 text-slate-700',
  on_hold: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-rose-50 text-rose-700',
  archived: 'bg-slate-200 text-slate-700',
  inactive: 'bg-slate-100 text-slate-700',
  completed: 'bg-emerald-50 text-emerald-700',
  to_do: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-50 text-blue-700',
  under_review: 'bg-purple-50 text-purple-700',
  reopened: 'bg-orange-50 text-orange-700',
  approved: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  rejected: 'bg-red-50 text-red-700',
  overdue: 'bg-red-50 text-red-700',
  logged_in: 'bg-blue-50 text-blue-700',
  logged_out: 'bg-slate-100 text-slate-700',
  on_break: 'bg-amber-50 text-amber-700',
  late: 'bg-orange-50 text-orange-700'
};

const StatusBadge = ({ status = 'pending' }) => {
  const label = String(status).replaceAll('_', ' ');
  return <span className={`rounded px-2 py-1 text-xs font-bold capitalize ${colors[status] || 'bg-slate-100 text-slate-700'}`}>{label}</span>;
};

export default StatusBadge;
