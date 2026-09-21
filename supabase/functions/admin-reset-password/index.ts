// Supabase Edge Function: admin-reset-password
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateSecurePassword(length = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + numbers + symbols;

  let pwd = "";
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 4; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  return pwd
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
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
      data: { user: caller },
      error: callerError,
    } = await supabaseClient.auth.getUser();

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabaseClient
      .from("profiles")
      .select("role, is_active")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || !callerProfile.is_active || (callerProfile.role !== "directeur_admin" && callerProfile.role !== "super_admin")) {
      return new Response(JSON.stringify({ error: "Droits administrateur requis" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { targetUserId, manualPassword, autoGenerate = true } = body;

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "ID utilisateur cible requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tempPassword = autoGenerate ? generateSecurePassword(12) : manualPassword;

    if (!tempPassword || tempPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: "Le mot de passe doit contenir au moins 8 caractères." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update user password in Auth Admin
    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password: tempPassword,
      user_metadata: { must_change_password: true },
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark must_change_password in profiles
    await adminClient
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", targetUserId);

    // Log in audit_logs
    await adminClient.from("audit_logs").insert({
      actor_id: caller.id,
      action: "PASSWORD_RESET_BY_ADMIN",
      target_user_id: targetUserId,
      details: { forced_change: true },
    });

    // Return temporary password for ONE-TIME display to the admin
    return new Response(
      JSON.stringify({
        success: true,
        temporaryPassword: tempPassword,
        message: "Mot de passe temporaire défini avec succès. Communiquez-le à l'utilisateur.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

