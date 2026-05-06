import { Navigate } from 'react-router-dom';
import { getDashboardPath, useAuth } from '../context/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

const RoleBasedRoute = ({ roles, children }) => {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      {roles.includes(user?.role) ? children : <Navigate to={getDashboardPath(user?.role)} replace />}
    </ProtectedRoute>
  );
};

export default RoleBasedRoute;
