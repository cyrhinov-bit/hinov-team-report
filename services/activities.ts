import { supabase, isSupabaseConfigured } from './supabase';
import { Activity, ActivityStatus } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVITIES_STORAGE_KEY = '@htr_activities';

// Demo initial activities
// Demo initial activities for all users across the team
const INITIAL_DEMO_ACTIVITIES: Activity[] = [
  // --- 1. Jean-Marc Kouassi (demo-collab-1) ---
  {
    id: 'act-jmk-1',
    user_id: 'demo-collab-1',
    date: '2026-09-21',
    day_of_week: 1,
    title: 'Audit de sécurité des infrastructures Cloud HINOV',
    description: 'Revue des accès IAM, analyse des logs d’intrusion et durcissement des groupes de sécurité.',
    category: 'Sécurité',
    status: 'terminee',
    is_locked: false,
    created_at: '2026-09-21T08:30:00.000Z',
  },
  {
    id: 'act-jmk-2',
    user_id: 'demo-collab-1',
    date: '2026-09-21',
    day_of_week: 1,
    title: 'Réunion d’alignement technique hebdomadaire',
    description: 'Point d’équipe sur le calendrier de déploiement des micro-services et répartition des tâches.',
    category: 'Réunion',
    status: 'terminee',
    is_locked: false,
    created_at: '2026-09-21T10:00:00.000Z',
  },
  {
    id: 'act-jmk-3',
    user_id: 'demo-collab-1',
    date: '2026-09-22',
    day_of_week: 2,
    title: 'Configuration et déploiement du pipeline CI/CD',
    description: 'Automatisation des tests unitaires et intégration continue sur GitLab CI.',
    category: 'Développement',
    status: 'terminee',
    is_locked: false,
    created_at: '2026-09-22T09:15:00.000Z',
  },
  {
    id: 'act-jmk-4',
    user_id: 'demo-collab-1',
    date: '2026-09-23',
    day_of_week: 3,
    title: 'Optimisation des requêtes PostgreSQL et indexation',
    description: 'Amélioration des performances sur les tables d’activités et rapports volumineux.',
    category: 'Développement',
    status: 'en_cours',
    is_locked: false,
    created_at: '2026-09-23T11:00:00.000Z',
  },
  {
    id: 'act-jmk-5',
    user_id: 'demo-collab-1',
    date: '2026-09-24',
    day_of_week: 4,
    title: 'Mise en place du monitoring Prometheus & Grafana',
    description: 'Configuration des dashboards de surveillance CPU, RAM et latence réseau.',
    category: 'Support',
    status: 'en_cours',
    is_locked: false,
    created_at: '2026-09-24T14:00:00.000Z',
  },
  {
    id: 'act-jmk-6',
    user_id: 'demo-collab-1',
    date: '2026-09-25',
    day_of_week: 5,
    title: 'Validation des sauvegardes automatiques et PRA',
    description: 'Test de restauration à blanc d’une instance de base de données.',
    category: 'Sécurité',
    status: 'terminee',
    is_locked: false,
    created_at: '2026-09-25T15:30:00.000Z',
  },

  // --- 2. Amina Diallo (demo-collab-2) ---
  {
    id: 'act-ad-1',
    user_id: 'demo-collab-2',
    date: '2026-09-21',
    day_of_week: 1,
    title: 'Atelier de cadrage UX et parcours mobile client',
    description: 'Validation des wireframes du portail et définition des personas clés.',
    category: 'Gestion de projet',
    status: 'terminee',
    is_locked: false,
    created_at: '2026-09-21T09:00:00.000Z',
  },
  {
    id: 'act-ad-2',
    user_id: 'demo-collab-2',
    date: '2026-09-22',
    day_of_week: 2,
    title: 'Rédaction des spécifications fonctionnelles (User Stories)',
    description: 'Découpage du backlog sprint 4 pour l’équipe de développement frontend.',
    category: 'Gestion de projet',
    status: 'terminee',
    is_locked: false,
    created_at: '2026-09-22T10:30:00.000Z',
  },
  {
    id: 'act-ad-3',
    user_id: 'demo-collab-2',
    date: '2026-09-23',
    day_of_week: 3,
    title: 'Tests d’utilisabilité et recueil des feedbacks',
    description: 'Session de tests utilisateurs sur le prototype interactif Figma.',
    category: 'Général',
    status: 'terminee',
    is_locked: false,
    created_at: '2026-09-23T14:00:00.000Z',
  },
  {
    id: 'act-ad-4',
    user_id: 'demo-collab-2',
    date: '2026-09-24',
    day_of_week: 4,
    title: 'Revue de sprint et démonstration client',
    description: 'Présentation des fonctionnalités livrées et validation des critères d’acceptation.',
    category: 'Réunion',
    status: 'terminee',
    is_locked: false,
    created_at: '2026-09-24T16:00:00.000Z',
  },

  // --- 3. Serge Bamba (demo-collab-3) ---
  {
    id: 'act-sb-1',
    user_id: 'demo-collab-3',
    date: '2026-09-21',
    day_of_week: 1,
    title: 'Scan de vulnérabilités et test d’intrusion externe',
    description: 'Analyse automatisée avec Nessus et tests manuels sur les endpoints exposés.',
    category: 'Sécurité',
    status: 'terminee',
    is_locked: false,
    created_at: '2026-09-21T08:00:00.000Z',
  },
  {
    id: 'act-sb-2',
    user_id: 'demo-collab-3',
    date: '2026-09-23',
    day_of_week: 3,
    title: 'Mise à jour des politiques de conformité ISO 27001',
    description: 'Revue des procédures de gestion des incidents et sensibilisation interne.',
    category: 'Sécurité',
    status: 'terminee',
    is_locked: false,
    created_at: '2026-09-23T10:00:00.000Z',
  },

  // --- 4. Dr. Eric Yao (demo-director-1) ---
  {
    id: 'act-ey-1',
    user_id: 'demo-director-1',
    date: '2026-09-21',
    day_of_week: 1,
    title: 'Comité de Direction HINOV Group (COMEX)',
    description: 'Revue stratégique des projets Q3/Q4 et arbitrage budgétaire des investissements Cloud.',
    category: 'Réunion',
    status: 'terminee',
    is_locked: false,
    created_at: '2026-09-21T09:00:00.000Z',
  },
  {
    id: 'act-ey-2',
    user_id: 'demo-director-1',
    date: '2026-09-23',
    day_of_week: 3,
    title: 'Supervision et revue des livrables de la Direction Technique',
    description: 'Validation des rapports hebdomadaires et suivi des indicateurs de performance.',
    category: 'Gestion de projet',
    status: 'terminee',
    is_locked: false,
    created_at: '2026-09-23T14:00:00.000Z',
  },
];

export const ActivitiesService = {
  async getActivitiesForUser(userId: string, startDate?: string, endDate?: string): Promise<Activity[]> {
    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY);
      let list: Activity[] = [];
      if (raw) {
        list = JSON.parse(raw);
      } else {
        list = [...INITIAL_DEMO_ACTIVITIES];
        await AsyncStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(list));
      }
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

  async createActivity(activity: Omit<Activity, 'id' | 'is_locked' | 'created_at' | 'updated_at'>): Promise<{ activity: Activity | null; error?: string }> {
    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY);
      const list: Activity[] = raw ? JSON.parse(raw) : [...INITIAL_DEMO_ACTIVITIES];
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
      let list: Activity[] = raw ? JSON.parse(raw) : [...INITIAL_DEMO_ACTIVITIES];
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
      let list: Activity[] = raw ? JSON.parse(raw) : [...INITIAL_DEMO_ACTIVITIES];
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
      let list: Activity[] = raw ? JSON.parse(raw) : [...INITIAL_DEMO_ACTIVITIES];
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

