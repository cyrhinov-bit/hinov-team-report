import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { WeeklyReport, UserProfile, Activity, CompanySettings } from '@/types';
import { SettingsService } from './settings';

export const PdfService = {
  buildHtmlReport(
    report: WeeklyReport,
    user: UserProfile,
    activitiesByDay: Record<number, Activity[]>,
    companySettings?: Partial<CompanySettings>
  ): string {
    const dayLabels = [
      { key: 1, name: 'LUNDI' },
      { key: 2, name: 'MARDI' },
      { key: 3, name: 'MERCREDI' },
      { key: 4, name: 'JEUDI' },
      { key: 5, name: 'VENDREDI' },
    ];

    const companyName = companySettings?.company_name || 'HINOV Group';
    const headerImageUrl = companySettings?.pdf_header_image;
    const footerText = companySettings?.pdf_footer_text || 'HINOV Team Report • Document Confidentiel';

    const avatarUrl =
      user.avatar_url ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';

    // Filter only days with activities
    const daysWithTasks = dayLabels.filter(
      (day) => (activitiesByDay[day.key] || []).length > 0
    );

    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Rapport Hebdomadaire - ${user.full_name}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm 12mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #303030;
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.45;
            background: #FFFFFF;
          }
          .color-line {
            height: 4px;
            background: linear-gradient(to right, #34495e, #9b59b6, #3498db, #62cb31, #ffb606, #e67e22, #e74c3c, #c0392b);
            margin-bottom: 12px;
            border-radius: 2px;
          }
          .header-banner-wrapper {
            width: 100%;
            margin-bottom: 12px;
            overflow: hidden;
            border-radius: 4px;
          }
          .header-banner-img {
            width: 100%;
            max-height: 120px;
            object-fit: contain;
            display: block;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2.5px solid #e12503;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }
          .brand-title {
            font-size: 22px;
            font-weight: 800;
            color: #e12503;
            letter-spacing: 0.5px;
          }
          .brand-subtitle {
            font-size: 11px;
            font-weight: 700;
            color: #676a6c;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .week-badge {
            background: #85060c;
            color: #FFFFFF;
            padding: 6px 14px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
            text-align: right;
          }
          .user-card {
            display: flex;
            align-items: center;
            background: #f5f5f5;
            border: 1px solid #e5e6e7;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 18px;
          }
          .avatar {
            width: 58px;
            height: 58px;
            border-radius: 50%;
            border: 2px solid #e12503;
            object-fit: cover;
            margin-right: 14px;
          }
          .user-details h2 {
            margin: 0 0 3px 0;
            font-size: 15px;
            color: #303030;
            font-weight: 700;
          }
          .user-details p {
            margin: 0;
            font-size: 11.5px;
            color: #676a6c;
          }
          .period-meta {
            margin-left: auto;
            text-align: right;
          }
          .period-label {
            font-size: 10px;
            color: #999999;
            text-transform: uppercase;
            font-weight: 600;
          }
          .period-value {
            font-size: 11.5px;
            font-weight: 700;
            color: #e12503;
          }
          .section-heading {
            font-size: 13px;
            font-weight: 800;
            color: #303030;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-left: 3.5px solid #e12503;
            padding-left: 8px;
            margin: 16px 0 8px 0;
          }
          .day-container {
            border: 1px solid #e5e6e7;
            border-radius: 6px;
            margin-bottom: 10px;
            overflow: hidden;
            background: #FFFFFF;
          }
          .day-title {
            background: #f5f5f5;
            padding: 6px 12px;
            font-size: 11.5px;
            font-weight: 700;
            color: #303030;
            border-bottom: 1px solid #e5e6e7;
            display: flex;
            justify-content: space-between;
          }
          .activity-row {
            padding: 7px 12px;
            border-bottom: 1px solid #f5f5f5;
          }
          .activity-row:last-child {
            border-bottom: none;
          }
          .act-title {
            font-weight: 600;
            color: #303030;
            font-size: 12px;
          }
          .act-desc {
            color: #676a6c;
            font-size: 11px;
            margin-top: 2px;
          }
          .tag-status {
            display: inline-block;
            font-size: 9px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 3px;
            margin-left: 6px;
          }
          .tag-terminee { background: #E8F8F0; color: #27AE60; }
          .tag-en_cours { background: #FEF5E7; color: #f8ac59; }
          .tag-en_attente { background: #f5f5f5; color: #676a6c; }
          .box-block {
            background: #f5f5f5;
            border: 1px solid #e5e6e7;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 12px;
          }
          .box-item {
            margin-bottom: 5px;
            font-size: 11.5px;
            display: flex;
            align-items: flex-start;
          }
          .box-item:last-child { margin-bottom: 0; }
          .bullet-diff { color: #e12503; font-weight: bold; margin-right: 6px; }
          .bullet-persp { color: #03a9f4; font-weight: bold; margin-right: 6px; }
          .footer {
            margin-top: 20px;
            padding-top: 8px;
            border-top: 1px solid #e5e6e7;
            font-size: 9.5px;
            color: #999999;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="color-line"></div>
        ${
          headerImageUrl
            ? `
          <div class="header-banner-wrapper">
            <img src="${headerImageUrl}" class="header-banner-img" alt="En-tête ${companyName}" />
          </div>
        `
            : ''
        }

        <div class="header">
          <div>
            <div class="brand-title">${companyName}</div>
            <div class="brand-subtitle">Hinov Team Report (HTR)</div>
          </div>
          <div class="week-badge">
            Semaine ${report.week_number} • ${report.year}
          </div>
        </div>

        <div class="user-card">
          <img class="avatar" src="${avatarUrl}" alt="${user.full_name}" />
          <div class="user-details">
            <h2>${user.full_name}</h2>
            <p>${user.job_title || 'Collaborateur'} — ${user.department || 'Département HINOV'}</p>
            <p style="font-size: 10.5px; color: #999999;">${user.email}</p>
          </div>
          <div class="period-meta">
            <div class="period-label">Période d'activité</div>
            <div class="period-value">${report.start_date} au ${report.end_date}</div>
          </div>
        </div>

        <div class="section-heading">1. Activités Réalisées par Jour</div>
        ${
          daysWithTasks.length === 0
            ? `<div class="box-block" style="color: #676a6c; font-style: italic;">Aucune activité enregistrée pour cette semaine.</div>`
            : daysWithTasks
                .map((day) => {
                  const list = activitiesByDay[day.key] || [];
                  return `
            <div class="day-container">
              <div class="day-title">
                <span>${day.name}</span>
                <span style="font-weight: 500; font-size: 10.5px; color: #676a6c;">${list.length} activité${
                    list.length > 1 ? 's' : ''
                  }</span>
              </div>
              ${list
                .map(
                  (a) => `
                <div class="activity-row">
                  <div class="act-title">
                    • ${a.title}
                    <span class="tag-status tag-${a.status}">${
                      a.status === 'terminee'
                        ? 'Terminée'
                        : a.status === 'en_cours'
                        ? 'En cours'
                        : 'En attente'
                    }</span>
                  </div>
                  ${
                    a.description
                      ? `<div class="act-desc">${a.description}</div>`
                      : ''
                  }
                </div>
              `
                )
                .join('')}
            </div>
          `;
                })
                .join('')
        }

        <div class="section-heading">2. Difficultés & Points d'Attention</div>
        <div class="box-block">
          ${
            !report.difficulties || report.difficulties.length === 0
              ? `<div style="color: #676a6c; font-style: italic;">Aucune difficulté technique ou blocage majeur signalé cette semaine.</div>`
              : report.difficulties
                  .map(
                    (d) => `
                <div class="box-item">
                  <span class="bullet-diff">⚠</span>
                  <span>${typeof d === 'string' ? d : (d as any).text || (d as any).title}</span>
                </div>
              `
                  )
                  .join('')
          }
        </div>

        <div class="section-heading">3. Perspectives & Priorités de la Semaine Suivante</div>
        <div class="box-block">
          ${
            !report.perspectives || report.perspectives.length === 0
              ? `<div style="color: #676a6c; font-style: italic;">Continuité opérationnelle des projets en cours.</div>`
              : report.perspectives
                  .map(
                    (p) => `
                <div class="box-item">
                  <span class="bullet-persp">➔</span>
                  <span>${typeof p === 'string' ? p : (p as any).text || (p as any).title}</span>
                </div>
              `
                  )
                  .join('')
          }
        </div>

        <div class="footer">
          <span>${footerText}</span>
          <span>Date d'édition : ${new Date().toLocaleDateString('fr-FR')}</span>
        </div>
      </body>
      </html>
    `;
  },

  async generatePdfFile(
    report: WeeklyReport,
    user: UserProfile,
    activitiesByDay: Record<number, Activity[]>,
    companySettings?: Partial<CompanySettings>
  ): Promise<{ uri: string; base64?: string }> {
    const settings = companySettings || (await SettingsService.getSettings());
    const html = this.buildHtmlReport(report, user, activitiesByDay, settings);

    // 1. Electron Desktop headless PDF generation
    if (typeof window !== 'undefined' && (window as any).electronAPI?.generatePdf) {
      try {
        const res = await (window as any).electronAPI.generatePdf(html);
        if (res.success && res.base64) {
          return { uri: '', base64: res.base64 };
        }
      } catch (err) {
        console.warn('Electron PDF generation fallback:', err);
      }
    }

    // 2. Mobile Native (iOS / Android) ONLY
    if (Platform.OS !== 'web') {
      try {
        const { uri, base64 } = await Print.printToFileAsync({
          html,
          base64: true,
        });
        return { uri, base64 };
      } catch (err) {
        return { uri: '', base64: '' };
      }
    }

    // 3. Web Browser (non-Electron): Never call printToFileAsync because on Web expo-print calls window.print()
    return { uri: '', base64: '' };
  },

  async sharePdf(
    report: WeeklyReport,
    user: UserProfile,
    activitiesByDay: Record<number, Activity[]>,
    companySettings?: Partial<CompanySettings>
  ): Promise<void> {
    const cleanName = (user.full_name || 'Utilisateur').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Rapport_S${report.week_number}_${report.year}_${cleanName}.pdf`;

    // 1. Electron Desktop native file save dialog
    if (typeof window !== 'undefined' && (window as any).electronAPI?.generatePdf && (window as any).electronAPI?.savePdfDialog) {
      const { base64 } = await this.generatePdfFile(report, user, activitiesByDay, companySettings);
      if (base64) {
        const res = await (window as any).electronAPI.savePdfDialog(fileName, base64);
        if (res.success || res.canceled) {
          return;
        }
      }
    }

    // 2. Mobile Sharing API (iOS / Android)
    if (Platform.OS !== 'web') {
      const { uri } = await this.generatePdfFile(report, user, activitiesByDay, companySettings);
      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: fileName,
        });
        return;
      }
    }

    // 3. Web Browser Download fallback
    if (report.pdf_url) {
      if (typeof window !== 'undefined') {
        const a = document.createElement('a');
        a.href = report.pdf_url;
        a.target = '_blank';
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
    }

    // Direct Web download as self-contained HTML report if PDF binary isn't natively produced in browser
    const settings = companySettings || (await SettingsService.getSettings());
    const html = this.buildHtmlReport(report, user, activitiesByDay, settings);
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `Rapport_S${report.week_number}_${report.year}_${cleanName}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch (e) {
        console.error('Web download error:', e);
      }
    }
  },

  async printReport(
    report: WeeklyReport,
    user: UserProfile,
    activitiesByDay: Record<number, Activity[]>,
    companySettings?: Partial<CompanySettings>
  ): Promise<void> {
    const settings = companySettings || (await SettingsService.getSettings());
    const html = this.buildHtmlReport(report, user, activitiesByDay, settings);

    // 1. Electron Desktop print
    if (typeof window !== 'undefined' && (window as any).electronAPI?.printHtml) {
      await (window as any).electronAPI.printHtml(html);
      return;
    }

    // 2. Web Browser isolated print iframe
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 2000);
        return;
      }
    }

    // 3. Mobile Native
    await Print.printAsync({ html });
  },
};
