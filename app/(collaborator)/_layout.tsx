import React from 'react';
import { Tabs, router } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { LayoutDashboard, CheckSquare, FileText, History, User, Shield } from 'lucide-react-native';

export default function CollaboratorLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'directeur_admin';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primaryAccent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
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
          title: 'Dashboard',
          headerTitle: 'Hinov Team Report',
          headerRight: () =>
            isAdmin ? (
              <TouchableOpacity
                style={styles.adminHeaderBtn}
                onPress={() => router.push('/(admin)')}
                activeOpacity={0.8}
              >
                <Shield size={14} color="#38BDF8" />
                <Text style={styles.adminHeaderBtnText}>Admin</Text>
              </TouchableOpacity>
            ) : null,
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activités',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <CheckSquare size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Mon Rapport',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <FileText size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <History size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
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
});

