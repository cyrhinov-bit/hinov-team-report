import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/contexts/AuthContext';
import { ConfirmationProvider } from '@/contexts/ConfirmationContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { PWAProvider } from '@/contexts/PWAContext';
import { COLORS } from '@/constants/colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PWAProvider>
        <AuthProvider>
          <NotificationProvider>
            <ConfirmationProvider>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: COLORS.primary },
                  headerTintColor: '#FFFFFF',
                  headerTitleStyle: { fontWeight: '700' },
                  contentStyle: { backgroundColor: COLORS.background },
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(collaborator)" options={{ headerShown: false }} />
                <Stack.Screen name="(admin)" options={{ headerShown: false }} />
              </Stack>
            </ConfirmationProvider>
          </NotificationProvider>
        </AuthProvider>
      </PWAProvider>
    </SafeAreaProvider>
  );
}

