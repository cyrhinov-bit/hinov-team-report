import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Fetch all reports
    const { data: reports, error: rErr } = await supabaseAdmin
      .from("reports")
      .select(`
        id,
        user_id,
        week_number,
        year,
        start_date,
        end_date,
        status,
        submitted_at,
        created_at,
        pdf_url,
        difficulties,
        perspectives,
        content_snapshot
      `)
      .order("year", { ascending: false })
      .order("week_number", { ascending: false });

    if (rErr) throw rErr;

    // 2. Fetch all profiles to join
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, job_title, department, role");

    if (pErr) throw pErr;

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const enrichedReports = (reports || []).map((r) => {
      const p = profileMap.get(r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        author_name: p?.full_name || "Inconnu",
        author_email: p?.email || "Inconnu",
        author_department: p?.department || "-",
        author_role: p?.role || "-",
        week_number: r.week_number,
        year: r.year,
        period: `${r.start_date} au ${r.end_date}`,
        status: r.status,
        submitted_at: r.submitted_at,
        created_at: r.created_at,
        activities_count: Array.isArray(r.content_snapshot) ? r.content_snapshot.length : 0,
        difficulties_count: Array.isArray(r.difficulties) ? r.difficulties.length : 0,
        perspectives_count: Array.isArray(r.perspectives) ? r.perspectives.length : 0,
        has_pdf: Boolean(r.pdf_url),
        pdf_url: r.pdf_url,
      };
    });

    const submittedOnly = enrichedReports.filter((r) => r.status === "soumis");
    const draftsOnly = enrichedReports.filter((r) => r.status !== "soumis");

    return new Response(
      JSON.stringify({
        success: true,
        total_reports: enrichedReports.length,
        submitted_count: submittedOnly.length,
        drafts_count: draftsOnly.length,
        total_users: (profiles || []).length,
        users: profiles,
        submitted_reports: submittedOnly,
        all_reports: enrichedReports,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
