import { Router, type IRouter } from "express";
import {
  decryptSecret,
  encryptSecret,
  getBearerToken,
  getSupabaseUser,
  supabaseRequest,
  supabaseAdminRequest,
} from "../lib/supabase";

export interface BackendNotification {
  id: string;
  userId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  senderDepartment?: string;
  title: string;
  message: string;
  type: string;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

const inMemoryNotifications: BackendNotification[] = [];

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
    `/rest/v1/weekly_reports?user_id=eq.${encodeURIComponent(user.id)}${filter}&select=id,week_start,difficulties,perspectives,improved_difficulties,improved_perspectives,status,created_at,updated_at&order=week_start.desc`,
    { headers: { Authorization: `Bearer ${getBearerToken(req)}` } },
  );
  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    res.status(502).json({ message: "Impossible de récupérer le rapport.", detail: payload });
    return;
  }
  res.json(weekStart ? (Array.isArray(payload) ? payload[0] ?? null : payload) : payload);
});

router.get("/reports/history", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }

  // 1. Récupérer tous les rapports de l'utilisateur
  const reportsRes = await supabaseRequest(
    `/rest/v1/weekly_reports?user_id=eq.${encodeURIComponent(user.id)}&select=id,week_start,difficulties,perspectives,improved_difficulties,improved_perspectives,status,created_at,updated_at&order=week_start.desc`,
    { headers: { Authorization: `Bearer ${getBearerToken(req)}` } }
  );
  const reports = (reportsRes.ok ? await reportsRes.json() : []) as Array<Record<string, any>>;

  // 2. Récupérer toutes les activités de l'utilisateur pour le décompte par semaine
  const actsRes = await supabaseRequest(
    `/rest/v1/activities?user_id=eq.${encodeURIComponent(user.id)}&select=id,activity_date`,
    { headers: { Authorization: `Bearer ${getBearerToken(req)}` } }
  );
  const activities = (actsRes.ok ? await actsRes.json() : []) as Array<{ id: string; activity_date: string }>;

  // 3. Calculer le nombre d'activités par semaine
  const formatted = reports.map((rep) => {
    const wStart = rep.week_start;
    const startD = new Date(`${wStart}T12:00:00`);
    const endD = new Date(startD);
    endD.setDate(endD.getDate() + 6);
    const endStr = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;
    
    const count = activities.filter((a) => a.activity_date >= wStart && a.activity_date <= endStr).length;

    return {
      id: rep.id,
      userId: user.id,
      weekStart: rep.week_start,
      difficulties: rep.difficulties || "",
      perspectives: rep.perspectives || "",
      improvedDifficulties: rep.improved_difficulties || null,
      improvedPerspectives: rep.improved_perspectives || null,
      status: rep.status || "DRAFT",
      createdAt: rep.created_at || new Date().toISOString(),
      updatedAt: rep.updated_at || new Date().toISOString(),
      activitiesCount: count,
    };
  });

  res.json(formatted);
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

  const savedReport = Array.isArray(payload) ? payload[0] : payload;

  // Si le statut est SUBMITTED, notifier tous les Administrateurs / Directeurs
  if (status === "SUBMITTED") {
    try {
      // 1. Récupérer le profil du collaborateur
      const senderProfRes = await supabaseRequest(
        `/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=full_name,department,avatar_url`,
        { headers: { Authorization: `Bearer ${getBearerToken(req)}` } }
      );
      const senderProfiles = (senderProfRes.ok ? await senderProfRes.json() : []) as Array<Record<string, any>>;
      const senderName = senderProfiles[0]?.full_name || "Un collaborateur";
      const senderAvatar = senderProfiles[0]?.avatar_url || null;
      const senderDept = senderProfiles[0]?.department || "Général";

      // 2. Formater la date de la semaine
      const start = new Date(`${week_start}T12:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 4);
      const weekLabel = `du ${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} au ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`;

      // 3. Récupérer tous les administrateurs et directeurs
      const adminsRes = await supabaseAdminRequest(
        `/rest/v1/profiles?role=in.(ADMIN,SUPERADMIN)&select=id,full_name,role`
      );
      const admins = (adminsRes.ok ? await adminsRes.json() : []) as Array<{ id: string; full_name?: string }>;

      const notifTime = new Date().toISOString();
      for (const admin of admins) {
        // Éviter de se notifier soi-même si un admin soumet son propre rapport
        if (admin.id !== user.id) {
          const newNotif = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            userId: admin.id,
            senderId: user.id,
            senderName,
            senderAvatar,
            senderDepartment: senderDept,
            title: "Nouveau rapport hebdomadaire reçu",
            message: `${senderName} (${senderDept}) a validé et transmis son rapport officiel pour la semaine ${weekLabel}.`,
            type: "REPORT_SUBMITTED",
            data: {
              reportId: savedReport?.id,
              userId: user.id,
              weekStart: week_start,
              submittedAt: notifTime,
            },
            isRead: false,
            createdAt: notifTime,
          };
          inMemoryNotifications.unshift(newNotif);

          // Tenter l'insertion en base Supabase
          supabaseAdminRequest("/rest/v1/notifications", {
            method: "POST",
            body: JSON.stringify({
              id: newNotif.id,
              user_id: newNotif.userId,
              sender_id: newNotif.senderId,
              title: newNotif.title,
              message: newNotif.message,
              type: newNotif.type,
              data: newNotif.data,
              is_read: false,
              created_at: notifTime,
            }),
          }).catch(() => {});
        }
      }
    } catch {
      // Ignorer les erreurs de notification pour ne pas bloquer l'enregistrement du rapport
    }
  }

  res.json(savedReport);
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
  const userId = typeof req.query.user_id === "string" ? req.query.user_id : "";
  const weekFilter = weekStart ? `&week_start=eq.${encodeURIComponent(weekStart)}` : "";
  const userFilter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : "";
  const filter = `${weekFilter}${userFilter}`;

  // 1. Récupérer UNIQUEMENT les rapports SOUMIS (SUBMITTED)
  const reportsRes = await supabaseAdminRequest(
    `/rest/v1/weekly_reports?status=eq.SUBMITTED&select=id,user_id,week_start,difficulties,perspectives,status,created_at,updated_at${filter}&order=week_start.desc,updated_at.desc`
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

  // 4. Récupérer les activités pour décompte
  const actsRes = await supabaseAdminRequest(
    "/rest/v1/activities?select=id,user_id,activity_date"
  );
  const allActivities = (actsRes.ok ? await actsRes.json() : []) as Array<{ id: string; user_id: string; activity_date: string }>;

  // 5. Enrichir les rapports
  const enriched = reports.map((rep) => {
    const prof = profileMap.get(rep.user_id) || {};
    const wStart = rep.week_start;
    const startD = new Date(`${wStart}T12:00:00`);
    const endD = new Date(startD);
    endD.setDate(endD.getDate() + 6);
    const endStr = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;
    
    const count = allActivities.filter(
      (a) => a.user_id === rep.user_id && a.activity_date >= wStart && a.activity_date <= endStr
    ).length;

    return {
      id: rep.id,
      userId: rep.user_id,
      weekStart: rep.week_start,
      difficulties: rep.difficulties || "",
      perspectives: rep.perspectives || "",
      status: "SUBMITTED",
      createdAt: rep.created_at || new Date().toISOString(),
      updatedAt: rep.updated_at || new Date().toISOString(),
      fullName: prof.full_name || "Collaborateur HINOV",
      role: prof.role || "COLLABORATEUR",
      department: prof.department || "Général",
      avatarUrl: prof.avatar_url || null,
      email: emailMap.get(rep.user_id) || "",
      activitiesCount: count,
    };
  });

  res.json(enriched);
});

router.get("/admin/users/:id/reports-history", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }

  const targetUserId = req.params.id;

  // 1. Récupérer uniquement les rapports SOUMIS (SUBMITTED) pour ce collaborateur
  const reportsRes = await supabaseAdminRequest(
    `/rest/v1/weekly_reports?user_id=eq.${encodeURIComponent(targetUserId)}&status=eq.SUBMITTED&select=id,user_id,week_start,difficulties,perspectives,status,created_at,updated_at&order=week_start.desc`
  );
  const reports = (reportsRes.ok ? await reportsRes.json() : []) as Array<Record<string, any>>;

  // 2. Récupérer les activités pour décompte
  const actsRes = await supabaseAdminRequest(
    `/rest/v1/activities?user_id=eq.${encodeURIComponent(targetUserId)}&select=id,activity_date`
  );
  const activities = (actsRes.ok ? await actsRes.json() : []) as Array<{ id: string; activity_date: string }>;

  const formatted = reports.map((rep) => {
    const wStart = rep.week_start;
    const startD = new Date(`${wStart}T12:00:00`);
    const endD = new Date(startD);
    endD.setDate(endD.getDate() + 6);
    const endStr = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;
    const count = activities.filter((a) => a.activity_date >= wStart && a.activity_date <= endStr).length;

    return {
      id: rep.id,
      userId: targetUserId,
      weekStart: rep.week_start,
      difficulties: rep.difficulties || "",
      perspectives: rep.perspectives || "",
      status: "SUBMITTED",
      createdAt: rep.created_at || new Date().toISOString(),
      updatedAt: rep.updated_at || new Date().toISOString(),
      activitiesCount: count,
    };
  });

  res.json(formatted);
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

  // Récupérer son rapport hebdo UNIQUEMENT s'il est SOUMIS (SUBMITTED)
  const reportRes = await supabaseAdminRequest(
    `/rest/v1/weekly_reports?user_id=eq.${encodeURIComponent(targetUserId)}&week_start=eq.${encodeURIComponent(weekStart)}&status=eq.SUBMITTED&select=*`
  );
  const reports = (reportRes.ok ? await reportRes.json() : []) as Array<Record<string, any>>;
  const report = reports[0] || null;

  if (!report) {
    res.status(404).json({ message: "Ce collaborateur n'a pas encore soumis de rapport pour cette période." });
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
    report: {
      id: report.id,
      week_start: weekStart,
      difficulties: report.difficulties || "",
      perspectives: report.perspectives || "",
      status: "SUBMITTED",
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

// ==========================================
// NOTIFICATIONS SYSTÈME & DIRECTION
// ==========================================

router.get("/notifications", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }

  // Récupérer depuis in-memory et fusionner avec DB si possible
  let userNotifs = inMemoryNotifications.filter((n) => n.userId === user.id);

  try {
    const dbRes = await supabaseAdminRequest(
      `/rest/v1/notifications?user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc&limit=50`
    );
    if (dbRes.ok) {
      const dbNotifs = (await dbRes.json()) as Array<Record<string, any>>;
      if (Array.isArray(dbNotifs) && dbNotifs.length > 0) {
        const dbFormatted = dbNotifs.map((n) => ({
          id: n.id,
          userId: n.user_id,
          senderId: n.sender_id,
          senderName: n.sender_name || "Collaborateur",
          senderAvatar: n.sender_avatar || null,
          senderDepartment: n.sender_department || "Général",
          title: n.title || "Notification",
          message: n.message || "",
          type: n.type || "REPORT_SUBMITTED",
          data: n.data || {},
          isRead: !!n.is_read,
          createdAt: n.created_at || new Date().toISOString(),
        }));
        
        // Fusionner sans doublons
        const map = new Map<string, BackendNotification>();
        userNotifs.forEach((n) => map.set(n.id, n));
        dbFormatted.forEach((n) => map.set(n.id, n));
        userNotifs = Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    }
  } catch {
    // Utiliser inMemoryNotifications
  }

  const unreadCount = userNotifs.filter((n) => !n.isRead).length;

  res.json({
    notifications: userNotifs,
    unreadCount,
  });
});

router.patch("/notifications/:id/read", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }

  const notifId = req.params.id;
  const notif = inMemoryNotifications.find((n) => n.id === notifId && n.userId === user.id);
  if (notif) {
    notif.isRead = true;
  }

  // Mettre à jour en DB
  supabaseAdminRequest(`/rest/v1/notifications?id=eq.${encodeURIComponent(notifId)}`, {
    method: "PATCH",
    body: JSON.stringify({ is_read: true }),
  }).catch(() => {});

  res.json({ success: true, id: notifId });
});

router.post("/notifications/mark-all-read", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }

  inMemoryNotifications.forEach((n) => {
    if (n.userId === user.id) {
      n.isRead = true;
    }
  });

  // Mettre à jour en DB
  supabaseAdminRequest(`/rest/v1/notifications?user_id=eq.${encodeURIComponent(user.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ is_read: true }),
  }).catch(() => {});

  res.json({ success: true, message: "Toutes les notifications ont été marquées comme lues." });
});

// ==========================================
// TABLEAU DE BORD "RAPPORTS ÉQUIPE" (DIRECTION)
// ==========================================

router.get("/admin/team-reports/status", async (req, res) => {
  const user = await getSupabaseUser(req);
  if (!user) {
    res.status(401).json({ message: "Session invalide ou expirée." });
    return;
  }

  let weekStart = typeof req.query.week_start === "string" ? req.query.week_start : "";
  if (!weekStart) {
    // Semaine actuelle par défaut (lundi)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  }

  const weekStartDate = new Date(`${weekStart}T12:00:00`);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEndStr = `${weekEndDate.getFullYear()}-${String(weekEndDate.getMonth() + 1).padStart(2, '0')}-${String(weekEndDate.getDate()).padStart(2, '0')}`;

  // 1. Récupérer tous les utilisateurs Auth
  const authUsersRes = await supabaseAdminRequest("/auth/v1/admin/users?per_page=100");
  const authData = (authUsersRes.ok ? await authUsersRes.json() : {}) as { users?: Array<{ id: string; email?: string }> };
  const authUsers = authData.users || [];
  const emailMap = new Map<string, string>();
  authUsers.forEach((u) => {
    if (u.id && u.email) emailMap.set(u.id, u.email);
  });

  // 2. Récupérer tous les profils
  const profilesRes = await supabaseAdminRequest("/rest/v1/profiles?select=*&order=full_name.asc");
  const profiles = (profilesRes.ok ? await profilesRes.json() : []) as Array<Record<string, any>>;
  const profileMap = new Map<string, Record<string, any>>();
  profiles.forEach((p) => profileMap.set(p.id, p));

  // 3. Récupérer UNIQUEMENT les rapports SOUMIS (SUBMITTED) pour cette semaine
  const reportsRes = await supabaseAdminRequest(
    `/rest/v1/weekly_reports?week_start=eq.${encodeURIComponent(weekStart)}&status=eq.SUBMITTED&select=*`
  );
  const reports = (reportsRes.ok ? await reportsRes.json() : []) as Array<Record<string, any>>;
  const reportMap = new Map<string, Record<string, any>>();
  const submittedUserIds = new Set<string>();
  reports.forEach((r) => {
    reportMap.set(r.user_id, r);
    submittedUserIds.add(r.user_id);
  });

  // 4. Récupérer toutes les activités de la semaine pour ces collaborateurs
  const actsRes = await supabaseAdminRequest(
    `/rest/v1/activities?activity_date=gte.${encodeURIComponent(weekStart)}&activity_date=lte.${encodeURIComponent(weekEndStr)}&select=id,user_id`
  );
  const activities = (actsRes.ok ? await actsRes.json() : []) as Array<{ id: string; user_id: string }>;
  const activityCountMap = new Map<string, number>();
  activities.forEach((a) => {
    activityCountMap.set(a.user_id, (activityCountMap.get(a.user_id) || 0) + 1);
  });

  // 5. Synthétiser UNIQUEMENT les collaborateurs ayant effectivement soumis leur rapport
  const members = profiles
    .filter((p) => submittedUserIds.has(p.id))
    .map((p) => {
      const rep = reportMap.get(p.id);
      const actCount = activityCountMap.get(p.id) || 0;
      const email = emailMap.get(p.id) || "";

      return {
        id: p.id,
        userId: p.id,
        fullName: p.full_name || "Collaborateur",
        email,
        role: p.role || "COLLABORATEUR",
        department: p.department || "Général",
        avatarUrl: p.avatar_url || null,
        status: "SUBMITTED" as const,
        activitiesCount: actCount,
        difficulties: rep?.difficulties || "",
        perspectives: rep?.perspectives || "",
        submittedAt: rep?.updated_at || rep?.created_at || null,
        updatedAt: rep?.updated_at || null,
        reportId: rep?.id || null,
      };
    });

  const totalMembers = profiles.length;
  const submittedCount = members.length;
  const pendingCount = Math.max(0, totalMembers - submittedCount);
  const completionRate = totalMembers > 0 ? Math.round((submittedCount / totalMembers) * 100) : 0;

  res.json({
    weekStart,
    weekEnd: weekEndStr,
    kpis: {
      totalMembers,
      submittedCount,
      draftCount: 0,
      notStartedCount: pendingCount,
      completionRate,
    },
    members,
  });
});

export default router;