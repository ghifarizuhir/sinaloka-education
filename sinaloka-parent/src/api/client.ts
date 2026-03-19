import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) { accessToken = token; }
export function getAccessToken(): string | null { return accessToken; }

const REFRESH_TOKEN_KEY = 'sinaloka_parent_refresh_token';

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}
export function setRefreshToken(token: string | null) {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
}
export function clearTokens() {
  accessToken = null;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const response = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
    const { access_token, refresh_token } = response.data;
    setAccessToken(access_token);
    setRefreshToken(refresh_token);
    return access_token;
  } catch {
    clearTokens();
    return null;
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  },
);

export default api;

export const checkoutPayment = (id: string) =>
  api.post<{ snap_token: string; redirect_url: string }>(`/payments/${id}/checkout`).then((r) => r.data);

export const getPaymentStatus = (id: string) =>
  api.get<{ id: string; status: string; paid_date: string | null; method: string | null }>(`/payments/${id}/status`).then((r) => r.data);
