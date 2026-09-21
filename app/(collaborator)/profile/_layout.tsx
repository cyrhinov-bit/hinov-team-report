import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/colors';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Mon Profil Collaborateur' }}
      />
      <Stack.Screen
        name="security"
        options={{ title: 'Sécurité & Mot de Passe' }}
      />
      <Stack.Screen
        name="gemini-settings"
        options={{ title: 'Configuration Gemini AI' }}
      />
    </Stack>
  );
}

