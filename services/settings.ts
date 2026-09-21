import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { CompanySettings } from '@/types';

const SETTINGS_STORAGE_KEY = '@htr_company_settings';

const DEFAULT_SETTINGS: CompanySettings = {
  id: 'default',
  company_name: 'HINOV GROUP',
  logo_url: null,
  pdf_header_image: null,
  pdf_footer_text: 'HINOV Team Report • Document Confidentiel d’Entreprise',
  director_email: 'direction@hinovgroup.com',
  superadmin_report_recipient: 'superadmin@hinovgroup.com',
  reminder_cron: 'Tous les vendredis à 16h00',
  smtp_from: 'rapports@hinovgroup.com',
};

export const SettingsService = {
  async getSettings(): Promise<CompanySettings> {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    const cached: CompanySettings = raw ? JSON.parse(raw) : DEFAULT_SETTINGS;

    if (!isSupabaseConfigured) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (error || !data) {
        return cached;
      }

      const merged: CompanySettings = {
        ...cached,
        company_name: data.company_name || cached.company_name,
        pdf_header_image: data.pdf_header_image ?? cached.pdf_header_image,
        pdf_footer_text: data.pdf_footer_text || cached.pdf_footer_text,
      };

      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } catch (err) {
      console.warn('Failed to fetch remote app_settings, using local cache:', err);
      return cached;
    }
  },

  async updateSettings(updates: Partial<CompanySettings>): Promise<{ success: boolean; settings?: CompanySettings; error?: string }> {
    const current = await this.getSettings();
    const updated: CompanySettings = { ...current, ...updates };

    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));

    if (!isSupabaseConfigured) {
      return { success: true, settings: updated };
    }

    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          id: 'default',
          company_name: updated.company_name,
          pdf_header_image: updated.pdf_header_image,
          pdf_footer_text: updated.pdf_footer_text,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.warn('Supabase app_settings upsert error:', error);
      }

      return { success: true, settings: updated };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async uploadHeaderImage(base64Image: string): Promise<{ url: string | null; error?: string }> {
    const dataUri = `data:image/jpeg;base64,${base64Image}`;

    if (!isSupabaseConfigured) {
      await this.updateSettings({ pdf_header_image: dataUri });
      return { url: dataUri };
    }

    try {
      // Decode base64 to byte array
      const byteCharacters = atob(base64Image);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const filePath = `branding/header_banner_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, byteArray, { contentType: 'image/jpeg', upsert: true });

      let finalUrl = dataUri;
      if (!uploadError) {
        const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        if (publicData?.publicUrl) {
          finalUrl = publicData.publicUrl;
        }
      }

      await this.updateSettings({ pdf_header_image: finalUrl });
      return { url: finalUrl };
    } catch (err: any) {
      // Fallback to storing data URI directly
      await this.updateSettings({ pdf_header_image: dataUri });
      return { url: dataUri };
    }
  },

  async deleteHeaderImage(): Promise<{ success: boolean; error?: string }> {
    return this.updateSettings({ pdf_header_image: null });
  },
};

