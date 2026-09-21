import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ReportsService } from '@/services/reports';
import { PdfService } from '@/services/pdf';
import { SettingsService } from '@/services/settings';
import { WeeklyReport, Activity, CompanySettings } from '@/types';
import { FRENCH_DAYS } from '@/utils/date';
import { confirmAction, showAlert } from '@/utils/alert';
import {
  Share2,
  Printer,
  Send,
  CheckCircle2,
  AlertTriangle,
  Target,
  FileText,
  Building2,
} from 'lucide-react-native';

export default function ReportPreviewScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    reportData: string;
    activitiesByDayData: string;
  }>();

  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    SettingsService.getSettings().then(setSettings).catch(console.error);
  }, []);

  let report: WeeklyReport | null = null;
  let activitiesByDay: Record<number, Activity[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };

  try {
    if (params.reportData) report = JSON.parse(params.reportData);
    if (params.activitiesByDayData) activitiesByDay = JSON.parse(params.activitiesByDayData);
  } catch (err) {
    console.error('Failed to parse preview data:', err);
  }

  if (!report || !user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Données du rapport introuvables.</Text>
      </View>
    );
  }

  const isSubmitted = report.status === 'soumis';
  const isDirector = user.role === 'directeur_admin';

  const handleSharePdf = async () => {
    try {
      await PdfService.sharePdf(report!, user, activitiesByDay, settings || undefined);
    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible de générer le fichier PDF pour le partage.');
    }
  };

  const handlePrint = async () => {
    try {
      await PdfService.printReport(report!, user, activitiesByDay, settings || undefined);
    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible de lancer l’impression.');
    }
  };

  const handleSubmit = async () => {
    confirmAction({
      title: 'Soumission Définitive',
      message: isDirector
        ? 'Confirmez-vous la validation et l’archivage de votre rapport hebdomadaire personnel ?'
        : 'Confirmez-vous l’envoi automatique de votre rapport et du PDF généré au Directeur par email ?',
      confirmText: 'Confirmer & Soumettre',
      onConfirm: async () => {
        setSubmitting(true);
        try {
          // Generate PDF base64 for email attachment
          const pdfFile = await PdfService.generatePdfFile(report!, user, activitiesByDay, settings || undefined);
          const res = await ReportsService.submitReport(report!, user, pdfFile.base64);

          setSubmitting(false);

          if (res.success) {
            showAlert('Succès', res.message || 'Rapport transmis avec succès !', () => {
              router.replace('/(collaborator)');
            });
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
        <TouchableOpacity style={styles.toolBtn} onPress={handleSharePdf}>
          <Share2 size={16} color={COLORS.primaryAccent} />
          <Text style={styles.toolBtnText}>Partager PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolBtn} onPress={handlePrint}>
          <Printer size={16} color={COLORS.primaryAccent} />
          <Text style={styles.toolBtnText}>Imprimer</Text>
        </TouchableOpacity>
      </View>

      {/* Simulated A4 PDF Document Sheet */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.paperSheet}>
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
            <View style={styles.userMeta}>
              <Text style={styles.userName}>{user.full_name}</Text>
              <Text style={styles.userJob}>
                {user.job_title || 'Collaborateur'} — {user.department || 'Département'}
              </Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            <View style={styles.periodCol}>
              <Text style={styles.periodLabel}>Période :</Text>
              <Text style={styles.periodValue}>
                {report.start_date} au {report.end_date}
              </Text>
            </View>
          </View>

          {/* 1. Activities by Day */}
          <Text style={styles.sectionHeading}>1. Activités Réalisées par Jour</Text>
          {FRENCH_DAYS.map((d) => {
            const list = activitiesByDay[d.key] || [];
            return (
              <View key={`prev-day-${d.key}`} style={styles.dayBox}>
                <View style={styles.dayBoxHeader}>
                  <Text style={styles.dayBoxTitle}>{d.label.toUpperCase()}</Text>
                  <Text style={styles.dayBoxCount}>{list.length} tâche(s)</Text>
                </View>

                {list.length === 0 ? (
                  <Text style={styles.emptyDayText}>Aucune activité enregistrée</Text>
                ) : (
                  list.map((act, i) => (
                    <View key={`prev-act-${act.id || i}`} style={styles.activityItem}>
                      <View style={styles.actTitleRow}>
                        <Text style={styles.actTitle}>• {act.title}</Text>
                        <Badge label={act.status} status={act.status} />
                      </View>
                      {Boolean(act.description) && (
                        <Text style={styles.actDesc}>{act.description}</Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            );
          })}

          {/* 2. Difficulties */}
          <Text style={styles.sectionHeading}>2. Difficultés Rencontrées</Text>
          <View style={styles.noticeBox}>
            {(!report.difficulties || report.difficulties.length === 0) ? (
              <Text style={styles.emptyNoticeText}>Aucune difficulté signalée.</Text>
            ) : (
              report.difficulties.map((diff, idx) => (
                <View key={`prev-diff-${idx}`} style={styles.bulletRow}>
                  <AlertTriangle size={14} color="#D97706" style={{ marginTop: 2 }} />
                  <Text style={styles.bulletText}>{diff}</Text>
                </View>
              ))
            )}
          </View>

          {/* 3. Perspectives */}
          <Text style={styles.sectionHeading}>3. Perspectives & Priorités</Text>
          <View style={[styles.noticeBox, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
            {(!report.perspectives || report.perspectives.length === 0) ? (
              <Text style={styles.emptyNoticeText}>Continuité opérationnelle des projets.</Text>
            ) : (
              report.perspectives.map((persp, idx) => (
                <View key={`prev-persp-${idx}`} style={styles.bulletRow}>
                  <Target size={14} color="#16A34A" style={{ marginTop: 2 }} />
                  <Text style={[styles.bulletText, { color: '#14532D' }]}>{persp}</Text>
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

      {/* Bottom Submit Action */}
      {!isSubmitted && (
        <View style={styles.bottomBar}>
          <Button
            title={isDirector ? "ARCHIVER MON RAPPORT" : "SOUMETTRE & ENVOYER AU DIRECTEUR"}
            onPress={handleSubmit}
            loading={submitting}
            variant="primary"
            size="lg"
            style={{ width: '100%' }}
            icon={<Send size={18} color="#FFFFFF" />}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toolBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primaryAccent,
    marginLeft: 6,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 24,
  },
  paperSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  sheetHeaderBannerWrapper: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  sheetHeaderBanner: {
    width: '100%',
    height: 75,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 10,
    marginBottom: 16,
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
  },
  weekBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  weekBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  userMeta: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  userJob: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  userEmail: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  periodCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  periodLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  periodValue: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.primaryAccent,
    paddingLeft: 8,
    marginTop: 14,
    marginBottom: 8,
  },
  dayBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    marginBottom: 8,
    overflow: 'hidden',
  },
  dayBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dayBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
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
    borderBottomColor: '#F8FAFC',
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
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
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
    color: '#92400E',
    marginLeft: 6,
    flex: 1,
  },
  docFooter: {
    marginTop: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  docFooterText: {
    fontSize: 9.5,
    color: COLORS.textMuted,
  },
  bottomBar: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 40,
    color: COLORS.danger,
  },
});

