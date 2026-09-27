import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/colors';

export default function SupervisionLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primaryDark },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Supervision des Rapports' }}
      />
    </Stack>
  );
}
