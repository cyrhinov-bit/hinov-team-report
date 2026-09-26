import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SHADOWS } from '@/constants/colors';

interface CardProps {
  key?: React.Key;
  children?: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'subtle' | 'dark';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
}) => {
  return (
    <View
      style={[
        styles.card,
        variant === 'elevated' && styles.elevated,
        variant === 'outlined' && styles.outlined,
        variant === 'subtle' && styles.subtle,
        variant === 'dark' && styles.dark,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
  },
  elevated: {
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  outlined: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subtle: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dark: {
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.sidebarBorder,
  },
});
