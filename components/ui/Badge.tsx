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
  borderColor?: string;
  showDot?: boolean;
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
  borderColor,
  showDot = false,
  style,
}) => {
  const getBadgeStyle = () => {
    if (color && backgroundColor) {
      return { backgroundColor, color, borderColor: borderColor || 'transparent' };
    }

    if (status) {
      switch (status) {
        case 'terminee':
          return { backgroundColor: COLORS.successLight, color: COLORS.success, borderColor: '#A9DFBF' };
        case 'en_cours':
          return { backgroundColor: COLORS.warningLight, color: '#B7791F', borderColor: '#F9E79F' };
        case 'en_attente':
          return { backgroundColor: COLORS.surfaceSubtle, color: COLORS.textSecondary, borderColor: COLORS.border };
      }
    }

    if (role) {
      switch (role) {
        case 'super_admin':
          return { backgroundColor: COLORS.aiLight, color: COLORS.ai, borderColor: COLORS.aiBorder };
        case 'directeur_admin':
          return { backgroundColor: COLORS.goldLight, color: '#B7791F', borderColor: COLORS.goldBorder };
        case 'collaborateur':
          return { backgroundColor: COLORS.infoLight, color: COLORS.info, borderColor: '#AED6F1' };
      }
    }

    if (reportStatus) {
      switch (reportStatus) {
        case 'soumis':
          return { backgroundColor: COLORS.successLight, color: COLORS.success, borderColor: '#A9DFBF' };
        case 'brouillon':
          return { backgroundColor: COLORS.warningLight, color: '#B7791F', borderColor: '#F9E79F' };
        case 'archive':
          return { backgroundColor: COLORS.surfaceSubtle, color: COLORS.textSecondary, borderColor: COLORS.border };
      }
    }

    return { backgroundColor: COLORS.surfaceSubtle, color: COLORS.textPrimary, borderColor: COLORS.border };
  };

  const badgeStyle = getBadgeStyle();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeStyle.backgroundColor,
          borderColor: badgeStyle.borderColor,
        },
        style,
      ]}
    >
      {showDot && (
        <View style={[styles.dot, { backgroundColor: badgeStyle.color }]} />
      )}
      <Text style={[styles.text, { color: badgeStyle.color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
