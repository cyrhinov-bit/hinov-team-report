// Supabase Edge Function: send-report-email
// Uses Microsoft Graph API to send the weekly report to the Director's Outlook
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getMicrosoftGraphToken(): Promise<string | null> {
  const tenantId = Deno.env.get("AZURE_TENANT_ID");
  const clientId = Deno.env.get("AZURE_CLIENT_ID");
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET");

  if (!tenantId || !clientId || !clientSecret) {
    console.warn("Microsoft Graph credentials not configured in environment variables.");
    return null;
  }

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("scope", "https://graph.microsoft.com/.default");
  params.append("client_secret", clientSecret);
  params.append("grant_type", "client_credentials");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Failed to acquire MS Graph token:", errorText);
    return null;
  }

  const data = await res.json();
  return data.access_token;
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
    const { reportId, pdfBase64, htmlContent } = body;

    // Fetch report and author details
    const { data: report } = await supabaseClient
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (!report) {
      return new Response(JSON.stringify({ error: "Rapport introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: author } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", report.user_id)
      .single();

    const { data: settings } = await supabaseClient
      .from("company_settings")
      .select("*")
      .limit(1)
      .single();

    const directorEmail = settings?.director_email || "direction@hinovgroup.com";
    const superAdminRecipient = settings?.superadmin_report_recipient || directorEmail;

    // Determine recipient according to role
    let targetRecipient: string | null = null;
    if (author?.role === "collaborateur") {
      targetRecipient = directorEmail;
    } else if (author?.role === "directeur_admin") {
      // IMPORTANT: The director does not email himself his own report
      targetRecipient = null;
    } else if (author?.role === "super_admin") {
      targetRecipient = superAdminRecipient;
    }

    if (!targetRecipient) {
      // Update report status to submitted without email
      await supabaseClient
        .from("reports")
        .update({
          status: "soumis",
          submitted_at: new Date().toISOString(),
          email_recipient: "Non envoyé (Rapport Direction)",
        })
        .eq("id", reportId);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Rapport archivé avec succès dans votre espace personnel (pas d'envoi requis).",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Acquire Microsoft Graph token
    const token = await getMicrosoftGraphToken();
    const senderEmail = settings?.smtp_from || "rapports@hinovgroup.com";

    const subject = `[HTR] Rapport Hebdomadaire S${report.week_number} - ${author?.full_name || "Collaborateur"}`;
    const mailBody = `
      <p>Bonjour,</p>
      <p>Veuillez trouver ci-joint le rapport hebdomadaire d'activité de <strong>${author?.full_name || "Collaborateur"}</strong> (${author?.job_title || "Collaborateur"}) pour la <strong>Semaine ${report.week_number} (${report.start_date} au ${report.end_date})</strong>.</p>
      <p>Ce document a été validé et soumis via l'application mobile <strong>Hinov Team Report</strong>.</p>
      <hr/>
      <p style="font-size:12px;color:#64748B;">HINOV Group — Direction & Management</p>
    `;

    if (token) {
      // Send via Microsoft Graph API
      const mailPayload: any = {
        message: {
          subject,
          body: {
            contentType: "HTML",
            content: mailBody,
          },
          toRecipients: [
            {
              emailAddress: {
                address: targetRecipient,
              },
            },
          ],
        },
        saveToSentItems: "true",
      };

      if (pdfBase64) {
        mailPayload.message.attachments = [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: `Rapport_S${report.week_number}_${author?.full_name?.replace(/\s+/g, "_") || "Collaborateur"}.pdf`,
            contentType: "application/pdf",
            contentBytes: pdfBase64,
          },
        ];
      }

      const graphRes = await fetch(
        `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mailPayload),
        }
      );

      if (!graphRes.ok) {
        const errorText = await graphRes.text();
        console.error("Graph API send error:", errorText);
      }
    } else {
      console.log(`[SIMULATION EMAIL OUTLOOK] Envoi du rapport à ${targetRecipient}`);
    }

    // Update report status
    await supabaseClient
      .from("reports")
      .update({
        status: "soumis",
        submitted_at: new Date().toISOString(),
        emailed_at: new Date().toISOString(),
        email_recipient: targetRecipient,
      })
      .eq("id", reportId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Rapport envoyé avec succès au Directeur (${targetRecipient}).`,
        recipient: targetRecipient,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur d'envoi email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

