import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ActivitiesService } from '@/services/activities';
import { ReportsService } from '@/services/reports';
import { getWeekNumber, getWeekRange } from '@/utils/date';
import { Activity, WeeklyReport } from '@/types';
import {
  Plus,
  FileText,
  CheckCircle2,
  Circle,
  Clock,
  ChevronRight,
  Shield,
  Briefcase,
  Sparkles,
} from 'lucide-react-native';
import { ColorLine } from '@/components/ui/ColorLine';

export default function CollaboratorDashboard() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentReport, setCurrentReport] = useState<WeeklyReport | null>(null);

  const { week, year } = getWeekNumber();
  const weekRange = getWeekRange(week, year);

  const loadData = async () => {
    if (!user) return;
    try {
      const acts = await ActivitiesService.getActivitiesForUser(
        user.id,
        weekRange.startDate,
        weekRange.endDate
      );
      setActivities(acts);

      const report = await ReportsService.getOrCreateWeeklyDraft(user, week, year);
      setCurrentReport(report);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayActivities = activities.filter((a) => a.date === todayStr);

  const firstName = user?.full_name?.split(' ')[0] || 'Collaborateur';

  // Calculate day completion status
  const weekDays = weekRange.days.map((d) => {
    const count = activities.filter((a) => a.date === d.dateStr).length;
    const isToday = d.dateStr === todayStr;
    const isPast = d.dateStr < todayStr;
    return {
      ...d,
      count,
      isToday,
      isCompleted: count > 0,
    };
  });

  const getReportBadge = () => {
    if (!currentReport) return { label: 'À préparer', status: 'brouillon' as const };
    if (currentReport.status === 'soumis') {
      return { label: 'Envoyé ✓', status: 'soumis' as const };
    }
    if (activities.length > 0) {
      return { label: 'Brouillon en cours', status: 'brouillon' as const };
    }
    return { label: 'À préparer', status: 'brouillon' as const };
  };

  const reportBadge = getReportBadge();
  const isAdminOrDirector =
    user?.role === 'directeur_admin' || user?.role === 'super_admin';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <ColorLine height={4} style={{ borderRadius: 2, marginBottom: 12 }} />

      {/* Top Profile Card */}
      <View style={styles.profileHeader}>
        <Avatar url={user?.avatar_url} name={user?.full_name || 'U'} size={50} />
        <View style={styles.profileDetails}>
          <Text style={styles.greeting}>Bonjour {firstName} 👋</Text>
          <Text style={styles.dateText}>
            Semaine {week} • {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <Badge label={user?.role || 'collaborateur'} role={user?.role} />
      </View>

      {/* Admin Switch Banner (For Director & Super Admin) */}
      {isAdminOrDirector && (
        <TouchableOpacity
          style={styles.adminBanner}
          onPress={() => router.push('/(admin)')}
          activeOpacity={0.85}
        >
          <View style={styles.adminBannerLeft}>
            <Shield size={20} color="#FFFFFF" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.adminBannerTitle}>
                {user?.role === 'super_admin' ? 'Espace Super Administration' : 'Espace Administration Direction'}
              </Text>
              <Text style={styles.adminBannerSub}>
                Suivi des rapports d'équipe et gestion des accès
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Card 1: Activités du Jour */}
      <Card style={styles.statCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardIconBox}>
            <Briefcase size={18} color={COLORS.primaryAccent} />
          </View>
          <Text style={styles.cardTitle}>Activités du Jour</Text>
          <Text style={styles.badgeCountToday}>{todayActivities.length}</Text>
        </View>

        {todayActivities.length === 0 ? (
          <Text style={styles.emptyDayText}>
            Aucune activité enregistrée aujourd'hui.
          </Text>
        ) : (
          todayActivities.slice(0, 3).map((act) => (
            <View key={act.id} style={styles.todayActItem}>
              <CheckCircle2 size={14} color={COLORS.success} style={{ marginTop: 2 }} />
              <Text style={styles.todayActTitle} numberOfLines={1}>
                {act.title}
              </Text>
            </View>
          ))
        )}

        <Button
          title="+ Ajouter une activité"
          onPress={() => router.push('/(collaborator)/activities/new')}
          variant="outline"
          size="sm"
          style={{ marginTop: 12 }}
        />
      </Card>

      {/* Card 2: Progression de la Semaine */}
      <Card style={styles.statCard}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.cardIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Clock size={18} color={COLORS.primaryAccent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Progression de la Semaine</Text>
            <Text style={styles.weekProgressHint}>
              Touchez un jour pour y ajouter une activité
            </Text>
          </View>
          <Text style={styles.weekRangeText}>
            {weekRange.startDate} au {weekRange.endDate}
          </Text>
        </View>

        <View style={styles.weekProgressRow}>
          {weekDays.map((d) => (
            <TouchableOpacity
              key={`prog-${d.dayOfWeek}`}
              style={[
                styles.dayProgressCol,
                d.isToday && styles.dayProgressToday,
              ]}
              onPress={() => {
                router.push({
                  pathname: '/(collaborator)/activities/new',
                  params: { date: d.dateStr, dayOfWeek: String(d.dayOfWeek) },
                });
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayProgressLabel,
                  d.isToday && styles.dayProgressLabelToday,
                ]}
              >
                {d.label.substring(0, 3)}
              </Text>
              {d.isCompleted ? (
                <View style={styles.dayIconContainer}>
                  <CheckCircle2 size={20} color={COLORS.success} />
                </View>
              ) : (
                <View style={styles.dayIconContainer}>
                  <Plus size={18} color={d.isToday ? COLORS.primaryAccent : COLORS.textMuted} />
                </View>
              )}
              <Text
                style={[
                  styles.dayProgressCount,
                  d.isCompleted && styles.dayProgressCountDone,
                  d.isToday && !d.isCompleted && styles.dayProgressCountTodayEmpty,
                ]}
              >
                {d.count > 0 ? `${d.count} act.` : '+ Ajouter'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Card 3: Mon Rapport Hebdomadaire */}
      <Card style={styles.statCard}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.cardIconBox, { backgroundColor: COLORS.aiLight }]}>
            <FileText size={18} color={COLORS.ai} />
          </View>
          <Text style={styles.cardTitle}>Mon Rapport Hebdomadaire</Text>
          <Badge label={reportBadge.label} reportStatus={reportBadge.status} />
        </View>

        <Text style={styles.reportSummaryText}>
          {currentReport?.status === 'soumis'
            ? `Votre rapport de la Semaine ${week} a été soumis et transmis avec succès.`
            : `${activities.length} activité(s) prête(s) à être consolidée(s) pour la Semaine ${week}.`}
        </Text>

        <View style={styles.reportActionsRow}>
          <Button
            title="📄 Préparer mon rapport"
            onPress={() => router.push('/(collaborator)/report')}
            variant="primary"
            style={{ flex: 1, marginRight: 8 }}
          />
          <TouchableOpacity
            style={styles.aiQuickBtn}
            onPress={() => router.push('/(collaborator)/report')}
            activeOpacity={0.8}
          >
            <Sparkles size={16} color={COLORS.ai} />
          </TouchableOpacity>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  profileDetails: {
    flex: 1,
    marginLeft: 12,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  adminBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminBannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminBannerSub: {
    fontSize: 11,
    color: '#93C5FD',
    marginTop: 1,
  },
  statCard: {
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  badgeCountToday: {
    backgroundColor: '#EFF6FF',
    color: COLORS.primaryAccent,
    fontWeight: '800',
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emptyDayText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginVertical: 4,
  },
  todayActItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  todayActTitle: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  weekRangeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  weekProgressHint: {
    fontSize: 11,
    color: COLORS.primaryAccent,
    fontWeight: '500',
    marginTop: 1,
  },
  weekProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 4,
  },
  dayProgressCol: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayProgressToday: {
    backgroundColor: COLORS.infoLight,
    borderWidth: 1.5,
    borderColor: COLORS.primaryAccent,
  },
  dayIconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayProgressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dayProgressLabelToday: {
    color: COLORS.primaryAccent,
    fontWeight: '800',
  },
  dayProgressCount: {
    fontSize: 9.5,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '600',
    textAlign: 'center',
  },
  dayProgressCountDone: {
    color: COLORS.success,
    fontWeight: '700',
  },
  dayProgressCountTodayEmpty: {
    color: COLORS.primaryAccent,
    fontWeight: '700',
  },
  reportSummaryText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  reportActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiQuickBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.aiLight,
    borderWidth: 1,
    borderColor: COLORS.aiBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

