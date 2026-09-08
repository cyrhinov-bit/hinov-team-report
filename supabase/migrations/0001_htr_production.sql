create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'COLLABORATEUR',
  department text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  title text not null,
  description text not null default '',
  category text not null default 'Coordination',
  status text not null default 'En cours' check (status in ('Terminée', 'En cours', 'En attente')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_ai_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'gemini',
  encrypted_api_key text not null,
  key_last_four text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  difficulties text not null default '',
  perspectives text not null default '',
  improved_difficulties text,
  improved_perspectives text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED', 'APPROVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.user_ai_settings enable row level security;
alter table public.weekly_reports enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can manage their activities" on public.activities;
create policy "Users can manage their activities"
  on public.activities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can read their AI settings status" on public.user_ai_settings;
create policy "Users can read their AI settings status"
  on public.user_ai_settings for select using (auth.uid() = user_id);

drop policy if exists "Users can manage their AI settings" on public.user_ai_settings;
create policy "Users can manage their AI settings"
  on public.user_ai_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their weekly reports" on public.weekly_reports;
create policy "Users can manage their weekly reports"
  on public.weekly_reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, department)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.raw_user_meta_data->>'department', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();