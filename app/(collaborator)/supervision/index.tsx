import React, { useState, useEffect, useCallback } from 'react';
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
import { useNotifications } from '@/contexts/NotificationContext';
import { COLORS } from '@/constants/colors';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ColorLine } from '@/components/ui/ColorLine';
import { AdminService } from '@/services/admin';
import { ReportsService } from '@/services/reports';
import { PdfService } from '@/services/pdf';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { getWeekNumber, getWeekRange } from '@/utils/date';
import { UserProfile, WeeklyReport, Activity } from '@/types';
import {
  Calendar,
  Share2,
  Eye,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from 'lucide-react-native';

export default function SupervisionReportsScreen() {
  const { user: currentUser } = useAuth();
  const { clearAll } = useNotifications();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'soumis' | 'manquant'>('all');

  const { week, year } = getWeekNumber();
  const weekRange = getWeekRange(week, year);

  const loadData = async () => {
    const allUsers = await AdminService.getAllUsers();
    setUsers(allUsers.filter((u) => u.is_active && u.role !== 'super_admin'));

    const weekReports = await ReportsService.getAllReportsForAdmin(week, year);
    setReports(weekReports);
  };

  useEffect(() => {
    loadData();

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel(`rt:supervision_reports:${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reports',
          },
          () => {
            loadData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
          },
          () => {
            loadData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      clearAll();
    }, [currentUser, clearAll])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenPdf = (rep: WeeklyReport, authorUser: UserProfile) => {
    const activities = rep.content_snapshot || [];
    const grouped: Record<number, Activity[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    activities.forEach((a) => {
      const d = a.day_of_week || 1;
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(a);
    });

    router.push({
      pathname: '/(collaborator)/report/preview',
      params: {
        reportData: JSON.stringify({ ...rep, author: authorUser }),
        activitiesByDayData: JSON.stringify(grouped),
      },
    });
  };

  const handleSharePdf = async (rep: WeeklyReport, authorUser: UserProfile) => {
    const activities = rep.content_snapshot || [];
    const grouped: Record<number, Activity[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    activities.forEach((a) => {
      const d = a.day_of_week || 1;
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(a);
    });

    try {
      await PdfService.sharePdf(rep, authorUser, grouped);
    } catch {
      Alert.alert('Erreur', 'Impossible de partager le document.');
    }
  };

  // Combine active reporting users with received reports
  const userReportStatuses = users.map((u) => {
    const rep = reports.find((r) => r.user_id === u.id && r.status === 'soumis');
    const isSubmitted = Boolean(rep);
    return {
      user: u,
      report: rep || null,
      state: isSubmitted ? ('soumis' as const) : ('manquant' as const),
    };
  });

  const filteredList = userReportStatuses.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.state === statusFilter;
  });

  const submittedCount = userReportStatuses.filter((s) => s.state === 'soumis').length;
  const pendingCount = userReportStatuses.filter((s) => s.state === 'manquant').length;

  return (
    <View style={styles.container}>
      <ColorLine height={4} style={{ borderRadius: 2 }} />

      {/* Week Header */}
      <View style={styles.weekHeader}>
        <View style={styles.weekBadge}>
          <Calendar size={15} color="#FFFFFF" />
          <Text style={styles.weekText}>
            Semaine {week} • {year} ({weekRange.startDate} au {weekRange.endDate})
          </Text>
        </View>
        <Text style={styles.summaryStatsText}>
          {submittedCount} reçu(s) • {pendingCount} en attente
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, statusFilter === 'all' && styles.filterBtnActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.filterBtnText, statusFilter === 'all' && styles.filterBtnTextActive]}>
            Tous ({userReportStatuses.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, statusFilter === 'soumis' && styles.filterBtnActive]}
          onPress={() => setStatusFilter('soumis')}
        >
          <Text style={[styles.filterBtnText, statusFilter === 'soumis' && styles.filterBtnTextActive]}>
            Reçus ({submittedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, statusFilter === 'manquant' && styles.filterBtnActive]}
          onPress={() => setStatusFilter('manquant')}
        >
          <Text style={[styles.filterBtnText, statusFilter === 'manquant' && styles.filterBtnTextActive]}>
            En attente ({pendingCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List of Team Reports */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredList.map(({ user: colUser, report: colRep, state }) => (
          <View key={colUser.id} style={styles.itemCard}>
            <View style={styles.cardHeader}>
              <Avatar url={colUser.avatar_url} name={colUser.full_name} size={44} />
              <View style={styles.metaCol}>
                <Text style={styles.name}>{colUser.full_name}</Text>
                <Text style={styles.job}>
                  {colUser.job_title || 'Collaborateur'} — {colUser.department || 'Département'}
                </Text>
              </View>
              <Badge
                label={state === 'soumis' ? 'Reçu' : 'En attente'}
                color={state === 'soumis' ? COLORS.success : '#D97706'}
                backgroundColor={state === 'soumis' ? COLORS.successLight : '#FEF3C7'}
              />
            </View>

            {colRep && colRep.status === 'soumis' ? (
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleSharePdf(colRep, colUser)}
                >
                  <Share2 size={14} color={COLORS.primaryAccent} />
                  <Text style={styles.actionBtnText}>Partager PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { marginLeft: 8 }]}
                  onPress={() => handleOpenPdf(colRep, colUser)}
                >
                  <Eye size={14} color={COLORS.primaryAccent} />
                  <Text style={styles.actionBtnText}>Consulter</Text>
                </TouchableOpacity>

                {colRep.submitted_at && (
                  <Text style={styles.submitDate}>
                    Reçu le {new Date(colRep.submitted_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.pendingBar}>
                <Clock size={14} color="#B45309" style={{ marginRight: 6 }} />
                <Text style={styles.pendingText}>
                  Rapport hebdomadaire non encore soumis pour cette semaine.
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  weekHeader: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  weekText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
    marginLeft: 6,
  },
  summaryStatsText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSubtle,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 28,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaCol: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  job: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceSubtle,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.primaryAccent,
    marginLeft: 5,
  },
  submitDate: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginLeft: 'auto',
    fontWeight: '500',
  },
  pendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  pendingText: {
    fontSize: 11.5,
    color: '#B45309',
    fontStyle: 'italic',
  },
});
