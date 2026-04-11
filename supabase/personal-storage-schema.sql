create extension if not exists pgcrypto;

create or replace function public.is_approved_user(target_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_user_id
      and approval_status = 'approved'
  );
$$;

create table if not exists public.saved_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  name text not null,
  site_id text not null,
  site_name text not null,
  date text not null,
  task_type text not null default 'RACE' check (task_type in ('RACE')),
  sss_open_time text not null,
  task_deadline_time text not null,
  distance_km numeric(8, 2) not null default 0,
  turnpoints jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorite_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  site_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, site_id)
);

create or replace function public.handle_saved_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saved_tasks_set_updated_at on public.saved_tasks;
create trigger saved_tasks_set_updated_at
before update on public.saved_tasks
for each row
execute function public.handle_saved_tasks_updated_at();

alter table public.saved_tasks enable row level security;
alter table public.favorite_sites enable row level security;

drop policy if exists "saved_tasks_select_own" on public.saved_tasks;
create policy "saved_tasks_select_own"
on public.saved_tasks
for select
to authenticated
using (
  auth.uid() = user_id
  and public.is_approved_user(auth.uid())
);

drop policy if exists "saved_tasks_insert_own" on public.saved_tasks;
create policy "saved_tasks_insert_own"
on public.saved_tasks
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.is_approved_user(auth.uid())
);

drop policy if exists "saved_tasks_update_own" on public.saved_tasks;
create policy "saved_tasks_update_own"
on public.saved_tasks
for update
to authenticated
using (
  auth.uid() = user_id
  and public.is_approved_user(auth.uid())
)
with check (
  auth.uid() = user_id
  and public.is_approved_user(auth.uid())
);

drop policy if exists "saved_tasks_delete_own" on public.saved_tasks;
create policy "saved_tasks_delete_own"
on public.saved_tasks
for delete
to authenticated
using (
  auth.uid() = user_id
  and public.is_approved_user(auth.uid())
);

drop policy if exists "favorite_sites_select_own" on public.favorite_sites;
create policy "favorite_sites_select_own"
on public.favorite_sites
for select
to authenticated
using (
  auth.uid() = user_id
  and public.is_approved_user(auth.uid())
);

drop policy if exists "favorite_sites_insert_own" on public.favorite_sites;
create policy "favorite_sites_insert_own"
on public.favorite_sites
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.is_approved_user(auth.uid())
);

drop policy if exists "favorite_sites_delete_own" on public.favorite_sites;
create policy "favorite_sites_delete_own"
on public.favorite_sites
for delete
to authenticated
using (
  auth.uid() = user_id
  and public.is_approved_user(auth.uid())
);

comment on function public.is_approved_user(uuid) is '승인된 회원인지 확인';
comment on table public.saved_tasks is '승인된 회원의 개인 저장 타스크';
comment on table public.favorite_sites is '승인된 회원의 즐겨찾는 활공장';
