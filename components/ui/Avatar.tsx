import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ImageStyle, ViewStyle } from 'react-native';
import { COLORS } from '@/constants/colors';

interface AvatarProps {
  url?: string | null;
  name: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  showBorder?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  url,
  name,
  size = 48,
  style,
  showBorder = false,
}) => {
  const getInitials = (fullName: string) => {
    if (!fullName) return 'U';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const borderRadius = size / 2;

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius,
            borderWidth: showBorder ? 2 : 0,
            borderColor: COLORS.primary,
          },
          style as StyleProp<ImageStyle>,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius,
          borderWidth: showBorder ? 2 : 0,
          borderColor: COLORS.primary,
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: COLORS.surfaceSubtle,
  },
  fallback: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
