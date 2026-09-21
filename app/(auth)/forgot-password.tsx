import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS } from '@/constants/colors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { router } from 'expo-router';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { isValidEmail } from '@/utils/validation';
import { KeyRound, Mail, CheckCircle2, ArrowLeft } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendReset = async () => {
    if (!email.trim() || !isValidEmail(email.trim())) {
      setErrorMsg('Veuillez renseigner une adresse email valide.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
        });

        if (error) {
          setErrorMsg(error.message || 'Erreur lors de l’envoi de l’email.');
          setLoading(false);
          return;
        }
      }

      setSentSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Erreur lors de l’envoi');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <KeyRound size={32} color={COLORS.primaryAccent} />
          </View>

          <Text style={styles.title}>Mot de Passe Oublié</Text>
          <Text style={styles.subtitle}>
            Saisissez votre email professionnel. Vous recevrez un lien pour réinitialiser votre mot de passe en toute autonomie.
          </Text>

          {sentSuccess ? (
            <View style={styles.successBox}>
              <CheckCircle2 size={24} color="#16A34A" />
              <Text style={styles.successTitle}>Email envoyé !</Text>
              <Text style={styles.successText}>
                Un lien de réinitialisation sécurisé a été envoyé à <Text style={{ fontWeight: '700' }}>{email}</Text>. Consultez votre boîte de réception pour définir votre nouveau mot de passe.
              </Text>

              <Button
                title="RETOUR À LA CONNEXION"
                onPress={() => router.replace('/(auth)/login')}
                variant="primary"
                style={{ width: '100%', marginTop: 20 }}
              />
            </View>
          ) : (
            <View style={{ width: '100%' }}>
              {Boolean(errorMsg) && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              <Input
                label="Email Professionnel"
                placeholder="votre.email@hinovgroup.com"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setErrorMsg('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={18} color={COLORS.textSecondary} />}
              />

              <Button
                title="ENVOYER LE LIEN DE RÉINITIALISATION"
                onPress={handleSendReset}
                loading={loading}
                variant="primary"
                size="lg"
                style={{ width: '100%', marginTop: 8 }}
              />

              <Button
                title="Retour à la connexion"
                onPress={() => router.back()}
                variant="ghost"
                style={{ width: '100%', marginTop: 10 }}
                icon={<ArrowLeft size={16} color={COLORS.textSecondary} />}
              />
            </View>
          )}
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
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 6,
    textAlign: 'center',
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
    marginBottom: 14,
    width: '100%',
  },
  errorText: {
    fontSize: 12.5,
    color: COLORS.danger,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    width: '100%',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#166534',
    marginTop: 8,
    marginBottom: 4,
  },
  successText: {
    fontSize: 13,
    color: '#166534',
    textAlign: 'center',
    lineHeight: 18,
  },
});

