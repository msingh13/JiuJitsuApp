-- Run after the private journal migration. Only a caller's own daily quota is affected.
create table public.nutrition_estimate_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  attempts integer not null check(attempts between 1 and 10),
  primary key(user_id, day)
);
alter table public.nutrition_estimate_usage enable row level security;
revoke all on public.nutrition_estimate_usage from public, anon, authenticated;
create function public.claim_nutrition_estimate() returns boolean
language plpgsql security definer set search_path = '' as $$
declare accepted integer;
begin
  if auth.uid() is null then return false; end if;
  insert into public.nutrition_estimate_usage(user_id,day,attempts)
  values(auth.uid(), (now() at time zone 'UTC')::date, 1)
  on conflict(user_id,day) do update set attempts=public.nutrition_estimate_usage.attempts+1
  where public.nutrition_estimate_usage.attempts < 10 returning attempts into accepted;
  return accepted is not null;
end; $$;
revoke all on function public.claim_nutrition_estimate() from public, anon;
grant execute on function public.claim_nutrition_estimate() to authenticated;
