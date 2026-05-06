const colors = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-700',
  completed: 'bg-emerald-50 text-emerald-700',
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
