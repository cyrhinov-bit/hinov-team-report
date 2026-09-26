// Password & Form validation utilities for HTR
import { COLORS } from '@/constants/colors';

export interface PasswordStrength {
  score: number; // 0 to 4
  level: 'weak' | 'medium' | 'strong';
  color: string;
  label: string;
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasDigit: boolean;
    hasSpecial: boolean;
  };
  isValid: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  let score = 0;
  if (checks.minLength) score += 1;
  if (checks.hasUpper && checks.hasLower) score += 1;
  if (checks.hasDigit) score += 1;
  if (checks.hasSpecial) score += 1;

  let level: 'weak' | 'medium' | 'strong' = 'weak';
  let color = COLORS.danger; // Jeweler Red #e12503
  let label = 'Faible 🔴';

  if (score === 3) {
    level = 'medium';
    color = COLORS.warning; // Jeweler Gold #f8ac59
    label = 'Moyen 🟠';
  } else if (score >= 4) {
    level = 'strong';
    color = COLORS.success; // Jeweler Emerald #27AE60
    label = 'Fort 🟢';
  }

  const isValid =
    checks.minLength &&
    checks.hasUpper &&
    checks.hasLower &&
    checks.hasDigit &&
    checks.hasSpecial;

  return {
    score,
    level,
    color,
    label,
    checks,
    isValid,
  };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

