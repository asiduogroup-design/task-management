import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

const ModulePage = ({ title, actions, children, showBack = false, backTo }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEmployeeRoute = location.pathname.startsWith('/employee');

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
      return;
    }
    navigate(-1);
  };

  return (
    <DashboardLayout title={title}>
      <div className={isEmployeeRoute ? 'employee-page employee-page-module' : undefined}>
        {(showBack || actions) && (
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {showBack && (
              <button className="btn-secondary" type="button" onClick={handleBack}>
                Back
              </button>
            )}
            {actions}
          </div>
        )}
        {children || (
          <section className="surface-card-strong page-enter rounded-2xl p-6">
            <p className="text-sm text-slate-600">This module is ready for workflow-specific forms, filters, tables, and actions.</p>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ModulePage;
