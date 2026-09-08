import React, { useEffect } from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAppState } from '@/context/AppStateContext';

function NativeTabLayout({ isAdmin }: { isAdmin: boolean }) {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activities">
        <NativeTabs.Trigger.Icon sf={{ default: 'checklist', selected: 'checklist' }} />
        <NativeTabs.Trigger.Label>Activités</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="report">
        <NativeTabs.Trigger.Icon sf={{ default: 'doc.text', selected: 'doc.text.fill' }} />
        <NativeTabs.Trigger.Label>Rapport</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      {isAdmin ? (
        <NativeTabs.Trigger name="users">
          <NativeTabs.Trigger.Icon sf={{ default: 'person.3', selected: 'person.3.fill' }} />
          <NativeTabs.Trigger.Label>Équipe</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ) : null}
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ai-settings">
        <NativeTabs.Trigger.Icon sf={{ default: 'sparkles', selected: 'sparkles' }} />
        <NativeTabs.Trigger.Label>Paramètres IA</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout({ isAdmin }: { isAdmin: boolean }) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activités',
          tabBarIcon: ({ color }) => <Feather name="check-square" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Rapport',
          tabBarIcon: ({ color }) => <Feather name="file-text" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Équipe',
          href: isAdmin ? '/users' : null,
          tabBarIcon: ({ color }) => <Feather name="users" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Feather name="user" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai-settings"
        options={{
          title: 'Paramètres IA',
          tabBarIcon: ({ color }) => <Feather name="zap" size={21} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { token, isHydrated } = useAuth();
  const { profile } = useAppState();

  const isAdmin =
    profile.role?.toUpperCase() === 'SUPERADMIN' ||
    profile.role?.toUpperCase() === 'ADMIN';

  useEffect(() => {
    if (isHydrated && !token) router.replace('/login');
  }, [isHydrated, token]);

  if (!isHydrated || !token) return null;
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout isAdmin={isAdmin} />;
  }
  return <ClassicTabLayout isAdmin={isAdmin} />;
}
