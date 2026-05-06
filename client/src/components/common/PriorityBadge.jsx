const colors = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-orange-50 text-orange-700',
  urgent: 'bg-red-50 text-red-700'
};

const PriorityBadge = ({ priority = 'medium' }) => (
  <span className={`rounded px-2 py-1 text-xs font-bold capitalize ${colors[priority] || colors.medium}`}>{priority}</span>
);

export default PriorityBadge;
