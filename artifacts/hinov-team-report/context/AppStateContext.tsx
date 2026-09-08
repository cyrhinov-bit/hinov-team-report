import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ActivityStatus = 'Terminée' | 'En cours' | 'En attente';

export type Activity = {
  id: string;
  date: string;
  title: string;
  description: string;
  category: string;
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

const STORAGE_KEY = '@hinov-team-report/state';
const GEMINI_KEY_STORAGE = '@hinov-team-report/gemini-api-key';
const initialActivities: Activity[] = [
  {
    id: 'sample-1',
    date: new Date().toISOString().slice(0, 10),
    title: 'Revue des priorités de la semaine',
    description: 'Alignement avec l’équipe sur les livrables et les prochaines échéances.',
    category: 'Coordination',
    status: 'Terminée',
  },
  {
    id: 'sample-2',
    date: new Date().toISOString().slice(0, 10),
    title: 'Suivi des dossiers clients',
    description: 'Mise à jour des dossiers en cours et préparation des prochaines actions.',
    category: 'Clients',
    status: 'En cours',
  },
];

const initialProfile: Profile = {
  fullName: 'Aminata Diop',
  role: 'Collaboratrice',
  department: 'Développement',
  email: 'aminata.diop@hinov.group',
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [difficulties, setDifficulties] = useState('');
  const [perspectives, setPerspectives] = useState('');
  const [hasGeminiApiKey, setHasGeminiApiKey] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<{
            activities: Activity[];
            profile: Profile;
            difficulties: string;
            perspectives: string;
          }>;
          if (parsed.activities) setActivities(parsed.activities);
          if (parsed.profile) setProfile({ ...initialProfile, ...parsed.profile });
          if (typeof parsed.difficulties === 'string') setDifficulties(parsed.difficulties);
          if (typeof parsed.perspectives === 'string') setPerspectives(parsed.perspectives);
        }
      })
      .catch(() => undefined)
      .finally(() => setIsHydrated(true));
    SecureStore.getItemAsync(GEMINI_KEY_STORAGE)
      .then((key) => setHasGeminiApiKey(Boolean(key)))
      .catch(() => setHasGeminiApiKey(false));
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activities, profile, difficulties, perspectives }),
    ).catch(() => undefined);
  }, [activities, profile, difficulties, perspectives, isHydrated]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      activities,
      profile,
      difficulties,
      perspectives,
      hasGeminiApiKey,
      isHydrated,
      addActivity: (activity) =>
        setActivities((current) => [
          { ...activity, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
          ...current,
        ]),
      updateActivity: (id, activity) =>
        setActivities((current) =>
          current.map((item) => (item.id === id ? { ...item, ...activity } : item)),
        ),
      deleteActivity: (id) =>
        setActivities((current) => current.filter((item) => item.id !== id)),
      updateProfile: (nextProfile) =>
        setProfile((current) => ({ ...current, ...nextProfile })),
      setDifficulties,
      setPerspectives,
      saveGeminiApiKey: async (value) => {
        const trimmed = value.trim();
        if (!trimmed) {
          await SecureStore.deleteItemAsync(GEMINI_KEY_STORAGE);
          setHasGeminiApiKey(false);
          return;
        }
        await SecureStore.setItemAsync(GEMINI_KEY_STORAGE, trimmed, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
        setHasGeminiApiKey(true);
      },
      clearGeminiApiKey: async () => {
        await SecureStore.deleteItemAsync(GEMINI_KEY_STORAGE);
        setHasGeminiApiKey(false);
      },
    }),
    [activities, profile, difficulties, perspectives, hasGeminiApiKey, isHydrated],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within AppStateProvider');
  return context;
}