import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile, AppRole } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PROFILE_KEY = '@htr_user_profile';

export const AuthService = {
  async getStoredProfile(): Promise<UserProfile | null> {
    const raw = await AsyncStorage.getItem(STORAGE_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  async setStoredProfile(profile: UserProfile | null) {
    if (profile) {
      await AsyncStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
    } else {
      await AsyncStorage.removeItem(STORAGE_PROFILE_KEY);
    }
  },

  async login(email: string, password: string): Promise<{ profile: UserProfile | null; error?: string }> {
    if (!isSupabaseConfigured) {
      return { profile: null, error: 'Configuration Supabase non configurée ou indisponible.' };
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        return { profile: null, error: authError?.message || 'Identifiants invalides' };
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profileData) {
        return { profile: null, error: 'Profil introuvable' };
      }

      if (!profileData.is_active) {
        await supabase.auth.signOut();
        return { profile: null, error: 'Votre compte a été désactivé par l’administrateur.' };
      }

      if (profileData.must_change_password && profileData.temp_password_expires_at) {
        const isExpired = new Date().getTime() > new Date(profileData.temp_password_expires_at).getTime();
        if (isExpired) {
          await supabase.auth.signOut();
          return {
            profile: null,
            error: 'Ce mot de passe temporaire a expiré (délai de 24h dépassé). Veuillez demander une nouvelle réinitialisation à votre administrateur ou via "Mot de passe oublié".',
          };
        }
      }

      await this.setStoredProfile(profileData);
      return { profile: profileData };
    } catch (err: any) {
      return { profile: null, error: err.message || 'Erreur de connexion' };
    }
  },

  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      const current = await this.getStoredProfile();
      if (current) {
        current.must_change_password = false;
        current.temp_password_expires_at = null;
        await this.setStoredProfile(current);
      }
      return { success: true };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) return { success: false, error: error.message };

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({
            must_change_password: false,
            temp_password_expires_at: null,
          })
          .eq('id', user.id);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<{ profile: UserProfile | null; error?: string }> {
    const current = await this.getStoredProfile();
    const updated = { ...current, ...updates } as UserProfile;

    if (!isSupabaseConfigured) {
      await this.setStoredProfile(updated);
      return { profile: updated };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', updated.id)
        .select()
        .single();

      if (error) return { profile: null, error: error.message };
      await this.setStoredProfile(data);
      return { profile: data };
    } catch (err: any) {
      return { profile: null, error: err.message };
    }
  },

  async uploadAvatar(userId: string, base64Image: string): Promise<{ url: string | null; error?: string }> {
    if (!isSupabaseConfigured) {
      const demoUrl = `data:image/jpeg;base64,${base64Image}`;
      await this.updateProfile({ avatar_url: demoUrl });
      return { url: demoUrl };
    }

    try {
      // Decode base64 to byte array
      const byteCharacters = atob(base64Image);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const filePath = `${userId}/profile_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, byteArray, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) return { url: null, error: uploadError.message };

      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await this.updateProfile({ avatar_url: publicData.publicUrl });
      return { url: publicData.publicUrl };
    } catch (err: any) {
      return { url: null, error: err.message };
    }
  },

  async logout(): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    await this.setStoredProfile(null);
  },
};

