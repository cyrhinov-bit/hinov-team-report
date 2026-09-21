import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile, AppRole, AuditLog } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_STORAGE_KEY = '@htr_admin_users';

const DEFAULT_ADMIN_USERS: UserProfile[] = [
  {
    id: 'demo-collab-1',
    full_name: 'Jean-Marc Kouassi',
    email: 'jm.kouassi@hinovgroup.com',
    job_title: 'Ingénieur Solutions Cloud',
    department: 'Direction Technique',
    role: 'collaborateur',
    is_active: true,
    must_change_password: false,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    last_login_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'demo-collab-2',
    full_name: 'Amina Diallo',
    email: 'amina.diallo@hinovgroup.com',
    job_title: 'Product Owner & UX Lead',
    department: 'Digital & Innovation',
    role: 'collaborateur',
    is_active: true,
    must_change_password: true,
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    last_login_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'demo-collab-3',
    full_name: 'Serge Bamba',
    email: 'serge.bamba@hinovgroup.com',
    job_title: 'Consultant Senior Cybersécurité',
    department: 'Direction Technique',
    role: 'collaborateur',
    is_active: false,
    must_change_password: false,
    avatar_url: null,
    last_login_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'demo-director-1',
    full_name: 'Dr. Eric Yao',
    email: 'eric.yao@hinovgroup.com',
    job_title: 'Directeur Général Adjoint',
    department: 'Comité de Direction',
    role: 'directeur_admin',
    is_active: true,
    must_change_password: false,
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    last_login_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
  },
  {
    id: 'demo-superadmin-1',
    full_name: 'Super Administrateur',
    email: 'superadmin@hinovgroup.com',
    job_title: 'Responsable Systèmes d’Information',
    department: 'DSI / Sécurité',
    role: 'super_admin',
    is_active: true,
    must_change_password: false,
    avatar_url: null,
    last_login_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 200 * 86400000).toISOString(),
  },
];

export const AdminService = {
  async getAllUsers(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_ADMIN_USERS;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching users:', err);
      return [];
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
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          ...payload,
          password: tempPassword,
        },
      });

      if (error) return { success: false, error: error.message };
      return {
        success: true,
        user: data.user,
        temporaryPassword: tempPassword,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async resetUserPassword(
    userId: string,
    manualPassword?: string
  ): Promise<{ success: boolean; temporaryPassword?: string; error?: string }> {
    const tempPassword = manualPassword || this.generateTemporaryPassword();

    if (!isSupabaseConfigured) {
      const currentUsers = await this.getAllUsers();
      const updated = currentUsers.map((u) =>
        u.id === userId ? { ...u, must_change_password: true } : u
      );
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));

      return {
        success: true,
        temporaryPassword: tempPassword,
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          targetUserId: userId,
          manualPassword: tempPassword,
          autoGenerate: !manualPassword,
        },
      });

      if (error) return { success: false, error: error.message };
      return {
        success: true,
        temporaryPassword: data.temporaryPassword || tempPassword,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
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

