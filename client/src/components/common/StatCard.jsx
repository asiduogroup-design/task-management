const StatCard = ({ label, value, helper }) => (
  <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-sm font-semibold text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
  </article>
);

export default StatCard;
