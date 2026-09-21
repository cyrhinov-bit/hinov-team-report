// Supabase Edge Function: admin-create-user
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

    // 1. Verify caller session
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

    // 2. Check caller role in DB
    const { data: callerProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role, is_active")
      .eq("id", caller.id)
      .single();

    if (profileError || !callerProfile || !callerProfile.is_active) {
      return new Response(JSON.stringify({ error: "Compte inactif ou invalide" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (callerProfile.role !== "directeur_admin" && callerProfile.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Droits administrateur requis" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      email,
      password,
      fullName,
      jobTitle,
      department,
      role = "collaborateur",
      isActive = true,
      mustChangePassword = true,
    } = body;

    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: "Email, mot de passe et nom complet requis." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Director cannot create super_admin
    if (role === "super_admin" && callerProfile.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Seul le Super Admin peut créer un Super Admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Admin Client with service_role key (server-side only)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create user in Supabase Auth
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        job_title: jobTitle,
        department,
        role,
        is_active: isActive,
        must_change_password: mustChangePassword,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert into public.profiles
    await adminClient.from("profiles").upsert({
      id: newUser.user.id,
      full_name: fullName,
      email,
      job_title: jobTitle,
      department,
      role,
      is_active: isActive,
      must_change_password: mustChangePassword,
    });

    // Log action in audit_logs
    await adminClient.from("audit_logs").insert({
      actor_id: caller.id,
      action: "USER_CREATED",
      target_user_id: newUser.user.id,
      details: { email, role, full_name: fullName },
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email,
          fullName,
          role,
          mustChangePassword,
        },
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

