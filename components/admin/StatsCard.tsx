import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '@/constants/colors';

interface StatsCardProps {
  key?: React.Key;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'ai';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'primary',
}) => {
  const getBadgeColor = () => {
    switch (variant) {
      case 'success':
        return { bg: COLORS.successLight, text: COLORS.success };
      case 'warning':
        return { bg: COLORS.warningLight, text: '#B45309' };
      case 'ai':
        return { bg: COLORS.aiLight, text: COLORS.ai };
      default:
        return { bg: '#EFF6FF', text: COLORS.primaryAccent };
    }
  };

  const badgeStyle = getBadgeColor();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrapper, { backgroundColor: badgeStyle.bg }]}>
          {icon}
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
    minWidth: 140,
    marginHorizontal: 4,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});

