import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export interface TabIconConfig {
  name: string;
  type?: 'feather' | 'ionicons' | 'material';
  color: string;
  label?: string;
}

interface AnimatedTabIconProps {
  focused: boolean;
  color?: string;
  name: string;
  tabColor: string;
  iconType?: 'feather' | 'ionicons' | 'material';
  size?: number;
}

export function AnimatedTabIcon({
  focused,
  name,
  tabColor,
  iconType = 'feather',
  size = 22,
}: AnimatedTabIconProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.18,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: -3,
          friction: 5,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(badgeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(badgeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused, scaleAnim, translateYAnim, badgeAnim]);

  const activeColor = tabColor;
  const inactiveColor = '#94A3B8'; // Muted slate

  const iconElement = () => {
    const iconColor = focused ? activeColor : inactiveColor;
    const currentSize = size;

    if (iconType === 'ionicons') {
      return <Ionicons name={name as any} size={currentSize} color={iconColor} />;
    }
    if (iconType === 'material') {
      return <MaterialCommunityIcons name={name as any} size={currentSize} color={iconColor} />;
    }
    return <Feather name={name as any} size={currentSize} color={iconColor} />;
  };

  return (
    <View style={styles.wrapper}>
      {/* Halo lumineux d'arrière-plan animé */}
      <Animated.View
        style={[
          styles.glowPill,
          {
            backgroundColor: `${tabColor}24`, // ~14% d'opacité
            opacity: badgeAnim,
            transform: [
              {
                scale: badgeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ],
          },
        ]}
      />

      {/* Icône avec animation de rebond et translation */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
          },
        ]}
      >
        {iconElement()}
      </Animated.View>

      {/* Petit indicateur sous forme de point lumineux coloré sous l'icône active */}
      <Animated.View
        style={[
          styles.activeDot,
          {
            backgroundColor: tabColor,
            opacity: badgeAnim,
            transform: [
              {
                scale: badgeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 38,
    position: 'relative',
  },
  glowPill: {
    position: 'absolute',
    width: 38,
    height: 30,
    borderRadius: 15,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
