import { createContext, useContext, useMemo, useState } from 'react';
import { employeeService } from '../services/employeeService.js';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const loadEmployees = async (params) => {
    setLoadingEmployees(true);
    try {
      const { data } = await employeeService.list(params);
      setEmployees(data.employees || []);
      return data.employees || [];
    } finally {
      setLoadingEmployees(false);
    }
  };

  const value = useMemo(() => ({ employees, loadingEmployees, loadEmployees }), [employees, loadingEmployees]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUsers = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUsers must be used inside UserProvider');
  return context;
};
