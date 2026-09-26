import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '@/constants/colors';

interface StatsCardProps {
  key?: React.Key;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'ai' | 'gold';
  trend?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'primary',
  trend,
}) => {
  const getTheme = () => {
    switch (variant) {
      case 'success':
        return { bg: COLORS.successLight, text: COLORS.success, borderTop: COLORS.success };
      case 'warning':
        return { bg: COLORS.warningLight, text: COLORS.warning, borderTop: COLORS.warning };
      case 'ai':
        return { bg: COLORS.aiLight, text: COLORS.ai, borderTop: COLORS.ai };
      case 'gold':
        return { bg: COLORS.goldLight, text: '#B7791F', borderTop: COLORS.gold };
      default:
        return { bg: '#EBF5FB', text: COLORS.primaryAccent, borderTop: COLORS.primaryAccent };
    }
  };

  const theme = getTheme();

  return (
    <View style={[styles.card, { borderTopColor: theme.borderTop }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconBox, { backgroundColor: theme.bg }]}>
          {icon}
        </View>
        {Boolean(trend) && (
          <View style={[styles.trendBadge, { backgroundColor: theme.bg }]}>
            <Text style={[styles.trendText, { color: theme.text }]}>{trend}</Text>
          </View>
        )}
      </View>

      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 16,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 3,
    flex: 1,
    minWidth: 140,
    marginHorizontal: 4,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
