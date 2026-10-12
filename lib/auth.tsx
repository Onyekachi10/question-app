'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, UserRole } from '../types/qa';
import { authApi } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  rateLimitError: string | null;
  rateLimitRetryAfter: number | null;
  clearRateLimitError: () => void;
  login: (payload: {
    email: string;
    username: string;
    userRole: UserRole;
  }) => Promise<void>;
  register: (payload: {
    email: string;
    username: string;
    userRole: UserRole;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(null);

  const clearRateLimitError = useCallback(() => {
    setRateLimitError(null);
    setRateLimitRetryAfter(null);
  }, []);

  // On mount: silently validate session cookie via /refresh
  useEffect(() => {
    authApi
      .refresh()
      .then((refreshedUser) => {
        setUser(refreshedUser);
        setIsLoading(false);
      })
      .catch((err: any) => {
        if (err?.isRateLimited || err?.status === 429) {
          setRateLimitError(err.message || 'Too many attempts. Please try again later.');
          setRateLimitRetryAfter(err.retryAfter ?? null);
        }
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(
    async (payload: { email: string; username: string; userRole: UserRole }) => {
      clearRateLimitError();
      try {
        const res = await authApi.login(payload);
        setUser(res.user);
      } catch (err: any) {
        if (err?.isRateLimited || err?.status === 429) {
          setRateLimitError(err.message || 'Too many attempts. Please try again later.');
          setRateLimitRetryAfter(err.retryAfter ?? null);
        }
        throw err;
      }
    },
    [clearRateLimitError]
  );

  const register = useCallback(
    async (payload: { email: string; username: string; userRole: UserRole }) => {
      clearRateLimitError();
      try {
        const fn =
          payload.userRole === 'creator'
            ? authApi.registerCreator
            : authApi.registerRecipient;
        const res = await fn({ email: payload.email, username: payload.username });
        setUser(res.user);
      } catch (err: any) {
        if (err?.isRateLimited || err?.status === 429) {
          setRateLimitError(err.message || 'Too many attempts. Please try again later.');
          setRateLimitRetryAfter(err.retryAfter ?? null);
        }
        throw err;
      }
    },
    [clearRateLimitError]
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
    clearRateLimitError();
  }, [clearRateLimitError]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        rateLimitError,
        rateLimitRetryAfter,
        clearRateLimitError,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
