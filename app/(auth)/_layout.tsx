import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen
        name="forgot-password"
        options={{ title: 'Mot de passe oublié' }}
      />
      <Stack.Screen
        name="force-change-password"
        options={{
          title: 'Sécurité Obligatoire',
          headerBackVisible: false,
        }}
      />
    </Stack>
  );
}

