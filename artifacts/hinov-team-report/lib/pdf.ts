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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    }

    /* BANNIÈRE D'EN-TÊTE PLEINE LARGEUR */
    .header-banner-container {
      width: 100%;
      margin-bottom: 16px;
      border-radius: 10px;
      overflow: hidden;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      box-shadow: 0 4px 14px rgba(30, 58, 138, 0.12);
    }
    .header-banner-img {
      width: 100%;
      height: 125px;
      object-fit: cover;
      display: block;
    }
    .header-banner-placeholder {
      width: 100%;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      color: #FFFFFF;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .brand-subtitle {
      font-size: 11px;
      opacity: 0.85;
      font-weight: 500;
      letter-spacing: 0.8px;
    }

    /* CARTE D'IDENTITÉ DU COLLABORATEUR */
    .user-identity-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 14px 20px;
      margin-bottom: 22px;
    }
    .user-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .avatar-wrapper {
      width: 58px;
      height: 58px;
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
      font-size: 20px;
      font-weight: 700;
      color: ${primaryColor};
    }
    .user-details h1 {
      font-size: 17px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 2px;
    }
    .user-meta {
      font-size: 12px;
      color: #64748B;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .meta-tag {
      font-weight: 600;
      color: ${primaryColor};
    }
    .report-meta-right {
      text-align: right;
    }
    .doc-type-badge {
      display: inline-block;
      background: #EFF6FF;
      color: ${secondaryColor};
      border: 1px solid #BFDBFE;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .period-text {
      font-size: 12px;
      font-weight: 600;
      color: #334155;
    }

    /* TITRES DE SECTIONS COLORÉS */
    .section-heading {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: ${primaryColor};
      margin-top: 20px;
      margin-bottom: 12px;
      padding-bottom: 5px;
      border-bottom: 2px solid #E2E8F0;
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
    }
    .section-counter {
      margin-left: auto;
      font-size: 11px;
      font-weight: 600;
      color: #64748B;
      text-transform: none;
      background: #F1F5F9;
      padding: 2px 8px;
      border-radius: 12px;
    }

    /* ACTIVITÉS - FORMAT RÉDIGÉ ÉDITORIAL (SANS TABLEAU) */
    .day-block {
      margin-bottom: 14px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px 16px;
      page-break-inside: avoid;
    }
    .day-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px dashed #E2E8F0;
    }
    .day-title {
      font-size: 13px;
      font-weight: 700;
      color: #1E293B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .day-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 10px;
      background: #F1F5F9;
      color: #475569;
    }
    .activity-entry {
      margin-bottom: 10px;
      padding-left: 12px;
      border-left: 3px solid ${secondaryColor};
    }
    .activity-entry:last-child {
      margin-bottom: 0;
    }
    .activity-title-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .activity-title {
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
    }
    .activity-category-tag {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      background: #EEF2FF;
      color: ${secondaryColor};
      padding: 2px 6px;
      border-radius: 4px;
    }
    .activity-desc {
      font-size: 12px;
      color: #475569;
      line-height: 1.5;
    }
    .empty-day-note {
      font-size: 11px;
      font-style: italic;
      color: #94A3B8;
      padding: 4px 0;
    }

    /* ENCADRÉS BILAN & PERSPECTIVES */
    .callout-box {
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 16px;
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
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .callout-body {
      font-size: 12.5px;
      color: #334155;
      line-height: 1.6;
      white-space: pre-line;
    }

    /* ZONE DE VALIDATION & SIGNATURE */
    .signatures-container {
      display: flex;
      justify-content: space-between;
      margin-top: 26px;
      padding-top: 14px;
      border-top: 1px solid #E2E8F0;
      page-break-inside: avoid;
    }
    .sign-box {
      width: 46%;
      background: #F8FAFC;
      border: 1px dashed #CBD5E1;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .sign-label {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .sign-status {
      font-size: 12px;
      color: #059669;
      font-weight: 600;
      margin-top: 18px;
    }

    /* PIED DE PAGE */
    .pdf-footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94A3B8;
    }

    /* RESPONSIVE MEDIA QUERIES (WEB / MOBILE) */
    @media (max-width: 680px) {
      body {
        padding: 8px;
        font-size: 12px;
      }
      .user-identity-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        padding: 12px;
      }
      .report-meta-right {
        text-align: left;
        width: 100%;
        padding-top: 8px;
        border-top: 1px solid #E2E8F0;
      }
      .signatures-container {
        flex-direction: column;
        gap: 12px;
      }
      .sign-box {
        width: 100%;
      }
      .activity-title-row {
        flex-wrap: wrap;
      }
      .pdf-footer {
        flex-direction: column;
        gap: 6px;
      }
    }
  </style>
</head>
<body>

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