import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, AuthResponse } from '../types';
import { api } from '../services/api';
import { mockDb } from '../services/mockDatabase';

interface AuthContextType {
  user: AuthResponse | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  quickSwitch: (targetRole: UserRole) => Promise<void>;
  resetDatabase: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check localStorage for saved session
    const savedUser = localStorage.getItem('presenceguard_user');
    const savedToken = localStorage.getItem('presenceguard_token');
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('presenceguard_user');
        localStorage.removeItem('presenceguard_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setUser(res);
    localStorage.setItem('presenceguard_user', JSON.stringify(res));
    localStorage.setItem('presenceguard_token', res.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('presenceguard_user');
    localStorage.removeItem('presenceguard_token');
  };

  const quickSwitch = async (targetRole: UserRole) => {
    let email = 'student@college.com';
    let password = 'student123';
    if (targetRole === 'ADMIN') {
      email = 'admin@college.com';
      password = 'admin123';
    } else if (targetRole === 'TEACHER') {
      email = 'teacher@college.com';
      password = 'teacher123';
    }
    await login(email, password);
  };

  const resetDatabase = () => {
    mockDb.resetToDefaults();
    window.location.reload();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        quickSwitch,
        resetDatabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
