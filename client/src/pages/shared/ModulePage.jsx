import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { useNavigate } from 'react-router-dom';

const ModulePage = ({ title, actions, children, showBack = false, backTo }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
      return;
    }
    navigate(-1);
  };

  return (
    <DashboardLayout title={title}>
      {(showBack || actions) && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {showBack && (
            <button className="btn-secondary" type="button" onClick={handleBack}>
              Back
            </button>
          )}
          {actions}
        </div>
      )}
      {children || (
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">This module is ready for workflow-specific forms, filters, tables, and actions.</p>
        </section>
      )}
    </DashboardLayout>
  );
};

export default ModulePage;
