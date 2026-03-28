import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { authService } from '@/src/services/auth.service';
import {
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
} from '@/src/lib/api';
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
  login: (email: string, password: string, slug?: string) => Promise<User>;
  logout: () => Promise<void>;
  updateTokens: (accessToken: string, refreshToken: string) => void;
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

  // On mount: use refresh token (if present) to restore session without exposing
  // the access token in localStorage.
  useEffect(() => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      setIsLoading(false);
      return;
    }
    authService.refresh(refreshToken)
      .then((tokens) => {
        setAccessToken(tokens.access_token);
        setRefreshToken(tokens.refresh_token);
        return authService.getMe();
      })
      .then((profile) => {
        setUser(profile);
        setMustChangePassword(profile.must_change_password);
        applyInstitutionLanguage(profile);
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Listen for forced logout dispatched by the API interceptor
  useEffect(() => {
    const handler = () => {
      clearTokens();
      sessionStorage.removeItem('impersonatedInstitution');
      setImpersonatedInstitution(null);
      setMustChangePassword(false);
      setUser(null);
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const login = useCallback(async (email: string, password: string, slug?: string): Promise<User> => {
    const tokens = await authService.login({ email, password, slug });
    setAccessToken(tokens.access_token);
    setRefreshToken(tokens.refresh_token);
    const profile = await authService.getMe();
    setUser(profile);
    setMustChangePassword(profile.must_change_password);
    applyInstitutionLanguage(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try { if (refreshToken) await authService.logout(refreshToken); } catch { /* ignore */ }
    clearTokens();
    sessionStorage.removeItem('impersonatedInstitution');
    setImpersonatedInstitution(null);
    setMustChangePassword(false);
    setUser(null);
  }, []);

  // Used by ChangePassword page to save new tokens without logging out
  const updateTokens = useCallback((newAccessToken: string, newRefreshToken: string) => {
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, updateTokens, mustChangePassword, impersonatedInstitution, enterInstitution, exitInstitution, isImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
}
