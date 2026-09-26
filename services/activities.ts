import { supabase, isSupabaseConfigured } from './supabase';
import { Activity, ActivityStatus } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVITIES_STORAGE_KEY = '@htr_activities';

export const ActivitiesService = {
  async getActivitiesForUser(userId: string, startDate?: string, endDate?: string): Promise<Activity[]> {
    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY);
      let list: Activity[] = raw ? JSON.parse(raw) : [];
      list = list.filter((a) => a.user_id === userId);
      if (startDate && endDate) {
        list = list.filter((a) => a.date >= startDate && a.date <= endDate);
      }
      return list.sort((a, b) => a.date.localeCompare(b.date) || (a.day_of_week || 0) - (b.day_of_week || 0));
    }

    try {
      let query = supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error fetching activities:', err);
      return [];
    }
  },

  async getActivityById(id: string): Promise<Activity | null> {
    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY);
      const list: Activity[] = raw ? JSON.parse(raw) : [];
      return list.find((a) => a.id === id) || null;
    }

    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error fetching activity by id:', err);
      return null;
    }
  },

  async createActivity(activity: Omit<Activity, 'id' | 'is_locked' | 'created_at' | 'updated_at'>): Promise<{ activity: Activity | null; error?: string }> {
    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY);
      const list: Activity[] = raw ? JSON.parse(raw) : [];
      const newAct: Activity = {
        ...activity,
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        is_locked: false,
        created_at: new Date().toISOString(),
      };
      list.push(newAct);
      await AsyncStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(list));
      return { activity: newAct };
    }

    try {
      const { data, error } = await supabase
        .from('activities')
        .insert([activity])
        .select()
        .single();

      if (error) return { activity: null, error: error.message };
      return { activity: data };
    } catch (err: any) {
      return { activity: null, error: err.message };
    }
  },

  async updateActivity(id: string, updates: Partial<Activity>): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY);
      let list: Activity[] = raw ? JSON.parse(raw) : [];
      list = list.map((a) => (a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a));
      await AsyncStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(list));
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async deleteActivity(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY);
      let list: Activity[] = raw ? JSON.parse(raw) : [];
      list = list.filter((a) => a.id !== id);
      await AsyncStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(list));
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async lockActivities(activityIds: string[]): Promise<void> {
    if (activityIds.length === 0) return;
    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY);
      let list: Activity[] = raw ? JSON.parse(raw) : [];
      list = list.map((a) => (activityIds.includes(a.id) ? { ...a, is_locked: true } : a));
      await AsyncStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(list));
      return;
    }

    await supabase
      .from('activities')
      .update({ is_locked: true })
      .in('id', activityIds);
  },
};

