import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SettingsService } from '@/services/settings';
import { confirmAction, showAlert } from '@/utils/alert';
import {
  Building2,
  Mail,
  Bell,
  Image as ImageIcon,
  Upload,
  Trash2,
  CheckCircle2,
  Info,
} from 'lucide-react-native';

export default function AdminSettingsScreen() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState('HINOV GROUP');
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [footerText, setFooterText] = useState('HINOV Team Report • Document Confidentiel d’Entreprise');
  const [directorEmail, setDirectorEmail] = useState('direction@hinovgroup.com');
  const [superAdminRecipient, setSuperAdminRecipient] = useState('superadmin@hinovgroup.com');
  const [reminderDay, setReminderDay] = useState('Tous les vendredis à 16h00');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await SettingsService.getSettings();
      setCompanyName(s.company_name);
      setHeaderImage(s.pdf_header_image || null);
      if (s.pdf_footer_text) setFooterText(s.pdf_footer_text);
      if (s.director_email) setDirectorEmail(s.director_email);
      if (s.superadmin_report_recipient) setSuperAdminRecipient(s.superadmin_report_recipient);
      if (s.reminder_cron) setReminderDay(s.reminder_cron);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handlePickHeaderImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'L’accès à la galerie est nécessaire pour choisir l’image d’en-tête.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 4],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingImage(true);
        // Optimize and resize image for A4 full width banner
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (manipResult.base64) {
          const uploadRes = await SettingsService.uploadHeaderImage(manipResult.base64);
          if (uploadRes.url) {
            setHeaderImage(uploadRes.url);
            Alert.alert(
              'En-tête PDF Mis à Jour',
              'L’image d’en-tête a été téléversée avec succès. Elle occupera toute la largeur supérieure de chaque rapport PDF généré.'
            );
          } else {
            Alert.alert('Erreur', uploadRes.error || 'Échec du téléversement de l’image.');
          }
        }
        setUploadingImage(false);
      }
    } catch (err: any) {
      setUploadingImage(false);
      Alert.alert('Erreur', err.message || 'Erreur lors de la sélection de l’image.');
    }
  };

  const handleDeleteHeaderImage = () => {
    confirmAction({
      title: 'Supprimer l’image d’en-tête ?',
      message: 'Le document PDF utilisera l’en-tête textuel par défaut de l’entreprise.',
      confirmText: 'Supprimer',
      destructive: true,
      onConfirm: async () => {
        setUploadingImage(true);
        await SettingsService.deleteHeaderImage();
        setHeaderImage(null);
        setUploadingImage(false);
        showAlert('Image supprimée', 'L’en-tête textuel par défaut a été réactivé.');
      },
    });
  };

  const handleSave = async () => {
    setLoading(true);
    const res = await SettingsService.updateSettings({
      company_name: companyName.trim() || 'HINOV GROUP',
      pdf_header_image: headerImage,
      pdf_footer_text: footerText.trim(),
      director_email: directorEmail.trim(),
      superadmin_report_recipient: superAdminRecipient.trim(),
      reminder_cron: reminderDay.trim(),
    });
    setLoading(false);

    if (res.success) {
      Alert.alert(
        'Paramètres Enregistrés',
        'Les configurations du groupe, l’image d’en-tête et les adresses de destination ont été mises à jour.'
      );
    } else {
      Alert.alert('Erreur', res.error || 'Impossible d’enregistrer les paramètres.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Card 1: Image d'en-tête PDF (Full Width Banner) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ImageIcon size={20} color={COLORS.primaryAccent} />
            <Text style={styles.cardTitle}>En-tête Officiel du Rapport PDF</Text>
          </View>

          <Text style={styles.cardSub}>
            Cette image est positionnée en en-tête de chaque rapport PDF et occupe toute la largeur du document A4.
          </Text>

          {headerImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: headerImage }}
                style={styles.headerImagePreview}
                resizeMode="contain"
              />
              <View style={styles.imageActionsRow}>
                <Button
                  title="Changer l'image"
                  onPress={handlePickHeaderImage}
                  loading={uploadingImage}
                  variant="outline"
                  size="sm"
                  style={{ flex: 1, marginRight: 8 }}
                  icon={<Upload size={14} color={COLORS.primary} />}
                />
                <Button
                  title="Supprimer"
                  onPress={handleDeleteHeaderImage}
                  disabled={uploadingImage}
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={14} color="#FFFFFF" />}
                />
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadDropzone}
              onPress={handlePickHeaderImage}
              disabled={uploadingImage}
              activeOpacity={0.7}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={COLORS.primaryAccent} />
              ) : (
                <>
                  <View style={styles.uploadIconCircle}>
                    <Upload size={22} color={COLORS.primaryAccent} />
                  </View>
                  <Text style={styles.uploadTitle}>Téléverser l'image d'en-tête PDF</Text>
                  <Text style={styles.uploadSub}>
                    Format recommandé : Bannière panoramique (1200x250 px, PNG ou JPG)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.infoBox}>
            <Info size={16} color={COLORS.primaryAccent} style={{ marginTop: 1 }} />
            <Text style={styles.infoText}>
              L'en-tête sera automatiquement intégré en pleine largeur sur la version PDF exportée, imprimée et envoyée par email au Directeur.
            </Text>
          </View>
        </View>

        {/* Card 2: Company Settings Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Building2 size={20} color={COLORS.primaryAccent} />
            <Text style={styles.cardTitle}>Identité de l'Entreprise</Text>
          </View>

          <Input
            label="Nom de l'organisation"
            value={companyName}
            onChangeText={setCompanyName}
          />

          <Input
            label="Pied de page des rapports PDF"
            value={footerText}
            onChangeText={setFooterText}
          />
        </View>

        {/* Card 3: Email Destinations Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Mail size={20} color={COLORS.primaryAccent} />
            <Text style={styles.cardTitle}>Destinataires des Rapports</Text>
          </View>

          <Text style={styles.cardSub}>
            Adresse Outlook de la Direction recevant automatiquement les rapports hebdomadaires soumis par les collaborateurs.
          </Text>

          <Input
            label="Email du Directeur (Outlook)"
            value={directorEmail}
            onChangeText={setDirectorEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Destinataire pour les rapports du Super Admin"
            value={superAdminRecipient}
            onChangeText={setSuperAdminRecipient}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Card 4: Automated Reminders Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Bell size={20} color="#D97706" />
            <Text style={styles.cardTitle}>Rappels Automatisés</Text>
          </View>

          <Input
            label="Fréquence des notifications de relance"
            value={reminderDay}
            onChangeText={setReminderDay}
          />
        </View>

        <Button
          title="ENREGISTRER LES PARAMÈTRES"
          onPress={handleSave}
          loading={loading}
          variant="primary"
          size="lg"
          style={{ width: '100%', marginTop: 8 }}
        />
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
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.primary,
    marginLeft: 8,
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 14,
    lineHeight: 16,
  },
  uploadDropzone: {
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  uploadSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  headerImagePreview: {
    width: '100%',
    height: 90,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  imageActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  infoText: {
    fontSize: 11.5,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});
