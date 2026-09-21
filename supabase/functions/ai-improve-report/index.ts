// Supabase Edge Function: ai-improve-report
// Enhances phrasing, conciseness, and professionalism using Google Gemini API
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

    const { data: userProfile } = await supabaseClient
      .from("profiles")
      .select("custom_gemini_api_key")
      .eq("id", user.id)
      .single();

    const body = await req.json();
    const { activitiesByDay, difficulties, perspectives, tone = "corporate_pro" } = body;

    // Use user custom key or fallback to enterprise server key
    const geminiKey =
      userProfile?.custom_gemini_api_key ||
      body.customApiKey ||
      Deno.env.get("GEMINI_API_KEY");

    if (!geminiKey) {
      return new Response(
        JSON.stringify({
          error: "Aucune clé API Gemini configurée. Veuillez renseigner votre clé dans votre profil ou contacter l'administrateur.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `
Tu es un assistant exécutif et expert en communication d'entreprise pour le groupe HINOV Group.
Améliore la rédaction, la clarté et l'impact professionnel du rapport hebdomadaire d'activité ci-dessous.

RÈGLES STRICTES :
1. Conserve STRICTEMENT la structure par jour (Lundi, Mardi, Mercredi, Jeudi, Vendredi). Ne mélange jamais les activités entre les jours.
2. Conserve fidèlement la vérité factuelle des activités, difficultés et perspectives. N'invente aucun fait, chiffre ou mission imaginaire.
3. Rends le ton corporate, soigné, dynamique et orienté résultats.
4. Corrige les fautes d'orthographe, de syntaxe et de ponctuation.
5. Renvoie UNIQUEMENT un JSON valide au format exact suivant sans bloc markdown autour (pas de \`\`\`json) :

{
  "activitiesByDay": {
    "1": [{ "title": "...", "description": "...", "status": "terminee|en_cours|en_attente", "category": "..." }],
    "2": [...],
    "3": [...],
    "4": [...],
    "5": [...]
  },
  "difficulties": [
    "Difficulté 1 formulée de façon professionnelle...",
    "Difficulté 2..."
  ],
  "perspectives": [
    "Perspective 1 pour la semaine prochaine...",
    "Perspective 2..."
  ],
  "summary": "Court résumé exécutif de 2 phrases sur les réalisations de la semaine."
}

DONNÉES EN ENTRÉE :
Activités par jour : ${JSON.stringify(activitiesByDay || {})}
Difficultés : ${JSON.stringify(difficulties || [])}
Perspectives : ${JSON.stringify(perspectives || [])}
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      return new Response(JSON.stringify({ error: `Erreur Gemini API: ${errText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    let resultJson;
    try {
      resultJson = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
    } catch {
      resultJson = { rawText, error: "Parsing JSON error" };
    }

    return new Response(JSON.stringify({ success: true, enhanced: resultJson }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur IA" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

