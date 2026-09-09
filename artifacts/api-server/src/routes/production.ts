import { Router, type IRouter } from "express";
import {
  decryptSecret,
  encryptSecret,
  getBearerToken,
  getSupabaseUser,
  supabaseRequest,
  supabaseAdminRequest,
} from "../lib/supabase";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password) {
    res.status(400).json({ message: "Email et mot de passe requis." });
    return;
  }

  const response = await supabaseRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const payload = (await response.json().catch(() => ({}))) as { msg?: string; message?: string };
  if (!response.ok) {
    res.status(response.status === 400 ? 401 : 502).json({ message: "Connexion impossible.", detail: payload?.msg ?? payload?.message });
    return;
  }
  res.json(payload);
});

router.post(["/auth/forgot-password", "/auth/recover"], async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!email) {
    res.status(400).json({ message: "Email professionnel requis." });
    return;
  }

  try {
    const response = await supabaseRequest("/auth/v1/recover", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      res.status(response.status).json({
        message: "Impossible d'envoyer l'email automatique de récupération.",
        detail: payload,
      });
      return;
    }

    res.json({
      success: true,
      message: "Un email contenant le lien de réinitialisation a été envoyé à votre adresse.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la demande de réinitialisation.",
      detail: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

router.post("/auth/refresh", async (req, res) => {
  const refreshToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken.trim() : "";
  if (!refreshToken) {
    res.status(400).json({ message: "Refresh token requis." });
    return;
  }

  const response = await supabaseRequest("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    res.status(response.status === 400 ? 401 : 502).json({ message: "Échec du rafraîchissement de la session.", detail: payload });
    return;
  }
  res.json(payload);
});

router.get("/auth/me", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }
  const profileResponse = await supabaseRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,full_name,role,department,avatar_url`, {
    headers: { Authorization: `Bearer ${getBearerToken(req)}` },
  });
  const profiles = (profileResponse.ok ? await profileResponse.json() : []) as Array<Record<string, unknown>>;
  res.json({ user, profile: profiles[0] ?? null });
});

router.get("/activities", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }
  const response = await supabaseRequest(
    `/rest/v1/activities?user_id=eq.${encodeURIComponent(user.id)}&select=id,activity_date,title,description,category,status&order=activity_date.desc,created_at.desc`,
    { headers: { Authorization: `Bearer ${getBearerToken(req)}` } },
  );
  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    res.status(502).json({ message: "Impossible de récupérer les activités.", detail: payload });
    return;
  }
  res.json(payload);
});

router.post("/activities", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }
  const { activity_date, title, description, category, status } = req.body ?? {};
  if (!activity_date || !title) {
    res.status(400).json({ message: "Date et titre requis." });
    return;
  }
  if (typeof activity_date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(activity_date)) {
    res.status(400).json({ message: "Format de date invalide. Utilisez AAAA-MM-JJ." });
    return;
  }
  const allowedStatuses = ["Terminée", "En cours", "En attente"];
  const allowedCategories = ["Coordination", "Clients", "Production", "Administration"];
  const safeTitle = typeof title === "string" ? title.trim().slice(0, 200) : "";
  const safeDescription = typeof description === "string" ? description.trim().slice(0, 2000) : "";
  const safeCategory = typeof category === "string" && allowedCategories.includes(category) ? category : "Coordination";
  const safeStatus = typeof status === "string" && allowedStatuses.includes(status) ? status : "En cours";
  const response = await supabaseRequest("/rest/v1/activities", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getBearerToken(req)}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      user_id: user.id,
      activity_date,
      title: safeTitle,
      description: safeDescription,
      category: safeCategory,
      status: safeStatus,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    res.status(502).json({ message: "Impossible d'enregistrer l'activité.", detail: payload });
    return;
  }
  res.status(201).json(Array.isArray(payload) ? payload[0] : payload);
});

router.delete("/activities/:id", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }
  const response = await supabaseRequest(`/rest/v1/activities?id=eq.${encodeURIComponent(req.params.id)}&user_id=eq.${encodeURIComponent(user.id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getBearerToken(req)}` },
  });
  if (!response.ok) {
    res.status(502).json({ message: "Impossible de supprimer l’activité." });
    return;
  }
  res.status(204).send();
});

router.patch("/activities/:id", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }
  const allowed = ["activity_date", "title", "description", "category", "status"] as const;
  const updates = Object.fromEntries(
    allowed.filter((key) => req.body?.[key] !== undefined).map((key) => [key, req.body[key]]),
  );
  if (!Object.keys(updates).length) {
    res.status(400).json({ message: "Aucune modification fournie." });
    return;
  }
  const response = await supabaseRequest(
    `/rest/v1/activities?id=eq.${encodeURIComponent(req.params.id)}&user_id=eq.${encodeURIComponent(user.id)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${getBearerToken(req)}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
    },
  );
  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    res.status(502).json({ message: "Impossible de modifier l’activité.", detail: payload });
    return;
  }
  res.json(Array.isArray(payload) ? payload[0] : payload);
});

router.patch("/profile", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }
  const allowedRoles = ["COLLABORATEUR", "ADMIN", "SUPERADMIN"];
  const rawRole = typeof req.body?.role === "string" ? req.body.role.trim().toUpperCase() : undefined;
  const safeRole = rawRole && allowedRoles.includes(rawRole) ? rawRole : undefined;
  const updates = Object.fromEntries(
    ["full_name", "department", "avatar_url"]
      .filter((key) => req.body?.[key] !== undefined)
      .map((key) => [key, req.body[key]]),
  );
  if (safeRole) updates.role = safeRole;
  if (!Object.keys(updates).length) {
    res.status(400).json({ message: "Aucune modification fournie." });
    return;
  }
  const response = await supabaseRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${getBearerToken(req)}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
  });
  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    res.status(502).json({ message: "Impossible de mettre à jour le profil.", detail: payload });
    return;
  }
  res.json(Array.isArray(payload) ? payload[0] : payload);
});

router.get("/ai-settings", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }
  const response = await supabaseRequest(`/rest/v1/user_ai_settings?user_id=eq.${encodeURIComponent(user.id)}&select=provider,key_last_four,updated_at`, {
    headers: { Authorization: `Bearer ${getBearerToken(req)}` },
  });
  const payload = (response.ok ? await response.json() : []) as Array<Record<string, unknown>>;
  res.json({ configured: Array.isArray(payload) && payload.length > 0, settings: payload[0] ?? null });
});

router.post("/ai-settings", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }
  const apiKey = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";
  if (apiKey.length < 10) {
    res.status(400).json({ message: "Clé Gemini invalide." });
    return;
  }
  const encryptedApiKey = encryptSecret(apiKey);
  const response = await supabaseRequest("/rest/v1/user_ai_settings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getBearerToken(req)}`,
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      user_id: user.id,
      provider: "gemini",
      encrypted_api_key: encryptedApiKey,
      key_last_four: apiKey.slice(-4),
      updated_at: new Date().toISOString(),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    res.status(502).json({ message: "Impossible de sécuriser la clé Gemini.", detail: payload });
    return;
  }
  res.json({ configured: true, keyLastFour: apiKey.slice(-4) });
});

router.delete("/ai-settings", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }
  const response = await supabaseRequest(`/rest/v1/user_ai_settings?user_id=eq.${encodeURIComponent(user.id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getBearerToken(req)}` },
  });
  if (!response.ok) {
    res.status(502).json({ message: "Impossible de supprimer la clé Gemini." });
    return;
  }
  res.status(204).send();
});

router.get("/reports", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }
  const weekStart = typeof req.query.week_start === "string" ? req.query.week_start : "";
  if (weekStart && !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    res.status(400).json({ message: "Format de date invalide pour week_start." });
    return;
  }
  const filter = weekStart ? `&week_start=eq.${encodeURIComponent(weekStart)}` : "";
  const response = await supabaseRequest(
    `/rest/v1/weekly_reports?user_id=eq.${encodeURIComponent(user.id)}${filter}&select=id,week_start,difficulties,perspectives,improved_difficulties,improved_perspectives,status`,
    { headers: { Authorization: `Bearer ${getBearerToken(req)}` } },
  );
  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    res.status(502).json({ message: "Impossible de récupérer le rapport.", detail: payload });
    return;
  }
  res.json(Array.isArray(payload) ? payload[0] ?? null : payload);
});

router.post("/reports", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }
  const { week_start, difficulties, perspectives, improved_difficulties, improved_perspectives, status } = req.body ?? {};
  if (!week_start) {
    res.status(400).json({ message: "Semaine du rapport requise." });
    return;
  }
  if (typeof week_start === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(week_start)) {
    res.status(400).json({ message: "Format de date invalide pour week_start." });
    return;
  }
  const response = await supabaseRequest("/rest/v1/weekly_reports", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getBearerToken(req)}`,
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      user_id: user.id,
      week_start,
      difficulties: difficulties ?? "",
      perspectives: perspectives ?? "",
      improved_difficulties: improved_difficulties ?? null,
      improved_perspectives: improved_perspectives ?? null,
      status: status ?? "DRAFT",
      updated_at: new Date().toISOString(),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    res.status(502).json({ message: "Impossible d’enregistrer le rapport.", detail: payload });
    return;
  }
  res.json(Array.isArray(payload) ? payload[0] : payload);
});

router.post("/reports/improve", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }
  const difficulties = typeof req.body?.difficulties === "string" ? req.body.difficulties.trim() : "";
  const perspectives = typeof req.body?.perspectives === "string" ? req.body.perspectives.trim() : "";
  if (!difficulties && !perspectives) {
    res.status(400).json({ message: "Ajoutez une difficulté ou une perspective." });
    return;
  }
  const settingsResponse = await supabaseRequest(
    `/rest/v1/user_ai_settings?user_id=eq.${encodeURIComponent(user.id)}&select=encrypted_api_key`,
    { headers: { Authorization: `Bearer ${getBearerToken(req)}` } },
  );
  const settings = (await settingsResponse.json().catch(() => [])) as Array<{ encrypted_api_key?: string }>;
  if (!settingsResponse.ok || !settings[0]?.encrypted_api_key) {
    res.status(409).json({ message: "Configurez d’abord votre clé Gemini dans Paramètres IA." });
    return;
  }

  let apiKey: string;
  try {
    apiKey = decryptSecret(settings[0].encrypted_api_key);
  } catch {
    res.status(500).json({ message: "La configuration Gemini est illisible. Enregistrez une nouvelle clé." });
    return;
  }

  const prompt = [
    "Tu es l'assistant de rédaction interne de HINOV Group.",
    "Améliore le texte professionnellement en français, sans inventer de faits.",
    'Réponds uniquement avec un objet JSON valide contenant "difficulties" et "perspectives".',
    `Difficultés: ${difficulties || "(aucune)"}`,
    `Perspectives: ${perspectives || "(aucune)"}`,
  ].join("\n");
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.3,
        },
      }),
    },
  );
  const geminiPayload = await geminiResponse.json().catch(() => ({})) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (!geminiResponse.ok) {
    res.status(502).json({ message: "Gemini n’a pas pu améliorer ce rapport." });
    return;
  }
  const text = geminiPayload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  try {
    const normalized = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    const improved = JSON.parse(normalized) as { difficulties?: string; perspectives?: string };
    res.json({
      difficulties: improved.difficulties ?? difficulties,
      perspectives: improved.perspectives ?? perspectives,
    });
  } catch {
    res.status(502).json({ message: "La réponse Gemini n’a pas pu être interprétée." });
  }
});

// ==========================================
// GESTION D'ÉQUIPE (ADMIN / SUPERADMIN)
// ==========================================

router.get("/admin/users", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }

  // 1. Récupérer la liste des profils (sans la colonne email qui n'existe pas dans profiles)
  const profilesRes = await supabaseAdminRequest(
    "/rest/v1/profiles?select=id,full_name,role,department,avatar_url,created_at&order=created_at.desc",
  );
  let rawProfiles = (profilesRes.ok ? await profilesRes.json() : []) as Array<Record<string, any>>;

  if (!Array.isArray(rawProfiles) || rawProfiles.length === 0) {
    const fallbackRes = await supabaseRequest(
      "/rest/v1/profiles?select=id,full_name,role,department,avatar_url,created_at&order=created_at.desc",
      { headers: { Authorization: `Bearer ${getBearerToken(req)}` } }
    );
    rawProfiles = (fallbackRes.ok ? await fallbackRes.json() : []) as Array<Record<string, any>>;
  }

  // 2. Récupérer les emails depuis auth.users
  const authUsersRes = await supabaseAdminRequest("/auth/v1/admin/users?per_page=100");
  const authData = (authUsersRes.ok ? await authUsersRes.json() : {}) as { users?: Array<{ id: string; email?: string }> };
  const emailMap = new Map((authData.users ?? []).map((u) => [u.id, u.email || ""]));

  const formatted = (Array.isArray(rawProfiles) ? rawProfiles : []).map((p) => ({
    id: p.id,
    email: emailMap.get(p.id) || "",
    fullName: p.full_name || p.fullName || "Collaborateur",
    role: p.role || "COLLABORATEUR",
    department: p.department || "Développement",
    avatarUrl: p.avatar_url || p.avatarUrl || null,
    createdAt: p.created_at || new Date().toISOString(),
  }));

  res.json(formatted);
});

router.post("/admin/users", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }

  const { fullName, email, password, department, role } = req.body ?? {};
  if (!fullName || !email) {
    res.status(400).json({ message: "Nom complet et adresse email requis." });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPass = password && String(password).length >= 6 ? String(password) : "Hinov2026!";
  const cleanRole = role && ["ADMIN", "SUPERADMIN", "COLLABORATEUR"].includes(String(role).toUpperCase()) ? String(role).toUpperCase() : "COLLABORATEUR";
  const cleanDept = String(department || "Développement").trim();

  let createdUserId: string | null = null;
  let authErrorDetail = "";

  // 1. Création via Supabase Auth Admin (/auth/v1/admin/users)
  const createAuthRes = await supabaseAdminRequest("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email: cleanEmail,
      password: cleanPass,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        role: cleanRole,
        department: cleanDept,
      },
    }),
  });

  const adminAuthPayload = (await createAuthRes.json().catch(() => ({}))) as Record<string, any>;
  if (createAuthRes.ok && (adminAuthPayload.id || adminAuthPayload.user?.id)) {
    createdUserId = adminAuthPayload.id || adminAuthPayload.user?.id;
  } else {
    authErrorDetail = adminAuthPayload.msg || adminAuthPayload.message || "";
    // Si l'utilisateur existe déjà, retrouver son identifiant
    const authUsersRes = await supabaseAdminRequest("/auth/v1/admin/users?per_page=100");
    const authData = (authUsersRes.ok ? await authUsersRes.json() : {}) as { users?: Array<{ id: string; email?: string }> };
    const existing = (authData.users ?? []).find((u) => u.email?.toLowerCase() === cleanEmail);
    if (existing) {
      createdUserId = existing.id;
    } else {
      // 2. Fallback via /auth/v1/signup
      const signupRes = await supabaseRequest("/auth/v1/signup", {
        method: "POST",
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPass,
          data: {
            full_name: fullName.trim(),
            role: cleanRole,
            department: cleanDept,
          },
        }),
      });
      const signupPayload = (await signupRes.json().catch(() => ({}))) as Record<string, any>;
      if (signupRes.ok && (signupPayload.id || signupPayload.user?.id)) {
        createdUserId = signupPayload.id || signupPayload.user?.id;
      }
    }
  }

  if (!createdUserId) {
    res.status(400).json({
      message: authErrorDetail || "Impossible de créer le compte utilisateur.",
    });
    return;
  }

  // 3. Insérer ou mettre à jour dans public.profiles avec la clé service_role (sans colonne email)
  const profileUpsertRes = await supabaseAdminRequest("/rest/v1/profiles", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      id: createdUserId,
      full_name: fullName.trim(),
      role: cleanRole,
      department: cleanDept,
      updated_at: new Date().toISOString(),
    }),
  });

  const profilePayload = await profileUpsertRes.json().catch(() => ({}));

  res.status(201).json({
    id: createdUserId,
    email: cleanEmail,
    fullName: fullName.trim(),
    role: cleanRole,
    department: cleanDept,
    temporaryPassword: cleanPass,
    createdAt: new Date().toISOString(),
  });
});

router.patch("/admin/users/:id", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }

  const targetId = req.params.id;
  const { fullName, department, role, password } = req.body ?? {};

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (fullName !== undefined) updates.full_name = String(fullName).trim();
  if (department !== undefined) updates.department = String(department).trim();
  if (role !== undefined) updates.role = String(role).trim().toUpperCase();

  const response = await supabaseAdminRequest(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(targetId)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(updates),
    },
  );

  // Mettre à jour les métadonnées auth & le mot de passe si renseigné
  const authUpdatePayload: Record<string, any> = {
    user_metadata: {
      ...(fullName ? { full_name: String(fullName).trim() } : {}),
      ...(department ? { department: String(department).trim() } : {}),
      ...(role ? { role: String(role).trim().toUpperCase() } : {}),
    },
  };
  if (password && String(password).length >= 6) {
    authUpdatePayload.password = String(password);
    authUpdatePayload.email_confirm = true;
  }

  await supabaseAdminRequest(`/auth/v1/admin/users/${encodeURIComponent(targetId)}`, {
    method: "PUT",
    body: JSON.stringify(authUpdatePayload),
  }).catch(() => {});

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    res.status(502).json({ message: "Impossible de mettre à jour l'utilisateur.", detail: payload });
    return;
  }

  res.json(Array.isArray(payload) ? payload[0] : payload);
});

router.post("/admin/users/:id/reset-password", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }

  const targetId = req.params.id;
  const newPass = req.body?.password && String(req.body.password).length >= 6
    ? String(req.body.password)
    : "Hinov2026!";

  const resetRes = await supabaseAdminRequest(`/auth/v1/admin/users/${encodeURIComponent(targetId)}`, {
    method: "PUT",
    body: JSON.stringify({
      password: newPass,
      email_confirm: true,
    }),
  });

  const payload = (await resetRes.json().catch(() => ({}))) as Record<string, any>;
  if (!resetRes.ok) {
    res.status(502).json({ message: "Impossible de réinitialiser le mot de passe.", detail: payload });
    return;
  }

  res.json({
    success: true,
    temporaryPassword: newPass,
    message: "Mot de passe réinitialisé avec succès.",
  });
});

router.delete("/admin/users/:id", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }

  const targetId = req.params.id;

  // Supprimer de auth admin et de profiles
  await supabaseAdminRequest(`/auth/v1/admin/users/${encodeURIComponent(targetId)}`, { method: "DELETE" });
  await supabaseAdminRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(targetId)}`, { method: "DELETE" });

  res.status(204).send();
});

// ==========================================
// RAPPORTS DE L'ÉQUIPE (DIRECTION & ADMIN)
// ==========================================

router.get("/admin/reports", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }

  const weekStart = typeof req.query.week_start === "string" ? req.query.week_start : "";
  const filter = weekStart ? `&week_start=eq.${encodeURIComponent(weekStart)}` : "";

  // 1. Récupérer tous les rapports
  const reportsRes = await supabaseAdminRequest(
    `/rest/v1/weekly_reports?select=id,user_id,week_start,difficulties,perspectives,status,created_at,updated_at${filter}&order=updated_at.desc`
  );
  const reports = (reportsRes.ok ? await reportsRes.json() : []) as Array<Record<string, any>>;

  // 2. Récupérer les profils
  const profilesRes = await supabaseAdminRequest(
    "/rest/v1/profiles?select=id,full_name,role,department,avatar_url"
  );
  const profiles = (profilesRes.ok ? await profilesRes.json() : []) as Array<Record<string, any>>;
  const profileMap = new Map<string, Record<string, any>>(profiles.map((p) => [p.id, p]));

  // 3. Récupérer les emails auth
  const authUsersRes = await supabaseAdminRequest("/auth/v1/admin/users?per_page=1000");
  const authData = (authUsersRes.ok ? await authUsersRes.json() : {}) as { users?: Array<{ id: string; email?: string }> };
  const emailMap = new Map<string, string>(
    (authData.users || []).map((u) => [u.id, u.email || ""])
  );

  // 4. Enrichir les rapports
  const enriched = reports.map((rep) => {
    const prof = profileMap.get(rep.user_id) || {};
    return {
      ...rep,
      fullName: prof.full_name || "Collaborateur HINOV",
      role: prof.role || "COLLABORATEUR",
      department: prof.department || "Général",
      avatarUrl: prof.avatar_url || null,
      email: emailMap.get(rep.user_id) || "",
    };
  });

  res.json(enriched);
});

router.get("/admin/users/:id/report", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }

  const targetUserId = req.params.id;
  const weekStart = typeof req.query.week_start === "string" ? req.query.week_start : "";
  if (!weekStart) {
    res.status(400).json({ message: "week_start requis." });
    return;
  }

  // Calculer fin de semaine (lundi + 6 jours = dimanche)
  const weekStartDate = new Date(`${weekStart}T12:00:00`);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEndStr = `${weekEndDate.getFullYear()}-${String(weekEndDate.getMonth() + 1).padStart(2, '0')}-${String(weekEndDate.getDate()).padStart(2, '0')}`;

  // Récupérer le profil du collaborateur
  const profRes = await supabaseAdminRequest(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(targetUserId)}&select=id,full_name,role,department,avatar_url`
  );
  const profiles = (profRes.ok ? await profRes.json() : []) as Array<Record<string, any>>;
  const profile = profiles[0] || {
    id: targetUserId,
    full_name: "Collaborateur HINOV",
    role: "COLLABORATEUR",
    department: "Général",
    avatar_url: null,
  };

  // Récupérer son email
  const authUserRes = await supabaseAdminRequest(`/auth/v1/admin/users/${encodeURIComponent(targetUserId)}`);
  const authUserData = (authUserRes.ok ? await authUserRes.json() : {}) as { email?: string };
  const email = authUserData.email || "";

  // Récupérer son rapport hebdo
  const reportRes = await supabaseAdminRequest(
    `/rest/v1/weekly_reports?user_id=eq.${encodeURIComponent(targetUserId)}&week_start=eq.${encodeURIComponent(weekStart)}&select=*`
  );
  const reports = (reportRes.ok ? await reportRes.json() : []) as Array<Record<string, any>>;
  const report = reports[0] || null;

  // Récupérer ses activités pour la semaine
  const actsRes = await supabaseAdminRequest(
    `/rest/v1/activities?user_id=eq.${encodeURIComponent(targetUserId)}&activity_date=gte.${encodeURIComponent(weekStart)}&activity_date=lte.${encodeURIComponent(weekEndStr)}&order=activity_date.asc,created_at.asc`
  );
  const activities = (actsRes.ok ? await actsRes.json() : []) as Array<Record<string, any>>;

  res.json({
    profile: {
      id: profile.id,
      fullName: profile.full_name || "Collaborateur HINOV",
      role: profile.role || "COLLABORATEUR",
      department: profile.department || "Général",
      avatarUri: profile.avatar_url || null,
      email,
    },
    report: report || {
      week_start: weekStart,
      difficulties: "",
      perspectives: "",
      status: "DRAFT",
    },
    activities: activities.map((a) => ({
      id: a.id,
      date: a.activity_date,
      title: a.title,
      description: a.description,
      category: a.category,
      status: a.status,
    })),
  });
});

// ==========================================
// PARAMÈTRES DE L'APPLICATION (BRANDING & PDF)
// ==========================================

let inMemoryAppSettings = {
  companyName: "HINOV GROUP",
  pdfHeaderImage: null as string | null,
  pdfFooterText: "HINOV Team Report - Document Confidentiel d'Entreprise",
  primaryColor: "#1E3A8A",
  secondaryColor: "#4F46E5",
};

router.get("/app-settings", async (_req, res) => {
  const dbRes = await supabaseAdminRequest("/rest/v1/app_settings?id=eq.default&select=*");
  const data = (dbRes.ok ? await dbRes.json() : []) as Array<Record<string, any>>;
  if (data && data.length > 0 && data[0]) {
    res.json({
      companyName: data[0].company_name || inMemoryAppSettings.companyName,
      pdfHeaderImage: data[0].pdf_header_image || inMemoryAppSettings.pdfHeaderImage,
      pdfFooterText: data[0].pdf_footer_text || inMemoryAppSettings.pdfFooterText,
      primaryColor: data[0].primary_color || inMemoryAppSettings.primaryColor,
      secondaryColor: data[0].secondary_color || inMemoryAppSettings.secondaryColor,
    });
    return;
  }
  res.json(inMemoryAppSettings);
});

router.post("/app-settings", async (req, res) => {
  const { companyName, pdfHeaderImage, pdfFooterText, primaryColor, secondaryColor } = req.body ?? {};

  inMemoryAppSettings = {
    companyName: companyName || inMemoryAppSettings.companyName,
    pdfHeaderImage: pdfHeaderImage !== undefined ? pdfHeaderImage : inMemoryAppSettings.pdfHeaderImage,
    pdfFooterText: pdfFooterText || inMemoryAppSettings.pdfFooterText,
    primaryColor: primaryColor || inMemoryAppSettings.primaryColor,
    secondaryColor: secondaryColor || inMemoryAppSettings.secondaryColor,
  };

  // Tenter de persister en DB si la table existe
  await supabaseAdminRequest("/rest/v1/app_settings", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id: "default",
      company_name: inMemoryAppSettings.companyName,
      pdf_header_image: inMemoryAppSettings.pdfHeaderImage,
      pdf_footer_text: inMemoryAppSettings.pdfFooterText,
      primary_color: inMemoryAppSettings.primaryColor,
      secondary_color: inMemoryAppSettings.secondaryColor,
      updated_at: new Date().toISOString(),
    }),
  }).catch(() => {});

  res.json(inMemoryAppSettings);
});

export default router;