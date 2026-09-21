// Password & Form validation utilities for HTR

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
  let color = '#EF4444'; // Red
  let label = 'Faible 🔴';

  if (score === 3) {
    level = 'medium';
    color = '#F59E0B'; // Orange
    label = 'Moyen 🟠';
  } else if (score >= 4) {
    level = 'strong';
    color = '#10B981'; // Green
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

