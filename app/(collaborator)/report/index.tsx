import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DaySection } from '@/components/report/DaySection';
import { DifficultySection } from '@/components/report/DifficultySection';
import { PerspectiveSection } from '@/components/report/PerspectiveSection';
import { ColorLine } from '@/components/ui/ColorLine';
import { ReportsService } from '@/services/reports';
import { ActivitiesService } from '@/services/activities';
import { PdfService } from '@/services/pdf';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { GeminiService } from '@/services/gemini';
import { getWeekNumber, getWeekRange, FRENCH_DAYS } from '@/utils/date';
import { confirmAction, showAlert } from '@/utils/alert';
import { NotificationHelper } from '@/utils/notifications';
import { Activity, WeeklyReport } from '@/types';
import {
  Sparkles,
  FileCheck,
  Send,
  Eye,
  Calendar,
  Lock,
  Save,
  CheckCircle2,
  Award,
  ShieldCheck,
} from 'lucide-react-native';

export default function WeeklyReportScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { week, year } = getWeekNumber();
  const weekRange = getWeekRange(week, year);

  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [activitiesByDay, setActivitiesByDay] = useState<Record<number, Activity[]>>({
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  });
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [perspectives, setPerspectives] = useState<string[]>([]);

  const loadReportData = async (showSpinner = false) => {
    if (!user) return;
    try {
      if (showSpinner) {
        setLoading(true);
      }
      const rep = await ReportsService.getOrCreateWeeklyDraft(user, week, year);
      setReport(rep);
      setDifficulties(rep.difficulties || []);
      setPerspectives(rep.perspectives || []);

      // Load latest activities for the current week
      const dbActivities = await ActivitiesService.getActivitiesForUser(user.id, weekRange.startDate, weekRange.endDate);
      let acts: Activity[] = [];

      if (rep.status === 'soumis' && rep.content_snapshot && rep.content_snapshot.length > 0) {
        // Merge snapshot with any new/updated db activities
        const actMap = new Map<string, Activity>();
        rep.content_snapshot.forEach((a) => actMap.set(a.id, a));
        dbActivities.forEach((a) => actMap.set(a.id, a));
        acts = Array.from(actMap.values());
      } else {
        acts = dbActivities;
      }

      const grouped: Record<number, Activity[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
      acts.forEach((a) => {
        const d = a.day_of_week || 1;
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(a);
      });
      setActivitiesByDay(grouped);
    } catch (err) {
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadReportData(true);
    }

    if (user && isSupabaseConfigured) {
      const channel = supabase
        .channel(`rt:report:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'activities',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadReportData(false);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reports',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadReportData(false);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadReportData(false);
      }
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData(false);
    setRefreshing(false);
  };

  const totalActivities = Object.values(activitiesByDay).reduce((sum, list) => sum + list.length, 0);
  const isSubmitted = report?.status === 'soumis';

  const flattenActivities = (): Activity[] => {
    const list: Activity[] = [];
    Object.keys(activitiesByDay).forEach((k) => {
      list.push(...(activitiesByDay[Number(k)] || []));
    });
    return list;
  };

  const handleEditActivity = (activity: Activity) => {
    router.push({
      pathname: '/(collaborator)/activities/[id]',
      params: { id: activity.id },
    });
  };

  const handleDeleteActivity = async (activityId: string) => {
    confirmAction({
      title: 'Supprimer l’activité',
      message: 'Êtes-vous sûr de vouloir supprimer définitivement cette activité du rapport ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      destructive: true,
      onConfirm: async () => {
        const res = await ActivitiesService.deleteActivity(activityId);
        if (res.success) {
          await loadReportData(false);
        } else {
          showAlert('Erreur', res.error || 'Impossible de supprimer l’activité.');
        }
      },
    });
  };

  const handleSaveDraft = async () => {
    if (!report) return;
    setSaving(true);
    const allActs = flattenActivities();
    const res = await ReportsService.saveReportDraft(report.id, {
      content_snapshot: allActs,
      difficulties,
      perspectives,
    });
    setSaving(false);
    if (res.success) {
      showAlert('Brouillon sauvegardé', 'Vos modifications ont été enregistrées avec succès.');
    } else {
      showAlert('Erreur de sauvegarde', res.error || 'Impossible d’enregistrer le brouillon.');
    }
  };

  const handleGeminiImprove = async () => {
    if (totalActivities === 0) {
      showAlert(
        'Activités requises',
        'Veuillez ajouter au moins une activité avant de lancer l’optimisation Gemini AI.'
      );
      return;
    }

    try {
      setAiLoading(true);
      const res = await GeminiService.improveReport(
        activitiesByDay,
        difficulties,
        perspectives,
        user?.custom_gemini_api_key
      );

      if (res.success && res.result) {
        const newActs = res.result.activitiesByDay || activitiesByDay;
        const newDiffs = res.result.difficulties || difficulties;
        const newPersps = res.result.perspectives || perspectives;

        setActivitiesByDay(newActs);
        setDifficulties(newDiffs);
        setPerspectives(newPersps);

        // Auto-save immediately to persistent storage
        if (report) {
          const flatActs: Activity[] = [];
          Object.keys(newActs).forEach((k) => {
            flatActs.push(...(newActs[Number(k)] || []));
          });
          await ReportsService.saveReportDraft(report.id, {
            content_snapshot: flatActs,
            difficulties: newDiffs,
            perspectives: newPersps,
          });
        }

        showAlert(
          '✨ Amélioration Gemini AI Réussie !',
          'Le contenu de votre rapport a été enrichi et professionnalisé avec succès. Vous pouvez encore ajuster manuellement chaque section avant de soumettre.'
        );
      } else {
        showAlert('Notice Gemini', res.error || 'Impossible d’effectuer l’optimisation AI.');
      }
    } catch (err: any) {
      showAlert('Erreur AI', err.message || 'Erreur inconnue');
    } finally {
      setAiLoading(false);
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handlePreview = async () => {
    if (!report || !user) return;
    const allActs = flattenActivities();
    const updatedReport: WeeklyReport = {
      ...report,
      content_snapshot: allActs,
      difficulties,
      perspectives,
      author: user,
    };

    // Auto-save draft before navigating to guarantee zero data loss
    await ReportsService.saveReportDraft(report.id, {
      content_snapshot: allActs,
      difficulties,
      perspectives,
      author: user,
    });

    router.push({
      pathname: '/(collaborator)/report/preview',
      params: {
        reportData: JSON.stringify(updatedReport),
        activitiesByDayData: JSON.stringify(activitiesByDay),
      },
    });
  };

  const handleSubmitDirect = async () => {
    if (!report || !user) return;

    if (totalActivities === 0) {
      showAlert(
        'Activités requises',
        'Veuillez ajouter au moins une activité à votre rapport avant de le soumettre.'
      );
      return;
    }

    const isDirector = user.role === 'directeur_admin';

    confirmAction({
      title: 'Soumission Définitive',
      message: isDirector
        ? 'Confirmez-vous la validation et l’archivage de votre rapport hebdomadaire personnel ?'
        : 'Confirmez-vous la soumission définitive de votre rapport hebdomadaire à la Direction ?',
      confirmText: 'Confirmer & Soumettre',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setSubmitting(true);
        try {
          const allActs = flattenActivities();
          const updatedReport: WeeklyReport = {
            ...report,
            content_snapshot: allActs,
            difficulties,
            perspectives,
            author: user,
          };

          // Save draft first
          await ReportsService.saveReportDraft(report.id, {
            content_snapshot: allActs,
            difficulties,
            perspectives,
            author: user,
          });

          // Generate PDF headless if available
          const pdfFile = await PdfService.generatePdfFile(updatedReport, user, activitiesByDay);
          const res = await ReportsService.submitReport(updatedReport, user, pdfFile.base64);

          setSubmitting(false);

          if (res.success) {
            // Trigger system / desktop / mobile notification
            await NotificationHelper.notifyReportSubmitted({
              week: updatedReport.week_number,
              year: updatedReport.year,
              authorName: user.full_name,
              recipientEmail: updatedReport.email_recipient || undefined,
            });

            showAlert(
              'Rapport Soumis avec Succès !',
              isDirector
                ? `Votre rapport personnel de la Semaine ${updatedReport.week_number} a été validé et archivé avec succès.`
                : `Votre rapport hebdomadaire pour la Semaine ${updatedReport.week_number} (${updatedReport.start_date} au ${updatedReport.end_date}) a été validé et transmis avec succès à la Direction.\n\nUne attestation de dépôt certifiée a été générée et vos activités sont archivées.`,
              () => {
                loadReportData(true);
              }
            );
          } else {
            showAlert('Notice', res.error || 'Erreur de transmission');
          }
        } catch (err: any) {
          setSubmitting(false);
          showAlert('Erreur', err.message || 'Erreur lors de la soumission');
        }
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryAccent} />
        <Text style={styles.loadingText}>Préparation de votre rapport hebdomadaire...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header Info Card */}
      <Card style={styles.headerCard}>
        <ColorLine height={3} style={{ marginBottom: 12, borderRadius: 2 }} />
        <View style={styles.headerTop}>
          <View style={styles.weekBadge}>
            <Calendar size={16} color="#FFFFFF" />
            <Text style={styles.weekBadgeText}>Semaine {week} • {year}</Text>
          </View>
          <Badge
            label={isSubmitted ? 'Rapport Soumis' : 'Brouillon en cours'}
            reportStatus={report?.status}
          />
        </View>

        <Text style={styles.periodText}>
          Période : Du <Text style={{ fontWeight: '700' }}>{weekRange.startDate}</Text> au{' '}
          <Text style={{ fontWeight: '700' }}>{weekRange.endDate}</Text>
        </Text>

        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            📊 Total : <Text style={{ fontWeight: '800', color: COLORS.primary }}>{totalActivities}</Text> activité(s)
          </Text>
          <Text style={styles.summaryText}>
            ⚠ {difficulties.length} difficulté(s)
          </Text>
          <Text style={styles.summaryText}>
            🎯 {perspectives.length} perspective(s)
          </Text>
        </View>

        {isSubmitted && (
          <View style={styles.attestationCard}>
            <View style={styles.attestationHeader}>
              <View style={styles.attestationIconWrapper}>
                <ShieldCheck size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.attestationTitle}>Attestation de Soumission</Text>
                <Text style={styles.attestationSub}>
                  Rapport certifié et archivé pour la Semaine {report?.week_number}
                </Text>
              </View>
              <Badge label="TRANSMIS ✓" reportStatus="soumis" />
            </View>

            <View style={styles.attestationDivider} />

            <View style={styles.attestationBody}>
              <View style={styles.attestationFieldRow}>
                <Text style={styles.attestationFieldLabel}>Date & Heure :</Text>
                <Text style={styles.attestationFieldValue}>
                  {report?.submitted_at
                    ? new Date(report.submitted_at).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Enregistré'}
                </Text>
              </View>

              {Boolean(report?.email_recipient) && (
                <View style={styles.attestationFieldRow}>
                  <Text style={styles.attestationFieldLabel}>Destinataire :</Text>
                  <Text style={styles.attestationFieldValue}>{report!.email_recipient}</Text>
                </View>
              )}

              <View style={styles.attestationFieldRow}>
                <Text style={styles.attestationFieldLabel}>Activités transmises :</Text>
                <Text style={[styles.attestationFieldValue, { color: COLORS.success, fontWeight: '800' }]}>
                  {totalActivities} tâche(s) validée(s)
                </Text>
              </View>
            </View>
          </View>
        )}
      </Card>

      {/* Gemini AI Action Banner */}
      {!isSubmitted && (
        <TouchableOpacity
          style={styles.aiBanner}
          onPress={handleGeminiImprove}
          disabled={aiLoading}
          activeOpacity={0.85}
        >
          <View style={styles.aiBannerLeft}>
            <Sparkles size={22} color="#FFFFFF" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.aiBannerTitle}>
                {aiLoading ? 'Optimisation en cours...' : 'Améliorer avec Gemini AI'}
              </Text>
              <Text style={styles.aiBannerSub}>
                Formulation corporate, clarté et concision automatique
              </Text>
            </View>
          </View>
          {aiLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View style={styles.aiPill}>
              <Text style={styles.aiPillText}>Lancer ✨</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Section 1: Activités organisées par jour */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>1. Activités Réalisées par Jour</Text>
      </View>

      {FRENCH_DAYS.map((d) => {
        const matchedDay = weekRange.days.find((wd) => wd.dayOfWeek === d.key);
        return (
          <DaySection
            key={`report-day-${d.key}`}
            dayOfWeek={d.key}
            dayName={d.label}
            dateStr={matchedDay?.dateStr}
            activities={activitiesByDay[d.key] || []}
            readOnly={isSubmitted}
            onEditActivity={handleEditActivity}
            onDeleteActivity={handleDeleteActivity}
            onAddActivity={(day) => {
              router.push({
                pathname: '/(collaborator)/activities/new',
                params: { date: matchedDay?.dateStr, dayOfWeek: day },
              });
            }}
          />
        );
      })}

      {/* Section 2: Difficultés */}
      <DifficultySection
        difficulties={difficulties}
        onChange={setDifficulties}
        readOnly={isSubmitted}
      />

      {/* Section 3: Perspectives */}
      <PerspectiveSection
        perspectives={perspectives}
        onChange={setPerspectives}
        readOnly={isSubmitted}
      />

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActionsContainer}>
        {!isSubmitted ? (
          <>
            <View style={styles.actionRowTop}>
              <Button
                title="Enregistrer"
                onPress={handleSaveDraft}
                loading={saving}
                variant="outline"
                style={{ flex: 1, marginRight: 8 }}
                icon={<Save size={16} color={COLORS.primary} />}
              />
              <Button
                title="Aperçu & Télécharger"
                onPress={handlePreview}
                variant="secondary"
                style={{ flex: 1.3 }}
                icon={<Eye size={16} color={COLORS.primaryAccent} />}
              />
            </View>
            <Button
              title={user?.role === 'directeur_admin' ? "ARCHIVER LE RAPPORT" : "SOUMETTRE MON RAPPORT"}
              onPress={handleSubmitDirect}
              loading={submitting}
              variant="primary"
              size="lg"
              style={{ width: '100%', marginTop: 10 }}
              icon={<Send size={18} color="#FFFFFF" />}
            />
          </>
        ) : (
          <Button
            title="Consulter l'Aperçu & Télécharger PDF"
            onPress={handlePreview}
            variant="primary"
            size="lg"
            style={{ width: '100%' }}
            icon={<Eye size={18} color="#FFFFFF" />}
          />
        )}
      </View>
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
    backgroundColor: COLORS.background,
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  headerCard: {
    marginBottom: 14,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  weekBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  periodText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSubtle,
    padding: 10,
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  attestationCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
  },
  attestationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attestationIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attestationTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#14532D',
  },
  attestationSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 1,
  },
  attestationDivider: {
    height: 1,
    backgroundColor: '#BBF7D0',
    marginVertical: 10,
  },
  attestationBody: {
    gap: 5,
  },
  attestationFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attestationFieldLabel: {
    fontSize: 11.5,
    color: '#166534',
    fontWeight: '600',
  },
  attestationFieldValue: {
    fontSize: 11.5,
    color: '#14532D',
    fontWeight: '700',
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.ai,
    padding: 14,
    borderRadius: 12,
    marginBottom: 18,
    shadowColor: COLORS.ai,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  aiBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aiBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  aiBannerSub: {
    fontSize: 11,
    color: '#EDE9FE',
    marginTop: 1,
  },
  aiPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  aiPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomActionsContainer: {
    marginTop: 18,
    width: '100%',
  },
  actionRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
});

