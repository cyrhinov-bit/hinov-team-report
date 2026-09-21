import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS } from '@/constants/colors';

interface ButtonProps {
  key?: React.Key;
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ai' | 'ghost';
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
  variant = 'primary',
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
      case 'primary':
        return COLORS.primary;
      case 'secondary':
        return COLORS.surfaceSubtle;
      case 'outline':
        return 'transparent';
      case 'danger':
        return COLORS.danger;
      case 'ai':
        return COLORS.ai;
      case 'ghost':
        return 'transparent';
      default:
        return COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return COLORS.textMuted;
    switch (variant) {
      case 'primary':
      case 'danger':
      case 'ai':
        return COLORS.textWhite;
      case 'secondary':
        return COLORS.textPrimary;
      case 'outline':
        return COLORS.primary;
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
        return { paddingVertical: 16, paddingHorizontal: 24, minHeight: 52 };
      default:
        return { paddingVertical: 12, paddingHorizontal: 18, minHeight: 46 };
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
          borderColor: variant === 'outline' ? COLORS.primary : 'transparent',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14,
                marginLeft: icon ? 8 : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

