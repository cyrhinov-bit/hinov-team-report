import { supabase, isSupabaseConfigured } from './supabase';
import { WeeklyReport, ReportStatus, Activity, UserProfile } from '@/types';
import { ActivitiesService } from './activities';
import { getWeekNumber, getWeekRange } from '@/utils/date';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPORTS_STORAGE_KEY = '@htr_reports';

// Initial Demo submitted reports for history and supervision previews
const INITIAL_DEMO_REPORTS: WeeklyReport[] = [
  {
    id: 'rep-38-2026-demo-collab-1',
    user_id: 'demo-collab-1',
    week_number: 38,
    year: 2026,
    start_date: '2026-09-14',
    end_date: '2026-09-18',
    status: 'soumis',
    submitted_at: '2026-09-18T17:30:00.000Z',
    emailed_at: '2026-09-18T17:30:05.000Z',
    email_recipient: 'direction@hinovgroup.com',
    content_snapshot: [
      {
        id: 'act-38-1',
        user_id: 'demo-collab-1',
        date: '2026-09-14',
        day_of_week: 1,
        title: 'Déploiement du cluster Kubernetes et configuration Ingress',
        description: 'Mise en place de l’infrastructure de staging et tests d’allocation des ressources processeur.',
        category: 'Développement',
        status: 'terminee',
        is_locked: true,
        created_at: '2026-09-14T09:00:00.000Z',
      },
      {
        id: 'act-38-2',
        user_id: 'demo-collab-1',
        date: '2026-09-15',
        day_of_week: 2,
        title: 'Revue d’architecture Cloud et sécurisation API Gateway',
        description: 'Audit des routes exposées et implémentation des quotas de requêtes par clé API.',
        category: 'Sécurité',
        status: 'terminee',
        is_locked: true,
        created_at: '2026-09-15T11:00:00.000Z',
      },
      {
        id: 'act-38-3',
        user_id: 'demo-collab-1',
        date: '2026-09-16',
        day_of_week: 3,
        title: 'Tests de charge et benchmark des performances',
        description: 'Simulation de 50 000 connexions concurrentes sur l’environnement de pré-production.',
        category: 'Développement',
        status: 'terminee',
        is_locked: true,
        created_at: '2026-09-16T14:30:00.000Z',
      },
      {
        id: 'act-38-4',
        user_id: 'demo-collab-1',
        date: '2026-09-17',
        day_of_week: 4,
        title: 'Réunion de cadrage et synchronisation DevOps',
        description: 'Point hebdomadaire d’alignement avec l’équipe projet HINOV sur les jalons du trimestre.',
        category: 'Réunion',
        status: 'terminee',
        is_locked: true,
        created_at: '2026-09-17T10:00:00.000Z',
      },
      {
        id: 'act-38-5',
        user_id: 'demo-collab-1',
        date: '2026-09-18',
        day_of_week: 5,
        title: 'Finalisation documentation technique et automatisation des backups',
        description: 'Rédaction du guide d’exploitation et paramétrage des snapshots quotidiens chiffrés.',
        category: 'Support',
        status: 'terminee',
        is_locked: true,
        created_at: '2026-09-18T15:00:00.000Z',
      },
    ],
    difficulties: [
      'Latence réseau temporaire constatée lors de la synchronisation entre les zones de disponibilité.',
      'Délai de propagation des certificats SSL tiers résolu en collaboration avec le fournisseur DNS.',
    ],
    perspectives: [
      'Migration définitive des bases de données de production en Semaine 39.',
      'Mise en œuvre du monitoring temps réel avec alertes instantanées sur Microsoft Teams.',
    ],
    created_at: '2026-09-14T08:00:00.000Z',
    author: {
      id: 'demo-collab-1',
      full_name: 'Jean-Marc Kouassi',
      email: 'jm.kouassi@hinovgroup.com',
      job_title: 'Ingénieur Solutions Cloud',
      department: 'Direction Technique',
      role: 'collaborateur',
      is_active: true,
      must_change_password: false,
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      custom_gemini_api_key: null,
    },
  },
  {
    id: 'rep-38-2026-demo-collab-2',
    user_id: 'demo-collab-2',
    week_number: 38,
    year: 2026,
    start_date: '2026-09-14',
    end_date: '2026-09-18',
    status: 'soumis',
    submitted_at: '2026-09-18T16:00:00.000Z',
    emailed_at: '2026-09-18T16:00:05.000Z',
    email_recipient: 'direction@hinovgroup.com',
    content_snapshot: [
      {
        id: 'act-38-2-1',
        user_id: 'demo-collab-2',
        date: '2026-09-14',
        day_of_week: 1,
        title: 'Atelier de co-conception UX pour le portail client',
        description: 'Recueil des retours utilisateurs et validation des wireframes interactifs.',
        category: 'Gestion de projet',
        status: 'terminee',
        is_locked: true,
        created_at: '2026-09-14T09:30:00.000Z',
      },
      {
        id: 'act-38-2-2',
        user_id: 'demo-collab-2',
        date: '2026-09-16',
        day_of_week: 3,
        title: 'Validation des parcours mobiles et design tokens',
        description: 'Harmonisation de la charte graphique et validation avec le Comité Produit.',
        category: 'Général',
        status: 'terminee',
        is_locked: true,
        created_at: '2026-09-16T11:00:00.000Z',
      },
    ],
    difficulties: ['Arbitrage nécessaire sur les formats d’exportation des tableaux de bord client.'],
    perspectives: ['Lancement de la phase de tests utilisateurs en environnement pilote.'],
    created_at: '2026-09-14T08:00:00.000Z',
    author: {
      id: 'demo-collab-2',
      full_name: 'Amina Diallo',
      email: 'amina.diallo@hinovgroup.com',
      job_title: 'Product Owner & UX Lead',
      department: 'Digital & Innovation',
      role: 'collaborateur',
      is_active: true,
      must_change_password: true,
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
      custom_gemini_api_key: null,
    },
  },
];

export const ReportsService = {
  async getOrCreateWeeklyDraft(user: UserProfile, weekNumber?: number, year?: number): Promise<WeeklyReport> {
    const currentInfo = getWeekNumber();
    const w = weekNumber ?? currentInfo.week;
    const y = year ?? currentInfo.year;
    const range = getWeekRange(w, y);

    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
      const reports: WeeklyReport[] = raw ? JSON.parse(raw) : [...INITIAL_DEMO_REPORTS];
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
      // Look for existing report
      const { data: existing } = await supabase
        .from('reports')
        .select('*, author:profiles(*)')
        .eq('user_id', user.id)
        .eq('week_number', w)
        .eq('year', y)
        .maybeSingle();

      const activities = await ActivitiesService.getActivitiesForUser(user.id, range.startDate, range.endDate);

      if (existing) {
        if (existing.status === 'brouillon') {
          // Update draft with fresh activities
          await supabase
            .from('reports')
            .update({ content_snapshot: activities, start_date: range.startDate, end_date: range.endDate })
            .eq('id', existing.id);
          existing.content_snapshot = activities;
        }
        return existing;
      }

      // Create new draft
      const { data: created, error } = await supabase
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
        .select('*, author:profiles(*)')
        .single();

      if (error) throw error;
      return created;
    } catch (err: any) {
      console.error('Error in getOrCreateWeeklyDraft:', err);
      // Fallback object
      return {
        id: `rep-fallback-${w}`,
        user_id: user.id,
        week_number: w,
        year: y,
        start_date: range.startDate,
        end_date: range.endDate,
        status: 'brouillon',
        content_snapshot: [],
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
      const { error } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', reportId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
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
    await ActivitiesService.lockActivities(actIds);

    const isDirector = user.role === 'directeur_admin';
    const recipient = isDirector ? 'Non envoyé (Rapport Directeur)' : 'direction@hinovgroup.com';

    if (!isSupabaseConfigured) {
      await this.saveReportDraft(report.id, {
        status: 'soumis',
        submitted_at: new Date().toISOString(),
        emailed_at: isDirector ? null : new Date().toISOString(),
        email_recipient: recipient,
        content_snapshot: report.content_snapshot,
        difficulties: report.difficulties || [],
        perspectives: report.perspectives || [],
        author: user,
      });

      return {
        success: true,
        message: isDirector
          ? 'Votre rapport personnel a été généré et archivé avec succès.'
          : `Rapport validé et envoyé automatiquement au Directeur (${recipient}).`,
      };
    }

    try {
      // Update report content and status in Supabase
      await supabase
        .from('reports')
        .update({
          status: 'soumis',
          submitted_at: new Date().toISOString(),
          email_recipient: isDirector ? null : 'direction@hinovgroup.com',
          content_snapshot: report.content_snapshot,
          difficulties: report.difficulties || [],
          perspectives: report.perspectives || [],
        })
        .eq('id', report.id);

      // Call Supabase Edge Function to send email via Microsoft Graph
      const { data, error } = await supabase.functions.invoke('send-report-email', {
        body: {
          reportId: report.id,
          pdfBase64,
        },
      });

      if (error) {
        return {
          success: true,
          message: 'Rapport soumis et archivé dans la base HTR.',
        };
      }

      return {
        success: true,
        message: data?.message || 'Rapport soumis avec succès.',
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async getReportsHistory(userId: string): Promise<WeeklyReport[]> {
    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
      const reports: WeeklyReport[] = raw ? JSON.parse(raw) : [...INITIAL_DEMO_REPORTS];
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
      const reports: WeeklyReport[] = raw ? JSON.parse(raw) : [...INITIAL_DEMO_REPORTS];
      return reports.filter((r) => r.week_number === w && r.year === y);
    }

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*, author:profiles(*)')
        .eq('week_number', w)
        .eq('year', y)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching admin reports:', err);
      return [];
    }
  },
};

