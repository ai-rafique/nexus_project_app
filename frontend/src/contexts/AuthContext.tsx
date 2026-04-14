import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/api/client';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, totpCode?: string) => Promise<{ requireTotp?: boolean }>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Rehydrate session from storage on mount
  useEffect(() => {
    const stored = localStorage.getItem('nexus_user');
    const token = localStorage.getItem('accessToken');
    if (stored && token) {
      try {
        setState({ user: JSON.parse(stored), isAuthenticated: true, isLoading: false });
      } catch {
        localStorage.clear();
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string, totpCode?: string) => {
      const { data } = await apiClient.post('/auth/login', { email, password, totpCode });

      if (data.requireTotp) return { requireTotp: true };

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('nexus_user', JSON.stringify(data.user));
      setState({ user: data.user, isAuthenticated: true, isLoading: false });
      return {};
    },
    [],
  );

  const register = useCallback(async (data: RegisterData) => {
    const { data: res } = await apiClient.post('/auth/register', data);
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('nexus_user', JSON.stringify(res.user));
    setState({ user: res.user, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await apiClient.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    localStorage.clear();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
