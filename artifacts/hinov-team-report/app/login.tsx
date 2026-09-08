import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const logo = require('@/assets/images/htr-logo.jpeg');

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, isHydrated, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
        <Pressable onPress={() => Alert.alert('Mot de passe oublié', 'Contactez votre Directeur ou votre administrateur HINOV pour réinitialiser votre accès.')}>
          <Text style={[styles.forgot, { color: colors.primary }]}>Mot de passe oublié ?</Text>
        </Pressable>
      </View>
      <Text style={[styles.footer, { color: colors.mutedForeground }]}>Accès réservé aux collaborateurs HINOV Group</Text>
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
});