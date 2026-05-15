import { useState } from 'react';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

const DashboardLayout = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <main className="min-h-screen bg-slate-100 md:flex">
      <Sidebar
        collapsed={collapsed}
        open={open}
        onClose={() => setOpen(false)}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />
      {open && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-slate-950/30 md:hidden" type="button" onClick={() => setOpen(false)} />}
      <section className="min-w-0 flex-1">
        <Navbar />
        <div className="px-4 py-6 md:px-6">
          <h2 className="mb-5 text-2xl font-black text-slate-950">{title}</h2>
          {children}
        </div>
      </section>
    </main>
  );
};

export default DashboardLayout;
