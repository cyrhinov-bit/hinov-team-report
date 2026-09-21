import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { WeeklyReport, UserProfile, Activity } from '@/types';

export const PdfService = {
  buildHtmlReport(
    report: WeeklyReport,
    user: UserProfile,
    activitiesByDay: Record<number, Activity[]>,
    companyName = 'HINOV Group'
  ): string {
    const dayLabels = [
      { key: 1, name: 'LUNDI' },
      { key: 2, name: 'MARDI' },
      { key: 3, name: 'MERCREDI' },
      { key: 4, name: 'JEUDI' },
      { key: 5, name: 'VENDREDI' },
    ];

    const avatarUrl =
      user.avatar_url ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';

    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Rapport Hebdomadaire - ${user.full_name}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0F172A;
            margin: 0;
            padding: 0;
            font-size: 12.5px;
            line-height: 1.5;
            background: #FFFFFF;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2.5px solid #0B2240;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .brand-title {
            font-size: 22px;
            font-weight: 800;
            color: #0B2240;
            letter-spacing: 0.5px;
          }
          .brand-subtitle {
            font-size: 11px;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .week-badge {
            background: #0B2240;
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
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 18px;
          }
          .avatar {
            width: 58px;
            height: 58px;
            border-radius: 50%;
            border: 2px solid #0B2240;
            object-fit: cover;
            margin-right: 14px;
          }
          .user-details h2 {
            margin: 0 0 3px 0;
            font-size: 15px;
            color: #0B2240;
            font-weight: 700;
          }
          .user-details p {
            margin: 0;
            font-size: 11.5px;
            color: #64748B;
          }
          .period-meta {
            margin-left: auto;
            text-align: right;
          }
          .period-label {
            font-size: 10px;
            color: #94A3B8;
            text-transform: uppercase;
            font-weight: 600;
          }
          .period-value {
            font-size: 11.5px;
            font-weight: 700;
            color: #0B2240;
          }
          .section-heading {
            font-size: 13px;
            font-weight: 800;
            color: #0B2240;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-left: 3.5px solid #0066CC;
            padding-left: 8px;
            margin: 16px 0 8px 0;
          }
          .day-container {
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            margin-bottom: 10px;
            overflow: hidden;
            background: #FFFFFF;
          }
          .day-title {
            background: #F1F5F9;
            padding: 6px 12px;
            font-size: 11.5px;
            font-weight: 700;
            color: #1E293B;
            border-bottom: 1px solid #E2E8F0;
            display: flex;
            justify-content: space-between;
          }
          .activity-row {
            padding: 7px 12px;
            border-bottom: 1px solid #F8FAFC;
          }
          .activity-row:last-child {
            border-bottom: none;
          }
          .act-title {
            font-weight: 600;
            color: #0F172A;
            font-size: 12px;
          }
          .act-desc {
            color: #475569;
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
          .tag-terminee { background: #DCFCE7; color: #166534; }
          .tag-en_cours { background: #FEF3C7; color: #92400E; }
          .tag-en_attente { background: #F1F5F9; color: #475569; }
          .box-block {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
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
          .bullet-diff { color: #EF4444; font-weight: bold; margin-right: 6px; }
          .bullet-persp { color: #0066CC; font-weight: bold; margin-right: 6px; }
          .footer {
            margin-top: 20px;
            padding-top: 8px;
            border-top: 1px solid #E2E8F0;
            font-size: 9.5px;
            color: #94A3B8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
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
            <p style="font-size: 10.5px; color: #94A3B8;">${user.email}</p>
          </div>
          <div class="period-meta">
            <div class="period-label">Période d'activité</div>
            <div class="period-value">${report.start_date} au ${report.end_date}</div>
          </div>
        </div>

        <div class="section-heading">1. Activités Réalisées par Jour</div>
        ${dayLabels
          .map((day) => {
            const list = activitiesByDay[day.key] || [];
            return `
            <div class="day-container">
              <div class="day-title">
                <span>${day.name}</span>
                <span style="font-weight: 500; font-size: 10.5px; color: #64748B;">${list.length} activité${
              list.length > 1 ? 's' : ''
            }</span>
              </div>
              ${
                list.length === 0
                  ? `<div class="activity-row" style="color: #94A3B8; font-style: italic;">Aucune tâche renseignée pour ce jour.</div>`
                  : list
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
                      ${a.description ? `<div class="act-desc">${a.description}</div>` : ''}
                    </div>
                  `
                      )
                      .join('')
              }
            </div>
          `;
          })
          .join('')}

        <div class="section-heading">2. Difficultés Rencontrées</div>
        <div class="box-block">
          ${
            !report.difficulties || report.difficulties.length === 0
              ? `<div style="color: #64748B; font-style: italic;">Aucune difficulté particulière signalée.</div>`
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
              ? `<div style="color: #64748B; font-style: italic;">Continuité opérationnelle des projets en cours.</div>`
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
          <span>Généré avec Hinov Team Report (HTR) • Document Confidentiel</span>
          <span>Date : ${new Date().toLocaleDateString('fr-FR')}</span>
        </div>
      </body>
      </html>
    `;
  },

  async generatePdfFile(
    report: WeeklyReport,
    user: UserProfile,
    activitiesByDay: Record<number, Activity[]>
  ): Promise<{ uri: string; base64?: string }> {
    const html = this.buildHtmlReport(report, user, activitiesByDay);
    const { uri, base64 } = await Print.printToFileAsync({
      html,
      base64: true,
    });
    return { uri, base64 };
  },

  async sharePdf(
    report: WeeklyReport,
    user: UserProfile,
    activitiesByDay: Record<number, Activity[]>
  ): Promise<void> {
    const { uri } = await this.generatePdfFile(report, user, activitiesByDay);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Rapport_S${report.week_number}_${user.full_name}`,
      });
    }
  },

  async printReport(
    report: WeeklyReport,
    user: UserProfile,
    activitiesByDay: Record<number, Activity[]>
  ): Promise<void> {
    const html = this.buildHtmlReport(report, user, activitiesByDay);
    await Print.printAsync({ html });
  },
};

