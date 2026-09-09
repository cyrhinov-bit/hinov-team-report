import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { apiRequest } from '@/lib/api';

const logo = require('@/assets/images/htr-logo.jpeg');

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, isHydrated, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password modal states
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isHydrated && token) router.replace('/');
  }, [isHydrated, token]);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Champs requis', 'Saisissez votre email professionnel et votre mot de passe.');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (error) {
      Alert.alert('Connexion impossible', error instanceof Error ? error.message : 'Vérifiez vos identifiants.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForgot = () => {
    setForgotEmail(email.trim());
    setForgotStatus(null);
    setIsForgotModalOpen(true);
  };

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim()) {
      setForgotStatus({ type: 'error', message: 'Veuillez renseigner votre email professionnel.' });
      return;
    }
    setIsForgotSubmitting(true);
    setForgotStatus(null);
    try {
      const res = await apiRequest<{ message?: string; success?: boolean }>('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: forgotEmail.trim().toLowerCase() },
      });
      setForgotStatus({
        type: 'success',
        message: res.message || 'Demande transmise avec succès.',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Impossible d'envoyer l'email de réinitialisation.";
      setForgotStatus({
        type: 'error',
        message: `${msg}\n\n💡 Conseil : Votre Administrateur peut également réinitialiser instantanément votre mot de passe depuis l'onglet Équipe.`,
      });
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 34, paddingBottom: insets.bottom + 30 }}
      bottomOffset={30}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.brand}>
        <Image source={logo} style={styles.logo} />
        <Text style={[styles.brandName, { color: colors.navy }]}>HINOV</Text>
        <Text style={[styles.brandTagline, { color: colors.mutedForeground }]}>Team Report</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>ESPACE COLLABORATEUR</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Bienvenue dans votre espace.</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Connectez-vous pour retrouver vos activités et votre rapport hebdomadaire.</Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Email professionnel</Text>
        <View style={[styles.inputWrap, { borderColor: colors.input, backgroundColor: colors.background }]}>
          <Feather name="mail" size={17} color={colors.mutedForeground} />
          <TextInput
            testID="login-email"
            value={email}
            onChangeText={setEmail}
            placeholder="prenom.nom@hinov.group"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: colors.foreground }]}
          />
        </View>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Mot de passe</Text>
        <View style={[styles.inputWrap, { borderColor: colors.input, backgroundColor: colors.background }]}>
          <Feather name="lock" size={17} color={colors.mutedForeground} />
          <TextInput
            testID="login-password"
            value={password}
            onChangeText={setPassword}
            placeholder="Votre mot de passe"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showPassword}
            style={[styles.input, { color: colors.foreground }]}
          />
          <Pressable testID="toggle-password" onPress={() => setShowPassword((current) => !current)} hitSlop={10}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={17} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <Pressable
          testID="login-submit"
          onPress={submit}
          disabled={isLoading}
          style={({ pressed }) => [styles.submit, { backgroundColor: colors.primary, opacity: isLoading ? 0.5 : pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.submitText}>{isLoading ? 'Connexion…' : 'Se connecter'}</Text>
          <Feather name="arrow-right" size={17} color={colors.primaryForeground} />
        </Pressable>
        <Pressable testID="login-forgot-button" onPress={handleOpenForgot}>
          <Text style={[styles.forgot, { color: colors.primary }]}>Mot de passe oublié ?</Text>
        </Pressable>
      </View>
      <Text style={[styles.footer, { color: colors.mutedForeground }]}>Accès réservé aux collaborateurs HINOV Group</Text>

      {/* MODAL RÉCUPÉRATION DU MOT DE PASSE */}
      <Modal visible={isForgotModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Mot de passe oublié</Text>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                  Recevez un lien de réinitialisation sécurisé sur votre boîte email.
                </Text>
              </View>
              <Pressable onPress={() => setIsForgotModalOpen(false)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={{ marginVertical: 12 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Votre adresse email professionnelle</Text>
              <View style={[styles.inputWrap, { borderColor: colors.input, backgroundColor: colors.background, marginTop: 4 }]}>
                <Feather name="mail" size={17} color={colors.mutedForeground} />
                <TextInput
                  testID="forgot-email-input"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  placeholder="prenom.nom@hinov.group"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { color: colors.foreground }]}
                />
              </View>
            </View>

            {forgotStatus ? (
              <View
                style={[
                  styles.statusBox,
                  {
                    backgroundColor: forgotStatus.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                    borderColor: forgotStatus.type === 'success' ? '#BBF7D0' : '#FECACA',
                  },
                ]}
              >
                <Feather
                  name={forgotStatus.type === 'success' ? 'check-circle' : 'info'}
                  size={18}
                  color={forgotStatus.type === 'success' ? '#16A34A' : '#DC2626'}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: forgotStatus.type === 'success' ? '#15803D' : '#991B1B' },
                  ]}
                >
                  {forgotStatus.message}
                </Text>
              </View>
            ) : null}

            <Pressable
              testID="forgot-submit-btn"
              onPress={handleForgotSubmit}
              disabled={isForgotSubmitting}
              style={({ pressed }) => [
                styles.submit,
                { backgroundColor: colors.primary, opacity: isForgotSubmitting ? 0.6 : pressed ? 0.8 : 1, marginTop: 14 },
              ]}
            >
              {isForgotSubmitting ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <>
                  <Text style={styles.submitText}>Envoyer les instructions</Text>
                  <Feather name="send" size={16} color={colors.primaryForeground} />
                </>
              )}
            </Pressable>

            <View style={[styles.adminHelpBox, { backgroundColor: colors.muted }]}>
              <Feather name="shield" size={16} color={colors.primary} />
              <Text style={[styles.adminHelpText, { color: colors.mutedForeground }]}>
                En cas de blocage, contactez directement votre Administrateur HINOV pour obtenir un mot de passe temporaire instantané.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  brand: { alignItems: 'center', marginBottom: 31 },
  logo: { width: 83, height: 83, borderRadius: 24 },
  brandName: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: 4, marginTop: 9 },
  brandTagline: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 1.7, marginTop: 2 },
  copy: { paddingHorizontal: 24, marginBottom: 20 },
  eyebrow: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.3, marginBottom: 8 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', lineHeight: 33, letterSpacing: -0.6 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginTop: 9 },
  card: { borderWidth: 1, borderRadius: 22, marginHorizontal: 18, padding: 17 },
  label: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 8, marginBottom: 7 },
  inputWrap: { borderWidth: 1, borderRadius: 12, minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  input: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', paddingVertical: 10 },
  submit: { minHeight: 50, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 22 },
  submitText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_700Bold' },
  forgot: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 18 },
  footer: { textAlign: 'center', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 26 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 3,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  statusText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
  },
  adminHelpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
    marginBottom: 8,
  },
  adminHelpText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
});