import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export type ActivityStatus = 'Terminée' | 'En cours' | 'En attente';

export type Activity = {
  id: string;
  date: string;
  title: string;
  description: string;
  category?: string;
  status: ActivityStatus;
};

export type Profile = {
  fullName: string;
  role: string;
  department: string;
  email: string;
  avatarUri?: string;
};

type AppStateContextValue = {
  activities: Activity[];
  profile: Profile;
  difficulties: string;
  perspectives: string;
  hasGeminiApiKey: boolean;
  isHydrated: boolean;
  addActivity: (activity: Omit<Activity, 'id'>) => void;
  updateActivity: (id: string, activity: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  updateProfile: (profile: Partial<Profile>) => void;
  setDifficulties: (value: string) => void;
  setPerspectives: (value: string) => void;
  saveGeminiApiKey: (value: string) => Promise<void>;
  clearGeminiApiKey: () => Promise<void>;
};

const initialProfile: Profile = {
  fullName: '',
  role: 'Collaborateur',
  department: '',
  email: '',
};

type ApiActivity = {
  id: string;
  activity_date: string;
  title: string;
  description: string;
  category: string;
  status: ActivityStatus;
};

const mapActivity = (activity: ApiActivity): Activity => ({
  id: activity.id,
  date: activity.activity_date,
  title: activity.title,
  description: activity.description,
  category: activity.category,
  status: activity.status,
});

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { token, isHydrated: authHydrated } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [difficulties, setDifficulties] = useState('');
  const [perspectives, setPerspectives] = useState('');
  const [hasGeminiApiKey, setHasGeminiApiKey] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!authHydrated) return;
    if (!token) {
      setActivities([]);
      setProfile(initialProfile);
      setHasGeminiApiKey(false);
      setIsHydrated(true);
      return;
    }

    let cancelled = false;
    setIsHydrated(false);
    Promise.all([
      apiRequest<{
        user: { email?: string };
        profile: { full_name: string; role: string; department: string; avatar_url?: string } | null;
      }>('/api/auth/me', { token }),
      apiRequest<ApiActivity[]>('/api/activities', { token }),
      apiRequest<{ configured: boolean }>('/api/ai-settings', { token }),
    ])
      .then(([me, remoteActivities, aiSettings]) => {
        if (cancelled) return;
        setProfile({
          fullName: me.profile?.full_name ?? '',
          role: me.profile?.role ?? 'Collaborateur',
          department: me.profile?.department ?? '',
          email: me.user.email ?? '',
          avatarUri: me.profile?.avatar_url ?? undefined,
        });
        setActivities(remoteActivities.map(mapActivity));
        setHasGeminiApiKey(aiSettings.configured);
      })
      .catch(() => {
        if (!cancelled) {
          setActivities([]);
          setHasGeminiApiKey(false);
        }
      })
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authHydrated, token]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      activities,
      profile,
      difficulties,
      perspectives,
      hasGeminiApiKey,
      isHydrated,
      addActivity: (activity) => {
        const temporaryId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setActivities((current) => [{ ...activity, id: temporaryId }, ...current]);
        if (!token) return;
        apiRequest<ApiActivity>('/api/activities', {
          method: 'POST',
          token,
          body: {
            activity_date: activity.date,
            title: activity.title,
            description: activity.description,
            category: activity.category,
            status: activity.status,
          },
        })
          .then((saved) => setActivities((current) => current.map((item) => (item.id === temporaryId ? mapActivity(saved) : item))))
          .catch(() => setActivities((current) => current.filter((item) => item.id !== temporaryId)));
      },
      updateActivity: (id, nextActivity) => {
        setActivities((current) => current.map((item) => (item.id === id ? { ...item, ...nextActivity } : item)));
        if (token) {
          apiRequest(`/api/activities/${id}`, {
            method: 'PATCH',
            token,
            body: {
              ...(nextActivity.date !== undefined ? { activity_date: nextActivity.date } : {}),
              ...(nextActivity.title !== undefined ? { title: nextActivity.title } : {}),
              ...(nextActivity.description !== undefined ? { description: nextActivity.description } : {}),
              ...(nextActivity.category !== undefined ? { category: nextActivity.category } : {}),
              ...(nextActivity.status !== undefined ? { status: nextActivity.status } : {}),
            },
          }).catch(() => undefined);
        }
      },
      deleteActivity: (id) => {
        const deletedActivity = activities.find((item) => item.id === id);
        setActivities((current) => current.filter((item) => item.id !== id));
        if (token) {
          apiRequest(`/api/activities/${id}`, { method: 'DELETE', token })
            .catch(() => {
              if (deletedActivity) {
                setActivities((current) => [deletedActivity, ...current]);
              }
            });
        }
      },
      updateProfile: (nextProfile) => {
        setProfile((current) => ({ ...current, ...nextProfile }));
        if (token) {
          apiRequest('/api/profile', {
            method: 'PATCH',
            token,
            body: {
              ...(nextProfile.fullName !== undefined ? { full_name: nextProfile.fullName } : {}),
              ...(nextProfile.department !== undefined ? { department: nextProfile.department } : {}),
              ...(nextProfile.avatarUri !== undefined ? { avatar_url: nextProfile.avatarUri } : {}),
              ...(nextProfile.role !== undefined ? { role: nextProfile.role } : {}),
            },
          }).catch(() => undefined);
        }
      },
      setDifficulties,
      setPerspectives,
      saveGeminiApiKey: async (value) => {
        const trimmed = value.trim();
        if (!token) throw new Error('Session requise.');
        if (!trimmed) {
          await apiRequest('/api/ai-settings', { method: 'DELETE', token });
          setHasGeminiApiKey(false);
          return;
        }
        await apiRequest('/api/ai-settings', { method: 'POST', token, body: { apiKey: trimmed } });
        setHasGeminiApiKey(true);
      },
      clearGeminiApiKey: async () => {
        if (!token) return;
        await apiRequest('/api/ai-settings', { method: 'DELETE', token });
        setHasGeminiApiKey(false);
      },
    }),
    [activities, profile, difficulties, perspectives, hasGeminiApiKey, isHydrated, token],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within AppStateProvider');
  return context;
}