import { Router, type IRouter } from "express";
import { decryptSecret, encryptSecret, getBearerToken, getSupabaseUser, supabaseRequest } from "../lib/supabase";

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

export default router;