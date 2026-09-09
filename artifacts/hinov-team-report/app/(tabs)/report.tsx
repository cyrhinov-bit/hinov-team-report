import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { apiRequest, AppSettings, ReportHistoryItem } from '@/lib/api';
import { exportAndShareReportPdf } from '@/lib/pdf';
import { WEEK_DAYS, getCurrentWeekRange, dateToWeekDay } from '@/lib/constants';

const logo = require('@/assets/images/htr-logo.jpeg');

function formatWeekLabel(wStart: string) {
  if (!wStart) return 'Période indéfinie';
  const start = new Date(`${wStart}T12:00:00`);
  if (isNaN(start.getTime())) return wStart;
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  return `Du ${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} au ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
}

export default function ReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Breakpoints responsives
  const isSmall = width < 380;
  const isCompact = width < 540;
  const isTabletOrDesktop = width >= 768;

  const { activities, profile, difficulties, perspectives, setDifficulties, setPerspectives } = useAppState();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'history'>('editor');
  const [isImproved, setIsImproved] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [myReportStatus, setMyReportStatus] = useState<'DRAFT' | 'SUBMITTED'>('DRAFT');

  const isSuperAdmin = profile.role?.toUpperCase() === 'SUPERADMIN';

  // Historique personnel & Filtres
  const [historyList, setHistoryList] = useState<ReportHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'DRAFT'>('ALL');
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  const headerBanner = appSettings?.pdfHeaderImage || null;

  useEffect(() => {
    setIsImproved(false);
  }, [difficulties, perspectives]);

  const weekRange = useMemo(() => getCurrentWeekRange(), []);
  const weekStart = weekRange.start;
  const weekEnd = weekRange.end;
  const weekLabel = useMemo(() => {
    return formatWeekLabel(weekStart);
  }, [weekStart]);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setLoadingHistory(true);
    try {
      const data = await apiRequest<ReportHistoryItem[]>('/api/reports/history', { token });
      setHistoryList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Erreur chargement historique:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ difficulties?: string; perspectives?: string; status?: string } | null>(
      `/api/reports?week_start=${weekStart}`,
      { token }
    )
      .then((report) => {
        if (!report) return;
        setDifficulties(report.difficulties ?? '');
        setPerspectives(report.perspectives ?? '');
        if (report.status === 'SUBMITTED') {
          setMyReportStatus('SUBMITTED');
        }
      })
      .catch(() => undefined);

    apiRequest<AppSettings>('/api/app-settings', { token })
      .then((settings) => setAppSettings(settings))
      .catch(() => undefined);

    fetchHistory();
  }, [token, weekStart, setDifficulties, setPerspectives, fetchHistory]);

  const filteredHistory = useMemo(() => {
    return historyList.filter((item) => {
      // 1. Recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDiff = item.difficulties?.toLowerCase().includes(q);
        const matchesPersp = item.perspectives?.toLowerCase().includes(q);
        const matchesWeek = item.weekStart?.toLowerCase().includes(q);
        if (!matchesDiff && !matchesPersp && !matchesWeek) {
          return false;
        }
      }

      // 2. Filtre statut
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [historyList, searchQuery, statusFilter]);

  const grouped = useMemo(() => {
    const byDay = new Map<string, typeof activities>();
    activities
      .filter((activity) => activity.date >= weekStart && activity.date <= weekEnd)
      .forEach((activity) => {
        const day = dateToWeekDay(activity.date);
        byDay.set(day, [...(byDay.get(day) ?? []), activity]);
      });
    return byDay;
  }, [activities, weekStart, weekEnd]);

  const totalActivities = useMemo(() => Array.from(grouped.values()).flat().length, [grouped]);

  const saveReport = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      await apiRequest('/api/reports', {
        method: 'POST',
        token,
        body: { week_start: weekStart, difficulties, perspectives, status: 'SUBMITTED' },
      });
      setMyReportStatus('SUBMITTED');
      fetchHistory();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert('Rapport soumis !', 'Votre rapport hebdomadaire a été transmis avec succès à la Direction.');
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de sauvegarder le rapport.');
    } finally {
      setIsSaving(false);
    }
  };

  const improveWriting = async () => {
    if (!difficulties.trim() && !perspectives.trim()) {
      Alert.alert('Ajoutez du contenu', 'Écrivez au moins une difficulté ou une perspective avant de demander une amélioration.');
      return;
    }
    setIsImproving(true);
    try {
      const improved = await apiRequest<{ difficulties: string; perspectives: string }>('/api/reports/improve', {
        method: 'POST',
        token,
        body: { difficulties, perspectives },
      });
      setDifficulties(improved.difficulties);
      setPerspectives(improved.perspectives);
      setIsImproved(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Amélioration indisponible', error instanceof Error ? error.message : 'Configurez votre clé Gemini dans Paramètres IA.');
    } finally {
      setIsImproving(false);
    }
  };

  const companyName = appSettings?.companyName || 'HINOV GROUP';
  const primaryColor = appSettings?.primaryColor || '#1E3A8A';
  const activeDaysCount = grouped.size;

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportAndShareReportPdf({
        profile: {
          fullName: profile.fullName || 'Collaborateur HINOV',
          email: profile.email || '',
          department: profile.department || 'Général',
          role: profile.role || 'COLLABORATEUR',
          avatarUri: profile.avatarUri,
        },
        weekLabel,
        weekStart,
        activities,
        difficulties,
        perspectives,
        appSettings: {
          id: appSettings?.id || 'default',
          companyName,
          pdfFooterText: appSettings?.pdfFooterText || "HINOV Team Report - Document Confidentiel d'Entreprise",
          primaryColor,
          secondaryColor: appSettings?.secondaryColor || '#4F46E5',
          pdfHeaderImage: headerBanner,
        },
      });
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('Erreur lors de la génération', error instanceof Error ? error.message : 'Impossible de générer le document PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadHistoricReport = async (item: ReportHistoryItem) => {
    setDownloadingReportId(item.id);
    try {
      const itemWeekLabel = formatWeekLabel(item.weekStart);
      const wStart = item.weekStart;
      const startD = new Date(`${wStart}T12:00:00`);
      const endD = new Date(startD);
      endD.setDate(endD.getDate() + 4);
      const endStr = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;
      const weekActs = activities.filter((a) => a.date >= wStart && a.date <= endStr);

      await exportAndShareReportPdf({
        profile: {
          fullName: profile.fullName || 'Collaborateur HINOV',
          email: profile.email || '',
          department: profile.department || 'Général',
          role: profile.role || 'COLLABORATEUR',
          avatarUri: profile.avatarUri,
        },
        weekLabel: itemWeekLabel,
        weekStart: item.weekStart,
        activities: weekActs,
        difficulties: item.difficulties,
        perspectives: item.perspectives,
        appSettings: {
          id: appSettings?.id || 'default',
          companyName,
          pdfFooterText: appSettings?.pdfFooterText || "HINOV Team Report - Document Confidentiel d'Entreprise",
          primaryColor,
          secondaryColor: appSettings?.secondaryColor || '#4F46E5',
          pdfHeaderImage: headerBanner,
        },
      });
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de télécharger ce rapport.');
    } finally {
      setDownloadingReportId(null);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 8, 16),
          paddingBottom: insets.bottom + 90,
          paddingHorizontal: isTabletOrDesktop ? 32 : isSmall ? 12 : 16,
        },
      ]}
    >
      <View style={[styles.mainWrapper, { maxWidth: isTabletOrDesktop ? 820 : '100%' }]}>
        
        {/* En-tête principal : Mon Rapport Personnel */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.ai }]}>DOCUMENT DE LA SEMAINE</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Mon rapport</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{weekLabel}</Text>
          </View>
          <View style={styles.headerActions}>
            <Image
              source={profile.avatarUri ? { uri: profile.avatarUri } : logo}
              style={[styles.headerAvatar, { borderColor: colors.border }]}
            />
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: myReportStatus === 'SUBMITTED' ? '#DEF7EC' : colors.orangeSoft,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: myReportStatus === 'SUBMITTED' ? '#03543F' : colors.warning },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: myReportStatus === 'SUBMITTED' ? '#03543F' : colors.warning },
                ]}
              >
                {myReportStatus === 'SUBMITTED' ? 'Validé / Transmis' : 'Brouillon'}
              </Text>
            </View>
          </View>
        </View>

        {/* Sélecteur de Mode : 3 Onglets (Rédaction, Aperçu Direct, Historique) */}
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            testID="tab-editor"
            onPress={() => setActiveTab('editor')}
            style={[styles.tabButton, activeTab === 'editor' && { backgroundColor: colors.blueSoft }]}
          >
            <Feather name="edit-3" size={14} color={activeTab === 'editor' ? colors.primary : colors.mutedForeground} />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: activeTab === 'editor' ? colors.primary : colors.mutedForeground,
                  fontWeight: activeTab === 'editor' ? '700' : '500',
                  fontSize: isSmall ? 11 : 12,
                },
              ]}
            >
              Rédaction
            </Text>
          </Pressable>

          <Pressable
            testID="tab-preview"
            onPress={() => setActiveTab('preview')}
            style={[styles.tabButton, activeTab === 'preview' && { backgroundColor: colors.blueSoft }]}
          >
            <Feather name="eye" size={14} color={activeTab === 'preview' ? colors.primary : colors.mutedForeground} />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: activeTab === 'preview' ? colors.primary : colors.mutedForeground,
                  fontWeight: activeTab === 'preview' ? '700' : '500',
                  fontSize: isSmall ? 11 : 12,
                },
              ]}
            >
              Aperçu PDF
            </Text>
            <View style={styles.liveDot} />
          </Pressable>

          <Pressable
            testID="tab-history"
            onPress={() => {
              setActiveTab('history');
              fetchHistory();
            }}
            style={[styles.tabButton, activeTab === 'history' && { backgroundColor: colors.blueSoft }]}
          >
            <Feather name="archive" size={14} color={activeTab === 'history' ? colors.primary : colors.mutedForeground} />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: activeTab === 'history' ? colors.primary : colors.mutedForeground,
                  fontWeight: activeTab === 'history' ? '700' : '500',
                  fontSize: isSmall ? 11 : 12,
                },
              ]}
            >
              Historique
            </Text>
            {historyList.length > 0 ? (
              <View style={[styles.historyCountBadge, { backgroundColor: activeTab === 'history' ? colors.primary : colors.muted }]}>
                <Text style={[styles.historyCountBadgeText, { color: activeTab === 'history' ? colors.primaryForeground : colors.foreground }]}>
                  {historyList.length}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* ========================================================================= */}
        {/* MODE 1 : ÉDITEUR (RÉDACTION)                                              */}
        {/* ========================================================================= */}
        {activeTab === 'editor' ? (
          <View style={styles.contentColumn}>
            {/* Bannière d'accès direct à l'aperçu PDF évolutif */}
            <Pressable
              testID="jump-to-preview-banner"
              onPress={() => setActiveTab('preview')}
              style={({ pressed }) => [
                styles.previewBannerCard,
                { backgroundColor: colors.card, borderColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.previewBannerIcon, { backgroundColor: colors.blueSoft }]}>
                <Feather name="file-text" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.previewBadgeRow}>
                  <Text style={[styles.previewBadgeText, { color: colors.primary }]}>APERÇU ÉVOLUTIF EN DIRECT</Text>
                  <View style={styles.liveDotMini} />
                </View>
                <Text style={[styles.previewBannerTitle, { color: colors.foreground }]}>
                  Visualiser le rendu final du PDF
                </Text>
                <Text style={[styles.previewBannerSubtitle, { color: colors.mutedForeground }]}>
                  {totalActivities} activité{totalActivities > 1 ? 's' : ''} sur {activeDaysCount} jour{activeDaysCount > 1 ? 's' : ''} renseigné{activeDaysCount > 1 ? 's' : ''}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </Pressable>

            {/* Pour le Superadmin : Raccourci vers les Paramètres d'application */}
            {isSuperAdmin ? (
              <Pressable
                testID="superadmin-settings-hint"
                onPress={() => router.push({ pathname: '/users', params: { openSettings: 'true' } })}
                style={({ pressed }) => [
                  styles.superadminSettingsHintCard,
                  { backgroundColor: colors.card, borderColor: colors.warning, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <View style={[styles.superadminIconWrap, { backgroundColor: colors.orangeSoft }]}>
                  <Feather name="sliders" size={17} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.superadminHintTitle, { color: colors.foreground }]}>
                    Paramètres de l'application (Superadmin)
                  </Text>
                  <Text style={[styles.superadminHintSub, { color: colors.mutedForeground }]}>
                    {headerBanner
                      ? "Bannière d'en-tête personnalisée active pour toute l'entreprise."
                      : "Personnalisez la bannière d'en-tête du PDF pour toute l'équipe."}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            ) : null}

            {/* Section 1 : Activités de la semaine (Lecture seule synthétique) */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconWrap, { backgroundColor: colors.blueSoft }]}>
                  <Feather name="check-square" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Activités de la semaine</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
                    {totalActivities} activité{totalActivities > 1 ? 's' : ''} enregistrée{totalActivities > 1 ? 's' : ''}
                  </Text>
                </View>
                <Pressable
                  testID="edit-activities-btn"
                  onPress={() => router.push('/activities')}
                  style={({ pressed }) => [
                    styles.editActivitiesBtn,
                    { backgroundColor: colors.blueSoft, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Feather name="plus" size={14} color={colors.primary} />
                  <Text style={[styles.editActivitiesText, { color: colors.primary }]}>Gérer</Text>
                </Pressable>
              </View>

              {grouped.size === 0 ? (
                <View style={[styles.emptyBox, { borderColor: colors.border }]}>
                  <Feather name="inbox" size={32} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    Aucune activité enregistrée pour cette semaine.
                  </Text>
                  <Pressable
                    testID="empty-add-activity-btn"
                    onPress={() => router.push('/activities')}
                    style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                  >
                    <Feather name="plus" size={14} color={colors.primaryForeground} />
                    <Text style={[styles.emptyAddBtnText, { color: colors.primaryForeground }]}>
                      Ajouter une activité
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.daysList}>
                  {WEEK_DAYS.filter((day) => grouped.has(day)).map((day) => {
                    const dayActs = grouped.get(day) ?? [];
                    return (
                      <View key={day} style={[styles.dayCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <View style={styles.dayCardHeader}>
                          <Text style={[styles.dayTitle, { color: colors.foreground }]}>{day}</Text>
                          <View style={[styles.dayBadge, { backgroundColor: colors.blueSoft }]}>
                            <Text style={[styles.dayBadgeText, { color: colors.primary }]}>
                              {dayActs.length}
                            </Text>
                          </View>
                        </View>
                        {dayActs.map((act) => (
                          <View key={act.id} style={styles.activityItem}>
                            <View style={[styles.activityBullet, { backgroundColor: colors.primary }]} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.activityTitle, { color: colors.foreground }]}>{act.title}</Text>
                              {act.description ? (
                                <Text style={[styles.activityDesc, { color: colors.mutedForeground }]}>
                                  {act.description}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Section 2 : Difficultés rencontrées */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconWrap, { backgroundColor: colors.orangeSoft }]}>
                  <Feather name="alert-triangle" size={18} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Difficultés rencontrées</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
                    Points bloquants ou vigilances de la semaine
                  </Text>
                </View>
              </View>
              <TextInput
                testID="difficulties-input"
                value={difficulties}
                onChangeText={setDifficulties}
                placeholder="Ex : Retard sur la validation du cahier des charges client, indisponibilité temporaire du serveur..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
                style={[
                  styles.textArea,
                  { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border },
                ]}
              />
            </View>

            {/* Section 3 : Perspectives & Priorités */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconWrap, { backgroundColor: colors.greenSoft }]}>
                  <Feather name="target" size={18} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Perspectives</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
                    Priorités et objectifs pour la semaine prochaine
                  </Text>
                </View>
              </View>
              <TextInput
                testID="perspectives-input"
                value={perspectives}
                onChangeText={setPerspectives}
                placeholder="Ex : Finaliser la refonte du module de facturation, animer la revue d'équipe mardi..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
                style={[
                  styles.textArea,
                  { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border },
                ]}
              />
            </View>

            {/* Actions & Amélioration IA */}
            <View style={styles.actionSection}>
              <Pressable
                testID="ai-improve-btn"
                onPress={improveWriting}
                disabled={isImproving}
                style={({ pressed }) => [
                  styles.aiButton,
                  { opacity: pressed || isImproving ? 0.8 : 1 },
                ]}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#6D28D9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.aiButtonGradient}
                >
                  {isImproving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Feather name="zap" size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.aiButtonText}>
                    {isImproving ? 'Optimisation en cours…' : '✨ Améliorer la rédaction avec Gemini'}
                  </Text>
                </LinearGradient>
              </Pressable>

              {isImproved && (
                <View style={[styles.improvedBanner, { backgroundColor: colors.greenSoft, borderColor: colors.success }]}>
                  <Feather name="check" size={14} color={colors.success} />
                  <Text style={[styles.improvedBannerText, { color: colors.success }]}>
                    Texte enrichi et corrigé avec succès par l'IA !
                  </Text>
                </View>
              )}

              {/* Bouton de Soumission & Exportation */}
              <View style={styles.bottomButtonsRow}>
                <Pressable
                  testID="submit-report-btn"
                  onPress={saveReport}
                  disabled={isSaving}
                  style={({ pressed }) => [
                    styles.submitReportBtn,
                    { backgroundColor: colors.primary, opacity: pressed || isSaving ? 0.8 : 1 },
                  ]}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Feather name="send" size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.submitReportBtnText}>
                    {isSaving ? 'Envoi…' : '✔ Soumettre mon rapport'}
                  </Text>
                </Pressable>

                <Pressable
                  testID="preview-pdf-btn"
                  onPress={() => setActiveTab('preview')}
                  style={({ pressed }) => [
                    styles.previewPdfBtn,
                    { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Feather name="eye" size={16} color={colors.foreground} />
                  <Text style={[styles.previewPdfBtnText, { color: colors.foreground }]}>
                    Aperçu A4
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : activeTab === 'preview' ? (
          /* ========================================================================= */
          /* MODE 2 : APERÇU PDF A4 RESPONSIVE EN DIRECT                               */
          /* ========================================================================= */
          <View style={styles.contentColumn}>
            <View style={styles.paperSheet}>
              {/* En-tête officiel */}
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
                      <Text style={styles.paperDocSubtitle}>Rapport d'Activités Hebdomadaire</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Métadonnées collaborateur */}
              <View style={[styles.paperMetaRow, isCompact && { flexDirection: 'column', gap: 12 }]}>
                <View style={styles.paperMetaLeft}>
                  {profile.avatarUri ? (
                    <Image source={{ uri: profile.avatarUri }} style={styles.paperAvatar} />
                  ) : (
                    <View style={[styles.paperAvatarFallback, { backgroundColor: primaryColor }]}>
                      <Text style={styles.paperAvatarText}>
                        {profile.fullName
                          ?.split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.paperUserCol}>
                    <Text style={styles.paperUserName}>{profile.fullName || 'Collaborateur HINOV'}</Text>
                    <View style={styles.paperRoleBadgeRow}>
                      <View style={[styles.paperRoleBadge, { backgroundColor: primaryColor }]}>
                        <Text style={styles.paperRoleText}>{profile.role || 'COLLABORATEUR'}</Text>
                      </View>
                      <Text style={styles.paperDeptText}>{profile.department || 'Général'}</Text>
                    </View>
                    {profile.email ? <Text style={styles.paperEmailText}>{profile.email}</Text> : null}
                  </View>
                </View>

                <View style={[styles.paperMetaRight, isCompact && styles.paperMetaRightCompact]}>
                  <View style={styles.paperDocBadge}>
                    <Text style={styles.paperDocBadgeText}>RAPPORT HEBDOMADAIRE</Text>
                  </View>
                  <Text style={styles.paperPeriodText}>{weekLabel}</Text>
                </View>
              </View>

              {/* Section 1 : Activités */}
              <View style={styles.paperSectionHeading}>
                <View style={[styles.paperSectionIcon, { backgroundColor: primaryColor }]}>
                  <Text style={styles.paperSectionIconNumber}>1</Text>
                </View>
                <Text style={[styles.paperSectionTitle, { color: primaryColor }]}>Activités & Réalisations</Text>
                <View style={styles.paperSectionCounter}>
                  <Text style={styles.paperSectionCounterText}>
                    {totalActivities} activité{totalActivities > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {grouped.size === 0 ? (
                <View style={styles.paperEmptyDayBox}>
                  <Text style={styles.paperEmptyDayText}>
                    Aucune activité enregistrée pour le moment cette semaine.
                  </Text>
                </View>
              ) : (
                WEEK_DAYS.filter((day) => grouped.has(day)).map((day) => {
                  const dayActs = grouped.get(day) ?? [];
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
                      {dayActs.map((act) => (
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

              {/* Section 2 : Difficultés */}
              <View style={[styles.paperSectionHeading, { marginTop: 22 }]}>
                <View style={[styles.paperSectionIcon, { backgroundColor: '#D97706' }]}>
                  <Text style={styles.paperSectionIconNumber}>2</Text>
                </View>
                <Text style={[styles.paperSectionTitle, { color: '#D97706' }]}>
                  Bilan & Difficultés Rencontrées
                </Text>
              </View>
              <View style={[styles.paperCalloutBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <Text style={[styles.paperCalloutTitle, { color: '#92400E' }]}>
                  ⚠️ Points de blocage & vigilances opérationnelles
                </Text>
                <Text style={[styles.paperCalloutBody, { color: '#78350F' }]}>
                  {difficulties.trim() ? difficulties : 'Aucun point bloquant majeur signalé pour cette période.'}
                </Text>
              </View>

              {/* Section 3 : Perspectives */}
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
                  {perspectives.trim()
                    ? perspectives
                    : 'Poursuite des tâches en cours et alignement avec les objectifs du pôle.'}
                </Text>
              </View>

              {/* Section 4 : Signatures */}
              <View style={[styles.paperSignaturesRow, isCompact && { flexDirection: 'column' }]}>
                <View style={styles.paperSignBox}>
                  <Text style={styles.paperSignLabel}>Collaborateur</Text>
                  <Text style={styles.paperSignName}>{profile.fullName || 'Collaborateur'}</Text>
                  <Text style={styles.paperSignStatusDone}>✔ Document certifié et transmis</Text>
                </View>
                <View style={styles.paperSignBox}>
                  <Text style={styles.paperSignLabel}>Visa Hiérarchique / Direction</Text>
                  <Text style={styles.paperSignPending}>En attente de revue</Text>
                  <View style={styles.paperSignLine} />
                </View>
              </View>

              {/* Footer */}
              <View style={styles.paperFooter}>
                <Text style={styles.paperFooterText}>
                  {appSettings?.pdfFooterText || "HINOV Team Report - Document Confidentiel d'Entreprise"}
                </Text>
                <Text style={styles.paperFooterDate}>Aperçu Officiel</Text>
              </View>
            </View>

            {/* Actions aperçu */}
            <View style={styles.previewActionStack}>
              <Pressable
                testID="preview-export-btn"
                onPress={handleExportPdf}
                disabled={isExportingPdf || isSaving}
                style={({ pressed }) => [
                  styles.exportPdfButton,
                  { backgroundColor: colors.primary, opacity: pressed || isExportingPdf ? 0.85 : 1 },
                ]}
              >
                {isExportingPdf ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="download" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.exportPdfText}>
                  {isExportingPdf ? 'Génération du PDF…' : '📄 Télécharger / Partager ce PDF'}
                </Text>
              </Pressable>

              <Pressable
                testID="back-to-editor-btn"
                onPress={() => setActiveTab('editor')}
                style={({ pressed }) => [
                  styles.saveDraftButton,
                  { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Feather name="edit-3" size={16} color={colors.foreground} />
                <Text style={[styles.saveDraftText, { color: colors.foreground }]}>
                  ✏️ Modifier le contenu du rapport
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* ========================================================================= */
          /* MODE 3 : MON HISTORIQUE PERSONNEL DES RAPPORTS                            */
          /* ========================================================================= */
          <View style={styles.contentColumn}>
            {/* Barre de recherche */}
            <View style={[styles.historySearchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.primary} />
              <TextInput
                testID="history-search-input"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher dans mes rapports (semaine, difficultés, perspectives)..."
                placeholderTextColor={colors.mutedForeground}
                style={[styles.historySearchInput, { color: colors.foreground }]}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Feather name="x-circle" size={16} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>

            {/* Filtres de statut */}
            <View style={styles.historyFiltersSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
                {[
                  { key: 'ALL', label: 'Tous mes rapports' },
                  { key: 'SUBMITTED', label: '✔ Validés / Transmis' },
                  { key: 'DRAFT', label: '⏳ Brouillons' },
                ].map((st) => {
                  const isSelected = statusFilter === st.key;
                  return (
                    <Pressable
                      key={st.key}
                      onPress={() => setStatusFilter(st.key as any)}
                      style={[
                        styles.filterPill,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          { color: isSelected ? colors.primaryForeground : colors.foreground, fontWeight: isSelected ? '700' : '500' },
                        ]}
                      >
                        {st.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* KPI Cards Strip */}
            <View style={styles.kpiHistoryRow}>
              <View style={[styles.kpiHistoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.kpiHistoryNumber, { color: colors.primary }]}>{filteredHistory.length}</Text>
                <Text style={[styles.kpiHistoryLabel, { color: colors.mutedForeground }]}>
                  {filteredHistory.length > 1 ? 'Rapports' : 'Rapport'}
                </Text>
              </View>
              <View style={[styles.kpiHistoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.kpiHistoryNumber, { color: '#059669' }]}>
                  {filteredHistory.filter((h) => h.status === 'SUBMITTED').length}
                </Text>
                <Text style={[styles.kpiHistoryLabel, { color: colors.mutedForeground }]}>Validés & Transmis</Text>
              </View>
              <View style={[styles.kpiHistoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.kpiHistoryNumber, { color: colors.ai }]}>
                  {filteredHistory.reduce((sum, h) => sum + (h.activitiesCount || 0), 0)}
                </Text>
                <Text style={[styles.kpiHistoryLabel, { color: colors.mutedForeground }]}>Activités au total</Text>
              </View>
            </View>

            {/* Chargement ou Contenu */}
            {loadingHistory ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                  Chargement de votre historique...
                </Text>
              </View>
            ) : filteredHistory.length === 0 ? (
              <View style={[styles.emptyHistoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.emptyHistoryIconWrap, { backgroundColor: colors.blueSoft }]}>
                  <Feather name="folder" size={28} color={colors.primary} />
                </View>
                <Text style={[styles.emptyHistoryTitle, { color: colors.foreground }]}>
                  Aucun rapport dans l'historique
                </Text>
                <Text style={[styles.emptyHistorySubtitle, { color: colors.mutedForeground }]}>
                  Vos rapports hebdomadaires enregistrés et validés apparaîtront automatiquement ici.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12, marginTop: 4 }}>
                {filteredHistory.map((item) => {
                  const isSubmitted = item.status === 'SUBMITTED';
                  const isDownloading = downloadingReportId === item.id;
                  const itemWeekLabel = formatWeekLabel(item.weekStart);

                  return (
                    <View
                      key={item.id}
                      style={[styles.historyItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <View style={styles.historyCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.historyPeriodRow}>
                            <Feather name="calendar" size={13} color={colors.primary} />
                            <Text style={[styles.historyPeriodText, { color: colors.foreground }]}>
                              {itemWeekLabel}
                            </Text>
                          </View>
                          <Text style={[styles.historyWeekSubtitle, { color: colors.mutedForeground }]}>
                            Semaine du {item.weekStart}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.historyStatusBadge,
                            {
                              backgroundColor: isSubmitted ? '#DEF7EC' : colors.orangeSoft,
                              borderColor: isSubmitted ? '#84E1BC' : colors.warning,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.historyStatusText,
                              { color: isSubmitted ? '#03543F' : colors.warning },
                            ]}
                          >
                            {isSubmitted ? '✔ Transmis' : '⏳ Brouillon'}
                          </Text>
                        </View>
                      </View>

                      {/* Difficultés & Perspectives */}
                      {item.difficulties ? (
                        <Text style={[styles.historyExcerptText, { color: colors.foreground }]} numberOfLines={2}>
                          <Text style={{ fontWeight: '700', color: '#D97706' }}>Difficultés : </Text>
                          {item.difficulties}
                        </Text>
                      ) : null}

                      {item.perspectives ? (
                        <Text style={[styles.historyExcerptText, { color: colors.foreground, marginTop: 4 }]} numberOfLines={2}>
                          <Text style={{ fontWeight: '700', color: '#059669' }}>Perspectives : </Text>
                          {item.perspectives}
                        </Text>
                      ) : null}

                      {/* Actions */}
                      <View style={styles.historyCardFooter}>
                        <Text style={[styles.historyActivitiesBadgeText, { color: colors.mutedForeground }]}>
                          {item.activitiesCount ?? 0} activité{(item.activitiesCount ?? 0) > 1 ? 's' : ''}
                        </Text>
                        <Pressable
                          onPress={() => handleDownloadHistoricReport(item)}
                          disabled={isDownloading}
                          style={[styles.historyDownloadActionBtn, { backgroundColor: colors.primary }]}
                        >
                          {isDownloading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Feather name="download" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                          )}
                          <Text style={styles.historyDownloadActionText}>
                            {isDownloading ? 'Téléchargement…' : 'Télécharger PDF'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
  },
  mainWrapper: {
    width: '100%',
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonText: {
    fontSize: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  historyCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  historyCountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  contentColumn: {
    gap: 14,
  },
  previewBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  previewBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  previewBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  liveDotMini: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  previewBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewBannerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  superadminSettingsHintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  superadminIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  superadminHintTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  superadminHintSub: {
    fontSize: 10,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11,
  },
  editActivitiesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editActivitiesText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  daysList: {
    gap: 8,
  },
  dayCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  dayBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 2,
  },
  activityBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionSection: {
    gap: 10,
  },
  aiButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  aiButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  improvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  improvedBannerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  submitReportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  submitReportBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  previewPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  previewPdfBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Aperçu papier A4
  paperSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
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
    fontSize: 16,
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
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paperMetaLeft: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  paperAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  paperAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  paperUserCol: {
    flex: 1,
  },
  paperUserName: {
    fontSize: 15,
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
    fontSize: 11,
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
  paperMetaRightCompact: {
    alignItems: 'flex-start',
  },
  paperDocBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paperDocBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338CA',
  },
  paperPeriodText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  paperSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 6,
    gap: 8,
  },
  paperSectionIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperSectionIconNumber: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  paperSectionTitle: {
    fontSize: 13,
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
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  paperEmptyDayBox: {
    marginHorizontal: 14,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paperEmptyDayText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  paperDayBlock: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  paperDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  paperDayTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  paperDayBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  paperDayBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4338CA',
  },
  paperActivityEntry: {
    padding: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  paperActivityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paperActivityBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6366F1',
  },
  paperActivityTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  paperCategoryTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  paperCategoryTagText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  paperActivityDesc: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
    marginLeft: 10,
  },
  paperCalloutBox: {
    marginHorizontal: 14,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  paperCalloutTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 3,
  },
  paperCalloutBody: {
    fontSize: 11,
    lineHeight: 15,
  },
  paperSignaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginTop: 18,
    marginBottom: 12,
    gap: 12,
  },
  paperSignBox: {
    flex: 1,
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paperSignLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  paperSignName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  paperSignStatusDone: {
    fontSize: 9,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 2,
  },
  paperSignPending: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontStyle: 'italic',
  },
  paperSignLine: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginTop: 10,
  },
  paperFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  paperFooterText: {
    fontSize: 9,
    color: '#94A3B8',
    flex: 1,
  },
  paperFooterDate: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
  },
  previewActionStack: {
    gap: 8,
  },
  exportPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  exportPdfText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  saveDraftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  saveDraftText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Historique personnel
  historySearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  historySearchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  historyFiltersSection: {
    gap: 6,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
  },
  kpiHistoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiHistoryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  kpiHistoryNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  kpiHistoryLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyHistoryCard: {
    padding: 30,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyHistorySubtitle: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  historyItemCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  historyPeriodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  historyPeriodText: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyWeekSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  historyStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  historyExcerptText: {
    fontSize: 11,
    lineHeight: 15,
  },
  historyCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  historyActivitiesBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyDownloadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  historyDownloadActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
