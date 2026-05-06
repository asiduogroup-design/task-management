import DashboardLayout from '../../components/layout/DashboardLayout.jsx';

const ModulePage = ({ title, actions, children }) => (
  <DashboardLayout title={title}>
    {actions && <div className="mb-4 flex flex-wrap gap-3">{actions}</div>}
    {children || (
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">This module is ready for workflow-specific forms, filters, tables, and actions.</p>
      </section>
    )}
  </DashboardLayout>
);

export default ModulePage;
