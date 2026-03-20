import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api, { setAccessToken, setRefreshToken, getRefreshToken, clearTokens } from '../api/client';
import type { ParentProfile } from '../types';
import { mapProfile } from '../mappers';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: ParentProfile | null;
  login: (email: string, password: string) => Promise<void>;
  register: (token: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ParentProfile | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/api/auth/me');
      setProfile(mapProfile(res.data));
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
      setProfile(null);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password });
    setAccessToken(res.data.access_token);
    setRefreshToken(res.data.refresh_token);
    await fetchProfile();
  }, [fetchProfile]);

  const register = useCallback(async (token: string, name: string, password: string) => {
    const res = await api.post('/api/auth/register/parent', { token, name, password });
    setAccessToken(res.data.access_token);
    setRefreshToken(res.data.refresh_token);
    await fetchProfile();
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await api.post('/api/auth/logout', { refresh_token: refreshToken });
    } catch {
      // Always clear local tokens regardless
    } finally {
      clearTokens();
      setIsAuthenticated(false);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      api.post('/api/auth/refresh', { refresh_token: refreshToken })
        .then((res) => {
          setAccessToken(res.data.access_token);
          setRefreshToken(res.data.refresh_token);
          return fetchProfile();
        })
        .catch(() => clearTokens())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    const handler = () => { clearTokens(); setIsAuthenticated(false); setProfile(null); };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, profile, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
