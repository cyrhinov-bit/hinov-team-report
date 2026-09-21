import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter';
import { evaluatePasswordStrength } from '@/utils/validation';
import { Lock, ShieldAlert } from 'lucide-react-native';

export default function ForceChangePasswordScreen() {
  const { user, updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const strength = evaluatePasswordStrength(newPassword);

  const handleSubmit = async () => {
    if (!strength.isValid) {
      setErrorMsg(
        'Le mot de passe ne respecte pas tous les critères de sécurité exigés.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await updatePassword(newPassword);
    setLoading(false);

    if (res.success) {
      Alert.alert(
        'Mot de passe mis à jour !',
        'Votre nouveau mot de passe a été enregistré. Bienvenue sur Hinov Team Report.',
        [
          {
            text: 'Accéder à l’application',
            onPress: () => router.replace('/(collaborator)'),
          },
        ]
      );
    } else {
      setErrorMsg(res.error || 'Erreur lors de la mise à jour du mot de passe.');
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
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <ShieldAlert size={32} color="#D97706" />
          </View>

          <Text style={styles.title}>Changement de Mot de Passe Obligatoire</Text>
          <Text style={styles.subtitle}>
            Bonjour <Text style={{ fontWeight: '700' }}>{user?.full_name}</Text>,
            vous vous connectez avec un accès temporaire. Pour sécuriser vos
            rapports, veuillez définir votre mot de passe personnel.
          </Text>

          {Boolean(errorMsg) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <Input
            label="Nouveau mot de passe"
            placeholder="••••••••••••"
            value={newPassword}
            onChangeText={(t) => {
              setNewPassword(t);
              setErrorMsg('');
            }}
            isPassword
            leftIcon={<Lock size={18} color={COLORS.textSecondary} />}
          />

          <PasswordStrengthMeter password={newPassword} showChecks={true} />

          <Input
            label="Confirmer le nouveau mot de passe"
            placeholder="••••••••••••"
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              setErrorMsg('');
            }}
            isPassword
            leftIcon={<Lock size={18} color={COLORS.textSecondary} />}
          />

          <Button
            title="ENREGISTRER MON MOT DE PASSE"
            onPress={handleSubmit}
            loading={loading}
            disabled={!strength.isValid || newPassword !== confirmPassword}
            variant="primary"
            size="lg"
            style={{ width: '100%', marginTop: 10 }}
          />
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
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12.5,
    color: COLORS.danger,
    fontWeight: '600',
    textAlign: 'center',
  },
});

