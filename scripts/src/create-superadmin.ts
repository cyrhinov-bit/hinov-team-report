import fs from 'node:fs';
import path from 'node:path';

// Parse arguments: --email <email> --password <password> --name <name> --department <dept> --role <role>
const args = process.argv.slice(2);
function getArg(name: string, defaultValue = ''): string {
  const index = args.indexOf(`--${name}`);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return defaultValue;
}

// Read .env if not loaded in environment
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
  console.error('❌ Erreur: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquante dans le fichier .env');
  process.exit(1);
}

const email = getArg('email', process.env.ADMIN_EMAIL || 'superadmin@hinov.com');
const password = getArg('password', process.env.ADMIN_PASSWORD || 'HinovAdmin2026!');
const fullName = getArg('name', 'Super Administrateur');
const department = getArg('department', 'Direction');
const role = getArg('role', 'SUPERADMIN');

async function createSuperAdmin() {
  console.log('🚀 Création du compte Superadmin...');
  console.log(`- Email : ${email}`);
  console.log(`- Nom complet : ${fullName}`);
  console.log(`- Département : ${department}`);
  console.log(`- Rôle : ${role}`);

  // 1. Création de l'utilisateur dans Supabase Auth via l'API Admin
  const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        department,
        role,
      },
    }),
  });

  const userResult = await createUserResponse.json() as { id?: string; user?: { id: string }; message?: string; msg?: string; error?: string };

  if (!createUserResponse.ok && !userResult.id && !userResult.user?.id) {
    const errorMsg = userResult.message || userResult.msg || userResult.error || 'Erreur inconnue';
    if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
      console.log('ℹ️ L’utilisateur existe déjà dans Auth. Mise à jour de son profil...');
      // Récupérer l'utilisateur
      const listResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }
      });
      const listData = await listResponse.json() as { users?: Array<{ id: string; email: string }> };
      const existing = listData.users?.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        await updateProfile(existing.id);
        return;
      }
    }
    console.error(`❌ Échec de la création : ${errorMsg}`);
    process.exit(1);
  }

  const userId = userResult.id || userResult.user?.id;
  if (!userId) {
    console.error('❌ Impossible de récupérer l’ID du compte créé.');
    process.exit(1);
  }

  console.log(`✅ Utilisateur créé dans auth.users (ID: ${userId})`);
  await updateProfile(userId);
}

async function updateProfile(userId: string) {
  // 2. Mettre à jour / insérer dans la table public.profiles avec le rôle SUPERADMIN
  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      id: userId,
      full_name: fullName,
      role,
      department,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!profileResponse.ok) {
    const errorBody = await profileResponse.text();
    console.error(`❌ Échec de la mise à jour du profil : ${errorBody}`);
    process.exit(1);
  }

  console.log(`✅ Profil mis à jour avec le rôle [${role}]`);
  console.log('\n======================================================');
  console.log('🎉 COMPTE SUPERADMIN OPÉRATIONNEL !');
  console.log(`📧 Email    : ${email}`);
  console.log(`🔑 Mot de passe : ${password}`);
  console.log(`👑 Rôle     : ${role}`);
  console.log('======================================================\n');
}

createSuperAdmin().catch((err) => {
  console.error('❌ Erreur :', err);
  process.exit(1);
});
