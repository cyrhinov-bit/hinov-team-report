import { Platform } from 'react-native';

const DEFAULT_SUPABASE_URL = 'https://ikjptirwvvjrapftsaec.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlranB0aXJ3dnZqcmFwZnRzYWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NjE3MTEsImV4cCI6MjEwNDQzNzcxMX0.ovQAEN4nBZfCHwma68FDLTDkpPl_InoRFe3KIuqlgt4';

const supabaseUrl = (
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  DEFAULT_SUPABASE_URL
).replace(/\/+$/, '');

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

const serviceRoleKey =
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

const getApiOrigin = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }
  return 'http://localhost:5000';
};


const apiOrigin = getApiOrigin();

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'COLLABORATEUR';
  department: string;
  avatarUrl?: string;
  createdAt: string;
};

export type AppSettings = {
  id: string;
  companyName: string;
  pdfHeaderImage?: string | null;
  pdfFooterText: string;
  primaryColor: string;
  secondaryColor: string;
  updatedAt?: string;
};

export async function refreshAuthSession(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    error_description?: string;
    msg?: string;
    message?: string;
  };
  if (!res.ok || !data.access_token || !data.refresh_token) {
    throw new Error(data.error_description || data.msg || data.message || 'Impossible de rafraîchir la session.');
  }
  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const method = options.method ?? 'GET';

  // 1. Authentification directe via Supabase Auth
  if (path === '/api/auth/login') {
    const { email, password } = (options.body as { email?: string; password?: string }) ?? {};
    let res: Response;
    try {
      res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ email: email?.trim().toLowerCase(), password }),
      });
    } catch (netErr) {
      throw new Error(`Erreur réseau (${netErr instanceof Error ? netErr.message : 'connexion impossible'}). Vérifiez votre accès internet.`);
    }
    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      refresh_token?: string;
      user?: Record<string, unknown>;
      error_description?: string;
      msg?: string;
      message?: string;
    };
    if (!res.ok || !data.access_token) {
      const errorMsg = data.error_description || data.msg || data.message;
      if (errorMsg === 'Invalid login credentials') {
        throw new Error('Email ou mot de passe incorrect.');
      }
      throw new Error(errorMsg || 'Identifiants incorrects.');
    }
    return data as T;
  }

  // 1.b Rafraîchissement de session
  if (path === '/api/auth/refresh') {
    const { refresh_token } = (options.body as { refresh_token?: string }) ?? {};
    if (!refresh_token) throw new Error('Refresh token manquant.');
    const result = await refreshAuthSession(refresh_token);
    return result as T;
  }

  // 2. Profil utilisateur connecté
  if (path === '/api/auth/me' && options.token) {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${options.token}`,
      },
    });
    if (!userRes.ok) {
      throw new Error('Session invalide ou expirée.');
    }
    const user = (await userRes.json()) as { id: string; email?: string; user_metadata?: Record<string, unknown> };
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,full_name,role,department,avatar_url`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${options.token}`,
        },
      },
    );
    let profiles = profileRes.ok ? ((await profileRes.json()) as Array<Record<string, unknown>>) : [];
    if ((!profiles || profiles.length === 0) && serviceRoleKey) {
      const fallbackRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,full_name,role,department,avatar_url`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      );
      if (fallbackRes.ok) {
        profiles = (await fallbackRes.json()) as Array<Record<string, unknown>>;
      }
    }
    return { user, profile: profiles[0] ?? null } as T;
  }

  // 3. Gestion administrative des utilisateurs (/api/admin/users)
  if (path === '/api/admin/users' || path.startsWith('/api/admin/users/')) {
    const subpath = path.replace(/^\/api\/admin\/users/, '');
    const isItem = subpath.startsWith('/');
    const targetUserId = isItem ? subpath.slice(1) : '';

    // A. Lister tous les utilisateurs
    if (method === 'GET' && !isItem) {
      const authHeader = serviceRoleKey
        ? { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }
        : { apikey: supabaseAnonKey, Authorization: `Bearer ${options.token}` };

      // Récupération des profils
      const profilesRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=id,full_name,role,department,avatar_url,created_at,updated_at&order=created_at.desc`,
        { headers: authHeader },
      );
      const profiles = profilesRes.ok
        ? ((await profilesRes.json()) as Array<{
            id: string;
            full_name: string;
            role: string;
            department: string;
            avatar_url?: string;
            created_at: string;
          }>)
        : [];

      // Récupération des emails correspondants depuis Auth Admin
      let authUsers: Array<{ id: string; email?: string }> = [];
      if (serviceRoleKey) {
        const authUsersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=100`, {
          headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
        });
        if (authUsersRes.ok) {
          const authData = (await authUsersRes.json()) as { users?: Array<{ id: string; email?: string }> };
          authUsers = authData.users ?? [];
        }
      }

      const emailMap = new Map(authUsers.map((u) => [u.id, u.email || '']));

      const users: AdminUser[] = profiles.map((p) => ({
        id: p.id,
        fullName: p.full_name || 'Utilisateur sans nom',
        email: emailMap.get(p.id) || '',
        role: (p.role?.toUpperCase() === 'SUPERADMIN' ? 'SUPERADMIN' : p.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'COLLABORATEUR'),
        department: p.department || 'Général',
        avatarUrl: p.avatar_url,
        createdAt: p.created_at,
      }));

      return users as T;
    }

    // B. Créer un utilisateur
    if (method === 'POST' && !isItem) {
      const { email, password, fullName, department, role } = (options.body as {
        email: string;
        password?: string;
        fullName: string;
        department: string;
        role: string;
      }) ?? {};

      if (!email || !fullName) {
        throw new Error('Email et nom complet requis.');
      }

      if (!password || password.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
      }

      // 1. Tenter via le serveur backend dédié (qui possède la clé service_role)
      try {
        const backendRes = await fetch(`${apiOrigin}/api/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          },
          body: JSON.stringify({ email, password, fullName, department, role }),
        });

        if (backendRes.ok) {
          const backendData = await backendRes.json();
          return backendData as T;
        }

        const errData = await backendRes.json().catch(() => ({}));
        if (backendRes.status === 400 || backendRes.status === 409 || backendRes.status === 422) {
          throw new Error(errData.message || errData.detail || 'Impossible de créer cet utilisateur.');
        }
      } catch (backendErr: any) {
        if (backendErr?.message && !backendErr.message.includes('fetch') && !backendErr.message.includes('Failed to fetch')) {
          throw backendErr;
        }
      }

      // 2. Fallback Supabase Client direct (signup standard)
      const signUpRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          data: {
            full_name: fullName.trim(),
            department: department.trim(),
            role: role.trim().toUpperCase(),
          },
        }),
      });

      const signUpData = (await signUpRes.json().catch(() => ({}))) as {
        id?: string;
        user?: { id: string };
        msg?: string;
        message?: string;
        error_description?: string;
      };

      const newUserId = signUpData.id || signUpData.user?.id;
      if (!signUpRes.ok || !newUserId) {
        throw new Error(
          signUpData.message || signUpData.msg || signUpData.error_description || 'Impossible de créer l’utilisateur.',
        );
      }

      // 3. Mise à jour de la table profiles
      await fetch(`${supabaseUrl}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${options.token || supabaseAnonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify({
          id: newUserId,
          full_name: fullName.trim(),
          role: role.trim().toUpperCase(),
          department: department.trim(),
          updated_at: new Date().toISOString(),
        }),
      }).catch(() => {});

      return {
        id: newUserId,
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        role: role.trim().toUpperCase(),
        department: department.trim(),
      } as T;
    }

    // C. Mettre à jour un utilisateur
    if (method === 'PATCH' && targetUserId) {
      const updates = options.body as { fullName?: string; department?: string; role?: string };
      const bodyPayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.fullName !== undefined) bodyPayload.full_name = updates.fullName.trim();
      if (updates.department !== undefined) bodyPayload.department = updates.department.trim();
      if (updates.role !== undefined) bodyPayload.role = updates.role.trim().toUpperCase();

      // Tenter via le backend
      try {
        const bePatch = await fetch(`${apiOrigin}/api/admin/users/${encodeURIComponent(targetUserId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          },
          body: JSON.stringify(updates),
        });
        if (bePatch.ok) return (await bePatch.json()) as T;
      } catch {}

      const patchRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(targetUserId)}`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${options.token || supabaseAnonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!patchRes.ok) {
        throw new Error('Impossible de modifier cet utilisateur.');
      }
      return { success: true } as T;
    }

    // D. Supprimer un utilisateur
    if (method === 'DELETE' && targetUserId) {
      try {
        const beDel = await fetch(`${apiOrigin}/api/admin/users/${encodeURIComponent(targetUserId)}`, {
          method: 'DELETE',
          headers: {
            ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          },
        });
        if (beDel.ok) return { success: true } as T;
      } catch {}

      await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(targetUserId)}`, {
        method: 'DELETE',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${options.token || supabaseAnonKey}`,
        },
      });
      return { success: true } as T;
    }
  }

  // 4. Activités CRUD
  if (path === '/api/activities' || path.startsWith('/api/activities/')) {
    const subpath = path.replace(/^\/api\/activities/, '');
    const isItem = subpath.startsWith('/');
    const itemId = isItem ? subpath.slice(1) : '';

    let url = `${supabaseUrl}/rest/v1/activities`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      apikey: supabaseAnonKey,
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    };

    if (method === 'GET') {
      url += '?select=id,activity_date,title,description,category,status&order=activity_date.desc,created_at.desc';
    } else if (method === 'POST') {
      headers.Prefer = 'return=representation';
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${options.token}` },
      });
      const user = userRes.ok ? ((await userRes.json()) as { id: string }) : null;
      if (user?.id && options.body && typeof options.body === 'object') {
        options.body = { ...options.body, user_id: user.id };
      }
    } else if (method === 'PATCH' && itemId) {
      url += `?id=eq.${encodeURIComponent(itemId)}`;
      headers.Prefer = 'return=representation';
    } else if (method === 'DELETE' && itemId) {
      url += `?id=eq.${encodeURIComponent(itemId)}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (method === 'DELETE') {
      return undefined as T;
    }

    const data = await res.json().catch(() => []);
    if (!res.ok) {
      throw new Error((data as { message?: string })?.message || 'Erreur lors de l’opération sur les activités.');
    }
    return (Array.isArray(data) && method === 'POST' ? data[0] : data) as T;
  }

  // 5. Mise à jour de profil personnel
  if (path === '/api/profile' && options.token) {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${options.token}` },
    });
    const user = (await userRes.json()) as { id: string };
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${options.token}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ ...(options.body as object), updated_at: new Date().toISOString() }),
    });
    const data = await res.json().catch(() => []);
    return (Array.isArray(data) ? data[0] : data) as T;
  }

  // 6. Rapports hebdomadaires
  if (path.startsWith('/api/reports') && path !== '/api/reports/improve') {
    const query = path.includes('?') ? path.split('?')[1] : '';
    let url = `${supabaseUrl}/rest/v1/weekly_reports`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      apikey: supabaseAnonKey,
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    };

    if (method === 'GET') {
      const params = new URLSearchParams(query);
      const weekStart = params.get('week_start');
      url += `?select=id,week_start,difficulties,perspectives,improved_difficulties,improved_perspectives,status${
        weekStart ? `&week_start=eq.${encodeURIComponent(weekStart)}` : ''
      }`;
    } else if (method === 'POST') {
      headers.Prefer = 'resolution=merge-duplicates,return=representation';
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${options.token}` },
      });
      const user = userRes.ok ? ((await userRes.json()) as { id: string }) : null;
      if (user?.id && options.body && typeof options.body === 'object') {
        options.body = { ...options.body, user_id: user.id };
      }
    }

    const res = await fetch(url, {
      method,
      headers,
      body: options.body
        ? JSON.stringify({ ...(options.body as object), updated_at: new Date().toISOString() })
        : undefined,
    });
    const data = await res.json().catch(() => []);
    return (Array.isArray(data) ? data[0] ?? null : data) as T;
  }

  // 7. Paramètres IA
  if (path === '/api/ai-settings') {
    if (method === 'GET') {
      const res = await fetch(`${supabaseUrl}/rest/v1/user_ai_settings?select=provider,key_last_four,updated_at`, {
        headers: {
          Accept: 'application/json',
          apikey: supabaseAnonKey,
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
      });
      const payload = res.ok ? ((await res.json()) as Array<Record<string, unknown>>) : [];
      return { configured: Array.isArray(payload) && payload.length > 0, settings: payload[0] ?? null } as T;
    }
  }

  // 8. Paramètres de l'application (Bannière d'en-tête PDF, Marque, Couleurs)
  if (path === '/api/app-settings') {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${options.token || supabaseAnonKey}`,
    };

    if (method === 'GET') {
      const res = await fetch(`${supabaseUrl}/rest/v1/app_settings?id=eq.default&select=*`, {
        headers,
      });
      const rows = (await res.json().catch(() => [])) as Array<{
        id: string;
        company_name: string;
        pdf_header_image?: string | null;
        pdf_footer_text: string;
        primary_color: string;
        secondary_color: string;
        updated_at?: string;
      }>;
      const row = rows[0] || {
        id: 'default',
        company_name: 'HINOV GROUP',
        pdf_footer_text: "HINOV Team Report - Document Confidentiel d'Entreprise",
        primary_color: '#1E3A8A',
        secondary_color: '#4F46E5',
      };
      return {
        id: row.id,
        companyName: row.company_name,
        pdfHeaderImage: row.pdf_header_image,
        pdfFooterText: row.pdf_footer_text,
        primaryColor: row.primary_color,
        secondaryColor: row.secondary_color,
        updatedAt: row.updated_at,
      } as T;
    }

    if (method === 'POST' || method === 'PATCH') {
      const body = options.body as {
        companyName?: string;
        pdfHeaderImage?: string | null;
        pdfFooterText?: string;
        primaryColor?: string;
        secondaryColor?: string;
      };

      const payload: Record<string, unknown> = {
        id: 'default',
        updated_at: new Date().toISOString(),
      };
      if (body.companyName !== undefined) payload.company_name = body.companyName;
      if (body.pdfHeaderImage !== undefined) payload.pdf_header_image = body.pdfHeaderImage;
      if (body.pdfFooterText !== undefined) payload.pdf_footer_text = body.pdfFooterText;
      if (body.primaryColor !== undefined) payload.primary_color = body.primaryColor;
      if (body.secondaryColor !== undefined) payload.secondary_color = body.secondaryColor;

      const res = await fetch(`${supabaseUrl}/rest/v1/app_settings?id=eq.default`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // En cas d'absence de la ligne par défaut, faire un upsert
        await fetch(`${supabaseUrl}/rest/v1/app_settings`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(payload),
        });
      }

      return { success: true, ...body } as T;
    }
  }

  // 9. Requête transmise à l'API server Express (ex: /api/reports/improve)
  const response = await fetch(`${apiOrigin}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new Error(typeof payload?.message === 'string' ? payload.message : 'Une erreur est survenue.');
  }
  return payload as T;
}