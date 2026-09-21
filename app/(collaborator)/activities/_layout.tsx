import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/colors';

export default function ActivitiesLayout() {
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
        options={{ title: 'Mes Activités Quotidiennes' }}
      />
      <Stack.Screen
        name="new"
        options={{ title: 'Nouvelle Activité', presentation: 'modal' }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: 'Modifier Activité', presentation: 'modal' }}
      />
    </Stack>
  );
}

