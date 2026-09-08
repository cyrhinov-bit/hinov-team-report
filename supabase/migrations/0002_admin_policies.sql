-- Enable Admins/Superadmins to view all user profiles
drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    auth.uid() = id or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('SUPERADMIN', 'ADMIN')
    )
  );

-- Enable Superadmins to update any user profile
drop policy if exists "Superadmins can update all profiles" on public.profiles;
create policy "Superadmins can update all profiles"
  on public.profiles for update
  using (
    auth.uid() = id or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('SUPERADMIN', 'ADMIN')
    )
  )
  with check (
    auth.uid() = id or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('SUPERADMIN', 'ADMIN')
    )
  );

-- Enable Superadmins to delete profiles
drop policy if exists "Superadmins can delete profiles" on public.profiles;
create policy "Superadmins can delete profiles"
  on public.profiles for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'SUPERADMIN'
    )
  );

