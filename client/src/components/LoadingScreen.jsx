const LoadingScreen = () => {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-field px-4">
      <div className="pointer-events-none absolute -left-20 top-16 h-56 w-56 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-12 h-56 w-56 rounded-full bg-teal-200/45 blur-3xl" style={{ animation: 'float-glow 7s ease-in-out infinite' }} />
      <div className="surface-card-strong page-enter rounded-2xl px-6 py-5 text-sm font-semibold text-slate-700 shadow-soft">
        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-blue-600" style={{ animation: 'float-glow 1.4s ease-in-out infinite' }} />
        Loading workspace...
      </div>
    </main>
  );
};

export default LoadingScreen;
