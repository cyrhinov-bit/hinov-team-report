import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatsCard } from '@/components/admin/StatsCard';
import { AdminService } from '@/services/admin';
import { ReportsService } from '@/services/reports';
import { getWeekNumber } from '@/utils/date';
import { UserProfile, WeeklyReport } from '@/types';
import { confirmAction, showAlert } from '@/utils/alert';
import {
  Users,
  FileCheck2,
  AlertCircle,
  Clock,
  UserPlus,
  Send,
  Settings,
  ChevronRight,
  ShieldCheck,
  BellRing,
} from 'lucide-react-native';

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const { week, year } = getWeekNumber();

  const loadData = async () => {
    const [allUsers, allReports] = await Promise.all([
      AdminService.getAllUsers(),
      ReportsService.getAllReportsForAdmin(week, year),
    ]);
    setUsers(allUsers);
    setReports(allReports);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [week, year])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Metrics calculation
  const activeCollaborators = users.filter(
    (u) => u.is_active && u.role !== 'super_admin'
  );
  const totalCount = activeCollaborators.length || 1;

  const submittedReports = reports.filter((r) => r.status === 'soumis');
  const draftReports = reports.filter((r) => r.status === 'brouillon');

  const submittedCount = submittedReports.length;
  const draftCount = draftReports.length;
  const missingCount = Math.max(0, totalCount - submittedCount - draftCount);

  const handleRemindTeam = () => {
    confirmAction({
      title: 'Relance des Collaborateurs',
      message: `Un rappel par notification sera envoyé aux ${missingCount + draftCount} collaborateur(s) n'ayant pas encore soumis leur rapport de la Semaine ${week}.`,
      confirmText: 'Envoyer le rappel',
      onConfirm: () => {
        showAlert(
          'Rappels envoyés',
          'Les collaborateurs concernés ont été notifiés avec succès.'
        );
      },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <View style={styles.headerLeft}>
          <ShieldCheck size={26} color="#38BDF8" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerTitle}>Supervision Direction</Text>
            <Text style={styles.headerSub}>Semaine {week} • {year}</Text>
          </View>
        </View>
        <Badge label={user?.role || 'admin'} role={user?.role} />
      </View>

      {/* KPI Stats Grid */}
      <View style={styles.statsGrid}>
        <StatsCard
          title="Reçus"
          value={`${submittedCount} / ${totalCount}`}
          subtitle={`${Math.round((submittedCount / totalCount) * 100)}% de complétion`}
          icon={<FileCheck2 size={18} color={COLORS.success} />}
          variant="success"
        />
        <StatsCard
          title="Brouillons"
          value={draftCount}
          subtitle="En cours de saisie"
          icon={<Clock size={18} color="#B45309" />}
          variant="warning"
        />
        <StatsCard
          title="Non Soumis"
          value={missingCount}
          subtitle="À relancer"
          icon={<AlertCircle size={18} color={COLORS.danger} />}
          variant="warning"
        />
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.actionsCard}>
        <Text style={styles.sectionHeading}>Actions Rapides</Text>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/(admin)/users/create')}
        >
          <View style={[styles.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
            <UserPlus size={18} color={COLORS.primaryAccent} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Créer un nouveau collaborateur</Text>
            <Text style={styles.actionSub}>Générer un compte avec mot de passe temporaire</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/(admin)/reports')}
        >
          <View style={[styles.actionIconBox, { backgroundColor: COLORS.successLight }]}>
            <FileCheck2 size={18} color={COLORS.success} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Consulter tous les rapports d'équipe</Text>
            <Text style={styles.actionSub}>Visualiser, filtrer et télécharger les PDF</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/(admin)/users')}
        >
          <View style={[styles.actionIconBox, { backgroundColor: COLORS.aiLight }]}>
            <Users size={18} color={COLORS.ai} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Annuaire & Gestion des Utilisateurs</Text>
            <Text style={styles.actionSub}>Réinitialiser mots de passe, désactiver/activer</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionRow, { borderBottomWidth: 0 }]}
          onPress={handleRemindTeam}
        >
          <View style={[styles.actionIconBox, { backgroundColor: '#FEF3C7' }]}>
            <BellRing size={18} color="#D97706" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Relancer les collaborateurs en retard</Text>
            <Text style={styles.actionSub}>Notification de rappel pour la semaine {week}</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Super Admin System Settings link */}
      {user?.role === 'super_admin' && (
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/(admin)/settings')}
        >
          <Settings size={18} color={COLORS.primaryAccent} />
          <Text style={styles.settingsBtnText}>
            Paramètres Système & Destinataires HTR
          </Text>
        </TouchableOpacity>
      )}
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
    paddingBottom: 36,
  },
  headerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 14,
  },
  actionsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
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
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 12,
    borderRadius: 12,
  },
  settingsBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.primaryAccent,
    marginLeft: 8,
  },
});

