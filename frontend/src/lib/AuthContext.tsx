import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api, setAccessToken } from './api';
import type { AuthResponse } from './types';

interface AuthState {
  isAuthed: boolean;
  loading: boolean;
  user: { id: string; email: string; name?: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthState['user']>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('flaxio_token');
    if (stored) setAccessToken(stored);
    api
      .get<{ id: string; email: string; name?: string }>('/auth/me')
      .then((u) => {
        setUser(u);
        setIsAuthed(true);
      })
      .catch(() => {
        setAccessToken(null);
        sessionStorage.removeItem('flaxio_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = (await api.post<AuthResponse>('/auth/login', { email, password })) as AuthResponse;
    setAccessToken(res.accessToken);
    sessionStorage.setItem('flaxio_token', res.accessToken);
    setUser(res.user || null);
    setIsAuthed(true);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = (await api.post<AuthResponse>('/auth/register', { name, email, password })) as AuthResponse;
    setAccessToken(res.accessToken);
    sessionStorage.setItem('flaxio_token', res.accessToken);
    setUser(res.user || null);
    setIsAuthed(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // ignore
    }
    setAccessToken(null);
    sessionStorage.removeItem('flaxio_token');
    setUser(null);
    setIsAuthed(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthed, loading, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
