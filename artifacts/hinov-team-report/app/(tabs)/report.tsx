import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
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
import { apiRequest, AppSettings } from '@/lib/api';
import { exportAndShareReportPdf } from '@/lib/pdf';
import { WEEK_DAYS, getCurrentWeekRange, dateToWeekDay } from '@/lib/constants';

const logo = require('@/assets/images/htr-logo.jpeg');

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
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isImproved, setIsImproved] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  const isSuperAdmin = profile.role?.toUpperCase() === 'SUPERADMIN';
  const headerBanner = appSettings?.pdfHeaderImage || null;

  useEffect(() => {
    setIsImproved(false);
  }, [difficulties, perspectives]);

  const weekRange = useMemo(() => getCurrentWeekRange(), []);
  const weekStart = weekRange.start;
  const weekEnd = weekRange.end;
  const weekLabel = useMemo(() => {
    const start = new Date(`${weekStart}T12:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 4);
    return `Du ${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} au ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
  }, [weekStart]);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ difficulties?: string; perspectives?: string } | null>(`/api/reports?week_start=${weekStart}`, { token })
      .then((report) => {
        if (!report) return;
        setDifficulties(report.difficulties ?? '');
        setPerspectives(report.perspectives ?? '');
      })
      .catch(() => undefined);

    apiRequest<AppSettings>('/api/app-settings', { token })
      .then((settings) => setAppSettings(settings))
      .catch(() => undefined);
  }, [token, weekStart, setDifficulties, setPerspectives]);

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
        body: { week_start: weekStart, difficulties, perspectives },
      });
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
      await saveReport();
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Erreur lors de la génération', error instanceof Error ? error.message : 'Impossible de générer le document PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + 18,
        paddingBottom: insets.bottom + 120,
        paddingHorizontal: isTabletOrDesktop ? 28 : 14,
        alignItems: 'center',
      }}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
    >
      {/* Conteneur principal centré responsive */}
      <View style={[styles.mainWrapper, { maxWidth: isTabletOrDesktop ? 820 : '100%' }]}>
        
        {/* En-tête principal */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.ai }]}>DOCUMENT DE LA SEMAINE</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Mon rapport</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{weekLabel}</Text>
          </View>
          <View style={styles.headerActions}>
            <Image source={profile.avatarUri ? { uri: profile.avatarUri } : logo} style={[styles.headerAvatar, { borderColor: colors.border }]} />
            <View style={[styles.statusPill, { backgroundColor: colors.orangeSoft }]}>
              <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.statusText, { color: colors.warning }]}>Brouillon</Text>
            </View>
          </View>
        </View>

        {/* Sélecteur de Mode : Rédaction vs Aperçu Direct PDF */}
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            testID="tab-editor"
            onPress={() => setActiveTab('editor')}
            style={[styles.tabButton, activeTab === 'editor' && { backgroundColor: colors.blueSoft }]}
          >
            <Feather name="edit-3" size={15} color={activeTab === 'editor' ? colors.primary : colors.mutedForeground} />
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
              Mode Rédaction
            </Text>
          </Pressable>

          <Pressable
            testID="tab-preview"
            onPress={() => setActiveTab('preview')}
            style={[styles.tabButton, activeTab === 'preview' && { backgroundColor: colors.blueSoft }]}
          >
            <Feather name="eye" size={15} color={activeTab === 'preview' ? colors.primary : colors.mutedForeground} />
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
              Aperçu PDF Direct
            </Text>
            <View style={styles.liveDot} />
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

            <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.progressTop}>
                <View>
                  <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>ÉTAT DE PRÉPARATION</Text>
                  <Text style={[styles.progressTitle, { color: colors.foreground }]}>
                    {totalActivities} activité{totalActivities > 1 ? 's' : ''} intégrée{totalActivities > 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={[styles.reportIcon, { backgroundColor: colors.purpleSoft }]}>
                  <Feather name="check-circle" size={19} color={colors.ai} />
                </View>
              </View>
              <View style={[styles.track, { backgroundColor: colors.muted }]}>
                <View style={[styles.trackFill, { backgroundColor: colors.ai, width: difficulties || perspectives ? '78%' : '45%' }]} />
              </View>
              <Text style={[styles.progressHint, { color: colors.mutedForeground }]}>
                {difficulties || perspectives ? 'Presque prêt à être relu' : 'Ajoutez vos difficultés et perspectives'}
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Activités par jour</Text>
            {grouped.size === 0 ? (
              <View style={[styles.dayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyDay, { color: colors.mutedForeground }]}>
                  Aucune activité enregistrée cette semaine. Ajoutez-en via l'onglet Activités.
                </Text>
              </View>
            ) : (
              WEEK_DAYS.filter((day) => grouped.has(day)).map((day) => {
                const dayActivities = grouped.get(day) ?? [];
                return (
                  <View key={day} style={[styles.dayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.dayHeader}>
                      <Text style={[styles.dayName, { color: colors.foreground }]}>{day}</Text>
                      <Text style={[styles.dayCount, { color: colors.primary }]}>
                        {dayActivities.length} activité{dayActivities.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                    {dayActivities.map((activity) => (
                      <View key={activity.id} style={styles.reportActivity}>
                        <View style={[styles.reportBullet, { backgroundColor: colors.primary }]} />
                        <View style={styles.reportActivityCopy}>
                          <Text style={[styles.reportActivityTitle, { color: colors.foreground }]}>{activity.title}</Text>
                          <Text style={[styles.reportActivityDescription, { color: colors.mutedForeground }]}>
                            {activity.description}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })
            )}

            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Bilan de la semaine</Text>
              <Pressable
                testID="improve-report"
                onPress={improveWriting}
                disabled={isImproving}
                style={({ pressed }) => [styles.aiButton, { backgroundColor: colors.purpleSoft, opacity: pressed ? 0.75 : 1 }]}
              >
                <Feather name="zap" size={14} color={colors.ai} />
                <Text style={[styles.aiButtonText, { color: colors.ai }]}>{isImproving ? 'Analyse…' : 'Améliorer'}</Text>
              </Pressable>
            </View>
            {isImproved ? <Text style={[styles.improvedNote, { color: colors.success }]}>Suggestion améliorée appliquée à votre brouillon.</Text> : null}
            
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Difficultés rencontrées</Text>
            <TextInput
              testID="difficulties-input"
              value={difficulties}
              onChangeText={setDifficulties}
              multiline
              placeholder="Décrivez les points qui ont ralenti votre semaine..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]}
            />
            
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Perspectives et priorités</Text>
            <TextInput
              testID="perspectives-input"
              value={perspectives}
              onChangeText={setPerspectives}
              multiline
              placeholder="Quelles sont vos priorités pour la semaine prochaine ?"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]}
            />

            <View style={styles.buttonStack}>
              <Pressable
                testID="export-pdf-report"
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
                  <Feather name="file-text" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.exportPdfText}>
                  {isExportingPdf ? 'Génération du PDF…' : '📄 Télécharger / Partager le PDF'}
                </Text>
              </Pressable>

              <Pressable
                testID="save-draft-report"
                onPress={async () => {
                  try {
                    await saveReport();
                    Alert.alert('Rapport sauvegardé', 'Vos modifications ont bien été enregistrées dans Supabase.');
                  } catch (error) {
                    Alert.alert('Enregistrement impossible', error instanceof Error ? error.message : 'Réessayez dans un instant.');
                  }
                }}
                disabled={isSaving || isExportingPdf}
                style={({ pressed }) => [
                  styles.saveDraftButton,
                  { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Feather name="save" size={16} color={colors.foreground} />
                <Text style={[styles.saveDraftText, { color: colors.foreground }]}>
                  {isSaving ? 'Enregistrement…' : 'Enregistrer le brouillon'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* ========================================================================= */
          /* MODE 2 : APERÇU ÉVOLUTIF EN DIRECT (RENDU FEUILLE A4 DU PDF RESPONSIVE)   */
          /* ========================================================================= */
          <View style={styles.contentColumn}>
            {/* Barre de statut d'aperçu dynamique */}
            <View style={[styles.liveStatusStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.liveStatusIndicator}>
                <View style={styles.liveDot} />
                <Text style={[styles.liveStatusText, { color: colors.foreground }]}>
                  Aperçu synchronisé en temps réel
                </Text>
              </View>
              <Text style={[styles.liveStatusSub, { color: colors.mutedForeground }]}>
                Ce document reproduit fidèlement la mise en page du PDF officiel exporté avec l'en-tête de l'entreprise.
              </Text>
            </View>

            {/* FEUILLE DE DOCUMENT A4 RESPONSIVE */}
            <View style={[styles.paperSheet, { padding: isTabletOrDesktop ? 26 : isSmall ? 10 : 14 }]}>
              
              {/* 1. Bannière d'en-tête officielle d'entreprise */}
              <View style={styles.bannerContainerRelative}>
                {headerBanner ? (
                  <Image source={{ uri: headerBanner }} style={styles.paperBannerImg} resizeMode="cover" />
                ) : (
                  <LinearGradient
                    colors={['#1E3A8A', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.paperBannerGradient, { paddingVertical: isSmall ? 14 : 18, paddingHorizontal: isSmall ? 12 : 16 }]}
                  >
                    <Text style={[styles.paperBannerTitle, { fontSize: isSmall ? 16 : 18 }]}>{companyName}</Text>
                    <Text style={styles.paperBannerSubtitle}>RAPPORT D'ACTIVITÉS HEBDOMADAIRE OFFICIEL</Text>
                  </LinearGradient>
                )}

                {/* Si Superadmin : petit bouton d'accès direct aux Paramètres */}
                {isSuperAdmin ? (
                  <Pressable
                    testID="preview-superadmin-settings-btn"
                    onPress={() => router.push({ pathname: '/users', params: { openSettings: 'true' } })}
                    style={({ pressed }) => [
                      styles.bannerAdminBadge,
                      { backgroundColor: 'rgba(15, 23, 42, 0.75)', opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Feather name="sliders" size={11} color="#FFFFFF" />
                    <Text style={styles.bannerAdminBadgeText}>Paramètres Superadmin</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* 2. Carte d'identité Collaborateur & Détails de période (Adaptative) */}
              <View
                style={[
                  styles.paperIdentityCard,
                  isCompact && styles.paperIdentityCardCompact,
                ]}
              >
                <View style={styles.paperUserLeft}>
                  {profile.avatarUri ? (
                    <Image source={{ uri: profile.avatarUri }} style={styles.paperAvatar} />
                  ) : (
                    <View style={[styles.paperAvatarFallback, { backgroundColor: primaryColor }]}>
                      <Text style={styles.paperAvatarInitials}>
                        {(profile.fullName || 'CO').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
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

                <View
                  style={[
                    styles.paperMetaRight,
                    isCompact && styles.paperMetaRightCompact,
                  ]}
                >
                  <View style={styles.paperDocBadge}>
                    <Text style={styles.paperDocBadgeText}>RAPPORT HEBDOMADAIRE</Text>
                  </View>
                  <Text style={styles.paperPeriodText}>{weekLabel}</Text>
                </View>
              </View>

              {/* 3. Section 1 : Activités & Réalisations de la Semaine */}
              <View style={styles.paperSectionHeading}>
                <View style={[styles.paperSectionIcon, { backgroundColor: primaryColor }]}>
                  <Text style={styles.paperSectionIconNumber}>1</Text>
                </View>
                <Text style={[styles.paperSectionTitle, { color: primaryColor }]}>
                  Activités & Réalisations
                </Text>
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
                          {act.description ? (
                            <Text style={styles.paperActivityDesc}>{act.description}</Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  );
                })
              )}

              {/* 4. Section 2 : Bilan & Difficultés Rencontrées */}
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
                  {difficulties.trim()
                    ? difficulties
                    : 'Aucun point bloquant majeur signalé pour cette période.'}
                </Text>
              </View>

              {/* 5. Section 3 : Perspectives & Priorités de la Semaine Suivante */}
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

              {/* 6. Section 4 : Bloc de Visa et Signature (Responsive) */}
              <View
                style={[
                  styles.paperSignaturesRow,
                  isCompact && { flexDirection: 'column' },
                ]}
              >
                <View style={styles.paperSignBox}>
                  <Text style={styles.paperSignLabel}>Collaborateur</Text>
                  <Text style={styles.paperSignName}>{profile.fullName || 'Collaborateur'}</Text>
                  <Text style={styles.paperSignStatusDone}>✔ Document validé et transmis</Text>
                </View>
                <View style={styles.paperSignBox}>
                  <Text style={styles.paperSignLabel}>Visa Hiérarchique / Direction</Text>
                  <Text style={styles.paperSignPending}>En attente de revue</Text>
                  <View style={styles.paperSignLine} />
                </View>
              </View>

              {/* 7. Pied de page officiel */}
              <View style={styles.paperFooter}>
                <Text style={styles.paperFooterText}>
                  {appSettings?.pdfFooterText || "HINOV Team Report - Document Confidentiel d'Entreprise"}
                </Text>
                <Text style={styles.paperFooterDate}>Aperçu synchronisé</Text>
              </View>
            </View>

            {/* Boutons d'action dans l'aperçu */}
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
        )}
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainWrapper: { width: '100%' },
  contentColumn: { width: '100%' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 4, marginBottom: 16 },
  headerActions: { alignItems: 'flex-end', gap: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, padding: 2 },
  eyebrow: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.3, marginBottom: 7 },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.6 },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 5 },
  statusPill: { borderRadius: 15, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },

  /* Onglets de bascule Rédaction / Aperçu */
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 18,
    gap: 4,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  tabButtonText: { fontFamily: 'Inter_600SemiBold' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  liveDotMini: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#10B981' },

  /* Carte Bannière vers Aperçu */
  previewBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    width: '100%',
  },
  previewBannerIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  previewBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  previewBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  previewBannerTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  previewBannerSubtitle: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },

  /* Raccourci Paramètres Superadmin */
  superadminSettingsHintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    width: '100%',
  },
  superadminIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  superadminHintTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  superadminHintSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },

  /* Progress Card */
  progressCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 22, width: '100%' },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  progressTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', marginTop: 6 },
  reportIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  track: { height: 7, borderRadius: 4, overflow: 'hidden', marginTop: 18 },
  trackFill: { height: '100%', borderRadius: 4 },
  progressHint: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 9 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginHorizontal: 4, marginBottom: 12 },

  /* Activités en mode rédaction */
  dayCard: { borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 10, width: '100%' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dayName: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  dayCount: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  reportActivity: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  reportBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6, marginRight: 9 },
  reportActivityCopy: { flex: 1 },
  reportActivityTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  reportActivityDescription: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16, marginTop: 3 },
  emptyDay: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 7 },

  /* Formulaire bilan */
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginHorizontal: 4 },
  aiButton: { flexDirection: 'row', gap: 6, alignItems: 'center', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7 },
  aiButtonText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  improvedNote: { fontSize: 11, fontFamily: 'Inter_500Medium', marginHorizontal: 4, marginTop: 4, marginBottom: 7 },
  inputLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginHorizontal: 4, marginTop: 8, marginBottom: 7 },
  textArea: { borderWidth: 1, borderRadius: 14, minHeight: 86, paddingHorizontal: 13, paddingTop: 12, fontSize: 12, fontFamily: 'Inter_400Regular', textAlignVertical: 'top', width: '100%' },
  buttonStack: { marginTop: 22, gap: 10, width: '100%' },
  exportPdfButton: { minHeight: 52, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4, width: '100%' },
  exportPdfText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  saveDraftButton: { minHeight: 46, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', width: '100%' },
  saveDraftText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  /* ========================================================================= */
  /* STYLES FEUILLE A4 DU PDF DANS L'APERÇU RESPONSIVE                         */
  /* ========================================================================= */
  liveStatusStrip: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    width: '100%',
  },
  liveStatusIndicator: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveStatusText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  liveStatusSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 },

  /* Papier A4 */
  paperSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    width: '100%',
  },
  bannerContainerRelative: {
    position: 'relative',
    width: '100%',
    marginBottom: 14,
  },
  paperBannerImg: { width: '100%', height: 85, borderRadius: 8 },
  paperBannerGradient: {
    borderRadius: 8,
  },
  paperBannerTitle: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  paperBannerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.2, marginTop: 3 },
  bannerAdminBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bannerAdminBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
  },

  /* Utilisateur dans la feuille (Adaptatif) */
  paperIdentityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 11,
    marginBottom: 16,
    gap: 8,
  },
  paperIdentityCardCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  paperUserLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, width: '100%' },
  paperAvatar: { width: 44, height: 44, borderRadius: 22 },
  paperAvatarFallback: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  paperAvatarInitials: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter_700Bold' },
  paperUserName: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#0F172A' },
  paperRoleBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' },
  paperRoleBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  paperRoleText: { color: '#FFFFFF', fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  paperDeptText: { fontSize: 10, fontFamily: 'Inter_500Medium', color: '#64748B' },
  paperEmailText: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#94A3B8', marginTop: 2 },
  paperMetaRight: { alignItems: 'flex-end', justifyContent: 'center' },
  paperMetaRightCompact: {
    alignItems: 'flex-start',
    width: '100%',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paperDocBadge: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 2 },
  paperDocBadgeText: { color: '#1E3A8A', fontSize: 8, fontFamily: 'Inter_700Bold' },
  paperPeriodText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#334155' },

  /* Sections numérotées */
  paperSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
  },
  paperSectionIcon: { width: 20, height: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  paperSectionIconNumber: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter_700Bold' },
  paperSectionTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.4, textTransform: 'uppercase', flex: 1 },
  paperSectionCounter: { backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  paperSectionCounterText: { fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#64748B' },

  /* Blocs activités par jour */
  paperDayBlock: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  paperDayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  paperDayTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#1E293B', textTransform: 'uppercase' },
  paperDayBadge: { backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 6, paddingVertical: 2 },
  paperDayBadgeText: { fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#475569' },
  paperActivityEntry: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  paperActivityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  paperActivityBullet: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#1E3A8A' },
  paperActivityTitle: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#0F172A', flex: 1, minWidth: 160 },
  paperCategoryTag: { backgroundColor: '#F1F5F9', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  paperCategoryTagText: { fontSize: 8, fontFamily: 'Inter_600SemiBold', color: '#64748B' },
  paperActivityDesc: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#475569', marginTop: 2, paddingLeft: 11, lineHeight: 15 },
  paperEmptyDayBox: { padding: 14, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', marginBottom: 8 },
  paperEmptyDayText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#94A3B8', fontStyle: 'italic' },

  /* Callout box (difficultés & perspectives) */
  paperCalloutBox: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8 },
  paperCalloutTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  paperCalloutBody: { fontSize: 10, fontFamily: 'Inter_400Regular', lineHeight: 15 },

  /* Signatures (Responsive) */
  paperSignaturesRow: { flexDirection: 'row', gap: 10, marginTop: 18, marginBottom: 12 },
  paperSignBox: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 8, padding: 9 },
  paperSignLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#475569', textTransform: 'uppercase', marginBottom: 2 },
  paperSignName: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#1E293B', marginTop: 2 },
  paperSignStatusDone: { fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#059669', marginTop: 10 },
  paperSignPending: { fontSize: 9, fontFamily: 'Inter_400Regular', color: '#94A3B8', marginTop: 4 },
  paperSignLine: { height: 1, backgroundColor: '#CBD5E1', marginTop: 10 },

  /* Footer */
  paperFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 10, flexWrap: 'wrap', gap: 4 },
  paperFooterText: { fontSize: 8, fontFamily: 'Inter_400Regular', color: '#94A3B8' },
  paperFooterDate: { fontSize: 8, fontFamily: 'Inter_400Regular', color: '#94A3B8' },

  /* Action Buttons dans l'aperçu */
  previewActionStack: { marginTop: 18, gap: 10, width: '100%' },
});