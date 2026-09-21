import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { AuthService } from '@/services/auth';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { router } from 'expo-router';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updatePassword: (newPass: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  uploadAvatar: (base64: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = async () => {
    try {
      setIsLoading(true);
      const stored = await AuthService.getStoredProfile();
      if (stored) {
        setUser(stored);
      }

      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUser(profile);
            await AuthService.setStoredProfile(profile);
          }
        }
      }
    } catch (err) {
      console.error('Session loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();

    if (isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          await AuthService.setStoredProfile(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profile) {
            setUser(profile);
            await AuthService.setStoredProfile(profile);
          }
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    const result = await AuthService.login(email, pass);
    setIsLoading(false);

    if (result.error || !result.profile) {
      return { success: false, error: result.error || 'Erreur d’authentification' };
    }

    setUser(result.profile);

    // Route according to user state
    if (result.profile.must_change_password) {
      router.replace('/(auth)/force-change-password');
    } else if (result.profile.role === 'directeur_admin' || result.profile.role === 'super_admin') {
      router.replace('/(collaborator)');
    } else {
      router.replace('/(collaborator)');
    }

    return { success: true };
  };

  const logout = async () => {
    setIsLoading(true);
    await AuthService.logout();
    setUser(null);
    setIsLoading(false);
    router.replace('/(auth)/login');
  };

  const updatePassword = async (newPass: string) => {
    const res = await AuthService.updatePassword(newPass);
    if (res.success && user) {
      const updatedUser = { ...user, must_change_password: false };
      setUser(updatedUser);
      await AuthService.setStoredProfile(updatedUser);
    }
    return res;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const res = await AuthService.updateProfile(updates);
    if (res.profile) {
      setUser(res.profile);
      return true;
    }
    return false;
  };

  const uploadAvatar = async (base64: string) => {
    if (!user) return false;
    const res = await AuthService.uploadAvatar(user.id, base64);
    if (res.url) {
      setUser((prev) => (prev ? { ...prev, avatar_url: res.url } : null));
      return true;
    }
    return false;
  };

  const refreshProfile = async () => {
    if (isSupabaseConfigured && user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUser(profile);
          await AuthService.setStoredProfile(profile);
          return;
        }
      } catch (err) {
        console.warn('Could not refresh profile from Supabase:', err);
      }
    }

    const stored = await AuthService.getStoredProfile();
    if (stored) setUser(stored);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        updatePassword,
        updateProfile,
        uploadAvatar,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

