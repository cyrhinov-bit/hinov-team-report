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
import { Lock, ShieldCheck } from 'lucide-react-native';

export default function SecurityScreen() {
  const { updatePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const strength = evaluatePasswordStrength(newPassword);

  const handleUpdate = async () => {
    if (!currentPassword) {
      setErrorMsg('Veuillez saisir votre mot de passe actuel.');
      return;
    }

    if (!strength.isValid) {
      setErrorMsg('Le nouveau mot de passe ne respecte pas les critères de sécurité.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await updatePassword(newPassword);
    setLoading(false);

    if (res.success) {
      Alert.alert(
        'Succès',
        'Votre mot de passe a été modifié avec succès.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      setErrorMsg(res.error || 'Erreur lors de la modification du mot de passe.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <ShieldCheck size={28} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Modifier mon mot de passe</Text>
          <Text style={styles.subtitle}>
            Pour assurer la protection de vos données d'activité, choisissez un mot de passe robuste.
          </Text>

          {Boolean(errorMsg) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <Input
            label="Mot de passe actuel *"
            placeholder="••••••••••••"
            value={currentPassword}
            onChangeText={(t) => {
              setCurrentPassword(t);
              setErrorMsg('');
            }}
            isPassword
            leftIcon={<Lock size={18} color={COLORS.textSecondary} />}
          />

          <Input
            label="Nouveau mot de passe *"
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
            label="Confirmer le nouveau mot de passe *"
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
            title="ENREGISTRER LE NOUVEAU MOT DE PASSE"
            onPress={handleUpdate}
            loading={loading}
            disabled={!strength.isValid || newPassword !== confirmPassword || !currentPassword}
            variant="primary"
            size="lg"
            style={{ width: '100%', marginTop: 12 }}
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
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 18,
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

