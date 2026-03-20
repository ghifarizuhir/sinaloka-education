import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api, {
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
} from '../api/client';
import type { TutorProfile } from '../types';
import { mapProfile } from '../mappers';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: TutorProfile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<TutorProfile | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/api/tutor/profile');
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

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await api.post('/api/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // Ignore — always clear local tokens
    } finally {
      clearTokens();
      setIsAuthenticated(false);
      setProfile(null);
    }
  }, []);

  // Try to restore session on mount
  useEffect(() => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      api.post('/api/auth/refresh', { refresh_token: refreshToken })
        .then((res) => {
          setAccessToken(res.data.access_token);
          setRefreshToken(res.data.refresh_token);
          return fetchProfile();
        })
        .catch(() => {
          clearTokens();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  // Listen for forced logout from interceptor
  useEffect(() => {
    const handler = () => {
      clearTokens();
      setIsAuthenticated(false);
      setProfile(null);
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, profile, login, logout, refreshProfile: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
