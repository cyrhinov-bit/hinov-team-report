import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/colors';

export default function ReportLayout() {
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
        options={{ title: 'Mon Rapport Hebdomadaire' }}
      />
      <Stack.Screen
        name="preview"
        options={{ title: 'Prévisualisation & Envoi PDF', presentation: 'modal' }}
      />
    </Stack>
  );
}

