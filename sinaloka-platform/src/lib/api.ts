import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// ── In-memory access token (never touches localStorage) ──────────────────────
let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

const REFRESH_TOKEN_KEY = 'sinaloka_refresh_token';

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearTokens() {
  accessToken = null;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
      refresh_token: refreshToken,
    });
    const { access_token, refresh_token } = response.data;
    setAccessToken(access_token);
    setRefreshToken(refresh_token);
    return access_token;
  } catch {
    clearTokens();
    return null;
  }
}

// ── Request interceptor: attach in-memory access token ───────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  try {
    const impersonated = sessionStorage.getItem('impersonatedInstitution');
    if (impersonated) {
      const { id } = JSON.parse(impersonated);
      config.params = { ...config.params, institution_id: id };
    }
  } catch {
    // ignore malformed sessionStorage data
  }
  return config;
});

// ── Response interceptor: serialize token refresh, dispatch logout event ─────
api.interceptors.response.use(
  (response) => {
    // Plan warning interceptor
    if (response.data?._warning) {
      const warning = response.data._warning;
      window.dispatchEvent(
        new CustomEvent('plan-warning', { detail: warning }),
      );
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      originalRequest._retry = true;

      // Serialize concurrent refresh attempts
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // Refresh failed — dispatch event for AuthContext to handle gracefully
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default api;
