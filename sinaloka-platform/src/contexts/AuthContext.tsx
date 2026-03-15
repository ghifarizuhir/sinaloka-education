import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { authService } from '@/src/services/auth.service';
import type { User } from '@/src/types/auth';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!user;

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setIsLoading(false); return; }
    authService.getMe()
      .then(setUser)
      .catch(() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authService.login({ email, password });
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    const profile = await authService.getMe();
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try { if (refreshToken) await authService.logout(refreshToken); } catch { /* ignore */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
