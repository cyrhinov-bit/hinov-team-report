import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '@/constants/colors';
import { ActivityStatus, AppRole, ReportStatus } from '@/types';

interface BadgeProps {
  key?: React.Key;
  label: string;
  type?: 'status' | 'role' | 'report' | 'custom';
  status?: ActivityStatus;
  role?: AppRole;
  reportStatus?: ReportStatus;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  type = 'custom',
  status,
  role,
  reportStatus,
  color,
  backgroundColor,
  style,
}) => {
  const getBadgeStyle = () => {
    if (color && backgroundColor) {
      return { backgroundColor, color };
    }

    if (status) {
      switch (status) {
        case 'terminee':
          return { backgroundColor: COLORS.successLight, color: COLORS.success };
        case 'en_cours':
          return { backgroundColor: COLORS.warningLight, color: '#B45309' };
        case 'en_attente':
          return { backgroundColor: COLORS.surfaceSubtle, color: COLORS.textSecondary };
      }
    }

    if (role) {
      switch (role) {
        case 'super_admin':
          return { backgroundColor: COLORS.aiLight, color: COLORS.ai };
        case 'directeur_admin':
          return { backgroundColor: '#EFF6FF', color: COLORS.primaryAccent };
        case 'collaborateur':
          return { backgroundColor: COLORS.surfaceSubtle, color: COLORS.textPrimary };
      }
    }

    if (reportStatus) {
      switch (reportStatus) {
        case 'soumis':
          return { backgroundColor: COLORS.successLight, color: COLORS.success };
        case 'brouillon':
          return { backgroundColor: COLORS.warningLight, color: '#B45309' };
        case 'archive':
          return { backgroundColor: COLORS.surfaceSubtle, color: COLORS.textSecondary };
      }
    }

    return { backgroundColor: COLORS.surfaceSubtle, color: COLORS.textPrimary };
  };

  const badgeStyle = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: badgeStyle.backgroundColor }, style]}>
      <Text style={[styles.text, { color: badgeStyle.color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

