alter table public.saved_tasks
add column if not exists visibility text not null default 'private'
check (visibility in ('private', 'public'));

comment on column public.saved_tasks.visibility is '타스크 공개 범위(private/public)';

update public.saved_tasks
set visibility = 'private'
where visibility is null;
