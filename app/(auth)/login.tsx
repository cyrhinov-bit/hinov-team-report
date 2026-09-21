import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, ShieldCheck, Briefcase } from 'lucide-react-native';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Veuillez saisir votre email professionnel et votre mot de passe.');
      return;
    }
    setErrorMsg('');

    const res = await login(email.trim(), password);
    if (!res.success) {
      setErrorMsg(res.error || 'Identifiants incorrects ou compte inactif.');
    }
  };

  const fillDemo = (type: 'collab' | 'director' | 'superadmin') => {
    if (type === 'collab') {
      setEmail('jm.kouassi@hinovgroup.com');
      setPassword('Hinov2026!Collab');
    } else if (type === 'director') {
      setEmail('eric.yao@hinovgroup.com');
      setPassword('Hinov2026!Directeur');
    } else {
      setEmail('superadmin@hinovgroup.com');
      setPassword('Hinov2026!Admin');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Branding */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Briefcase size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>HINOV GROUP</Text>
          <Text style={styles.appTitle}>Hinov Team Report (HTR)</Text>
          <Text style={styles.subtitle}>
            Plateforme digitale de production des rapports hebdomadaires d'activité
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>Connexion Professionnelle</Text>

          {Boolean(errorMsg) && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          )}

          <Input
            label="Email Professionnel"
            placeholder="nom.prenom@hinovgroup.com"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setErrorMsg('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Mail size={18} color={COLORS.textSecondary} />}
          />

          <Input
            label="Mot de Passe"
            placeholder="••••••••••••"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setErrorMsg('');
            }}
            isPassword
            leftIcon={<Lock size={18} color={COLORS.textSecondary} />}
          />

          <View style={styles.forgotRow}>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="SE CONNECTER"
            onPress={handleLogin}
            loading={isLoading}
            variant="primary"
            size="lg"
            style={{ width: '100%', marginTop: 8 }}
          />

          {/* Quick Demo Access Bar */}
          <View style={styles.demoSection}>
            <Text style={styles.demoLabel}>Connexion rapide démo :</Text>
            <View style={styles.demoBtnsRow}>
              <TouchableOpacity
                style={styles.demoPill}
                onPress={() => fillDemo('collab')}
              >
                <Text style={styles.demoPillText}>Collaborateur</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.demoPill, { backgroundColor: '#EFF6FF' }]}
                onPress={() => fillDemo('director')}
              >
                <Text style={[styles.demoPillText, { color: COLORS.primaryAccent }]}>
                  Directeur
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.demoPill, { backgroundColor: COLORS.aiLight }]}
                onPress={() => fillDemo('superadmin')}
              >
                <Text style={[styles.demoPillText, { color: COLORS.ai }]}>
                  Super Admin
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Security Footer */}
        <View style={styles.footer}>
          <ShieldCheck size={16} color={COLORS.textMuted} />
          <Text style={styles.footerText}>
            Accès sécurisé réservé exclusivement aux collaborateurs HINOV Group
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryAccent,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '600',
    textAlign: 'center',
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: COLORS.primaryAccent,
    fontWeight: '600',
  },
  demoSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  demoLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  demoBtnsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  demoPill: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  demoPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 6,
    textAlign: 'center',
    flex: 1,
  },
});

