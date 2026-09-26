import { supabase, isSupabaseConfigured } from './supabase';
import { WeeklyReport, ReportStatus, Activity, UserProfile } from '@/types';
import { ActivitiesService } from './activities';
import { SettingsService } from './settings';
import { getWeekNumber, getWeekRange } from '@/utils/date';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPORTS_STORAGE_KEY = '@htr_reports';

export const ReportsService = {
  async getOrCreateWeeklyDraft(user: UserProfile, weekNumber?: number, year?: number): Promise<WeeklyReport> {
    const currentInfo = getWeekNumber();
    const w = weekNumber ?? currentInfo.week;
    const y = year ?? currentInfo.year;
    const range = getWeekRange(w, y);

    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
      const reports: WeeklyReport[] = raw ? JSON.parse(raw) : [];
      let foundIndex = reports.findIndex((r) => r.user_id === user.id && r.week_number === w && r.year === y);

      // Always fetch latest activities for the week
      const currentActivities = await ActivitiesService.getActivitiesForUser(user.id, range.startDate, range.endDate);

      if (foundIndex === -1) {
        // Build new draft from current activities in range
        const newDraft: WeeklyReport = {
          id: `rep-${w}-${y}-${user.id}`,
          user_id: user.id,
          week_number: w,
          year: y,
          start_date: range.startDate,
          end_date: range.endDate,
          status: 'brouillon',
          content_snapshot: currentActivities,
          difficulties: [],
          perspectives: [],
          created_at: new Date().toISOString(),
          author: user,
        };
        reports.push(newDraft);
        await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
        return newDraft;
      }

      const existing = reports[foundIndex];
      // If still draft, refresh activities snapshot to include any newly created activities
      if (existing.status === 'brouillon') {
        existing.content_snapshot = currentActivities;
        existing.author = user;
        existing.start_date = range.startDate;
        existing.end_date = range.endDate;
        reports[foundIndex] = existing;
        await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
      }
      return existing;
    }

    try {
      // 1. Look for existing report for this user and week
      const { data: existing, error: fetchErr } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_number', w)
        .eq('year', y)
        .maybeSingle();

      if (fetchErr) {
        console.warn('Warning fetching existing report:', fetchErr.message);
      }

      const activities = await ActivitiesService.getActivitiesForUser(user.id, range.startDate, range.endDate);

      if (existing) {
        existing.author = user;
        if (existing.status === 'brouillon') {
          // Update draft with fresh activities snapshot
          await supabase
            .from('reports')
            .update({
              content_snapshot: activities,
              start_date: range.startDate,
              end_date: range.endDate,
            })
            .eq('id', existing.id);
          existing.content_snapshot = activities;
        }
        return existing;
      }

      // 2. Create new draft in Supabase
      const { data: created, error: insertError } = await supabase
        .from('reports')
        .insert([
          {
            user_id: user.id,
            week_number: w,
            year: y,
            start_date: range.startDate,
            end_date: range.endDate,
            status: 'brouillon',
            content_snapshot: activities,
            difficulties: [],
            perspectives: [],
          },
        ])
        .select('*')
        .single();

      if (insertError) {
        console.error('Error creating report draft in Supabase:', insertError);
        // In case of conflict, retry fetching
        const { data: retryReport } = await supabase
          .from('reports')
          .select('*')
          .eq('user_id', user.id)
          .eq('week_number', w)
          .eq('year', y)
          .maybeSingle();

        if (retryReport) {
          retryReport.author = user;
          return retryReport;
        }
        throw insertError;
      }

      created.author = user;
      return created;
    } catch (err: any) {
      console.error('Error in getOrCreateWeeklyDraft:', err);
      // Fallback object with user and activities
      const activities = await ActivitiesService.getActivitiesForUser(user.id, range.startDate, range.endDate).catch(() => []);
      return {
        id: `rep-fallback-${w}`,
        user_id: user.id,
        week_number: w,
        year: y,
        start_date: range.startDate,
        end_date: range.endDate,
        status: 'brouillon',
        content_snapshot: activities,
        difficulties: [],
        perspectives: [],
        author: user,
      };
    }
  },

  async saveReportDraft(reportId: string, updates: Partial<WeeklyReport>): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
      let reports: WeeklyReport[] = raw ? JSON.parse(raw) : [];
      reports = reports.map((r) => (r.id === reportId ? { ...r, ...updates, updated_at: new Date().toISOString() } : r));
      await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
      return { success: true };
    }

    try {
      // Sanitize updates to only valid table columns
      const sanitized: Record<string, any> = {};
      if (updates.content_snapshot !== undefined) sanitized.content_snapshot = updates.content_snapshot;
      if (updates.difficulties !== undefined) sanitized.difficulties = updates.difficulties;
      if (updates.perspectives !== undefined) sanitized.perspectives = updates.perspectives;
      if (updates.status !== undefined) sanitized.status = updates.status;
      if (updates.pdf_url !== undefined) sanitized.pdf_url = updates.pdf_url;
      if (updates.submitted_at !== undefined) sanitized.submitted_at = updates.submitted_at;
      if (updates.emailed_at !== undefined) sanitized.emailed_at = updates.emailed_at;
      if (updates.email_recipient !== undefined) sanitized.email_recipient = updates.email_recipient;
      if (updates.start_date !== undefined) sanitized.start_date = updates.start_date;
      if (updates.end_date !== undefined) sanitized.end_date = updates.end_date;

      const { error } = await supabase
        .from('reports')
        .update(sanitized)
        .eq('id', reportId);

      if (error) {
        console.error('Error saving report draft:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.error('Exception saving report draft:', err);
      return { success: false, error: err.message };
    }
  },

  async submitReport(
    report: WeeklyReport,
    user: UserProfile,
    pdfBase64?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    // 1. Lock all activities present in snapshot
    const actIds = (report.content_snapshot || []).map((a) => a.id).filter(Boolean);
    if (actIds.length > 0) {
      await ActivitiesService.lockActivities(actIds);
    }

    const isDirector = user.role === 'directeur_admin';

    if (!isSupabaseConfigured) {
      await this.saveReportDraft(report.id, {
        status: 'soumis',
        submitted_at: new Date().toISOString(),
        content_snapshot: report.content_snapshot,
        difficulties: report.difficulties || [],
        perspectives: report.perspectives || [],
      });

      return {
        success: true,
        message: isDirector
          ? 'Votre rapport personnel a été validé et archivé avec succès.'
          : 'Rapport hebdomadaire soumis et transmis avec succès à la Direction.',
      };
    }

    try {
      let uploadedPdfUrl: string | null | undefined = report.pdf_url;

      // 2. Upload PDF to Supabase Storage if base64 provided
      if (pdfBase64) {
        try {
          const byteCharacters = atob(pdfBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const filePath = `${user.id}/${report.year}_W${report.week_number}.pdf`;

          const { error: storageError } = await supabase.storage
            .from('reports_pdf')
            .upload(filePath, byteArray, { contentType: 'application/pdf', upsert: true });

          if (!storageError) {
            const { data: publicUrlData } = supabase.storage
              .from('reports_pdf')
              .getPublicUrl(filePath);
            uploadedPdfUrl = publicUrlData?.publicUrl;
          }
        } catch (storageErr) {
          console.warn('PDF storage upload warning:', storageErr);
        }
      }

      // 3. Update report in Supabase
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: 'soumis',
          submitted_at: new Date().toISOString(),
          content_snapshot: report.content_snapshot || [],
          difficulties: report.difficulties || [],
          perspectives: report.perspectives || [],
          ...(uploadedPdfUrl ? { pdf_url: uploadedPdfUrl } : {}),
        })
        .eq('id', report.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return {
        success: true,
        message: isDirector
          ? 'Votre rapport personnel a été validé et archivé avec succès dans l’espace Direction.'
          : 'Votre rapport hebdomadaire a été soumis et transmis avec succès à la Direction.',
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de la soumission du rapport' };
    }
  },

  async getReportsHistory(userId: string): Promise<WeeklyReport[]> {
    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
      const reports: WeeklyReport[] = raw ? JSON.parse(raw) : [];
      return reports
        .filter((r) => r.user_id === userId)
        .sort((a, b) => (b.year - a.year) || (b.week_number - a.week_number));
    }

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('year', { ascending: false })
        .order('week_number', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching history:', err);
      return [];
    }
  },

  async getAllReportsForAdmin(weekNumber?: number, year?: number): Promise<WeeklyReport[]> {
    const currentInfo = getWeekNumber();
    const w = weekNumber ?? currentInfo.week;
    const y = year ?? currentInfo.year;

    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
      const reports: WeeklyReport[] = raw ? JSON.parse(raw) : [];
      return reports.filter((r) => r.week_number === w && r.year === y);
    }

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*, author:profiles!user_id(*)')
        .eq('week_number', w)
        .eq('year', y)
        .order('submitted_at', { ascending: false });

      if (!error && data) {
        return data;
      }

      // Fallback in case of relationship name discrepancy
      const { data: rawReports, error: fallbackError } = await supabase
        .from('reports')
        .select('*')
        .eq('week_number', w)
        .eq('year', y)
        .order('submitted_at', { ascending: false });

      if (fallbackError) throw fallbackError;
      if (!rawReports || rawReports.length === 0) return [];

      const userIds = Array.from(new Set(rawReports.map((r) => r.user_id).filter(Boolean)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      return rawReports.map((r) => ({
        ...r,
        author: profileMap.get(r.user_id),
      }));
    } catch (err) {
      console.error('Error fetching admin reports:', err);
      return [];
    }
  },
};
