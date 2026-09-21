import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>H</Text>
        </View>
        <Text style={styles.title}>HINOV GROUP</Text>
        <Text style={styles.subtitle}>Team Report</Text>
        <ActivityIndicator size="large" color={COLORS.primaryAccent} style={styles.spinner} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.must_change_password) {
    return <Redirect href="/(auth)/force-change-password" />;
  }

  return <Redirect href="/(collaborator)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: COLORS.primaryAccent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.primaryAccent,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
  },
  spinner: {
    marginTop: 32,
  },
});
