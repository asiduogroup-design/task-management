const StatCard = ({ label, value, helper, className = '' }) => (
  <article className={`rounded-md border p-4 shadow-sm ${className}`.trim()}>
    <p className="text-sm font-semibold text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
  </article>
);

export default StatCard;
