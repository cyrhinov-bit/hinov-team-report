import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { router } from 'expo-router';
import { KeyRound, ShieldAlert, Mail } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <KeyRound size={32} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Réinitialisation du Mot de Passe</Text>

        <Text style={styles.description}>
          Pour des impératifs de sécurité et de conformité interne au sein de{' '}
          <Text style={{ fontWeight: '700' }}>HINOV Group</Text>, la réinitialisation
          des accès s’effectue par le Directeur ou le Super Administrateur.
        </Text>

        <View style={styles.instructionBox}>
          <ShieldAlert size={20} color="#D97706" style={{ marginTop: 2 }} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.boxTitle}>Procédure de récupération :</Text>
            <Text style={styles.boxText}>
              1. Contactez votre responsable ou la Direction.{'\n'}
              2. Un mot de passe temporaire à usage unique vous sera attribué.{'\n'}
              3. Vous serez automatiquement invité à définir votre nouveau mot de passe lors de votre prochaine connexion.
            </Text>
          </View>
        </View>

        <View style={styles.contactCard}>
          <Mail size={16} color={COLORS.primaryAccent} />
          <Text style={styles.contactText}>support.it@hinovgroup.com</Text>
        </View>

        <Button
          title="RETOUR À LA CONNEXION"
          onPress={() => router.back()}
          variant="outline"
          style={{ width: '100%', marginTop: 20 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: COLORS.background,
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
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  instructionBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    marginBottom: 16,
  },
  boxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  boxText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  contactText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryAccent,
    marginLeft: 8,
  },
});

