import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TempPasswordModal } from '@/components/admin/TempPasswordModal';
import { AdminService } from '@/services/admin';
import { UserProfile } from '@/types';
import {
  KeyRound,
  Power,
  Mail,
  Building,
  Briefcase,
  Calendar,
  Shield,
  ShieldCheck,
  RotateCw,
} from 'lucide-react-native';

export default function UserDetailScreen() {
  const { user: currentUser } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal temporary password
  const [tempModalVisible, setTempModalVisible] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const loadUser = async () => {
    if (!id) return;
    setLoading(true);
    const list = await AdminService.getAllUsers();
    const found = list.find((u) => u.id === id);
    setTargetUser(found || null);
    setLoading(false);
  };

  useEffect(() => {
    loadUser();
  }, [id]);

  const handleResetPassword = async () => {
    if (!targetUser) return;
    Alert.alert(
      'Réinitialisation du mot de passe',
      `Générer un nouveau mot de passe temporaire pour ${targetUser.full_name} ? Il sera affiché UNE SEULE FOIS.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Générer',
          onPress: async () => {
            const res = await AdminService.resetUserPassword(targetUser.id);
            if (res.success && res.temporaryPassword) {
              setTempPassword(res.temporaryPassword);
              setTempModalVisible(true);
              await loadUser();
            } else {
              Alert.alert('Erreur', res.error || 'Impossible de réinitialiser le mot de passe.');
            }
          },
        },
      ]
    );
  };

  const handleToggleStatus = async () => {
    if (!targetUser) return;
    if (targetUser.id === currentUser?.id) {
      Alert.alert('Action interdite', 'Vous ne pouvez pas désactiver votre propre compte.');
      return;
    }

    const nextState = !targetUser.is_active;
    const actionLabel = nextState ? 'Activer' : 'Désactiver';

    Alert.alert(
      `${actionLabel} le compte`,
      `Confirmez-vous le passage du compte à "${actionLabel}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: actionLabel,
          style: nextState ? 'default' : 'destructive',
          onPress: async () => {
            const res = await AdminService.toggleUserActiveStatus(targetUser.id, nextState);
            if (res.success) {
              setTargetUser((prev) => (prev ? { ...prev, is_active: nextState } : null));
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryAccent} />
      </View>
    );
  }

  if (!targetUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Collaborateur introuvable.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Top Profile Header */}
      <View style={styles.profileCard}>
        <Avatar url={targetUser.avatar_url} name={targetUser.full_name} size={70} showBorder />
        <Text style={styles.userName}>{targetUser.full_name}</Text>
        <Text style={styles.userJob}>{targetUser.job_title || 'Fonction non définie'}</Text>

        <View style={styles.badgeRow}>
          <Badge label={targetUser.role} role={targetUser.role} />
          <Badge
            label={targetUser.is_active ? 'Actif' : 'Inactif'}
            color={targetUser.is_active ? COLORS.success : COLORS.danger}
            backgroundColor={targetUser.is_active ? COLORS.successLight : '#FEE2E2'}
          />
        </View>
      </View>

      {/* Account Details */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Détails du Compte</Text>

        <View style={styles.infoRow}>
          <Mail size={16} color={COLORS.textSecondary} />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Email de connexion</Text>
            <Text style={styles.infoValue}>{targetUser.email}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Building size={16} color={COLORS.textSecondary} />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Département</Text>
            <Text style={styles.infoValue}>{targetUser.department || 'Général'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Calendar size={16} color={COLORS.textSecondary} />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Date de création</Text>
            <Text style={styles.infoValue}>
              {targetUser.created_at
                ? new Date(targetUser.created_at).toLocaleDateString('fr-FR')
                : 'N/A'}
            </Text>
          </View>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <RotateCw size={16} color={COLORS.textSecondary} />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Dernière connexion</Text>
            <Text style={styles.infoValue}>
              {targetUser.last_login_at
                ? new Date(targetUser.last_login_at).toLocaleDateString('fr-FR')
                : 'Jamais connecté'}
            </Text>
          </View>
        </View>
      </View>

      {/* Admin Actions */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Actions Administratives</Text>

        <TouchableOpacity style={styles.actionBtnRow} onPress={handleResetPassword}>
          <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
            <KeyRound size={18} color={COLORS.primaryAccent} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.actionTitle}>Réinitialiser le mot de passe</Text>
            <Text style={styles.actionSub}>
              Génère un accès temporaire et force le changement
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtnRow, { borderBottomWidth: 0 }]}
          onPress={handleToggleStatus}
        >
          <View
            style={[
              styles.actionIcon,
              { backgroundColor: targetUser.is_active ? '#FEE2E2' : COLORS.successLight },
            ]}
          >
            <Power
              size={18}
              color={targetUser.is_active ? COLORS.danger : COLORS.success}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={[
                styles.actionTitle,
                { color: targetUser.is_active ? COLORS.danger : COLORS.success },
              ]}
            >
              {targetUser.is_active ? 'Désactiver le compte' : 'Activer le compte'}
            </Text>
            <Text style={styles.actionSub}>
              {targetUser.is_active
                ? 'Bloque immédiatement la connexion du collaborateur'
                : 'Rétablit l’accès à la plateforme'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Temp Password Modal */}
      <TempPasswordModal
        visible={tempModalVisible}
        temporaryPassword={tempPassword}
        userName={targetUser.full_name}
        userEmail={targetUser.email}
        onClose={() => {
          setTempModalVisible(false);
          setTempPassword('');
        }}
      />
    </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 30,
    color: COLORS.danger,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 10,
  },
  userJob: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoCol: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13.5,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: 1,
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionSub: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
});

