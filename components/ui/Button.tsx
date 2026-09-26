import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { COLORS } from '@/constants/colors';

interface ButtonProps {
  key?: React.Key;
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'secondary' | 'outline' | 'danger' | 'success' | 'ai' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'accent',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return COLORS.surfaceMuted;
    switch (variant) {
      case 'accent':
        return COLORS.primaryAccent;
      case 'primary':
        return COLORS.primary;
      case 'secondary':
        return COLORS.surfaceSubtle;
      case 'outline':
        return 'transparent';
      case 'danger':
        return COLORS.danger;
      case 'success':
        return COLORS.success;
      case 'ai':
        return COLORS.ai;
      case 'gold':
        return COLORS.gold;
      case 'ghost':
        return 'transparent';
      default:
        return COLORS.primaryAccent;
    }
  };

  const getTextColor = () => {
    if (disabled) return COLORS.textMuted;
    switch (variant) {
      case 'accent':
      case 'primary':
      case 'danger':
      case 'success':
      case 'ai':
      case 'gold':
        return COLORS.textWhite;
      case 'secondary':
        return COLORS.textPrimary;
      case 'outline':
        return COLORS.primaryAccent;
      case 'ghost':
        return COLORS.primaryAccent;
      default:
        return COLORS.textWhite;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 14, minHeight: 36 };
      case 'lg':
        return { paddingVertical: 14, paddingHorizontal: 22, minHeight: 48 };
      default:
        return { paddingVertical: 11, paddingHorizontal: 18, minHeight: 42 };
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        getPadding(),
        {
          backgroundColor: getBackgroundColor(),
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: variant === 'outline' ? COLORS.primaryAccent : 'transparent',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <View style={styles.inner}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
