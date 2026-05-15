const StatCard = ({ label, value, tone = 'brand' }) => {
  const toneClasses = {
    brand: 'bg-blue-100/80 text-blue-700 border border-blue-200/70',
    mint: 'bg-teal-100/80 text-teal-700 border border-teal-200/70',
    amber: 'bg-amber-100/80 text-amber-700 border border-amber-200/80'
  };

  return (
    <article className="surface-card-strong page-enter rounded-2xl p-5">
      <div className={`mb-4 inline-flex rounded-full px-3 py-1 text-xs font-bold ${toneClasses[tone]}`}>
        {label}
      </div>
      <p className="text-3xl font-extrabold text-slate-900">{value}</p>
    </article>
  );
};

export default StatCard;
