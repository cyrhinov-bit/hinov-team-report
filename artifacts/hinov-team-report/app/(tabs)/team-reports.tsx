import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useAppState } from '@/context/AppStateContext';
import {
  AdminCollaboratorReport,
  AppNotification,
  AppSettings,
  ReportHistoryItem,
  TeamMemberReportStatus,
  TeamReportsStatusResponse,
  apiRequest,
} from '@/lib/api';
import { exportAndShareReportPdf } from '@/lib/pdf';
import { WEEK_DAYS, dateToWeekDay, getCurrentWeekRange } from '@/lib/constants';

const logo = require('@/assets/images/htr-logo.jpeg');

function formatWeekLabel(wStart: string) {
  if (!wStart) return 'Période indéfinie';
  const start = new Date(`${wStart}T12:00:00`);
  if (isNaN(start.getTime())) return wStart;
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  return `Du ${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} au ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
}

export default function TeamReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { token } = useAuth();
  const { profile } = useAppState();

  const isSmall = width < 380;
  const isCompact = width < 600;
  const isTablet = width >= 768;

  // Semaine sélectionnée (par défaut semaine courante)
  const initialWeekRange = useMemo(() => getCurrentWeekRange(), []);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(initialWeekRange.start);

  // Données
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusData, setStatusData] = useState<TeamReportsStatusResponse | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Filtres et recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Modale de prévisualisation PDF A4
  const [previewMember, setPreviewMember] = useState<TeamMemberReportStatus | null>(null);
  const [previewReportData, setPreviewReportData] = useState<AdminCollaboratorReport | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Modale Historique collaborateur
  const [historyMember, setHistoryMember] = useState<TeamMemberReportStatus | null>(null);
  const [memberHistoryList, setMemberHistoryList] = useState<ReportHistoryItem[]>([]);
  const [loadingMemberHistory, setLoadingMemberHistory] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [downloadingHistoryId, setDownloadingHistoryId] = useState<string | null>(null);

  // Direct download state for list cards
  const [downloadingUserId, setDownloadingUserId] = useState<string | null>(null);

  const companyName = appSettings?.companyName || 'HINOV GROUP';
  const primaryColor = appSettings?.primaryColor || '#1E3A8A';
  const secondaryColor = appSettings?.secondaryColor || '#4F46E5';
  const pdfFooterText = appSettings?.pdfFooterText || "HINOV Team Report - Document Confidentiel d'Entreprise";
  const headerBanner = appSettings?.pdfHeaderImage || null;

  // Calcul du label de la semaine affichée
  const currentWeekLabel = useMemo(() => formatWeekLabel(selectedWeekStart), [selectedWeekStart]);

  // Navigation entre semaines
  const shiftWeek = (offsetWeeks: number) => {
    const current = new Date(`${selectedWeekStart}T12:00:00`);
    if (isNaN(current.getTime())) return;
    current.setDate(current.getDate() + offsetWeeks * 7);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    setSelectedWeekStart(`${yyyy}-${mm}-${dd}`);
  };

  const isCurrentWeek = selectedWeekStart === initialWeekRange.start;

  // Chargement des données d'état de l'équipe
  const loadData = useCallback(async (isSilent = false) => {
    if (!token) return;
    if (!isSilent) setLoading(true);
    try {
      const [teamRes, settingsRes, notifRes] = await Promise.all([
        apiRequest<TeamReportsStatusResponse>(`/api/admin/team-reports/status?week_start=${selectedWeekStart}`, { token }).catch(() => null),
        apiRequest<AppSettings>('/api/app-settings', { token }).catch(() => null),
        apiRequest<{ notifications: AppNotification[]; unreadCount: number }>('/api/notifications', { token }).catch(() => ({ notifications: [], unreadCount: 0 })),
      ]);

      if (teamRes) setStatusData(teamRes);
      if (settingsRes) setAppSettings(settingsRes);
      if (notifRes) {
        setNotifications(Array.isArray(notifRes.notifications) ? notifRes.notifications : []);
        setUnreadCount(typeof notifRes.unreadCount === 'number' ? notifRes.unreadCount : 0);
      }
    } catch (err) {
      console.warn('Erreur chargement rapports équipe:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedWeekStart]);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadData(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Liste des départements disponibles
  const departments = useMemo(() => {
    const set = new Set<string>();
    statusData?.members.forEach((m) => {
      if (m.department) set.add(m.department);
    });
    return Array.from(set);
  }, [statusData]);

  // Filtrage des membres (UNIQUEMENT les rapports soumis)
  const filteredMembers = useMemo(() => {
    if (!statusData?.members) return [];
    return statusData.members.filter((member) => {
      // 1. Strictement soumis
      if (member.status !== 'SUBMITTED') return false;

      // 2. Recherche
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = member.fullName?.toLowerCase().includes(q);
        const matchEmail = member.email?.toLowerCase().includes(q);
        const matchDept = member.department?.toLowerCase().includes(q);
        const matchDiff = member.difficulties?.toLowerCase().includes(q);
        const matchPersp = member.perspectives?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchDept && !matchDiff && !matchPersp) {
          return false;
        }
      }
      // 3. Département
      if (deptFilter !== 'ALL' && member.department !== deptFilter) {
        return false;
      }
      return true;
    });
  }, [statusData, searchQuery, deptFilter]);

  // Action : Marquer toutes les notifications comme lues
  const handleMarkAllNotifsRead = async () => {
    if (!token) return;
    try {
      await apiRequest('/api/notifications/mark-all-read', { method: 'POST', token });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.warn('Erreur mark-all-read:', e);
    }
  };

  // Action : Cliquer sur une notification
  const handleSelectNotification = async (notif: AppNotification) => {
    if (!token) return;
    try {
      if (!notif.isRead) {
        await apiRequest(`/api/notifications/${notif.id}/read`, { method: 'PATCH', token });
        setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.warn('Erreur marquer lu:', e);
    }

    setShowNotificationsModal(false);

    if (notif.data?.weekStart && notif.data.weekStart !== selectedWeekStart) {
      setSelectedWeekStart(notif.data.weekStart);
    }

    if (notif.data?.userId) {
      handleOpenPreview({
        id: notif.data.userId,
        userId: notif.data.userId,
        fullName: notif.senderName || 'Collaborateur',
        email: '',
        role: 'COLLABORATEUR',
        department: notif.senderDepartment || 'Général',
        avatarUrl: notif.senderAvatar,
        status: 'SUBMITTED',
        activitiesCount: 0,
        difficulties: '',
        perspectives: '',
      });
    }
  };

  // Action : Ouvrir la prévisualisation PDF A4
  const handleOpenPreview = async (member: TeamMemberReportStatus) => {
    if (!token) return;
    setPreviewMember(member);
    setLoadingPreview(true);
    try {
      const reportData = await apiRequest<AdminCollaboratorReport>(
        `/api/admin/users/${member.userId}/report?week_start=${selectedWeekStart}`,
        { token }
      );
      setPreviewReportData(reportData);
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de charger le rapport.');
      setPreviewMember(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Action : Télécharger directement le PDF d'un collaborateur pour la semaine
  const handleDirectDownloadPdf = async (member: TeamMemberReportStatus) => {
    if (!token) return;
    setDownloadingUserId(member.userId);
    try {
      const data = await apiRequest<AdminCollaboratorReport>(
        `/api/admin/users/${member.userId}/report?week_start=${selectedWeekStart}`,
        { token }
      );

      await exportAndShareReportPdf({
        profile: {
          fullName: data.profile.fullName || member.fullName,
          email: data.profile.email || member.email,
          department: data.profile.department || member.department,
          role: data.profile.role || member.role,
          avatarUri: data.profile.avatarUri || member.avatarUrl,
        },
        weekLabel: currentWeekLabel,
        weekStart: selectedWeekStart,
        activities: data.activities || [],
        difficulties: data.report?.difficulties || '',
        perspectives: data.report?.perspectives || '',
        appSettings: {
          id: 'default',
          companyName,
          pdfFooterText,
          primaryColor,
          secondaryColor,
          pdfHeaderImage: headerBanner,
        },
      });

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de télécharger le PDF.');
    } finally {
      setDownloadingUserId(null);
    }
  };

  // Action : Télécharger depuis la modale de prévisualisation
  const handleExportFromPreview = async () => {
    if (!previewReportData || !previewMember) return;
    setIsExportingPdf(true);
    try {
      await exportAndShareReportPdf({
        profile: {
          fullName: previewReportData.profile.fullName || previewMember.fullName,
          email: previewReportData.profile.email || previewMember.email,
          department: previewReportData.profile.department || previewMember.department,
          role: previewReportData.profile.role || previewMember.role,
          avatarUri: previewReportData.profile.avatarUri || previewMember.avatarUrl,
        },
        weekLabel: currentWeekLabel,
        weekStart: selectedWeekStart,
        activities: previewReportData.activities || [],
        difficulties: previewReportData.report?.difficulties || '',
        perspectives: previewReportData.report?.perspectives || '',
        appSettings: {
          id: 'default',
          companyName,
          pdfFooterText,
          primaryColor,
          secondaryColor,
          pdfHeaderImage: headerBanner,
        },
      });

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible d’exporter le PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Action : Ouvrir l'historique complet d'un collaborateur
  const handleOpenMemberHistory = async (member: TeamMemberReportStatus) => {
    if (!token) return;
    setHistoryMember(member);
    setLoadingMemberHistory(true);
    setHistorySearchQuery('');
    try {
      const list = await apiRequest<ReportHistoryItem[]>(
        `/api/admin/users/${member.userId}/reports-history`,
        { token }
      );
      setMemberHistoryList(Array.isArray(list) ? list : []);
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de charger l’historique.');
      setHistoryMember(null);
    } finally {
      setLoadingMemberHistory(false);
    }
  };

  // Action : Télécharger un rapport historique précis
  const handleDownloadHistoricalItem = async (item: ReportHistoryItem) => {
    if (!token || !historyMember) return;
    setDownloadingHistoryId(item.id);
    try {
      const data = await apiRequest<AdminCollaboratorReport>(
        `/api/admin/users/${historyMember.userId}/report?week_start=${item.weekStart}`,
        { token }
      );
      const start = new Date(`${item.weekStart}T12:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 4);
      const weekLabel = `Du ${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} au ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`;

      await exportAndShareReportPdf({
        profile: {
          fullName: data.profile.fullName || historyMember.fullName,
          email: data.profile.email || historyMember.email,
          department: data.profile.department || historyMember.department,
          role: data.profile.role || historyMember.role,
          avatarUri: data.profile.avatarUri || historyMember.avatarUrl,
        },
        weekLabel,
        weekStart: item.weekStart,
        activities: data.activities || [],
        difficulties: data.report?.difficulties || '',
        perspectives: data.report?.perspectives || '',
        appSettings: {
          id: 'default',
          companyName,
          pdfFooterText,
          primaryColor,
          secondaryColor,
          pdfHeaderImage: headerBanner,
        },
      });

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de télécharger ce rapport.');
    } finally {
      setDownloadingHistoryId(null);
    }
  };

  // Filtrage de l'historique du membre
  const filteredMemberHistory = useMemo(() => {
    if (!historySearchQuery.trim()) return memberHistoryList;
    const q = historySearchQuery.toLowerCase().trim();
    return memberHistoryList.filter((item) => {
      const matchWeek = item.weekStart?.toLowerCase().includes(q);
      const matchDiff = item.difficulties?.toLowerCase().includes(q);
      const matchPersp = item.perspectives?.toLowerCase().includes(q);
      return matchWeek || matchDiff || matchPersp;
    });
  }, [memberHistoryList, historySearchQuery]);

  // Groupement des activités pour l'aperçu A4
  const previewGroupedActivities = useMemo(() => {
    if (!previewReportData?.activities) return new Map();
    const byDay = new Map<string, typeof previewReportData.activities>();
    previewReportData.activities.forEach((activity) => {
      const day = dateToWeekDay(activity.date);
      byDay.set(day, [...(byDay.get(day) ?? []), activity]);
    });
    return byDay;
  }, [previewReportData]);

  const kpis = statusData?.kpis || {
    totalMembers: 0,
    submittedCount: 0,
    draftCount: 0,
    notStartedCount: 0,
    completionRate: 0,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* 1. HEADER DIRECTION AVEC CLOCHE DE NOTIFICATIONS */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerBadge}>
            <Feather name="shield" size={12} color="#6366F1" />
            <Text style={styles.headerBadgeText}>ESPACE DIRECTION</Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Rapports de l'Équipe
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            Centralisation, prévisualisation A4 & téléchargement des rapports PDF
          </Text>
        </View>

        {/* Cloche de notifications interactive */}
        <Pressable
          testID="btn-open-notifications"
          onPress={() => setShowNotificationsModal(true)}
          style={({ pressed }) => [
            styles.notificationBellBtn,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="bell" size={20} color={unreadCount > 0 ? '#6366F1' : colors.foreground} />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* 2. SÉLECTEUR DE SEMAINE */}
        <View style={[styles.weekSelectorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            testID="prev-week-btn"
            onPress={() => shiftWeek(-1)}
            style={({ pressed }) => [styles.weekNavBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="chevron-left" size={20} color={colors.foreground} />
          </Pressable>

          <View style={styles.weekCenterBox}>
            <View style={styles.weekLabelRow}>
              <Feather name="calendar" size={15} color="#6366F1" style={{ marginRight: 6 }} />
              <Text style={[styles.weekLabelTitle, { color: colors.foreground }]}>{currentWeekLabel}</Text>
            </View>
            <Text style={[styles.weekSubText, { color: colors.muted }]}>
              {isCurrentWeek ? 'Semaine en cours' : `Semaine du ${selectedWeekStart}`}
            </Text>
          </View>

          <View style={styles.weekRightActions}>
            {!isCurrentWeek && (
              <Pressable
                onPress={() => setSelectedWeekStart(initialWeekRange.start)}
                style={[styles.todayButton, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}
              >
                <Text style={styles.todayButtonText}>Aujourd’hui</Text>
              </Pressable>
            )}
            <Pressable
              testID="next-week-btn"
              onPress={() => shiftWeek(1)}
              style={({ pressed }) => [styles.weekNavBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="chevron-right" size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        {/* 3. KPIS & TABLEAU DE BORD DE LA SEMAINE */}
        <View style={styles.kpiGrid}>
          {/* Taux de complétion */}
          <LinearGradient
            colors={['#4F46E5', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.kpiCard, styles.kpiCardPrimary]}
          >
            <View style={styles.kpiHeaderRow}>
              <Text style={styles.kpiPrimaryLabel}>Taux de Réception des Rapports</Text>
              <View style={styles.kpiIconPillWhite}>
                <Feather name="trending-up" size={14} color="#4F46E5" />
              </View>
            </View>
            <Text style={styles.kpiPrimaryValue}>{kpis.completionRate}%</Text>
            <Text style={styles.kpiPrimarySub}>
              {kpis.submittedCount} rapport{kpis.submittedCount > 1 ? 's' : ''} reçu{kpis.submittedCount > 1 ? 's' : ''} sur {kpis.totalMembers} collaborateurs
            </Text>
            <View style={styles.kpiProgressBarTrack}>
              <View style={[styles.kpiProgressBarFill, { width: `${Math.min(100, kpis.completionRate)}%` }]} />
            </View>
          </LinearGradient>

          {/* Rapports Reçus */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.kpiHeaderRow}>
              <Text style={[styles.kpiLabel, { color: colors.muted }]}>Rapports Reçus (Soumis)</Text>
              <View style={[styles.kpiIconPill, { backgroundColor: '#DCFCE7' }]}>
                <Feather name="check-circle" size={14} color="#16A34A" />
              </View>
            </View>
            <Text style={[styles.kpiValue, { color: '#16A34A' }]}>{kpis.submittedCount}</Text>
            <Text style={[styles.kpiSub, { color: colors.muted }]}>Prêts pour lecture & PDF</Text>
          </View>

          {/* En attente */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.kpiHeaderRow}>
              <Text style={[styles.kpiLabel, { color: colors.muted }]}>En attente de soumission</Text>
              <View style={[styles.kpiIconPill, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="clock" size={14} color="#D97706" />
              </View>
            </View>
            <Text style={[styles.kpiValue, { color: '#D97706' }]}>{kpis.notStartedCount}</Text>
            <Text style={[styles.kpiSub, { color: colors.muted }]}>Non encore transmis</Text>
          </View>

          {/* Effectif total */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.kpiHeaderRow}>
              <Text style={[styles.kpiLabel, { color: colors.muted }]}>Total Collaborateurs</Text>
              <View style={[styles.kpiIconPill, { backgroundColor: '#EEF2FF' }]}>
                <Feather name="users" size={14} color="#6366F1" />
              </View>
            </View>
            <Text style={[styles.kpiValue, { color: colors.foreground }]}>{kpis.totalMembers}</Text>
            <Text style={[styles.kpiSub, { color: colors.muted }]}>Équipe active</Text>
          </View>
        </View>

        {/* 4. BARRE DE RECHERCHE ET FILTRES */}
        <View style={[styles.filterSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.muted} />
            <TextInput
              testID="team-search-input"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher parmi les rapports reçus (nom, pôle, mots-clés)..."
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.foreground }]}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Feather name="x" size={16} color={colors.muted} />
              </Pressable>
            )}
          </View>

          {departments.length > 0 && (
            <View style={styles.filterChipsRow}>
              <Text style={[styles.filterGroupLabel, { color: colors.muted }]}>Pôle :</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsList}>
                <Pressable
                  onPress={() => setDeptFilter('ALL')}
                  style={[
                    styles.filterChip,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    deptFilter === 'ALL' && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: colors.foreground },
                      deptFilter === 'ALL' && { color: '#FFFFFF', fontWeight: '700' },
                    ]}
                  >
                    Tous les départements
                  </Text>
                </Pressable>
                {departments.map((dept) => (
                  <Pressable
                    key={dept}
                    onPress={() => setDeptFilter(dept)}
                    style={[
                      styles.filterChip,
                      { borderColor: colors.border, backgroundColor: colors.background },
                      deptFilter === dept && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: colors.foreground },
                        deptFilter === dept && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      {dept}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* 5. LISTE DES RAPPORTS REÇUS */}
        <View style={styles.listHeaderRow}>
          <Text style={[styles.listSectionTitle, { color: colors.foreground }]}>
            Rapports Reçus ({filteredMembers.length})
          </Text>
          <Text style={[styles.listSectionSubtitle, { color: colors.muted }]}>
            {selectedWeekStart}
          </Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Chargement des rapports reçus…</Text>
          </View>
        ) : filteredMembers.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="file-text" size={42} color={colors.muted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucun rapport reçu pour cette semaine</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Les rapports PDF apparaîtront ici dès que les collaborateurs auront validé et transmis leur compte-rendu hebdomadaire.
            </Text>
          </View>
        ) : (
          <View style={styles.membersGrid}>
            {filteredMembers.map((member) => {
              const isSubmitted = member.status === 'SUBMITTED';
              const isDraft = member.status === 'DRAFT';
              const isNotStarted = member.status === 'NOT_STARTED';
              const isDownloadingThis = downloadingUserId === member.userId;

              return (
                <View
                  key={member.userId}
                  style={[
                    styles.memberCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isSubmitted && styles.memberCardSubmitted,
                  ]}
                >
                  <View style={styles.memberCardHeader}>
                    <View style={styles.memberAvatarRow}>
                      {member.avatarUrl ? (
                        <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />
                      ) : (
                        <View style={[styles.avatarFallback, { backgroundColor: '#6366F1' }]}>
                          <Text style={styles.avatarFallbackText}>
                            {member.fullName
                              ?.split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase() || 'U'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.memberInfoCol}>
                        <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>
                          {member.fullName || 'Collaborateur'}
                        </Text>
                        <View style={styles.memberSubRow}>
                          <View style={[styles.roleBadge, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                            <Text style={styles.roleBadgeText}>{member.role || 'COLLABORATEUR'}</Text>
                          </View>
                          <Text style={[styles.deptText, { color: colors.muted }]} numberOfLines={1}>
                            {member.department || 'Général'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        isSubmitted && { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' },
                        isDraft && { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
                        isNotStarted && { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
                      ]}
                    >
                      <Feather
                        name={isSubmitted ? 'check-circle' : isDraft ? 'clock' : 'alert-circle'}
                        size={12}
                        color={isSubmitted ? '#16A34A' : isDraft ? '#D97706' : '#DC2626'}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isSubmitted && { color: '#16A34A' },
                          isDraft && { color: '#D97706' },
                          isNotStarted && { color: '#DC2626' },
                        ]}
                      >
                        {isSubmitted ? 'Rapport Reçu' : isDraft ? 'Brouillon' : 'Non commencé'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.memberCardBody, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricLabel, { color: colors.muted }]}>Activités saisies</Text>
                      <View style={styles.metricValueRow}>
                        <Feather name="check-square" size={14} color="#6366F1" style={{ marginRight: 4 }} />
                        <Text style={[styles.metricValue, { color: colors.foreground }]}>
                          {member.activitiesCount} activité{member.activitiesCount > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>

                    {isSubmitted && member.submittedAt ? (
                      <View style={styles.metricItem}>
                        <Text style={[styles.metricLabel, { color: colors.muted }]}>Transmis le</Text>
                        <Text style={[styles.metricValue, { color: colors.foreground }]}>
                          {new Date(member.submittedAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {(member.difficulties || member.perspectives) && (
                    <View style={styles.notesExcerptBox}>
                      {member.difficulties ? (
                        <Text style={[styles.notesExcerptText, { color: colors.foreground }]} numberOfLines={1}>
                          <Text style={{ fontWeight: '700', color: '#D97706' }}>Difficultés : </Text>
                          {member.difficulties}
                        </Text>
                      ) : null}
                      {member.perspectives ? (
                        <Text style={[styles.notesExcerptText, { color: colors.foreground, marginTop: 2 }]} numberOfLines={1}>
                          <Text style={{ fontWeight: '700', color: '#059669' }}>Perspectives : </Text>
                          {member.perspectives}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  <View style={styles.memberActionsRow}>
                    <Pressable
                      testID={`preview-btn-${member.userId}`}
                      onPress={() => handleOpenPreview(member)}
                      style={({ pressed }) => [
                        styles.actionButtonPreview,
                        { backgroundColor: '#6366F1', opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <Feather name="eye" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.actionButtonPreviewText}>👁️ Prévisualiser PDF</Text>
                    </Pressable>

                    <Pressable
                      testID={`download-btn-${member.userId}`}
                      onPress={() => handleDirectDownloadPdf(member)}
                      disabled={isDownloadingThis}
                      style={({ pressed }) => [
                        styles.actionButtonDownload,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.card,
                          opacity: pressed || isDownloadingThis ? 0.7 : 1,
                        },
                      ]}
                    >
                      {isDownloadingThis ? (
                        <ActivityIndicator size="small" color="#6366F1" />
                      ) : (
                        <Feather name="download" size={15} color={colors.foreground} />
                      )}
                      <Text style={[styles.actionButtonDownloadText, { color: colors.foreground }]}>
                        {isDownloadingThis ? 'Export…' : '📄 PDF'}
                      </Text>
                    </Pressable>

                    <Pressable
                      testID={`history-btn-${member.userId}`}
                      onPress={() => handleOpenMemberHistory(member)}
                      style={({ pressed }) => [
                        styles.actionButtonHistory,
                        { borderColor: colors.border, backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Feather name="clock" size={15} color={colors.muted} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* MODALE 1 : NOTIFICATIONS DIRECTION */}
      <Modal
        visible={showNotificationsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderTitleRow}>
              <View style={[styles.modalIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                <Feather name="bell" size={18} color="#6366F1" />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Notifications Direction</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                  Réception en temps réel des rapports soumis
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setShowNotificationsModal(false)}
              style={[styles.modalCloseBtn, { backgroundColor: colors.card }]}
            >
              <Feather name="x" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {unreadCount > 0 && (
            <View style={[styles.markAllBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <Text style={[styles.unreadCountText, { color: colors.muted }]}>
                {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
              </Text>
              <Pressable onPress={handleMarkAllNotifsRead} style={styles.markAllBtn}>
                <Feather name="check" size={14} color="#6366F1" style={{ marginRight: 4 }} />
                <Text style={styles.markAllBtnText}>Tout marquer comme lu</Text>
              </Pressable>
            </View>
          )}

          <ScrollView contentContainerStyle={styles.notificationsList}>
            {notifications.length === 0 ? (
              <View style={styles.emptyNotifsBox}>
                <Feather name="bell-off" size={48} color={colors.muted} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucune notification</Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                  Vous serez notifié dès qu'un collaborateur soumettra son rapport hebdomadaire.
                </Text>
              </View>
            ) : (
              notifications.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelectNotification(item)}
                  style={({ pressed }) => [
                    styles.notificationCard,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                    !item.isRead && styles.notificationCardUnread,
                  ]}
                >
                  <View style={styles.notifAvatarBox}>
                    {item.senderAvatar ? (
                      <Image source={{ uri: item.senderAvatar }} style={styles.notifAvatar} />
                    ) : (
                      <View style={[styles.notifAvatarFallback, { backgroundColor: '#6366F1' }]}>
                        <Text style={styles.notifAvatarText}>
                          {item.senderName
                            ?.split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                    {!item.isRead && <View style={styles.unreadDot} />}
                  </View>

                  <View style={styles.notifContentCol}>
                    <View style={styles.notifHeaderRow}>
                      <Text style={[styles.notifSenderName, { color: colors.foreground }]}>{item.senderName}</Text>
                      <Text style={[styles.notifTime, { color: colors.muted }]}>
                        {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Text style={[styles.notifTitle, { color: '#6366F1' }]}>{item.title}</Text>
                    <Text style={[styles.notifMessage, { color: colors.foreground }]}>{item.message}</Text>
                    {item.data?.weekStart && (
                      <View style={styles.notifWeekPill}>
                        <Feather name="calendar" size={11} color="#6366F1" style={{ marginRight: 4 }} />
                        <Text style={styles.notifWeekText}>Semaine du {item.data.weekStart}</Text>
                      </View>
                    )}
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.muted} />
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* MODALE 2 : APERÇU A4 RESPONSIVE DU RAPPORT PDF */}
      <Modal
        visible={Boolean(previewMember)}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setPreviewMember(null);
          setPreviewReportData(null);
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: '#0F172A', paddingTop: insets.top }]}>
          <View style={styles.previewTopBar}>
            <View style={styles.previewTopBarLeft}>
              <Pressable
                onPress={() => {
                  setPreviewMember(null);
                  setPreviewReportData(null);
                }}
                style={styles.previewBackBtn}
              >
                <Feather name="arrow-left" size={20} color="#FFFFFF" />
                <Text style={styles.previewBackBtnText}>Retour</Text>
              </Pressable>
              <View style={styles.previewTitleBox}>
                <Text style={styles.previewTopTitle} numberOfLines={1}>
                  {previewMember?.fullName || 'Rapport Collaborateur'}
                </Text>
                <Text style={styles.previewTopSubtitle}>{currentWeekLabel}</Text>
              </View>
            </View>

            <Pressable
              testID="preview-modal-download-btn"
              onPress={handleExportFromPreview}
              disabled={isExportingPdf || loadingPreview}
              style={({ pressed }) => [
                styles.previewTopDownloadBtn,
                { opacity: pressed || isExportingPdf ? 0.8 : 1 },
              ]}
            >
              {isExportingPdf ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="download" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.previewTopDownloadBtnText}>
                {isExportingPdf ? 'Exportation…' : '📄 Télécharger PDF'}
              </Text>
            </Pressable>
          </View>

          {loadingPreview ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={[styles.loadingText, { color: '#94A3B8' }]}>Génération de l'aperçu A4…</Text>
            </View>
          ) : previewReportData ? (
            <ScrollView contentContainerStyle={styles.previewScrollContent}>
              <View
                style={[
                  styles.paperSheet,
                  { maxWidth: isTablet ? 820 : isCompact ? '100%' : 720 },
                ]}
              >
                <View
                  style={[
                    styles.paperHeaderBanner,
                    { backgroundColor: primaryColor },
                    headerBanner ? { paddingVertical: 0, paddingHorizontal: 0 } : null,
                  ]}
                >
                  {headerBanner ? (
                    <Image source={{ uri: headerBanner }} style={styles.paperBannerImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.paperDefaultHeaderRow}>
                      <Image source={logo} style={styles.paperLogo} />
                      <View style={styles.paperHeaderTitles}>
                        <Text style={styles.paperCompanyName}>{companyName}</Text>
                        <Text style={styles.paperDocSubtitle}>Direction des Opérations & Suivi d'Équipe</Text>
                      </View>
                    </View>
                  )}
                </View>

                <View style={[styles.paperMetaRow, isCompact && { flexDirection: 'column', gap: 12 }]}>
                  <View style={styles.paperMetaLeft}>
                    {previewReportData.profile.avatarUri ? (
                      <Image source={{ uri: previewReportData.profile.avatarUri }} style={styles.paperAvatar} />
                    ) : (
                      <View style={[styles.paperAvatarFallback, { backgroundColor: primaryColor }]}>
                        <Text style={styles.paperAvatarText}>
                          {previewReportData.profile.fullName
                            ?.split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.paperUserCol}>
                      <Text style={styles.paperUserName}>{previewReportData.profile.fullName || 'Collaborateur'}</Text>
                      <View style={styles.paperRoleBadgeRow}>
                        <View style={[styles.paperRoleBadge, { backgroundColor: primaryColor }]}>
                          <Text style={styles.paperRoleText}>{previewReportData.profile.role || 'COLLABORATEUR'}</Text>
                        </View>
                        <Text style={styles.paperDeptText}>{previewReportData.profile.department || 'Général'}</Text>
                      </View>
                      {previewReportData.profile.email ? (
                        <Text style={styles.paperEmailText}>{previewReportData.profile.email}</Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={[styles.paperMetaRight, isCompact && { alignItems: 'flex-start' }]}>
                    <View style={styles.paperDocBadge}>
                      <Text style={styles.paperDocBadgeText}>RAPPORT HEBDOMADAIRE</Text>
                    </View>
                    <Text style={styles.paperPeriodText}>{currentWeekLabel}</Text>
                    <View
                      style={[
                        styles.paperStatusPill,
                        previewReportData.report.status === 'SUBMITTED'
                          ? { backgroundColor: '#DCFCE7' }
                          : { backgroundColor: '#FEF3C7' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.paperStatusPillText,
                          previewReportData.report.status === 'SUBMITTED' ? { color: '#16A34A' } : { color: '#D97706' },
                        ]}
                      >
                        {previewReportData.report.status === 'SUBMITTED' ? '✔ Rapport Transmis' : '⏳ Brouillon'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.paperSectionHeading}>
                  <View style={[styles.paperSectionIcon, { backgroundColor: primaryColor }]}>
                    <Text style={styles.paperSectionIconNumber}>1</Text>
                  </View>
                  <Text style={[styles.paperSectionTitle, { color: primaryColor }]}>Activités & Réalisations</Text>
                  <View style={styles.paperSectionCounter}>
                    <Text style={styles.paperSectionCounterText}>
                      {previewReportData.activities.length} activité{previewReportData.activities.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>

                {previewReportData.activities.length === 0 ? (
                  <View style={styles.paperEmptyDayBox}>
                    <Text style={styles.paperEmptyDayText}>Aucune activité enregistrée pour cette semaine.</Text>
                  </View>
                ) : (
                  WEEK_DAYS.filter((day) => previewGroupedActivities.has(day)).map((day) => {
                    const dayActs = previewGroupedActivities.get(day) ?? [];
                    return (
                      <View key={day} style={styles.paperDayBlock}>
                        <View style={styles.paperDayHeader}>
                          <Text style={styles.paperDayTitle}>{day}</Text>
                          <View style={styles.paperDayBadge}>
                            <Text style={styles.paperDayBadgeText}>
                              {dayActs.length} activité{dayActs.length > 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                        {dayActs.map((act: any) => (
                          <View key={act.id} style={styles.paperActivityEntry}>
                            <View style={styles.paperActivityTitleRow}>
                              <View style={styles.paperActivityBullet} />
                              <Text style={styles.paperActivityTitle}>{act.title}</Text>
                              {act.category ? (
                                <View style={styles.paperCategoryTag}>
                                  <Text style={styles.paperCategoryTagText}>{act.category}</Text>
                                </View>
                              ) : null}
                            </View>
                            {act.description ? <Text style={styles.paperActivityDesc}>{act.description}</Text> : null}
                          </View>
                        ))}
                      </View>
                    );
                  })
                )}

                <View style={[styles.paperSectionHeading, { marginTop: 22 }]}>
                  <View style={[styles.paperSectionIcon, { backgroundColor: '#D97706' }]}>
                    <Text style={styles.paperSectionIconNumber}>2</Text>
                  </View>
                  <Text style={[styles.paperSectionTitle, { color: '#D97706' }]}>Bilan & Difficultés Rencontrées</Text>
                </View>
                <View style={[styles.paperCalloutBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                  <Text style={[styles.paperCalloutTitle, { color: '#92400E' }]}>
                    ⚠️ Points de blocage & vigilances opérationnelles
                  </Text>
                  <Text style={[styles.paperCalloutBody, { color: '#78350F' }]}>
                    {previewReportData.report?.difficulties?.trim()
                      ? previewReportData.report.difficulties
                      : 'Aucun point bloquant majeur signalé pour cette période.'}
                  </Text>
                </View>

                <View style={[styles.paperSectionHeading, { marginTop: 22 }]}>
                  <View style={[styles.paperSectionIcon, { backgroundColor: '#059669' }]}>
                    <Text style={styles.paperSectionIconNumber}>3</Text>
                  </View>
                  <Text style={[styles.paperSectionTitle, { color: '#059669' }]}>
                    Perspectives & Priorités de la Semaine Suivante
                  </Text>
                </View>
                <View style={[styles.paperCalloutBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Text style={[styles.paperCalloutTitle, { color: '#065F46' }]}>
                    🎯 Objectifs stratégiques & livrables attendus
                  </Text>
                  <Text style={[styles.paperCalloutBody, { color: '#064E3B' }]}>
                    {previewReportData.report?.perspectives?.trim()
                      ? previewReportData.report.perspectives
                      : 'Poursuite des activités en cours et alignement avec les objectifs du pôle.'}
                  </Text>
                </View>

                <View style={[styles.paperSignaturesRow, isCompact && { flexDirection: 'column' }]}>
                  <View style={styles.paperSignBox}>
                    <Text style={styles.paperSignLabel}>Collaborateur</Text>
                    <Text style={styles.paperSignName}>{previewReportData.profile.fullName || 'Collaborateur'}</Text>
                    <Text style={styles.paperSignStatusDone}>✔ Document certifié et transmis</Text>
                  </View>
                  <View style={styles.paperSignBox}>
                    <Text style={styles.paperSignLabel}>Visa Direction</Text>
                    <Text style={styles.paperSignPending}>
                      {profile.fullName ? `Revu par ${profile.fullName}` : 'Revu par la Direction'}
                    </Text>
                    <View style={styles.paperSignLine} />
                  </View>
                </View>

                <View style={styles.paperFooter}>
                  <Text style={styles.paperFooterText}>{pdfFooterText}</Text>
                  <Text style={styles.paperFooterDate}>Aperçu Officiel Direction</Text>
                </View>
              </View>

              <View style={styles.previewBottomActionRow}>
                <Pressable
                  onPress={handleExportFromPreview}
                  disabled={isExportingPdf}
                  style={[styles.bigDownloadButton, { backgroundColor: '#6366F1' }]}
                >
                  {isExportingPdf ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Feather name="download" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  )}
                  <Text style={styles.bigDownloadButtonText}>
                    {isExportingPdf ? 'Génération du PDF en cours…' : '📄 Télécharger / Partager ce PDF officiel'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </Modal>

      {/* MODALE 3 : HISTORIQUE COMPLET DES RAPPORTS D'UN COLLABORATEUR */}
      <Modal
        visible={Boolean(historyMember)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setHistoryMember(null);
          setMemberHistoryList([]);
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderTitleRow}>
              <View style={[styles.modalIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                <Feather name="clock" size={18} color="#6366F1" />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  Historique : {historyMember?.fullName}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                  {historyMember?.department || 'Général'} • {memberHistoryList.length} rapport{memberHistoryList.length > 1 ? 's' : ''} archivé{memberHistoryList.length > 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                setHistoryMember(null);
                setMemberHistoryList([]);
              }}
              style={[styles.modalCloseBtn, { backgroundColor: colors.card }]}
            >
              <Feather name="x" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={[styles.historySearchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Feather name="search" size={15} color={colors.muted} />
              <TextInput
                value={historySearchQuery}
                onChangeText={setHistorySearchQuery}
                placeholder="Filtrer par semaine ou mot-clé..."
                placeholderTextColor={colors.muted}
                style={[styles.searchInput, { color: colors.foreground }]}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.historyListContent}>
            {loadingMemberHistory ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={[styles.loadingText, { color: colors.muted }]}>Chargement de l’historique…</Text>
              </View>
            ) : filteredMemberHistory.length === 0 ? (
              <View style={styles.emptyNotifsBox}>
                <Feather name="inbox" size={42} color={colors.muted} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucun rapport dans l'historique</Text>
              </View>
            ) : (
              filteredMemberHistory.map((item) => {
                const isDownloadingThis = downloadingHistoryId === item.id;
                return (
                  <View
                    key={item.id}
                    style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={styles.historyCardHeader}>
                      <View>
                        <Text style={[styles.historyWeekTitle, { color: colors.foreground }]}>
                          {formatWeekLabel(item.weekStart)}
                        </Text>
                        <Text style={[styles.historyDateSubtitle, { color: colors.muted }]}>
                          Semaine du {item.weekStart}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          item.status === 'SUBMITTED'
                            ? { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }
                            : { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            item.status === 'SUBMITTED' ? { color: '#16A34A' } : { color: '#D97706' },
                          ]}
                        >
                          {item.status === 'SUBMITTED' ? 'Rapport Validé' : 'Brouillon'}
                        </Text>
                      </View>
                    </View>

                    {item.difficulties ? (
                      <Text style={[styles.historyExcerpt, { color: colors.foreground }]} numberOfLines={2}>
                        <Text style={{ fontWeight: '700', color: '#D97706' }}>Difficultés : </Text>
                        {item.difficulties}
                      </Text>
                    ) : null}

                    {item.perspectives ? (
                      <Text style={[styles.historyExcerpt, { color: colors.foreground, marginTop: 4 }]} numberOfLines={2}>
                        <Text style={{ fontWeight: '700', color: '#059669' }}>Perspectives : </Text>
                        {item.perspectives}
                      </Text>
                    ) : null}

                    <View style={styles.historyCardFooter}>
                      <Text style={[styles.historyUpdatedText, { color: colors.muted }]}>
                        Modifié le {new Date(item.updatedAt || item.createdAt).toLocaleDateString('fr-FR')}
                      </Text>
                      <Pressable
                        onPress={() => handleDownloadHistoricalItem(item)}
                        disabled={isDownloadingThis}
                        style={[styles.historyDownloadBtn, { backgroundColor: '#6366F1' }]}
                      >
                        {isDownloadingThis ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Feather name="download" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        )}
                        <Text style={styles.historyDownloadBtnText}>
                          {isDownloadingThis ? 'Téléchargement…' : 'Télécharger PDF'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  notificationBellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  weekSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  weekNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCenterBox: {
    alignItems: 'center',
    flex: 1,
  },
  weekLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekLabelTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  weekSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  weekRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  todayButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 150,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  kpiCardPrimary: {
    borderWidth: 0,
    minWidth: '100%',
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kpiPrimaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E0E7FF',
  },
  kpiPrimaryValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  kpiPrimarySub: {
    fontSize: 12,
    color: '#E0E7FF',
    marginTop: 2,
  },
  kpiProgressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  kpiProgressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  kpiIconPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconPillWhite: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  kpiSub: {
    fontSize: 11,
    marginTop: 2,
  },
  filterSection: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterGroupLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipsList: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 10,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  listSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  listSectionSubtitle: {
    fontSize: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyBox: {
    padding: 36,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },
  membersGrid: {
    gap: 12,
  },
  memberCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  memberCardSubmitted: {
    borderColor: '#6366F1',
    borderWidth: 1.5,
  },
  memberCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  memberAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  memberInfoCol: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '800',
  },
  memberSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366F1',
  },
  deptText: {
    fontSize: 11,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  memberCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  notesExcerptBox: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  notesExcerptText: {
    fontSize: 12,
    lineHeight: 16,
  },
  memberActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonPreview: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionButtonPreviewText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  actionButtonDownload: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  actionButtonDownloadText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionButtonHistory: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  unreadCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
  },
  notificationsList: {
    padding: 16,
    gap: 10,
  },
  emptyNotifsBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  notificationCardUnread: {
    borderColor: '#6366F1',
    borderLeftWidth: 4,
  },
  notifAvatarBox: {
    position: 'relative',
  },
  notifAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  notifAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notifContentCol: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  notifSenderName: {
    fontSize: 13,
    fontWeight: '700',
  },
  notifTime: {
    fontSize: 11,
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  notifMessage: {
    fontSize: 12,
    lineHeight: 16,
  },
  notifWeekPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  notifWeekText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
  },
  previewTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  previewTopBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  previewBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  previewBackBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  previewTitleBox: {
    flex: 1,
  },
  previewTopTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  previewTopSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
  },
  previewTopDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  previewTopDownloadBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  previewScrollContent: {
    padding: 16,
    alignItems: 'center',
    gap: 16,
  },
  paperSheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  paperHeaderBanner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '100%',
    overflow: 'hidden',
  },
  paperBannerImage: {
    width: '100%',
    height: 115,
  },
  paperDefaultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paperLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  paperHeaderTitles: {
    flex: 1,
  },
  paperCompanyName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  paperDocSubtitle: {
    color: '#E0E7FF',
    fontSize: 11,
  },
  paperMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  paperMetaLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  paperAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  paperAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  paperUserCol: {
    flex: 1,
  },
  paperUserName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  paperRoleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  paperRoleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paperRoleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  paperDeptText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  paperEmailText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  paperMetaRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  paperDocBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  paperDocBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338CA',
  },
  paperPeriodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  paperStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paperStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  paperSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  paperSectionIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperSectionIconNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  paperSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  paperSectionCounter: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paperSectionCounterText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  paperEmptyDayBox: {
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paperEmptyDayText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  paperDayBlock: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  paperDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  paperDayTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  paperDayBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paperDayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338CA',
  },
  paperActivityEntry: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  paperActivityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paperActivityBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#6366F1',
  },
  paperActivityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  paperCategoryTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  paperCategoryTagText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  paperActivityDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    marginLeft: 11,
    lineHeight: 15,
  },
  paperCalloutBox: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  paperCalloutTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  paperCalloutBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  paperSignaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    gap: 16,
  },
  paperSignBox: {
    flex: 1,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paperSignLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  paperSignName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  paperSignStatusDone: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 2,
  },
  paperSignPending: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  paperSignLine: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginTop: 12,
  },
  paperFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  paperFooterText: {
    fontSize: 10,
    color: '#94A3B8',
    flex: 1,
  },
  paperFooterDate: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  previewBottomActionRow: {
    width: '100%',
    maxWidth: 720,
    marginTop: 8,
    marginBottom: 24,
  },
  bigDownloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bigDownloadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  historySearchBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyListContent: {
    padding: 16,
    gap: 12,
  },
  historyCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  historyWeekTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyDateSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  historyExcerpt: {
    fontSize: 12,
    lineHeight: 16,
  },
  historyCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  historyUpdatedText: {
    fontSize: 11,
  },
  historyDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  historyDownloadBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
