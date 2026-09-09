import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { AppSettings } from './api';
import { WEEK_DAYS, dateToWeekDay } from './constants';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface ReportPdfData {
  profile: {
    fullName: string;
    email: string;
    department: string;
    role: string;
    avatarUri?: string | null;
  };
  weekLabel: string;
  weekStart: string;
  activities: Array<{
    id: string;
    title: string;
    description: string;
    category?: string;
    status?: string;
    date: string;
  }>;
  difficulties: string;
  perspectives: string;
  appSettings?: AppSettings | null;
}

export function generateReportHtml(data: ReportPdfData): string {
  const { profile, weekLabel, activities, difficulties, perspectives, appSettings } = data;
  const companyName = appSettings?.companyName || 'HINOV GROUP';
  const primaryColor = appSettings?.primaryColor || '#1E3A8A';
  const secondaryColor = appSettings?.secondaryColor || '#4F46E5';
  const footerText = appSettings?.pdfFooterText || "HINOV Team Report - Document Confidentiel d'Entreprise";
  const headerBanner = appSettings?.pdfHeaderImage;

  // Groupement des activités par jour (filtré par semaine)
  const weekEndDate = new Date(`${data.weekStart}T12:00:00`);
  weekEndDate.setDate(weekEndDate.getDate() + 4);
  const weekEnd = `${weekEndDate.getFullYear()}-${String(weekEndDate.getMonth() + 1).padStart(2, '0')}-${String(weekEndDate.getDate()).padStart(2, '0')}`;

  const weekActivities = activities.filter((activity) => activity.date >= data.weekStart && activity.date <= weekEnd);
  const groupedByDay = new Map<string, typeof activities>();

  weekActivities.forEach((activity) => {
    const day = dateToWeekDay(activity.date);
    groupedByDay.set(day, [...(groupedByDay.get(day) ?? []), activity]);
  });

  const nowFormatted = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalActivities = weekActivities.length;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes">
  <title>Rapport Hebdomadaire - ${profile.fullName}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1E293B;
      background-color: #FFFFFF;
      font-size: 13px;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .pdf-document-wrapper {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      padding: 12px;
      background: #FFFFFF;
    }

    /* BANNIÈRE D'EN-TÊTE PLEINE LARGEUR */
    .header-banner-container {
      width: 100% !important;
      margin-bottom: 16px;
      border-radius: 8px;
      overflow: hidden;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      box-shadow: 0 4px 14px rgba(30, 58, 138, 0.12);
    }
    .header-banner-img {
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      display: block !important;
      object-fit: cover !important;
    }
    .header-banner-placeholder {
      width: 100%;
      min-height: 85px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      color: #FFFFFF;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .brand-subtitle {
      font-size: 10px;
      opacity: 0.85;
      font-weight: 600;
      letter-spacing: 0.8px;
      margin-top: 4px;
    }

    /* CARTE D'IDENTITÉ DU COLLABORATEUR */
    .user-identity-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 12px 18px;
      margin-bottom: 20px;
      gap: 14px;
      flex-wrap: wrap;
    }
    .user-left {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
      min-width: 220px;
    }
    .avatar-wrapper {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 3px solid #FFFFFF;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      overflow: hidden;
      background: #E2E8F0;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .avatar-initials {
      font-size: 18px;
      font-weight: 700;
      color: ${primaryColor};
    }
    .user-details {
      flex: 1;
      min-width: 0;
    }
    .user-details h1 {
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 2px;
      word-break: break-word;
    }
    .user-meta {
      font-size: 11.5px;
      color: #64748B;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }
    .meta-tag {
      font-weight: 600;
      color: ${primaryColor};
    }
    .report-meta-right {
      text-align: right;
      flex-shrink: 0;
    }
    .doc-type-badge {
      display: inline-block;
      background: #EFF6FF;
      color: ${secondaryColor};
      border: 1px solid #BFDBFE;
      padding: 3px 9px;
      border-radius: 16px;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .period-text {
      font-size: 11.5px;
      font-weight: 600;
      color: #334155;
    }

    /* TITRES DE SECTIONS COLORÉS */
    .section-heading {
      display: flex;
      align-items: center;
      gap: 9px;
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: ${primaryColor};
      margin-top: 18px;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 2px solid #E2E8F0;
      flex-wrap: wrap;
    }
    .section-heading-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: ${primaryColor};
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 900;
      flex-shrink: 0;
    }
    .section-counter {
      margin-left: auto;
      font-size: 10.5px;
      font-weight: 600;
      color: #64748B;
      text-transform: none;
      background: #F1F5F9;
      padding: 2px 8px;
      border-radius: 12px;
    }

    /* ACTIVITÉS - FORMAT RÉDIGÉ ÉDITORIAL */
    .day-block {
      margin-bottom: 12px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 9px;
      padding: 10px 14px;
      page-break-inside: avoid;
    }
    .day-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 1px dashed #E2E8F0;
      flex-wrap: wrap;
      gap: 6px;
    }
    .day-title {
      font-size: 12.5px;
      font-weight: 700;
      color: #1E293B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .day-badge {
      font-size: 9.5px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 8px;
      background: #F1F5F9;
      color: #475569;
    }
    .activity-entry {
      margin-bottom: 8px;
      padding-left: 10px;
      border-left: 3px solid ${secondaryColor};
    }
    .activity-entry:last-child {
      margin-bottom: 0;
    }
    .activity-title-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 2px;
      flex-wrap: wrap;
      gap: 6px;
    }
    .activity-title {
      font-size: 12.5px;
      font-weight: 700;
      color: #0F172A;
      word-break: break-word;
    }
    .activity-category-tag {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      background: #EEF2FF;
      color: ${secondaryColor};
      padding: 1px 5px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .activity-desc {
      font-size: 11.5px;
      color: #475569;
      line-height: 1.45;
      word-break: break-word;
    }
    .empty-day-note {
      font-size: 11px;
      font-style: italic;
      color: #94A3B8;
      padding: 4px 0;
    }

    /* ENCADRÉS BILAN & PERSPECTIVES */
    .callout-box {
      border-radius: 9px;
      padding: 12px 15px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .callout-warning {
      background-color: #FFFBEB;
      border: 1px solid #FDE68A;
      border-left: 4px solid #D97706;
    }
    .callout-warning .callout-title {
      color: #92400E;
    }
    .callout-success {
      background-color: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-left: 4px solid #059669;
    }
    .callout-success .callout-title {
      color: #065F46;
    }
    .callout-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .callout-body {
      font-size: 12px;
      color: #334155;
      line-height: 1.55;
      white-space: pre-line;
      word-break: break-word;
    }

    /* ZONE DE VALIDATION & SIGNATURE */
    .signatures-container {
      display: flex;
      justify-content: space-between;
      margin-top: 22px;
      padding-top: 12px;
      border-top: 1px solid #E2E8F0;
      page-break-inside: avoid;
      gap: 14px;
    }
    .sign-box {
      flex: 1;
      background: #F8FAFC;
      border: 1px dashed #CBD5E1;
      border-radius: 8px;
      padding: 10px 14px;
      min-width: 0;
    }
    .sign-label {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .sign-status {
      font-size: 11.5px;
      color: #059669;
      font-weight: 600;
      margin-top: 14px;
    }

    /* PIED DE PAGE */
    .pdf-footer {
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #94A3B8;
      flex-wrap: wrap;
      gap: 6px;
    }

    /* RESPONSIVE MEDIA QUERIES (MOBILE & TABLETTE) */
    @media (max-width: 640px) {
      body {
        font-size: 12px;
      }
      .pdf-document-wrapper {
        padding: 6px;
      }
      .header-banner-img {
        width: 100% !important;
        height: auto !important;
      }
      .header-banner-placeholder {
        padding: 12px 14px;
        min-height: 65px;
      }
      .brand-title {
        font-size: 16px;
      }
      .brand-subtitle {
        font-size: 9px;
      }
      .user-identity-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
      }
      .user-left {
        width: 100%;
        min-width: 0;
        gap: 10px;
      }
      .avatar-wrapper {
        width: 44px;
        height: 44px;
      }
      .user-details h1 {
        font-size: 14.5px;
      }
      .report-meta-right {
        text-align: left;
        width: 100%;
        padding-top: 8px;
        border-top: 1px solid #E2E8F0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .signatures-container {
        flex-direction: column;
        gap: 10px;
      }
      .sign-box {
        width: 100%;
      }
      .pdf-footer {
        flex-direction: column;
        gap: 4px;
      }
    }

    @media print {
      body {
        padding: 0;
        background: #FFFFFF;
      }
      .pdf-document-wrapper {
        max-width: 100%;
        padding: 0;
      }
      .day-block, .callout-box, .signatures-container {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
<div class="pdf-document-wrapper">

  <!-- 1. BANNIÈRE D'EN-TÊTE PLEINE LARGEUR -->
  <div class="header-banner-container">
    ${
      headerBanner
        ? `<img src="${headerBanner}" class="header-banner-img" alt="Bannière d'en-tête ${companyName}" />`
        : `
          <div class="header-banner-placeholder">
            <div>
              <div class="brand-title">${companyName}</div>
              <div class="brand-subtitle">RAPPORT D'ACTIVITÉS HEBDOMADAIRE OFFICIEL</div>
            </div>
          </div>
        `
    }
  </div>

  <!-- 2. IDENTITÉ DU COLLABORATEUR & DÉTAILS DU DOCUMENT -->
  <div class="user-identity-card">
    <div class="user-left">
      <div class="avatar-wrapper">
        ${
          profile.avatarUri
            ? `<img src="${profile.avatarUri}" class="avatar-img" alt="${profile.fullName}" />`
            : `<div class="avatar-initials">${profile.fullName.slice(0, 2).toUpperCase()}</div>`
        }
      </div>
      <div class="user-details">
        <h1>${profile.fullName}</h1>
        <div class="user-meta">
          <span>Pôle / Dép. : <strong class="meta-tag">${profile.department || 'Général'}</strong></span>
          <span>•</span>
          <span>Rôle : <strong>${profile.role}</strong></span>
          <span>•</span>
          <span>${profile.email}</span>
        </div>
      </div>
    </div>
    <div class="report-meta-right">
      <div class="doc-type-badge">Rapport Hebdomadaire</div>
      <div class="period-text">${weekLabel}</div>
    </div>
  </div>

  <!-- 3. ACTIVITÉS DE LA SEMAINE (FORMAT RÉDIGÉ ÉDITORIAL SANS TABLEAU) -->
  <div class="section-heading">
    <span class="section-heading-icon">1</span>
    <span>Activités & Réalisations de la Semaine</span>
    <span class="section-counter">${totalActivities} activité${totalActivities > 1 ? 's' : ''}</span>
  </div>

  ${groupedByDay.size === 0
    ? `<div class="day-block"><div class="empty-day-note">Aucune activité enregistrée cette semaine.</div></div>`
    : WEEK_DAYS
        .filter((day) => groupedByDay.has(day))
        .map((day) => {
          const dayActs = groupedByDay.get(day) ?? [];
          return `
            <div class="day-block">
              <div class="day-header">
                <span class="day-title">${day}</span>
                <span class="day-badge">${dayActs.length} activité${dayActs.length > 1 ? 's' : ''}</span>
              </div>
              ${dayActs
                .map(
                  (act) => `
                <div class="activity-entry">
                  <div class="activity-title-row">
                    <span class="activity-title">${escapeHtml(act.title)}</span>
                    ${act.category ? `<span class="activity-category-tag">${escapeHtml(act.category)}</span>` : ''}
                  </div>
                  <div class="activity-desc">${escapeHtml(act.description)}</div>
                </div>
              `,
                )
                .join('')}
            </div>
          `;
        })
        .join('')}

  <!-- 4. BILAN & DIFFICULTÉS -->
  <div class="section-heading" style="color: #D97706; margin-top: 24px;">
    <span class="section-heading-icon" style="background: #D97706;">2</span>
    <span>Bilan & Difficultés Rencontrées</span>
  </div>
  <div class="callout-box callout-warning">
    <div class="callout-title">⚠️ Points de blocage & vigilances opérationnelles</div>
    <div class="callout-body">${
      difficulties.trim()
        ? difficulties
        : 'Aucun point bloquant majeur signalé pour cette période.'
    }</div>
  </div>

  <!-- 5. PERSPECTIVES & PRIORITÉS -->
  <div class="section-heading" style="color: #059669;">
    <span class="section-heading-icon" style="background: #059669;">3</span>
    <span>Perspectives & Priorités de la Semaine Suivante</span>
  </div>
  <div class="callout-box callout-success">
    <div class="callout-title">🎯 Objectifs stratégiques & livrables attendus</div>
    <div class="callout-body">${
      perspectives.trim()
        ? perspectives
        : 'Poursuite des tâches en cours et alignement avec les objectifs du pôle.'
    }</div>
  </div>

  <!-- 6. BLOC DE VISA ET SIGNATURE -->
  <div class="signatures-container">
    <div class="sign-box">
      <div class="sign-label">Collaborateur</div>
      <div style="font-size: 12px; font-weight: 600; color: #1E293B;">${profile.fullName}</div>
      <div class="sign-status">✔ Document validé et transmis</div>
    </div>
    <div class="sign-box">
      <div class="sign-label">Visa Hiérarchique / Direction</div>
      <div style="font-size: 12px; font-weight: 600; color: #64748B;">Direction des Opérations</div>
      <div style="font-size: 11px; color: #94A3B8; margin-top: 18px;">Signature & Remarques</div>
    </div>
  </div>

  <!-- 7. PIED DE PAGE CORPORATE -->
  <div class="pdf-footer">
    <span>${footerText}</span>
    <span>Généré le ${nowFormatted}</span>
  </div>

</div>
</body>
</html>
`;
}

/**
 * Génère le fichier PDF et ouvre l'interface de partage/téléchargement
 */
export async function exportAndShareReportPdf(data: ReportPdfData): Promise<void> {
  const html = generateReportHtml(data);

  if (Platform.OS === 'web') {
    // Rendu navigateur : Impression directe / Enregistrer au format PDF
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          try {
            printWindow.print();
          } catch {
            // Ignorer
          }
        }, 350);
      } else {
        // Fallback avec iframe si popup bloquée
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        iframe.contentDocument?.open();
        iframe.contentDocument?.write(html);
        iframe.contentDocument?.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } finally {
            setTimeout(() => document.body.removeChild(iframe), 60000);
          }
        }, 350);
      }
    } catch {
      // Fallback
    }
    return;
  }

  // Sur iOS / Android : Génération du PDF via expo-print et partage via expo-sharing
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `Rapport Hebdomadaire - ${data.profile.fullName}`,
    });
  } else {
    await Print.printAsync({ uri });
  }
}