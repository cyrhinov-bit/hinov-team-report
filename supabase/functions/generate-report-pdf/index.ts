// Supabase Edge Function: generate-report-pdf
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateCorporateHtml(reportData: any): string {
  const { profile, report, activitiesByDay, difficulties, perspectives, companySettings } = reportData;

  const daysOrder = [
    { key: 1, label: "LUNDI" },
    { key: 2, label: "MARDI" },
    { key: 3, label: "MERCREDI" },
    { key: 4, label: "JEUDI" },
    { key: 5, label: "VENDREDI" },
  ];

  const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";

  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <title>Rapport Hebdomadaire - ${profile?.full_name || "Collaborateur"}</title>
    <style>
      @page { size: A4 portrait; margin: 15mm; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #0F172A;
        margin: 0;
        padding: 0;
        background-color: #FFFFFF;
        font-size: 13px;
        line-height: 1.5;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #0B2240;
        padding-bottom: 12px;
        margin-bottom: 20px;
      }
      .company-brand {
        display: flex;
        flex-direction: column;
      }
      .company-name {
        font-size: 20px;
        font-weight: 800;
        color: #0B2240;
        letter-spacing: 0.5px;
      }
      .report-title {
        font-size: 13px;
        color: #64748B;
        font-weight: 600;
        text-transform: uppercase;
      }
      .user-card {
        display: flex;
        align-items: center;
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 20px;
      }
      .avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #0B2240;
        margin-right: 16px;
      }
      .user-info h2 {
        margin: 0 0 4px 0;
        font-size: 16px;
        color: #0B2240;
      }
      .user-info p {
        margin: 0;
        font-size: 12px;
        color: #64748B;
      }
      .meta-badges {
        margin-left: auto;
        text-align: right;
      }
      .badge {
        display: inline-block;
        padding: 4px 10px;
        background: #0B2240;
        color: #FFFFFF;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 700;
      }
      .section-title {
        font-size: 14px;
        font-weight: 700;
        color: #0B2240;
        border-left: 4px solid #0066CC;
        padding-left: 8px;
        margin: 18px 0 10px 0;
        text-transform: uppercase;
      }
      .day-block {
        margin-bottom: 12px;
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        overflow: hidden;
      }
      .day-header {
        background: #F1F5F9;
        font-weight: 700;
        font-size: 12px;
        color: #1E293B;
        padding: 6px 12px;
        border-bottom: 1px solid #E2E8F0;
      }
      .activity-item {
        padding: 8px 12px;
        border-bottom: 1px solid #F1F5F9;
      }
      .activity-item:last-child {
        border-bottom: none;
      }
      .activity-title {
        font-weight: 600;
        color: #0F172A;
        font-size: 12px;
      }
      .activity-desc {
        color: #475569;
        font-size: 11.5px;
        margin-top: 2px;
      }
      .status-pill {
        display: inline-block;
        font-size: 9px;
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: 600;
        margin-left: 6px;
      }
      .status-terminee { background: #DCFCE7; color: #166534; }
      .status-en_cours { background: #FEF3C7; color: #92400E; }
      .status-en_attente { background: #F3F4F6; color: #4B5563; }
      .box-list {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        padding: 10px 14px;
      }
      .box-item {
        margin-bottom: 6px;
        display: flex;
        align-items: flex-start;
      }
      .box-item:last-child { margin-bottom: 0; }
      .bullet {
        color: #0066CC;
        font-weight: bold;
        margin-right: 8px;
      }
      .footer {
        margin-top: 25px;
        padding-top: 10px;
        border-top: 1px solid #E2E8F0;
        font-size: 10px;
        color: #94A3B8;
        display: flex;
        justify-content: space-between;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="company-brand">
        <span class="company-name">${companySettings?.company_name || "HINOV GROUP"}</span>
        <span class="report-title">Rapport Hebdomadaire d'Activité</span>
      </div>
      <div>
        <span class="badge">Semaine ${report?.week_number} • ${report?.year}</span>
      </div>
    </div>

    <div class="user-card">
      <img class="avatar" src="${profile?.avatar_url || defaultAvatar}" alt="Photo de profil" />
      <div class="user-info">
        <h2>${profile?.full_name || "Collaborateur"}</h2>
        <p>${profile?.job_title || "Fonction non définie"} — ${profile?.department || "Département"}</p>
        <p style="font-size: 11px; color: #94A3B8;">${profile?.email || ""}</p>
      </div>
      <div class="meta-badges">
        <div style="font-size: 11px; color: #64748B;">Période du :</div>
        <div style="font-weight: 700; font-size: 12px; color: #0B2240;">
          ${report?.start_date || ""} au ${report?.end_date || ""}
        </div>
      </div>
    </div>

    <div class="section-title">1. Activités Réalisées par Jour</div>
    ${(() => {
      const daysWithTasks = daysOrder.filter(
        (day) => (activitiesByDay[day.key] || []).length > 0
      );
      if (daysWithTasks.length === 0) {
        return `<div class="box-list" style="color: #64748B; font-style: italic;">Aucune activité enregistrée cette semaine.</div>`;
      }
      return daysWithTasks
        .map((day) => {
          const dayActs = activitiesByDay[day.key] || [];
          return `
          <div class="day-block">
            <div class="day-header">${day.label} (${dayActs.length} activité${dayActs.length > 1 ? "s" : ""})</div>
            ${dayActs
              .map(
                (act: any) => `
              <div class="activity-item">
                <div class="activity-title">
                  • ${act.title}
                  <span class="status-pill status-${act.status || "terminee"}">${
                    act.status === "terminee" ? "Terminée" : act.status === "en_cours" ? "En cours" : "En attente"
                  }</span>
                </div>
                ${act.description ? `<div class="activity-desc">${act.description}</div>` : ""}
              </div>
            `
              )
              .join("")}
          </div>
        `;
        })
        .join("");
    })()}

    <div class="section-title">2. Difficultés Rencontrées</div>
    <div class="box-list">
      ${
        !difficulties || difficulties.length === 0
          ? `<div style="color: #64748B; font-style: italic;">Aucune difficulté particulière signalée cette semaine.</div>`
          : difficulties
              .map(
                (diff: any) => `
            <div class="box-item">
              <span class="bullet">⚠</span>
              <span>${typeof diff === "string" ? diff : diff.text || diff.title}</span>
            </div>
          `
              )
              .join("")
      }
    </div>

    <div class="section-title">3. Perspectives & Priorités de la Semaine Suivante</div>
    <div class="box-list">
      ${
        !perspectives || perspectives.length === 0
          ? `<div style="color: #64748B; font-style: italic;">Objectifs réguliers et continuité des projets en cours.</div>`
          : perspectives
              .map(
                (persp: any) => `
            <div class="box-item">
              <span class="bullet">➔</span>
              <span>${typeof persp === "string" ? persp : persp.text || persp.title}</span>
            </div>
          `
              )
              .join("")
      }
    </div>

    <div class="footer">
      <span>Généré automatiquement par Hinov Team Report (HTR)</span>
      <span>Document confidentiel à usage interne exclusif</span>
    </div>
  </body>
  </html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { reportId } = body;

    if (!reportId) {
      return new Response(JSON.stringify({ error: "ID du rapport requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch report details
    const { data: report, error: reportErr } = await supabaseClient
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportErr || !report) {
      return new Response(JSON.stringify({ error: "Rapport introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch author profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", report.user_id)
      .single();

    // Fetch company settings
    const { data: companySettings } = await supabaseClient
      .from("company_settings")
      .select("*")
      .limit(1)
      .single();

    // Group activities by day
    const activitiesByDay: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    const snapshot = Array.isArray(report.content_snapshot) ? report.content_snapshot : [];
    snapshot.forEach((act: any) => {
      const day = act.day_of_week || 1;
      if (!activitiesByDay[day]) activitiesByDay[day] = [];
      activitiesByDay[day].push(act);
    });

    const html = generateCorporateHtml({
      profile,
      report,
      activitiesByDay,
      difficulties: report.difficulties,
      perspectives: report.perspectives,
      companySettings,
    });

    return new Response(
      JSON.stringify({
        success: true,
        html,
        fileName: `HTR_Rapport_S${report.week_number}_${profile?.full_name?.replace(/\s+/g, "_") || "Collaborateur"}.html`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur de génération PDF" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

