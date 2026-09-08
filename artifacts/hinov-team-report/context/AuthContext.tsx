import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';

type AuthContextValue = {
  token: string | null;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const SESSION_KEY = '@hinov-team-report/session';
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(SESSION_KEY)
      .then((session) => {
        if (session) {
          const parsed = JSON.parse(session) as { accessToken?: string };
          setToken(parsed.accessToken ?? null);
        }
      })
      .catch(() => undefined)
      .finally(() => setIsHydrated(true));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isHydrated,
      login: async (email, password) => {
        const result = await apiRequest<{ access_token: string; refresh_token?: string }>('/api/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        await SecureStore.setItemAsync(
          SESSION_KEY,
          JSON.stringify({ accessToken: result.access_token, refreshToken: result.refresh_token }),
        );
        setToken(result.access_token);
      },
      logout: async () => {
        await SecureStore.deleteItemAsync(SESSION_KEY);
        setToken(null);
      },
    }),
    [token, isHydrated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}