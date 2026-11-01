-- Apply once in a new Supabase project. No service-role key belongs in the app.
create table public.journal_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  kind text not null check (kind in ('sessions','techniques','workouts','meals','water','body','matches','partners','places','plans','schedule','vlogs','profile')),
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 200000),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,id)
);
create unique index one_athlete_profile on public.journal_records(user_id) where kind = 'profile';
create function public.bump_journal_revision() returns trigger language plpgsql set search_path = '' as $$
begin
  new.revision := old.revision + 1;
  new.user_id := old.user_id;
  new.id := old.id;
  new.kind := old.kind;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end; $$;
create trigger journal_revision before update on public.journal_records for each row execute function public.bump_journal_revision();
alter table public.journal_records enable row level security;
create policy own_records on public.journal_records for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.journal_records from anon;
grant select,insert,update,delete on public.journal_records to authenticated;

create table public.journal_media (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  name text not null check(length(name) <= 1000),
  type text not null check(type in ('image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime')),
  size bigint not null check(size >= 0 and size <= 52428800),
  primary key(user_id,id)
);
alter table public.journal_media enable row level security;
create policy own_media_metadata on public.journal_media for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.journal_media from anon;
grant select,insert,delete on public.journal_media to authenticated;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values
('matcraft-media','matcraft-media',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']);
create policy own_media_read on storage.objects for select to authenticated using (bucket_id='matcraft-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy own_media_upload on storage.objects for insert to authenticated with check (
 bucket_id='matcraft-media' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.journal_media m where m.user_id=(select auth.uid()) and m.id::text=storage.filename(storage.objects.name))
);
create policy own_media_delete on storage.objects for delete to authenticated using (bucket_id='matcraft-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
