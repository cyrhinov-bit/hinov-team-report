import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { apiRequest, refreshAuthSession } from '@/lib/api';

type StoredSession = {
  accessToken: string;
  refreshToken?: string;
  savedAt?: number;
};

type AuthContextValue = {
  token: string | null;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
};

const SESSION_KEY = 'hinov_team_report_session';
const AuthContext = createContext<AuthContextValue | null>(null);

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      return null;
    }
    return null;
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignorer
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Ignorer
  }
}

async function storageDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignorer
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignorer
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const refreshTokenRef = useRef<string | null>(null);

  const saveSession = useCallback(async (accessToken: string, refreshToken?: string) => {
    const sessionData: StoredSession = {
      accessToken,
      refreshToken,
      savedAt: Date.now(),
    };
    refreshTokenRef.current = refreshToken ?? null;
    await storageSet(SESSION_KEY, JSON.stringify(sessionData));
    setToken(accessToken);
  }, []);

  const clearSession = useCallback(async () => {
    refreshTokenRef.current = null;
    setToken(null);
    await storageDelete(SESSION_KEY);
  }, []);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    const currentRefresh = refreshTokenRef.current;
    if (!currentRefresh) return null;
    try {
      const refreshed = await refreshAuthSession(currentRefresh);
      if (refreshed.access_token && refreshed.refresh_token) {
        await saveSession(refreshed.access_token, refreshed.refresh_token);
        return refreshed.access_token;
      }
    } catch {
      // Le refresh a échoué (ex: hors ligne), conserver le token existant sans forcer le logout
    }
    return null;
  }, [saveSession]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const raw = await storageGet(SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as StoredSession;
          if (parsed?.accessToken) {
            refreshTokenRef.current = parsed.refreshToken ?? null;
            if (isMounted) setToken(parsed.accessToken);

            // Si un refresh_token est présent, tenter un rafraîchissement transparent en tâche de fond
            if (parsed.refreshToken) {
              refreshAuthSession(parsed.refreshToken)
                .then((fresh) => {
                  if (isMounted && fresh.access_token) {
                    saveSession(fresh.access_token, fresh.refresh_token);
                  }
                })
                .catch(() => {
                  // Conserver la session hors ligne
                });
            }
          }
        }
      } catch {
        // En cas d'erreur de lecture, laisser l'état neutre
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [saveSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isHydrated,
      login: async (email, password) => {
        const result = await apiRequest<{ access_token: string; refresh_token?: string }>('/api/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        await saveSession(result.access_token, result.refresh_token);
      },
      logout: async () => {
        await clearSession();
      },
      refreshSession,
    }),
    [token, isHydrated, saveSession, clearSession, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}