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
const anonKey = process.env.SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function testLoginAndMe() {
  console.log('1. Login en tant que e.gnonskan@hinovgroup.com...');
  const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey },
    body: JSON.stringify({ email: 'e.gnonskan@hinovgroup.com', password: 'M@jorix90' }),
  });
  const loginData = await loginRes.json() as { access_token?: string; user?: { id: string } };
  console.log('Token obtenu:', !!loginData.access_token);

  const token = loginData.access_token;
  if (!token) {
    console.error('Login failed:', loginData);
    return;
  }

  console.log('\n2. Test /auth/v1/user...');
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  const user = await userRes.json() as { id: string };
  console.log('User ID:', user.id);

  console.log('\n3. Test SELECT profile avec le token utilisateur (Anon Key + Token)...');
  const profRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=*`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  const profData = await profRes.json();
  console.log('Status profRes:', profRes.status);
  console.log('profData:', profData);

  console.log('\n4. Test SELECT profile avec Service Role Key...');
  const profResAdmin = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=*`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
  const profDataAdmin = await profResAdmin.json();
  console.log('profDataAdmin:', profDataAdmin);
}

testLoginAndMe();