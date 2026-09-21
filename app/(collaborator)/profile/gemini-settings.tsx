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
import { Sparkles, Key, Info, CheckCircle2 } from 'lucide-react-native';
import { GeminiService } from '@/services/gemini';
import { showAlert } from '@/utils/alert';

export default function GeminiSettingsScreen() {
  const { user, updateProfile } = useAuth();
  const [apiKey, setApiKey] = useState(user?.custom_gemini_api_key || '');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      showAlert('Clé requise', 'Veuillez saisir votre clé API avant de tester.');
      return;
    }
    setTesting(true);
    const res = await GeminiService.testApiKey(apiKey.trim());
    setTesting(false);

    if (res.success) {
      showAlert('Connexion Réussie !', 'Votre clé API Gemini est valide et prête à l’emploi.');
    } else {
      showAlert('Erreur de validation', res.error || 'La clé API semble invalide.');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const ok = await updateProfile({
      custom_gemini_api_key: apiKey.trim() || null,
    });
    setLoading(false);

    if (ok) {
      showAlert(
        'Configuration Gemini Enregistrée',
        'Votre clé API personnelle sera utilisée pour la génération et l’amélioration de vos rapports.',
        () => router.back()
      );
    } else {
      showAlert('Erreur', 'Impossible de sauvegarder la configuration.');
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
            <Sparkles size={28} color={COLORS.ai} />
          </View>

          <Text style={styles.title}>Clé Personnelle Gemini AI</Text>
          <Text style={styles.subtitle}>
            HTR intègre Google Gemini API pour fluidifier et professionnaliser la rédaction de vos rapports hebdomadaires.
          </Text>

          <View style={styles.infoBox}>
            <Info size={18} color={COLORS.ai} style={{ marginTop: 2 }} />
            <Text style={styles.infoText}>
              Si vous ne renseignez pas de clé personnelle, l’application utilisera automatiquement la clé globale configurée pour le groupe.
            </Text>
          </View>

          <Input
            label="Votre clé API Google Gemini (Facultatif)"
            placeholder="AIzaSy..."
            value={apiKey}
            onChangeText={setApiKey}
            leftIcon={<Key size={18} color={COLORS.textSecondary} />}
            isPassword
          />

          {apiKey.trim().length > 0 && (
            <Button
              title="TESTER LA CONNEXION GEMINI"
              onPress={handleTestKey}
              loading={testing}
              variant="outline"
              size="md"
              style={{ width: '100%', marginTop: 6, marginBottom: 4 }}
            />
          )}

          <Button
            title="ENREGISTRER LA CONFIGURATION"
            onPress={handleSave}
            loading={loading}
            variant="ai"
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
    backgroundColor: COLORS.aiLight,
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
    lineHeight: 18,
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.aiLight,
    borderWidth: 1,
    borderColor: COLORS.aiBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
  },
  infoText: {
    fontSize: 12,
    color: '#5B21B6',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

