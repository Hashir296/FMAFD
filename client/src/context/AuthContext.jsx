import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setAuthToken, removeAuthToken, getAuthToken } from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const applyUser = (user, token) => {
    if (token) setAuthToken(token);
    setCurrentUser(user);
    localStorage.setItem('finguard_user', JSON.stringify(user));
  };

  useEffect(() => {
    const restore = async () => {
      const token = getAuthToken();
      if (!token) {
        localStorage.removeItem('finguard_user');
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/profile');
        setCurrentUser(res.user);
        localStorage.setItem('finguard_user', JSON.stringify(res.user));
      } catch (err) {
        removeAuthToken();
        localStorage.removeItem('finguard_user');
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.success) {
        applyUser(res.user, res.token);
        showToast(`Signed in as ${res.user.name}`, 'success');
        return true;
      }
      return false;
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
      return false;
    }
  };

  const logout = () => {
    removeAuthToken();
    localStorage.removeItem('finguard_user');
    setCurrentUser(null);
  };

  const refreshUser = async () => {
    const res = await api.get('/auth/profile');
    setCurrentUser(res.user);
    localStorage.setItem('finguard_user', JSON.stringify(res.user));
    return res.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        currentUser,
        loading,
        login,
        logout,
        refreshUser,
        showToast,
        toasts,
        removeToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
