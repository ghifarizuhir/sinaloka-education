import { describe, it, expect, beforeEach, vi } from 'vitest';

// We test that getAccessToken() works in-memory and does NOT read from localStorage
describe('Platform API client token storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('getAccessToken returns null by default', async () => {
    const { getAccessToken } = await import('./api');
    expect(getAccessToken()).toBeNull();
  });

  it('setAccessToken stores token in memory, not localStorage', async () => {
    const { setAccessToken, getAccessToken } = await import('./api');
    setAccessToken('test-access-token');
    expect(getAccessToken()).toBe('test-access-token');
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('setRefreshToken stores token in localStorage', async () => {
    const { setRefreshToken } = await import('./api');
    setRefreshToken('test-refresh-token');
    expect(localStorage.getItem('sinaloka_refresh_token')).toBe('test-refresh-token');
  });

  it('clearTokens removes both in-memory and localStorage tokens', async () => {
    const { setAccessToken, setRefreshToken, getAccessToken, clearTokens } = await import('./api');
    setAccessToken('some-access');
    setRefreshToken('some-refresh');
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('sinaloka_refresh_token')).toBeNull();
  });
});
