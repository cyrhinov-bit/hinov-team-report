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
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { AdminService } from '@/services/admin';
import { ReportsService } from '@/services/reports';
import { PdfService } from '@/services/pdf';
import { getWeekNumber, getWeekRange } from '@/utils/date';
import { UserProfile, WeeklyReport, Activity } from '@/types';
import {
  Calendar,
  FileCheck2,
  Clock,
  AlertCircle,
  Share2,
  ChevronRight,
  Eye,
} from 'lucide-react-native';

export default function AdminReportsScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'soumis' | 'brouillon' | 'manquant'>('all');

  const { week, year } = getWeekNumber();
  const weekRange = getWeekRange(week, year);

  const loadData = async () => {
    const allUsers = await AdminService.getAllUsers();
    setUsers(allUsers.filter((u) => u.is_active && u.role === 'collaborateur'));

    const weekReports = await ReportsService.getAllReportsForAdmin(week, year);
    setReports(weekReports);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [currentUser])
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

  // Combine users and reports
  const userReportStatuses = users.map((u) => {
    const rep = reports.find((r) => r.user_id === u.id);
    let state: 'soumis' | 'brouillon' | 'manquant' = 'manquant';
    if (rep) {
      state = rep.status === 'soumis' ? 'soumis' : 'brouillon';
    }
    return {
      user: u,
      report: rep,
      state,
    };
  });

  const filteredList = userReportStatuses.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.state === statusFilter;
  });

  return (
    <View style={styles.container}>
      {/* Week Header */}
      <View style={styles.weekHeader}>
        <View style={styles.weekBadge}>
          <Calendar size={16} color="#FFFFFF" />
          <Text style={styles.weekText}>
            Semaine {week} • {year} ({weekRange.startDate} au {weekRange.endDate})
          </Text>
        </View>
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
            Reçus ({userReportStatuses.filter((s) => s.state === 'soumis').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, statusFilter === 'brouillon' && styles.filterBtnActive]}
          onPress={() => setStatusFilter('brouillon')}
        >
          <Text style={[styles.filterBtnText, statusFilter === 'brouillon' && styles.filterBtnTextActive]}>
            Brouillons ({userReportStatuses.filter((s) => s.state === 'brouillon').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, statusFilter === 'manquant' && styles.filterBtnActive]}
          onPress={() => setStatusFilter('manquant')}
        >
          <Text style={[styles.filterBtnText, statusFilter === 'manquant' && styles.filterBtnTextActive]}>
            Non soumis ({userReportStatuses.filter((s) => s.state === 'manquant').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List of Collaborator Reports */}
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
                label={
                  state === 'soumis'
                    ? 'Soumis'
                    : state === 'brouillon'
                    ? 'Brouillon'
                    : 'Non Soumis'
                }
                color={
                  state === 'soumis'
                    ? COLORS.success
                    : state === 'brouillon'
                    ? '#B45309'
                    : COLORS.danger
                }
                backgroundColor={
                  state === 'soumis'
                    ? COLORS.successLight
                    : state === 'brouillon'
                    ? COLORS.warningLight
                    : '#FEE2E2'
                }
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
                    Reçu le {new Date(colRep.submitted_at).toLocaleDateString('fr-FR')}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.pendingBar}>
                <Text style={styles.pendingText}>
                  {state === 'brouillon'
                    ? 'Le collaborateur est en train de renseigner ses activités.'
                    : 'Aucune activité ni brouillon enregistré pour cette semaine.'}
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
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  weekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  weekText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    marginLeft: 6,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceSubtle,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
  },
  filterBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaCol: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  job: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryAccent,
    marginLeft: 4,
  },
  submitDate: {
    marginLeft: 'auto',
    fontSize: 11,
    color: COLORS.textMuted,
  },
  pendingBar: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  pendingText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});

