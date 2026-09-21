import React from 'react';
import { Stack, router } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { ArrowLeft, UserCheck } from 'lucide-react-native';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primaryDark },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 16 },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Administration HTR',
          headerLeft: () => (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.replace('/(collaborator)')}
            >
              <ArrowLeft size={18} color="#FFFFFF" />
              <Text style={styles.backBtnText}>Mon Espace</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="users/index"
        options={{ title: 'Gestion des Utilisateurs' }}
      />
      <Stack.Screen
        name="users/create"
        options={{ title: 'Créer un Collaborateur', presentation: 'modal' }}
      />
      <Stack.Screen
        name="users/[id]"
        options={{ title: 'Fiche Collaborateur', presentation: 'modal' }}
      />
      <Stack.Screen
        name="reports/index"
        options={{ title: 'Suivi des Rapports d’Équipe' }}
      />
      <Stack.Screen
        name="settings/index"
        options={{ title: 'Paramètres Entreprise' }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 6,
    marginRight: 12,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
});

