import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Mock the API client
vi.mock('../api/client', () => {
  const mockApi = {
    post: vi.fn(),
    get: vi.fn(),
  };
  return {
    default: mockApi,
    setAccessToken: vi.fn(),
    setRefreshToken: vi.fn(),
    getRefreshToken: vi.fn(() => null),
    clearTokens: vi.fn(),
  };
});

import api, { setAccessToken, setRefreshToken } from '../api/client';
import { AuthProvider, AuthContext } from './AuthContext';

describe('Tutors AuthContext login slug detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate: hostname = 'testinstitusi.sinaloka.com'
    Object.defineProperty(window, 'location', {
      value: { hostname: 'testinstitusi.sinaloka.com' },
      writable: true,
    });
  });

  it('sends slug derived from subdomain in login request', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: { access_token: 'at', refresh_token: 'rt' },
    });
    (api.get as any).mockResolvedValueOnce({
      data: { id: 'u1', name: 'Tutor', email: 't@t.com', role: 'TUTOR' },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

    await act(async () => {
      await result.current!.login('tutor@test.com', 'password123');
    });

    expect(api.post).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ slug: 'testinstitusi' }),
    );
  });

  it('sends no slug when on localhost', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      writable: true,
    });

    (api.post as any).mockResolvedValueOnce({
      data: { access_token: 'at', refresh_token: 'rt' },
    });
    (api.get as any).mockResolvedValueOnce({
      data: { id: 'u1', name: 'Tutor', email: 't@t.com', role: 'TUTOR' },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

    await act(async () => {
      await result.current!.login('tutor@test.com', 'password123');
    });

    const callArgs = (api.post as any).mock.calls[0][1];
    expect(callArgs.slug).toBeUndefined();
  });
});
