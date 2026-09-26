import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ColorLine } from '@/components/ui/ColorLine';
import { Card } from '@/components/ui/Card';
import { ReportsService } from '@/services/reports';
import { ActivitiesService } from '@/services/activities';
import { PdfService } from '@/services/pdf';
import { SettingsService } from '@/services/settings';
import { WeeklyReport, Activity, CompanySettings } from '@/types';
import { FRENCH_DAYS, getWeekNumber, getWeekRange } from '@/utils/date';
import { confirmAction, showAlert } from '@/utils/alert';
import { NotificationHelper } from '@/utils/notifications';
import {
  Share2,
  Download,
  Printer,
  Send,
  CheckCircle2,
  AlertTriangle,
  Target,
  FileText,
  Building2,
  ArrowLeft,
  RotateCw,
} from 'lucide-react-native';

export default function ReportPreviewScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    reportData?: string;
    activitiesByDayData?: string;
    week?: string;
    year?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [activitiesByDay, setActivitiesByDay] = useState<Record<number, Activity[]>>({
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  });

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Load Company Settings
      const companySettings = await SettingsService.getSettings().catch(() => null);
      setSettings(companySettings);

      // 2. If params contain reportData, use it directly
      if (params.reportData) {
        try {
          const parsedReport: WeeklyReport = JSON.parse(params.reportData);
          setReport(parsedReport);

          if (params.activitiesByDayData) {
            const parsedActivities = JSON.parse(params.activitiesByDayData);
            setActivitiesByDay(parsedActivities);
          } else if (parsedReport.content_snapshot) {
            const grouped: Record<number, Activity[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
            parsedReport.content_snapshot.forEach((a) => {
              const d = a.day_of_week || 1;
              if (!grouped[d]) grouped[d] = [];
              grouped[d].push(a);
            });
            setActivitiesByDay(grouped);
          }
          setLoading(false);
          return;
        } catch (e) {
          console.warn('Could not parse params.reportData, falling back to database fetch:', e);
        }
      }

      // 3. Fallback on Page Reload / F5: fetch directly from Supabase / Local storage
      const currentInfo = getWeekNumber();
      const targetWeek = params.week ? parseInt(params.week, 10) : currentInfo.week;
      const targetYear = params.year ? parseInt(params.year, 10) : currentInfo.year;
      const weekRange = getWeekRange(targetWeek, targetYear);

      const fetchedReport = await ReportsService.getOrCreateWeeklyDraft(user, targetWeek, targetYear);
      setReport(fetchedReport);

      const dbActivities = await ActivitiesService.getActivitiesForUser(user.id, weekRange.startDate, weekRange.endDate);
      const grouped: Record<number, Activity[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
      
      const actsToGroup = (fetchedReport.status === 'soumis' && fetchedReport.content_snapshot && fetchedReport.content_snapshot.length > 0)
        ? fetchedReport.content_snapshot
        : dbActivities;

      actsToGroup.forEach((a) => {
        const d = a.day_of_week || 1;
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(a);
      });
      setActivitiesByDay(grouped);
    } catch (err) {
      console.error('Error loading preview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryAccent} />
        <Text style={styles.loadingText}>Génération de l’aperçu du rapport...</Text>
      </View>
    );
  }

  if (!report || !user) {
    return (
      <View style={styles.errorContainer}>
        <Card style={styles.errorCard}>
          <ColorLine height={4} style={{ marginBottom: 14, borderRadius: 2 }} />
          <AlertTriangle size={36} color={COLORS.danger} style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle}>Données du rapport introuvables</Text>
          <Text style={styles.errorSub}>
            Impossible de charger les données du rapport pour cette semaine. Veuillez retourner à votre espace.
          </Text>
          <Button
            title="Retour à Mon Rapport"
            onPress={() => router.replace('/(collaborator)/report')}
            variant="primary"
            style={{ width: '100%', marginTop: 16 }}
            icon={<ArrowLeft size={16} color="#FFFFFF" />}
          />
        </Card>
      </View>
    );
  }

  const isSubmitted = report.status === 'soumis';
  const isDirector = user.role === 'directeur_admin';

  const handleSharePdf = async () => {
    try {
      await PdfService.sharePdf(report!, user, activitiesByDay, settings || undefined);
    } catch (err: any) {
      showAlert('Erreur', 'Impossible de générer le fichier PDF pour le partage.');
    }
  };

  const handlePrint = async () => {
    try {
      await PdfService.printReport(report!, user, activitiesByDay, settings || undefined);
    } catch (err: any) {
      showAlert('Erreur', 'Impossible de lancer l’impression.');
    }
  };

  const handleSubmit = async () => {
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
          // Generate PDF base64 for archiving and storage
          const pdfFile = await PdfService.generatePdfFile(report!, user, activitiesByDay, settings || undefined);
          const res = await ReportsService.submitReport(report!, user, pdfFile.base64);

          setSubmitting(false);

          if (res.success) {
            // Trigger system / desktop / mobile notification
            await NotificationHelper.notifyReportSubmitted({
              week: report!.week_number,
              year: report!.year,
              authorName: user.full_name,
              recipientEmail: report!.email_recipient || undefined,
            });

            showAlert(
              'Rapport Soumis avec Succès !',
              isDirector
                ? `Votre rapport personnel de la Semaine ${report!.week_number} a été validé et archivé avec succès.`
                : `Votre rapport hebdomadaire pour la Semaine ${report!.week_number} (${report!.start_date} au ${report!.end_date}) a été validé et transmis avec succès à la Direction.\n\nUne attestation de dépôt certifiée a été générée.`,
              () => {
                router.replace('/(collaborator)');
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

  return (
    <View style={styles.container}>
      {/* Top Action Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(collaborator)/report'))}
        >
          <ArrowLeft size={15} color={COLORS.textPrimary} />
          <Text style={[styles.toolBtnText, { color: COLORS.textPrimary }]}>Retour</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolBtn} onPress={handleSharePdf}>
          <Download size={15} color={COLORS.primaryAccent} />
          <Text style={styles.toolBtnText}>Télécharger PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolBtn} onPress={handlePrint}>
          <Printer size={15} color={COLORS.primaryAccent} />
          <Text style={styles.toolBtnText}>Imprimer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.toolBtn, { marginLeft: 'auto' }]} onPress={loadData}>
          <RotateCw size={14} color={COLORS.textSecondary} />
          <Text style={[styles.toolBtnText, { color: COLORS.textSecondary }]}>Actualiser</Text>
        </TouchableOpacity>
      </View>

      {/* Simulated A4 PDF Document Sheet */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.paperSheet}>
          <ColorLine height={4} style={{ marginBottom: 12, borderRadius: 2 }} />

          {/* Full Width Company Header Banner if uploaded */}
          {Boolean(settings?.pdf_header_image) && (
            <View style={styles.sheetHeaderBannerWrapper}>
              <Image
                source={{ uri: settings!.pdf_header_image! }}
                style={styles.sheetHeaderBanner}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Document Header */}
          <View style={styles.docHeader}>
            <View>
              <Text style={styles.companyName}>{settings?.company_name || 'HINOV GROUP'}</Text>
              <Text style={styles.docType}>Rapport Hebdomadaire d'Activité</Text>
            </View>
            <View style={styles.weekBadge}>
              <Text style={styles.weekBadgeText}>
                Semaine {report.week_number} • {report.year}
              </Text>
            </View>
          </View>

          {/* User Profile Info Card with Photo */}
          <View style={styles.userCard}>
            <Avatar url={user.avatar_url} name={user.full_name} size={54} showBorder />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user.full_name}</Text>
              <Text style={styles.userMeta}>
                {user.job_title || 'Collaborateur'} — {user.department || 'Département HINOV'}
              </Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            <View style={styles.periodBox}>
              <Text style={styles.periodLabel}>PÉRIODE D'ACTIVITÉ</Text>
              <Text style={styles.periodVal}>{report.start_date}</Text>
              <Text style={styles.periodVal}>au {report.end_date}</Text>
            </View>
          </View>

          {/* 1. Activities by Day (Only days with tasks) */}
          <Text style={styles.sectionHeading}>1. Activités Réalisées par Jour</Text>
          {(() => {
            const daysWithTasks = FRENCH_DAYS.filter(
              (d) => (activitiesByDay[d.key] || []).length > 0
            );
            if (daysWithTasks.length === 0) {
              return (
                <View style={styles.noticeBox}>
                  <Text style={styles.emptyNoticeText}>Aucune activité enregistrée cette semaine.</Text>
                </View>
              );
            }
            return daysWithTasks.map((d) => {
              const list = activitiesByDay[d.key] || [];
              return (
                <View key={`prev-day-${d.key}`} style={styles.dayBox}>
                  <View style={styles.dayBoxHeader}>
                    <Text style={styles.dayBoxTitle}>{d.label.toUpperCase()}</Text>
                    <Text style={styles.dayBoxCount}>{list.length} tâche(s)</Text>
                  </View>

                  {list.map((act, i) => (
                    <View key={`prev-act-${act.id || i}`} style={styles.activityItem}>
                      <View style={styles.actTitleRow}>
                        <Text style={styles.actTitle}>• {act.title}</Text>
                        <Badge label={act.status} status={act.status} />
                      </View>
                      {Boolean(act.description) && (
                        <Text style={styles.actDesc}>{act.description}</Text>
                      )}
                    </View>
                  ))}
                </View>
              );
            });
          })()}

          {/* 2. Difficulties */}
          <Text style={styles.sectionHeading}>2. Difficultés Rencontrées</Text>
          <View style={styles.noticeBox}>
            {!report.difficulties || report.difficulties.length === 0 ? (
              <Text style={styles.emptyNoticeText}>Aucune difficulté signalée.</Text>
            ) : (
              report.difficulties.map((diff, idx) => (
                <View key={`prev-diff-${idx}`} style={styles.bulletRow}>
                  <AlertTriangle size={14} color={COLORS.danger} style={{ marginTop: 2 }} />
                  <Text style={styles.bulletText}>{diff}</Text>
                </View>
              ))
            )}
          </View>

          {/* 3. Perspectives */}
          <Text style={styles.sectionHeading}>3. Perspectives & Priorités</Text>
          <View style={[styles.noticeBox, { backgroundColor: COLORS.infoLight, borderColor: '#B3E5FC' }]}>
            {!report.perspectives || report.perspectives.length === 0 ? (
              <Text style={styles.emptyNoticeText}>Continuité opérationnelle des projets.</Text>
            ) : (
              report.perspectives.map((persp, idx) => (
                <View key={`prev-persp-${idx}`} style={styles.bulletRow}>
                  <Target size={14} color={COLORS.primaryAccent} style={{ marginTop: 2 }} />
                  <Text style={[styles.bulletText, { color: COLORS.textPrimary }]}>{persp}</Text>
                </View>
              ))
            )}
          </View>

          {/* Footer Note */}
          <View style={styles.docFooter}>
            <Text style={styles.docFooterText}>
              {settings?.pdf_footer_text || 'Généré par Hinov Team Report (HTR) • Document Confidentiel'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar Actions */}
      <View style={styles.bottomBar}>
        {!isSubmitted ? (
          <>
            <Button
              title="Retour à l'édition"
              onPress={() => router.replace('/(collaborator)/report')}
              variant="outline"
              style={{ flex: 1, marginRight: 10 }}
              icon={<ArrowLeft size={16} color={COLORS.primary} />}
            />
            <Button
              title={isDirector ? 'ARCHIVER LE RAPPORT' : 'SOUMETTRE LE RAPPORT'}
              onPress={handleSubmit}
              loading={submitting}
              variant="primary"
              style={{ flex: 1.4 }}
              icon={<Send size={16} color="#FFFFFF" />}
            />
          </>
        ) : (
          <Button
            title={router.canGoBack() ? "Retour" : "Retour à Mon Rapport"}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(collaborator)/report'))}
            variant="primary"
            style={{ width: '100%' }}
            icon={<ArrowLeft size={16} color="#FFFFFF" />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    gap: 6,
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryAccent,
  },
  scrollContent: {
    padding: 14,
    alignItems: 'center',
  },
  paperSheet: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 760,
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sheetHeaderBannerWrapper: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  sheetHeaderBanner: {
    width: '100%',
    height: 90,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 10,
    marginBottom: 14,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  docType: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekBadge: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  weekBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  userEmail: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  periodBox: {
    alignItems: 'flex-end',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    paddingLeft: 10,
  },
  periodLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  periodVal: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    paddingLeft: 8,
    marginTop: 14,
    marginBottom: 8,
  },
  dayBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    marginBottom: 8,
    overflow: 'hidden',
  },
  dayBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dayBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dayBoxCount: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  emptyDayText: {
    padding: 8,
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  activityItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSubtle,
  },
  actTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 6,
  },
  actDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  noticeBox: {
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  emptyNoticeText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletText: {
    fontSize: 11.5,
    color: COLORS.textPrimary,
    marginLeft: 6,
    flex: 1,
  },
  docFooter: {
    marginTop: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  docFooterText: {
    fontSize: 9.5,
    color: COLORS.textMuted,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
