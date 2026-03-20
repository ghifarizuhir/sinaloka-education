import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { authService } from '@/src/services/auth.service';
import i18n from '@/src/lib/i18n';
import type { User } from '@/src/types/auth';

function applyInstitutionLanguage(profile: User) {
  if (!localStorage.getItem('sinaloka-lang') && profile.institution?.default_language) {
    i18n.changeLanguage(profile.institution.default_language);
    document.documentElement.lang = profile.institution.default_language;
  }
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  mustChangePassword: boolean;
  impersonatedInstitution: { id: string; name: string } | null;
  enterInstitution: (id: string, name: string) => void;
  exitInstitution: () => void;
  isImpersonating: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!user;
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const [impersonatedInstitution, setImpersonatedInstitution] = useState<{
    id: string;
    name: string;
  } | null>(() => {
    const stored = sessionStorage.getItem('impersonatedInstitution');
    return stored ? JSON.parse(stored) : null;
  });

  const enterInstitution = useCallback((id: string, name: string) => {
    const value = { id, name };
    setImpersonatedInstitution(value);
    sessionStorage.setItem('impersonatedInstitution', JSON.stringify(value));
  }, []);

  const exitInstitution = useCallback(() => {
    setImpersonatedInstitution(null);
    sessionStorage.removeItem('impersonatedInstitution');
  }, []);

  const isImpersonating = impersonatedInstitution !== null;

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setIsLoading(false); return; }
    authService.getMe()
      .then((profile) => {
        setUser(profile);
        setMustChangePassword(profile.must_change_password);
        applyInstitutionLanguage(profile);
      })
      .catch(() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const tokens = await authService.login({ email, password });
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    const profile = await authService.getMe();
    setUser(profile);
    setMustChangePassword(profile.must_change_password);
    applyInstitutionLanguage(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try { if (refreshToken) await authService.logout(refreshToken); } catch { /* ignore */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('impersonatedInstitution');
    setImpersonatedInstitution(null);
    setMustChangePassword(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, mustChangePassword, impersonatedInstitution, enterInstitution, exitInstitution, isImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
}
