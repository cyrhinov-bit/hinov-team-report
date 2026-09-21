import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qedmplfbirfqhwwqlvuo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZG1wbGZiaXJmcWh3d3FsdnVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MDU4MzksImV4cCI6MjEwNDk4MTgzOX0.N0pRI8jawAgq9_sC4wRd3HN-CepZOa-v0IHMUzRirNE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const email = 'e.gnonskan@hinovgroup.com';
  const password = '04041990';
  const fullName = 'Evariste GNONSKAN';
  const jobTitle = 'Responsable développement';
  const department = 'Développement & Informatique';
  const role = 'super_admin';

  console.log(`Creating / registering user: ${email}...`);

  // 1. Sign up user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        job_title: jobTitle,
        department: department,
        role: role,
        must_change_password: false,
        is_active: true,
      },
    },
  });

  if (authError) {
    console.log('Auth signUp result:', authError.message);
    if (authError.message.includes('already registered')) {
      console.log('User exists in Auth. Signing in to update profile...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Sign in failed:', signInError.message);
      } else if (signInData.user) {
        console.log('Signed in as user ID:', signInData.user.id);
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            job_title: jobTitle,
            department: department,
            role: role,
            is_active: true,
            must_change_password: false,
          })
          .eq('id', signInData.user.id);

        if (profileError) {
          console.error('Profile update failed:', profileError.message);
        } else {
          console.log('Profile successfully updated to Super Admin!');
        }
      }
    }
  } else if (authData.user) {
    console.log('User created successfully with ID:', authData.user.id);

    // Wait a brief moment for database trigger or upsert profile directly
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: fullName,
        email: email,
        job_title: jobTitle,
        department: department,
        role: role,
        is_active: true,
        must_change_password: false,
      });

    if (profileError) {
      console.warn('Profile upsert notice:', profileError.message);
    } else {
      console.log('Super Admin profile created in public.profiles!');
    }
  }
}

main().catch(console.error);

