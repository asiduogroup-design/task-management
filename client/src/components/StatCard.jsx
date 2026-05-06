const StatCard = ({ label, value, tone = 'brand' }) => {
  const toneClasses = {
    brand: 'bg-brand/10 text-brand',
    mint: 'bg-mint/10 text-mint',
    amber: 'bg-amber/10 text-amber'
  };

  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <div className={`mb-4 inline-flex rounded-md px-3 py-1 text-xs font-bold ${toneClasses[tone]}`}>
        {label}
      </div>
      <p className="text-3xl font-bold text-ink">{value}</p>
    </article>
  );
};

export default StatCard;
