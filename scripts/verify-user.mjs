import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qedmplfbirfqhwwqlvuo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZG1wbGZiaXJmcWh3d3FsdnVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MDU4MzksImV4cCI6MjEwNDk4MTgzOX0.N0pRI8jawAgq9_sC4wRd3HN-CepZOa-v0IHMUzRirNE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const email = 'e.gnonskan@hinovgroup.com';
  const password = '04041990';

  console.log(`Testing login for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Sign in failed:', error.message);
    return;
  }

  console.log('Sign in SUCCESS! User ID:', data.user.id);
  
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileErr) {
    console.error('Profile fetch error:', profileErr.message);
  } else {
    console.log('Profile retrieved:', profile);
  }
}

main().catch(console.error);

