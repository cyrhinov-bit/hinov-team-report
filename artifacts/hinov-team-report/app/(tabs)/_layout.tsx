import React, { useEffect } from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAppState } from '@/context/AppStateContext';
import { AnimatedTabIcon } from '@/components/AnimatedTabIcon';

// Palette de couleurs distinctes et vivantes par onglet
export const TAB_COLORS = {
  home: '#3B82F6',        // Bleu dynamique (Accueil)
  activities: '#10B981',  // Vert émeraude (Activités)
  report: '#8B5CF6',      // Violet moderne (Rapport)
  teamReports: '#6366F1', // Indigo premium (Rapports Équipe Direction)
  users: '#F59E0B',       // Orange ambré (Équipe)
  profile: '#EC4899',     // Rose framboise (Profil)
  aiSettings: '#06B6D4',  // Cyan technologique (IA)
};

function ClassicTabLayout({ isAdmin, unreadCount }: { isAdmin: boolean; unreadCount: number }) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : (isDark ? '#0F172A' : '#FFFFFF'),
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 8,
          height: Platform.select({ ios: 88, android: 68, default: 72 }),
          paddingBottom: Platform.select({ ios: 28, android: 8, default: 10 }),
          paddingTop: 8,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={95}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
              ]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarActiveTintColor: TAB_COLORS.home,
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              name="home"
              tabColor={TAB_COLORS.home}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activités',
          tabBarActiveTintColor: TAB_COLORS.activities,
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              name="check-square"
              tabColor={TAB_COLORS.activities}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Rapport',
          tabBarActiveTintColor: TAB_COLORS.report,
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              name="file-text"
              tabColor={TAB_COLORS.report}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="team-reports"
        options={{
          title: 'Rapports Équipe',
          href: (isAdmin ? '/team-reports' : null) as any,
          tabBarActiveTintColor: TAB_COLORS.teamReports,
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              name="clipboard"
              tabColor={TAB_COLORS.teamReports}
              badgeCount={unreadCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Équipe',
          href: (isAdmin ? '/users' : null) as any,
          tabBarActiveTintColor: TAB_COLORS.users,
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              name="users"
              tabColor={TAB_COLORS.users}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarActiveTintColor: TAB_COLORS.profile,
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              name="user"
              tabColor={TAB_COLORS.profile}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-settings"
        options={{
          title: 'IA',
          tabBarActiveTintColor: TAB_COLORS.aiSettings,
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              name="zap"
              tabColor={TAB_COLORS.aiSettings}
            />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { token, isHydrated } = useAuth();
  const { profile } = useAppState();
  const [unreadCount, setUnreadCount] = React.useState(0);

  const isAdmin =
    profile.role?.toUpperCase() === 'SUPERADMIN' ||
    profile.role?.toUpperCase() === 'ADMIN';

  useEffect(() => {
    if (isHydrated && !token) router.replace('/login');
  }, [isHydrated, token]);

  // Polling des notifications pour la direction
  useEffect(() => {
    if (!token || !isAdmin) {
      setUnreadCount(0);
      return;
    }

    const checkNotifs = async () => {
      try {
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.unreadCount === 'number') {
            setUnreadCount(data.unreadCount);
          }
        }
      } catch {
        // Silencieux
      }
    };

    checkNotifs();
    const timer = setInterval(checkNotifs, 25000);
    return () => clearInterval(timer);
  }, [token, isAdmin]);

  if (!isHydrated || !token) return null;
  return <ClassicTabLayout isAdmin={isAdmin} unreadCount={unreadCount} />;
}
