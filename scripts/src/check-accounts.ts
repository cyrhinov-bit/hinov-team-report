import fs from 'node:fs';
import path from 'node:path';

function loadEnv() {
  let dir = process.cwd();
  let envPath: string | null = null;
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) {
      envPath = candidate;
      break;
    }
    dir = path.dirname(dir);
  }

  if (envPath) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...rest] = trimmed.split('=');
        const val = rest.join('=').trim().replace(/^["'](.*)["']$/, '$1');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Erreur: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquante.');
  process.exit(1);
}

async function checkAll() {
  console.log('=== 1. COMPTES AUTHENTIFIÉS (AUTH.USERS) ===');
  const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=100`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
  const authData = await authRes.json() as { users: Array<{ id: string; email?: string; email_confirmed_at?: string; created_at: string }> };

  console.log(`Nombre total de comptes Auth : ${authData.users.length}`);

  console.log('\n=== 2. PROFILS UTILISATEURS (PUBLIC.PROFILES) ===');
  const profRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*&order=created_at.desc`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
  const profiles = await profRes.json() as Array<{ id: string; full_name: string; role: string; department: string; avatar_url?: string; created_at: string }>;

  console.log(`Nombre total de profils : ${profiles.length}`);

  const profileMap = new Map(profiles.map(p => [p.id, p]));

  authData.users.forEach((user, index) => {
    const prof = profileMap.get(user.id);
    console.log(`\n[Compte #${index + 1}]`);
    console.log(`  - Email        : ${user.email}`);
    console.log(`  - Nom complet  : ${prof?.full_name || '(Aucun nom)'}`);
    console.log(`  - Rôle         : ${prof?.role || 'NON DÉFINI'}`);
    console.log(`  - Département  : ${prof?.department || '(Aucun)'}`);
    console.log(`  - Email Vérifié: ${user.email_confirmed_at ? 'OUI' : 'NON'}`);
    console.log(`  - Avatar       : ${prof?.avatar_url ? (prof.avatar_url.startsWith('data:') ? '✅ Oui (Photo Permanente Base64)' : prof.avatar_url) : '❌ Aucun'}`);
    console.log(`  - ID Utilisateur: ${user.id}`);
  });

  console.log('\n=== 3. PARAMÈTRES D\'ENTREPRISE (APP_SETTINGS) ===');
  const setRes = await fetch(`${supabaseUrl}/rest/v1/app_settings?select=*`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
  const settings = await setRes.json();
  console.log(JSON.stringify(settings, null, 2));
}

checkAll();