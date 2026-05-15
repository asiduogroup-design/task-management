import { useState } from 'react';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

const DashboardLayout = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden md:flex">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-blue-300/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-teal-300/25 blur-3xl" style={{ animation: 'float-glow 7s ease-in-out infinite' }} />
      </div>
      <Sidebar
        collapsed={collapsed}
        open={open}
        onClose={() => setOpen(false)}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />
      {open && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[2px] md:hidden" type="button" onClick={() => setOpen(false)} />}
      <section className="page-enter min-w-0 flex-1 pb-6">
        <Navbar />
        <div className="px-4 py-6 md:px-6 md:py-7">
          <h2 className="mb-5 text-2xl font-bold text-slate-950 md:text-3xl">{title}</h2>
          {children}
        </div>
      </section>
    </main>
  );
};

export default DashboardLayout;
