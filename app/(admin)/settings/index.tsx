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
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Building2, Mail, Bell, Shield, CheckCircle2 } from 'lucide-react-native';

export default function AdminSettingsScreen() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState('HINOV Group');
  const [directorEmail, setDirectorEmail] = useState('direction@hinovgroup.com');
  const [superAdminRecipient, setSuperAdminRecipient] = useState('superadmin@hinovgroup.com');
  const [reminderDay, setReminderDay] = useState('Tous les vendredis à 16h00');
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Paramètres Enregistrés',
        'Les configurations du groupe et les adresses de destination ont été mises à jour.'
      );
    }, 600);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Company Settings Card */}
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
        </View>

        {/* Email Destinations Card */}
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

        {/* Automated Reminders Card */}
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
});
