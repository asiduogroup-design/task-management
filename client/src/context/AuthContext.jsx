import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext(null);

const dashboardByRole = {
  super_admin: '/admin/dashboard',
  admin: '/admin/dashboard',
  manager: '/manager/dashboard',
  employee: '/employee/dashboard'
};

const getStoredToken = () => localStorage.getItem('ewms_token') || sessionStorage.getItem('ewms_token');
const getStoredUser = () => localStorage.getItem('ewms_user') || sessionStorage.getItem('ewms_user');

const clearStoredAuth = () => {
  localStorage.removeItem('ewms_token');
  localStorage.removeItem('ewms_user');
  sessionStorage.removeItem('ewms_token');
  sessionStorage.removeItem('ewms_user');
};

export const roleLabels = {
  super_admin: 'Super Admin',
  admin: 'Admin / HR',
  manager: 'Project Manager',
  employee: 'Employee'
};

export const getDashboardPath = (role) => dashboardByRole[role] || '/login';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = getStoredUser();
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(true);

  const persist = useCallback((data, remember = true) => {
    clearStoredAuth();
    if (remember) {
      localStorage.setItem('ewms_token', data.token);
      localStorage.setItem('ewms_user', JSON.stringify(data.user));
    } else {
      sessionStorage.setItem('ewms_token', data.token);
      sessionStorage.setItem('ewms_user', JSON.stringify(data.user));
    }
    setToken(data.token);
    setUser(data.user);
  }, []);

  const login = useCallback(
    async (payload) => {
      const { data } = await authService.login(payload);
      persist(data, payload.remember);
      return data.user;
    },
    [persist]
  );

  const logout = useCallback(async () => {
    try {
      if (getStoredToken()) await authService.logout();
    } catch (error) {
      // Local cleanup still matters if the server is unavailable.
    }
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getStoredToken()) return null;
    const { data } = await authService.me();
    setUser(data.user);
    const storage = localStorage.getItem('ewms_token') ? localStorage : sessionStorage;
    storage.setItem('ewms_user', JSON.stringify(data.user));
    return data.user;
  }, []);

  useEffect(() => {
    const loadMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authService.me();
        setUser(data.user);
        const storage = localStorage.getItem('ewms_token') ? localStorage : sessionStorage;
        storage.setItem('ewms_user', JSON.stringify(data.user));
      } catch (error) {
        await logout();
      } finally {
        setLoading(false);
      }
    };
    loadMe();
  }, [logout, token]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      login,
      logout,
      refreshUser
    }),
    [loading, login, logout, refreshUser, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
