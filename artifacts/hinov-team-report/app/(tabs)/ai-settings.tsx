import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';

const logo = require('@/assets/images/htr-logo.jpeg');

export default function AiSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, hasGeminiApiKey, saveGeminiApiKey, clearGeminiApiKey } = useAppState();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setApiKey('');
  }, [hasGeminiApiKey]);

  const save = async () => {
    if (apiKey.trim().length < 10) {
      Alert.alert('Clé invalide', 'Saisissez une clé Gemini valide avant de l’enregistrer.');
      return;
    }
    setIsSaving(true);
    try {
      await saveGeminiApiKey(apiKey);
      setApiKey('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Clé enregistrée', 'Votre clé Gemini est maintenant disponible pour vos suggestions IA.');
    } catch {
      Alert.alert('Enregistrement impossible', 'La clé n’a pas pu être sauvegardée de manière sécurisée.');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = () => {
    Alert.alert('Supprimer la clé Gemini ?', 'Les fonctions IA ne pourront plus utiliser votre clé après cette action.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await clearGeminiApiKey();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: insets.bottom + 110 }}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.ai }]}>PERSONNALISATION</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Paramètres IA</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Utilisez votre propre intelligence artificielle.</Text>
        </View>
        <Image source={profile.avatarUri ? { uri: profile.avatarUri } : logo} style={[styles.headerAvatar, { borderColor: colors.border }]} />
      </View>

      <View style={[styles.hero, { backgroundColor: colors.navy }]}>
        <View style={[styles.heroIcon, { backgroundColor: colors.purpleSoft }]}>
          <Feather name="zap" size={21} color={colors.ai} />
        </View>
        <Text style={styles.heroTitle}>Gemini pour vos rapports</Text>
        <Text style={styles.heroText}>Améliorez la formulation de vos difficultés, perspectives et synthèses avec votre clé personnelle.</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Clé API Gemini</Text>
            <Text style={[styles.cardCaption, { color: colors.mutedForeground }]}>Une clé par utilisateur</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: hasGeminiApiKey ? colors.greenSoft : colors.orangeSoft }]}>
            <View style={[styles.statusDot, { backgroundColor: hasGeminiApiKey ? colors.success : colors.warning }]} />
            <Text style={[styles.statusText, { color: hasGeminiApiKey ? colors.success : colors.warning }]}>{hasGeminiApiKey ? 'Configurée' : 'Non configurée'}</Text>
          </View>
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Votre clé secrète</Text>
        <View style={[styles.inputWrap, { borderColor: colors.input, backgroundColor: colors.background }]}>
          <Feather name="key" size={16} color={colors.mutedForeground} />
          <TextInput
            testID="gemini-api-key"
            value={apiKey}
            onChangeText={setApiKey}
            placeholder={hasGeminiApiKey ? 'Clé déjà enregistrée — saisissez une nouvelle clé' : 'Collez votre clé Gemini ici'}
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: colors.foreground }]}
          />
          <Pressable testID="toggle-key-visibility" onPress={() => setShowKey((current) => !current)} hitSlop={10}>
            <Feather name={showKey ? 'eye-off' : 'eye'} size={17} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>La clé n’est jamais affichée en clair après l’enregistrement.</Text>

        <Pressable
          testID="save-gemini-key"
          onPress={save}
          disabled={isSaving}
          style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.ai, opacity: isSaving ? 0.5 : pressed ? 0.8 : 1 }]}
        >
          <Feather name="lock" size={16} color={colors.primaryForeground} />
          <Text style={styles.saveText}>{isSaving ? 'Enregistrement…' : 'Enregistrer ma clé'}</Text>
        </Pressable>

        {hasGeminiApiKey ? (
          <Pressable testID="remove-gemini-key" onPress={remove} style={({ pressed }) => [styles.removeButton, { opacity: pressed ? 0.65 : 1 }]}>
            <Feather name="trash-2" size={15} color={colors.destructive} />
            <Text style={[styles.removeText, { color: colors.destructive }]}>Supprimer ma clé</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.securityNote, { backgroundColor: colors.blueSoft }]}>
        <Feather name="shield" size={17} color={colors.primary} />
        <Text style={[styles.securityText, { color: colors.navy }]}>Votre clé est stockée dans le coffre sécurisé de votre appareil et n’est pas enregistrée avec votre profil HINOV.</Text>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 22, marginBottom: 22 },
  eyebrow: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.3, marginBottom: 7 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.6 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 7, maxWidth: 270 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, padding: 2 },
  hero: { borderRadius: 21, marginHorizontal: 18, padding: 18, marginBottom: 18 },
  heroIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { color: '#FFFFFF', fontSize: 19, fontFamily: 'Inter_700Bold' },
  heroText: { color: '#B9D2EA', fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18, marginTop: 7 },
  card: { borderWidth: 1, borderRadius: 20, marginHorizontal: 18, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  cardCaption: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 },
  statusBadge: { borderRadius: 13, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  label: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 22, marginBottom: 7 },
  inputWrap: { borderWidth: 1, borderRadius: 12, minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  input: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', paddingVertical: 10 },
  helper: { fontSize: 10, fontFamily: 'Inter_400Regular', lineHeight: 15, marginTop: 8 },
  saveButton: { minHeight: 48, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 },
  saveText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_700Bold' },
  removeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 17, paddingVertical: 5 },
  removeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  securityNote: { borderRadius: 15, marginHorizontal: 18, marginTop: 14, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  securityText: { flex: 1, fontSize: 11, fontFamily: 'Inter_500Medium', lineHeight: 16 },
});