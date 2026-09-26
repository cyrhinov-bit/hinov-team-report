import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '@/constants/colors';

interface ColorLineProps {
  style?: ViewStyle;
  height?: number;
}

export function ColorLine({ style, height = 4 }: ColorLineProps) {
  const stripeColors = COLORS.stripeColors;

  return (
    <View style={[styles.container, { height }, style]}>
      {stripeColors.map((color, index) => (
        <View
          key={`stripe-${index}-${color}`}
          style={[styles.segment, { backgroundColor: color }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    height: '100%',
  },
});
