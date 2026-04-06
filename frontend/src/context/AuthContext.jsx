import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.me()
        .then(res => setUser(res.data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const can = useCallback((permission) => {
    if (!user) return false;
    const matrix = {
      'records:read':   ['VIEWER', 'ANALYST', 'ADMIN'],
      'records:create': ['ANALYST', 'ADMIN'],
      'records:update': ['ANALYST', 'ADMIN'],
      'records:delete': ['ANALYST', 'ADMIN'],
      'dashboard:read': ['VIEWER', 'ANALYST', 'ADMIN'],
      'users:read':     ['ADMIN'],
      'users:create':   ['ADMIN'],
      'users:update':   ['ADMIN'],
      'audit:read':     ['ADMIN'],
    };
    return (matrix[permission] || []).includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
