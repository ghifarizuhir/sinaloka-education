import api from '@/src/lib/api';
import type { LoginRequest, TokenResponse, User } from '@/src/types/auth';

export const authService = {
  login: (data: LoginRequest) =>
    api.post<TokenResponse>('/api/auth/login', data).then((r) => r.data),
  refresh: (refresh_token: string) =>
    api.post<TokenResponse>('/api/auth/refresh', { refresh_token }).then((r) => r.data),
  logout: (refresh_token: string) =>
    api.post('/api/auth/logout', { refresh_token }),
  getMe: () =>
    api.get<User>('/api/auth/me').then((r) => r.data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post<TokenResponse>('/api/auth/change-password', data).then((r) => r.data),
};
