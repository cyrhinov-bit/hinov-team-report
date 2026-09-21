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
import { Badge } from '@/components/ui/Badge';
import { ReportsService } from '@/services/reports';
import { PdfService } from '@/services/pdf';
import { WeeklyReport, Activity } from '@/types';
import {
  FileText,
  Calendar,
  Share2,
  Eye,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react-native';

export default function ReportsHistoryScreen() {
  const { user } = useAuth();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    if (!user) return;
    const list = await ReportsService.getReportsHistory(user.id);
    setReports(list);
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleOpenReport = (rep: WeeklyReport) => {
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
        reportData: JSON.stringify({ ...rep, author: user }),
        activitiesByDayData: JSON.stringify(grouped),
      },
    });
  };

  const handleShare = async (rep: WeeklyReport) => {
    if (!user) return;
    const activities = rep.content_snapshot || [];
    const grouped: Record<number, Activity[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    activities.forEach((a) => {
      const d = a.day_of_week || 1;
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(a);
    });

    try {
      await PdfService.sharePdf(rep, user, grouped);
    } catch {
      Alert.alert('Erreur', 'Impossible de partager le PDF.');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Archives de Rapports</Text>
        <Text style={styles.subtitle}>
          Consultez, visualisez et téléchargez vos rapports hebdomadaires précédents
        </Text>
      </View>

      {reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FileText size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Aucun rapport archivé</Text>
          <Text style={styles.emptySub}>
            Vos rapports soumis apparaîtront automatiquement ici avec leurs exports PDF.
          </Text>
        </View>
      ) : (
        reports.map((rep) => {
          const isSubmitted = rep.status === 'soumis';
          const actCount = (rep.content_snapshot || []).length;
          return (
            <TouchableOpacity
              key={`hist-${rep.id}`}
              style={styles.reportCard}
              onPress={() => handleOpenReport(rep)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <View style={styles.weekPill}>
                  <Calendar size={14} color={COLORS.primary} />
                  <Text style={styles.weekPillText}>
                    Semaine {rep.week_number} • {rep.year}
                  </Text>
                </View>
                <Badge
                  label={isSubmitted ? 'Soumis' : 'Brouillon'}
                  reportStatus={rep.status}
                />
              </View>

              <Text style={styles.periodText}>
                Période : {rep.start_date} au {rep.end_date}
              </Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaItem}>📝 {actCount} activité(s)</Text>
                {rep.submitted_at && (
                  <Text style={styles.metaItem}>
                    ✓ Soumis le {new Date(rep.submitted_at).toLocaleDateString('fr-FR')}
                  </Text>
                )}
              </View>

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    handleShare(rep);
                  }}
                >
                  <Share2 size={14} color={COLORS.primaryAccent} />
                  <Text style={styles.shareBtnText}>Partager PDF</Text>
                </TouchableOpacity>

                <View style={styles.viewLink}>
                  <Text style={styles.viewLinkText}>Visualiser</Text>
                  <ChevronRight size={16} color={COLORS.primaryAccent} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })
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
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  reportCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weekPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  weekPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 6,
  },
  periodText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  metaItem: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryAccent,
    marginLeft: 4,
  },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primaryAccent,
    marginRight: 2,
  },
});

