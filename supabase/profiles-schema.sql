create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null default '',
  phone text not null default '',
  primary_site_id text null,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_profile_privileged_field_changes()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = old.id then
    if new.approval_status is distinct from old.approval_status then
      raise exception 'approval_status는 관리자만 변경할 수 있습니다.';
    end if;

    if new.is_admin is distinct from old.is_admin then
      raise exception 'is_admin은 관리자만 변경할 수 있습니다.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.handle_profile_updated_at();

drop trigger if exists profiles_prevent_privileged_changes on public.profiles;
create trigger profiles_prevent_privileged_changes
before update on public.profiles
for each row
execute function public.prevent_profile_privileged_field_changes();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    name,
    phone,
    primary_site_id
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'primary_site_id', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = excluded.name,
    phone = excluded.phone,
    primary_site_id = excluded.primary_site_id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

comment on table public.profiles is '승인 회원 기반 개인 저장을 위한 사용자 프로필';
comment on column public.profiles.primary_site_id is '주로 비행하는 활공장 site_id';
comment on column public.profiles.approval_status is 'pending / approved / rejected';
