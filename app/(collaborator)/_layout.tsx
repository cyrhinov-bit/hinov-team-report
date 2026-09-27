import React from 'react';
import { Tabs, router } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet, View, Image } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { COLORS } from '@/constants/colors';
import { LayoutDashboard, CheckSquare, FileText, History, User, Shield, ShieldCheck } from 'lucide-react-native';

const TAB_PALETTES = {
  dashboard: {
    name: 'Dashboard',
    defaultColor: '#0284C7',
    activeColor: '#0052A3',
    bgActive: 'rgba(2, 132, 199, 0.14)',
  },
  activities: {
    name: 'Activités',
    defaultColor: '#10B981',
    activeColor: '#047857',
    bgActive: 'rgba(16, 185, 129, 0.14)',
  },
  report: {
    name: 'Mon Rapport',
    defaultColor: '#E12503',
    activeColor: '#B91C1C',
    bgActive: 'rgba(225, 37, 3, 0.14)',
  },
  supervision: {
    name: 'Supervision',
    defaultColor: '#8B5CF6',
    activeColor: '#6D28D9',
    bgActive: 'rgba(139, 92, 246, 0.14)',
  },
  history: {
    name: 'Historique',
    defaultColor: '#EC4899',
    activeColor: '#BE185D',
    bgActive: 'rgba(236, 72, 153, 0.14)',
  },
  profile: {
    name: 'Profil',
    defaultColor: '#0891B2',
    activeColor: '#0E7490',
    bgActive: 'rgba(8, 145, 178, 0.14)',
  },
};

export default function CollaboratorLayout() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'directeur_admin';

  return (
    <Tabs
      screenOptions={{
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: COLORS.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: TAB_PALETTES.dashboard.name,
          headerTitle: 'Hinov Team Report',
          tabBarActiveTintColor: TAB_PALETTES.dashboard.activeColor,
          headerLeft: () => (
            <View style={{ marginLeft: 16 }}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={{ width: 28, height: 28, borderRadius: 6 }}
                resizeMode="contain"
              />
            </View>
          ),
          headerRight: () =>
            isAdmin ? (
              <TouchableOpacity
                style={styles.adminHeaderBtn}
                onPress={() => router.push('/(admin)')}
                activeOpacity={0.8}
              >
                <Shield size={14} color={COLORS.primaryAccent} />
                <Text style={styles.adminHeaderBtnText}>Admin</Text>
              </TouchableOpacity>
            ) : null,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconWrapper,
                focused && { backgroundColor: TAB_PALETTES.dashboard.bgActive },
              ]}
            >
              <LayoutDashboard
                size={21}
                color={focused ? TAB_PALETTES.dashboard.activeColor : TAB_PALETTES.dashboard.defaultColor}
                strokeWidth={focused ? 2.4 : 1.9}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: TAB_PALETTES.activities.name,
          headerShown: false,
          tabBarActiveTintColor: TAB_PALETTES.activities.activeColor,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconWrapper,
                focused && { backgroundColor: TAB_PALETTES.activities.bgActive },
              ]}
            >
              <CheckSquare
                size={21}
                color={focused ? TAB_PALETTES.activities.activeColor : TAB_PALETTES.activities.defaultColor}
                strokeWidth={focused ? 2.4 : 1.9}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: TAB_PALETTES.report.name,
          headerShown: false,
          tabBarActiveTintColor: TAB_PALETTES.report.activeColor,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconWrapper,
                focused && { backgroundColor: TAB_PALETTES.report.bgActive },
              ]}
            >
              <FileText
                size={21}
                color={focused ? TAB_PALETTES.report.activeColor : TAB_PALETTES.report.defaultColor}
                strokeWidth={focused ? 2.4 : 1.9}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="supervision"
        options={{
          title: TAB_PALETTES.supervision.name,
          headerShown: false,
          href: isAdmin ? undefined : null,
          tabBarActiveTintColor: TAB_PALETTES.supervision.activeColor,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '700',
          },
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconWrapper,
                focused && { backgroundColor: TAB_PALETTES.supervision.bgActive },
              ]}
            >
              <ShieldCheck
                size={21}
                color={focused ? TAB_PALETTES.supervision.activeColor : TAB_PALETTES.supervision.defaultColor}
                strokeWidth={focused ? 2.4 : 1.9}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: TAB_PALETTES.history.name,
          headerShown: false,
          tabBarActiveTintColor: TAB_PALETTES.history.activeColor,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconWrapper,
                focused && { backgroundColor: TAB_PALETTES.history.bgActive },
              ]}
            >
              <History
                size={21}
                color={focused ? TAB_PALETTES.history.activeColor : TAB_PALETTES.history.defaultColor}
                strokeWidth={focused ? 2.4 : 1.9}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: TAB_PALETTES.profile.name,
          headerShown: false,
          tabBarActiveTintColor: TAB_PALETTES.profile.activeColor,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconWrapper,
                focused && { backgroundColor: TAB_PALETTES.profile.bgActive },
              ]}
            >
              <User
                size={21}
                color={focused ? TAB_PALETTES.profile.activeColor : TAB_PALETTES.profile.defaultColor}
                strokeWidth={focused ? 2.4 : 1.9}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  adminHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  adminHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  iconWrapper: {
    width: 40,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
});

