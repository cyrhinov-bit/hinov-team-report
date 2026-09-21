import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { evaluatePasswordStrength } from '@/utils/validation';
import { Check, X } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

interface PasswordStrengthMeterProps {
  key?: React.Key;
  password?: string;
  showChecks?: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password = '',
  showChecks = true,
}) => {
  if (!password) return null;

  const strength = evaluatePasswordStrength(password);

  const getBarColor = (index: number) => {
    if (strength.score >= index) {
      return strength.color;
    }
    return COLORS.surfaceMuted;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Niveau de sécurité :</Text>
        <Text style={[styles.strengthLabel, { color: strength.color }]}>
          {strength.label}
        </Text>
      </View>

      <View style={styles.barsContainer}>
        {[1, 2, 3, 4].map((index) => (
          <View
            key={index}
            style={[styles.bar, { backgroundColor: getBarColor(index) }]}
          />
        ))}
      </View>

      {showChecks && (
        <View style={styles.checksList}>
          <CheckItem
            valid={strength.checks.minLength}
            label="Au moins 8 caractères"
          />
          <CheckItem
            valid={strength.checks.hasUpper && strength.checks.hasLower}
            label="Majuscules et minuscules"
          />
          <CheckItem valid={strength.checks.hasDigit} label="Au moins un chiffre" />
          <CheckItem
            valid={strength.checks.hasSpecial}
            label="Au moins un caractère spécial (!@#$%)"
          />
        </View>
      )}
    </View>
  );
};

const CheckItem: React.FC<{ valid: boolean; label: string }> = ({ valid, label }) => (
  <View style={styles.checkRow}>
    {valid ? (
      <Check size={14} color={COLORS.success} />
    ) : (
      <X size={14} color={COLORS.textMuted} />
    )}
    <Text
      style={[
        styles.checkLabel,
        { color: valid ? COLORS.textPrimary : COLORS.textMuted },
      ]}
    >
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    backgroundColor: COLORS.surfaceSubtle,
    padding: 12,
    borderRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  barsContainer: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  bar: {
    flex: 1,
    marginHorizontal: 2,
    borderRadius: 3,
  },
  checksList: {
    marginTop: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkLabel: {
    fontSize: 12,
    marginLeft: 6,
  },
});

