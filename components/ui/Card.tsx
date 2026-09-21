import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SHADOWS } from '@/constants/colors';

interface CardProps {
  key?: React.Key;
  children?: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'subtle';
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
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  elevated: {
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  outlined: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  subtle: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

