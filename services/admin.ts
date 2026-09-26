import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile, AppRole, AuditLog } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_STORAGE_KEY = '@htr_admin_users';

export const AdminService = {
  async getAllUsers(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error fetching users from Supabase:', err);
      // Fallback to local storage if network or table error
      const raw = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }
  },

  async createUser(payload: {
    fullName: string;
    email: string;
    password?: string;
    jobTitle?: string;
    department?: string;
    role: AppRole;
    isActive?: boolean;
    mustChangePassword?: boolean;
  }): Promise<{ success: boolean; user?: UserProfile; temporaryPassword?: string; error?: string }> {
    const tempPassword = payload.password || this.generateTemporaryPassword();

    if (!isSupabaseConfigured) {
      const currentUsers = await this.getAllUsers();
      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        full_name: payload.fullName,
        email: payload.email,
        job_title: payload.jobTitle || '',
        department: payload.department || '',
        role: payload.role,
        is_active: payload.isActive !== false,
        must_change_password: payload.mustChangePassword !== false,
        avatar_url: null,
        created_at: new Date().toISOString(),
      };
      currentUsers.push(newUser);
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(currentUsers));

      return {
        success: true,
        user: newUser,
        temporaryPassword: tempPassword,
      };
    }

    try {
      // 1. Primary path: Supabase Edge Function (server-side admin creation)
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          ...payload,
          password: tempPassword,
        },
      });

      if (!error && data?.user) {
        return {
          success: true,
          user: data.user,
          temporaryPassword: tempPassword,
        };
      }

      // 2. Direct Supabase Auth Fallback (if edge function is pending deployment)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: payload.email,
        password: tempPassword,
        options: {
          data: {
            full_name: payload.fullName,
            job_title: payload.jobTitle || '',
            department: payload.department || '',
            role: payload.role,
            must_change_password: payload.mustChangePassword !== false,
          },
        },
      });

      if (signUpError) {
        return { success: false, error: signUpError.message };
      }

      if (authData.user) {
        const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
        // Upsert into public.profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            full_name: payload.fullName,
            email: payload.email,
            job_title: payload.jobTitle || '',
            department: payload.department || '',
            role: payload.role,
            is_active: payload.isActive !== false,
            must_change_password: payload.mustChangePassword !== false,
            temp_password_expires_at: payload.mustChangePassword !== false ? expiresAt : null,
          })
          .select()
          .single();

        if (profileError) {
          console.warn('Profile direct upsert warning:', profileError);
        }

        return {
          success: true,
          user: profileData || {
            id: authData.user.id,
            full_name: payload.fullName,
            email: payload.email,
            job_title: payload.jobTitle || '',
            department: payload.department || '',
            role: payload.role,
            is_active: payload.isActive !== false,
            must_change_password: payload.mustChangePassword !== false,
            temp_password_expires_at: payload.mustChangePassword !== false ? expiresAt : null,
            avatar_url: null,
          },
          temporaryPassword: tempPassword,
        };
      }

      return {
        success: false,
        error: error?.message || 'Erreur lors de la création du compte sur Supabase',
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur de communication avec Supabase' };
    }
  },

  async resetUserPassword(
    userId: string,
    manualPassword?: string
  ): Promise<{ success: boolean; temporaryPassword?: string; error?: string }> {
    const tempPassword = manualPassword || this.generateTemporaryPassword();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    if (!isSupabaseConfigured) {
      const currentUsers = await this.getAllUsers();
      const updated = currentUsers.map((u) =>
        u.id === userId
          ? {
              ...u,
              must_change_password: true,
              temp_password_expires_at: expiresAt,
            }
          : u
      );
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));

      return {
        success: true,
        temporaryPassword: tempPassword,
      };
    }

    try {
      // 1. Check if the admin is resetting their own password
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser && currentUser.id === userId) {
        const { error: selfUpdateError } = await supabase.auth.updateUser({
          password: tempPassword,
        });

        if (selfUpdateError) {
          return { success: false, error: selfUpdateError.message };
        }

        await supabase
          .from('profiles')
          .update({
            must_change_password: true,
            temp_password_expires_at: expiresAt,
          })
          .eq('id', userId);

        return {
          success: true,
          temporaryPassword: tempPassword,
        };
      }

      // 2. Invoke server-side Supabase Edge Function with Admin Service Role
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          targetUserId: userId,
          manualPassword: tempPassword,
          autoGenerate: !manualPassword,
        },
      });

      if (error) {
        console.error('Edge Function admin-reset-password error:', error);
        
        // Fetch target user email to propose sending a reset email
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single();

        let emailSent = false;
        if (targetProfile?.email) {
          const { error: emailErr } = await supabase.auth.resetPasswordForEmail(targetProfile.email);
          if (!emailErr) {
            emailSent = true;
          }
        }

        return {
          success: false,
          error: emailSent
            ? `L'Edge Function 'admin-reset-password' n'est pas encore déployée sur votre projet Supabase. Un email sécurisé de réinitialisation a été envoyé à ${targetProfile?.email}.`
            : `Échec de la réinitialisation sur Supabase (${error.message || 'Fonction serveur indisponible'}).`,
        };
      }

      if (data?.error) {
        return {
          success: false,
          error: data.error,
        };
      }

      // 3. Mark must_change_password & temp_password_expires_at in profiles table
      await supabase
        .from('profiles')
        .update({
          must_change_password: true,
          temp_password_expires_at: expiresAt,
        })
        .eq('id', userId);

      return {
        success: true,
        temporaryPassword: data?.temporaryPassword || tempPassword,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de la réinitialisation' };
    }
  },

  async toggleUserActiveStatus(userId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      const currentUsers = await this.getAllUsers();
      const updated = currentUsers.map((u) => (u.id === userId ? { ...u, is_active: isActive } : u));
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      const currentUsers = await this.getAllUsers();
      const updated = currentUsers.map((u) => (u.id === userId ? { ...u, ...updates } : u));
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  generateTemporaryPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%^&*';
    const all = upper + lower + numbers + symbols;

    let pwd = '';
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += lower[Math.floor(Math.random() * lower.length)];
    pwd += numbers[Math.floor(Math.random() * numbers.length)];
    pwd += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < 12; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }

    return pwd
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  },
};

