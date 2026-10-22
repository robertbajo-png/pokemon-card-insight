-- Only the Edge Functions' service role can consume these quotas.
create table public.ai_usage_windows (
  user_id uuid not null,
  action text not null check (action in ('analyze', 'generate', 'translate', 'global')),
  window_start timestamptz not null,
  requests integer not null default 0 check (requests >= 0),
  primary key (user_id, action, window_start)
);
alter table public.ai_usage_windows enable row level security;
revoke all on public.ai_usage_windows from anon, authenticated;

create or replace function public.consume_ai_quota(p_user_id uuid, p_action text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
  v_count integer;
  v_hour timestamptz := date_trunc('hour', now(), 'UTC');
  v_day timestamptz := date_trunc('day', now(), 'UTC');
  v_global_id uuid := '00000000-0000-0000-0000-000000000000';
begin
  v_limit := case p_action when 'analyze' then 20 when 'generate' then 5 when 'translate' then 120 else 0 end;
  if v_limit = 0 or p_user_id is null then return false; end if;
  -- Serialize the small counter update so parallel requests cannot exceed either cap.
  perform pg_catalog.pg_advisory_xact_lock(6284971632);
  delete from public.ai_usage_windows where window_start < v_day - interval '2 days';
  select requests into v_count from public.ai_usage_windows
    where user_id = v_global_id and action = 'global' and window_start = v_day;
  if coalesce(v_count, 0) >= 1000 then return false; end if;
  select requests into v_count from public.ai_usage_windows
    where user_id = p_user_id and action = p_action and window_start = v_hour;
  if coalesce(v_count, 0) >= v_limit then return false; end if;
  insert into public.ai_usage_windows values (p_user_id, p_action, v_hour, 1)
    on conflict (user_id, action, window_start) do update set requests = public.ai_usage_windows.requests + 1;
  insert into public.ai_usage_windows values (v_global_id, 'global', v_day, 1)
    on conflict (user_id, action, window_start) do update set requests = public.ai_usage_windows.requests + 1;
  return true;
end;
$$;
revoke all on function public.consume_ai_quota(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, text) to service_role;
