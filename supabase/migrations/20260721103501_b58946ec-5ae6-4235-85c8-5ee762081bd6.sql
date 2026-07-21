
-- CH-SIMPLE-P3E-B — Targeted Controlled-Live Dispatch and Provider Evidence
set search_path = public;

-- 1. Read hardening (project rule: no RLS; use GRANT/REVOKE + SECURITY DEFINER RPCs)
revoke all on public.communication_controlled_live_execution from anon, authenticated;
revoke all on public.communication_controlled_live_grant     from anon, authenticated;
grant all on public.communication_controlled_live_execution to service_role;
grant all on public.communication_controlled_live_grant     to service_role;

-- 2. Additional evidence columns (idempotent)
alter table public.communication_controlled_live_execution
  add column if not exists prior_operating_mode        communication_operating_mode,
  add column if not exists final_operating_mode        communication_operating_mode,
  add column if not exists restored_operating_mode     communication_operating_mode,
  add column if not exists cleanup_state               text,
  add column if not exists cleanup_succeeded           boolean,
  add column if not exists cleanup_error               text,
  add column if not exists provider_call_attempted     boolean not null default false,
  add column if not exists provider_invocation_key     text,
  add column if not exists provider_invocation_started_at timestamptz,
  add column if not exists provider_call_completed_at  timestamptz,
  add column if not exists provider_name               text,
  add column if not exists provider_status             text,
  add column if not exists provider_response_safe      jsonb;

alter table public.communication_delivery_attempt
  add column if not exists controlled_live_execution_id uuid,
  add column if not exists grant_id                     uuid,
  add column if not exists provider_invocation_key      text,
  add column if not exists provider_call_completed_at   timestamptz,
  add column if not exists provider_status              text,
  add column if not exists provider_response_safe       jsonb,
  add column if not exists preview_approval_id          uuid,
  add column if not exists dry_run_certification_id     uuid,
  add column if not exists result                       text;

create unique index if not exists uq_cda_provider_invocation_key
  on public.communication_delivery_attempt(provider_invocation_key)
  where provider_invocation_key is not null;

create index if not exists ix_cda_controlled_live_execution
  on public.communication_delivery_attempt(controlled_live_execution_id)
  where controlled_live_execution_id is not null;

-- 3. Admin gate helper
create or replace function public.is_comm_hub_admin(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
           public.is_admin(_uid)
        or public.has_role(_uid, 'Admin'::app_role)
        or public.has_permission(_uid, 'communication_hub', 'admin'),
         false)
$$;

-- 4. Grant lifecycle RPCs
create or replace function public.reserve_comm_hub_controlled_live_grant(
  p_grant_id uuid, p_execution_id uuid,
  p_recipient_set_hash text, p_subject_hash text, p_body_hash text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row communication_controlled_live_grant%rowtype;
begin
  select * into v_row from communication_controlled_live_grant where id = p_grant_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'grant_not_found'); end if;
  if v_row.execution_id <> p_execution_id then
    return jsonb_build_object('ok', false, 'code', 'grant_execution_mismatch');
  end if;
  if v_row.expires_at is not null and v_row.expires_at < now() then
    update communication_controlled_live_grant set status = 'EXPIRED',
      audit_metadata = coalesce(audit_metadata,'{}'::jsonb) || jsonb_build_object('expired_at', now())
      where id = p_grant_id and status = 'ISSUED';
    return jsonb_build_object('ok', false, 'code', 'grant_expired');
  end if;
  if v_row.status = 'RESERVED' then
    if v_row.recipient_set_hash <> p_recipient_set_hash then
      return jsonb_build_object('ok', false, 'code', 'grant_recipient_mismatch');
    end if;
    return jsonb_build_object('ok', true, 'status', 'RESERVED', 'idempotent', true, 'grant_id', v_row.id);
  end if;
  if v_row.status <> 'ISSUED' then
    return jsonb_build_object('ok', false, 'code', 'grant_terminal', 'status', v_row.status);
  end if;
  if v_row.recipient_set_hash <> p_recipient_set_hash then
    return jsonb_build_object('ok', false, 'code', 'grant_recipient_mismatch');
  end if;
  update communication_controlled_live_grant
     set status = 'RESERVED', reserved_at = now(),
         audit_metadata = coalesce(audit_metadata,'{}'::jsonb)
           || jsonb_build_object('subject_hash', p_subject_hash, 'body_hash', p_body_hash, 'reserved_at', now())
   where id = p_grant_id and status = 'ISSUED';
  return jsonb_build_object('ok', true, 'status', 'RESERVED', 'grant_id', p_grant_id);
end $$;

create or replace function public.consume_comm_hub_controlled_live_grant(
  p_grant_id uuid, p_execution_id uuid, p_provider_invocation_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row communication_controlled_live_grant%rowtype;
  v_started boolean;
begin
  select * into v_row from communication_controlled_live_grant where id = p_grant_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'grant_not_found'); end if;
  if v_row.execution_id <> p_execution_id then
    return jsonb_build_object('ok', false, 'code', 'grant_execution_mismatch');
  end if;
  if v_row.status = 'CONSUMED' then
    return jsonb_build_object('ok', true, 'status', 'CONSUMED', 'idempotent', true);
  end if;
  if v_row.status <> 'RESERVED' then
    return jsonb_build_object('ok', false, 'code', 'grant_not_reserved', 'status', v_row.status);
  end if;
  select provider_call_attempted into v_started
    from communication_controlled_live_execution where id = p_execution_id;
  if not coalesce(v_started, false) then
    return jsonb_build_object('ok', false, 'code', 'provider_call_not_attempted');
  end if;
  update communication_controlled_live_grant
     set status = 'CONSUMED', consumed_at = now(),
         audit_metadata = coalesce(audit_metadata,'{}'::jsonb)
           || jsonb_build_object('consumed_at', now(), 'provider_invocation_key', p_provider_invocation_key)
   where id = p_grant_id and status = 'RESERVED';
  return jsonb_build_object('ok', true, 'status', 'CONSUMED');
end $$;

create or replace function public.revoke_comm_hub_controlled_live_grant(
  p_grant_id uuid, p_execution_id uuid, p_reason text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row communication_controlled_live_grant%rowtype;
  v_started boolean;
begin
  select * into v_row from communication_controlled_live_grant where id = p_grant_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'grant_not_found'); end if;
  if v_row.execution_id <> p_execution_id then
    return jsonb_build_object('ok', false, 'code', 'grant_execution_mismatch');
  end if;
  if v_row.status = 'REVOKED' then
    return jsonb_build_object('ok', true, 'status', 'REVOKED', 'idempotent', true);
  end if;
  if v_row.status not in ('ISSUED','RESERVED') then
    return jsonb_build_object('ok', false, 'code', 'grant_terminal', 'status', v_row.status);
  end if;
  select provider_call_attempted into v_started
    from communication_controlled_live_execution where id = p_execution_id;
  if coalesce(v_started, false) then
    return jsonb_build_object('ok', false, 'code', 'provider_call_already_attempted');
  end if;
  update communication_controlled_live_grant
     set status = 'REVOKED', revoked_at = now(), revocation_reason = p_reason,
         audit_metadata = coalesce(audit_metadata,'{}'::jsonb)
           || jsonb_build_object('revoked_at', now(), 'reason', p_reason)
   where id = p_grant_id;
  return jsonb_build_object('ok', true, 'status', 'REVOKED');
end $$;

-- 5. Provider attempt / outcome / finalize / restore
create or replace function public.record_comm_hub_controlled_live_provider_attempt(
  p_execution_id uuid, p_invocation_key text, p_provider_name text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_exec communication_controlled_live_execution%rowtype;
begin
  select * into v_exec from communication_controlled_live_execution where id = p_execution_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'execution_not_found'); end if;
  if v_exec.provider_call_attempted then
    return jsonb_build_object('ok', true, 'idempotent', true, 'provider_invocation_key', v_exec.provider_invocation_key);
  end if;
  if v_exec.provider_invocation_key is not null and v_exec.provider_invocation_key <> p_invocation_key then
    return jsonb_build_object('ok', false, 'code', 'invocation_key_mismatch');
  end if;
  update communication_controlled_live_execution
     set provider_call_attempted = true,
         provider_invocation_key = p_invocation_key,
         provider_invocation_started_at = now(),
         provider_name = p_provider_name,
         state = 'DISPATCHING',
         updated_at = now()
   where id = p_execution_id;
  return jsonb_build_object('ok', true, 'provider_invocation_key', p_invocation_key);
end $$;

create or replace function public.record_comm_hub_controlled_live_provider_outcome(
  p_execution_id uuid, p_provider_status text, p_provider_message_id text,
  p_provider_response_safe jsonb, p_warnings jsonb default '[]'::jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_state communication_controlled_live_state;
begin
  v_state := case p_provider_status
               when 'PROVIDER_ACCEPTED' then 'PROVIDER_ACCEPTED'
               when 'DELIVERY_PENDING'  then 'DELIVERY_PENDING'
               when 'PROVIDER_REJECTED' then 'FAILED'
               else 'FAILED'
             end::communication_controlled_live_state;
  update communication_controlled_live_execution
     set provider_status = p_provider_status,
         provider_message_id = coalesce(p_provider_message_id, provider_message_id),
         provider_response_safe = p_provider_response_safe,
         provider_call_completed_at = now(),
         state = v_state,
         warnings = coalesce(warnings,'[]'::jsonb) || coalesce(p_warnings,'[]'::jsonb),
         updated_at = now()
   where id = p_execution_id;
  return jsonb_build_object('ok', true, 'state', v_state, 'provider_status', p_provider_status);
end $$;

create or replace function public.finalize_comm_hub_controlled_live(
  p_execution_id uuid, p_state text,
  p_final_operating_mode communication_operating_mode,
  p_cleanup_succeeded boolean, p_cleanup_state text,
  p_cleanup_error text default null,
  p_warnings jsonb default '[]'::jsonb,
  p_failure_stage text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update communication_controlled_live_execution
     set state = p_state::communication_controlled_live_state,
         final_operating_mode = p_final_operating_mode,
         cleanup_succeeded = p_cleanup_succeeded,
         cleanup_state = p_cleanup_state,
         cleanup_error = p_cleanup_error,
         failure_stage = coalesce(p_failure_stage, failure_stage),
         warnings = coalesce(warnings,'[]'::jsonb) || coalesce(p_warnings,'[]'::jsonb),
         completed_at = coalesce(completed_at, now()),
         updated_at = now()
   where id = p_execution_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.restore_comm_hub_operating_mode_after_controlled_live(
  p_execution_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_prior communication_operating_mode;
  v_current communication_operating_mode;
  v_err text;
begin
  select prior_operating_mode into v_prior
    from communication_controlled_live_execution where id = p_execution_id;
  if v_prior is null then
    update communication_controlled_live_execution
       set restored_operating_mode = null,
           cleanup_state = coalesce(cleanup_state,'no_restore_needed'),
           updated_at = now()
     where id = p_execution_id;
    return jsonb_build_object('ok', true, 'restored', false);
  end if;
  select operating_mode into v_current
    from communication_hub_control_settings where singleton_guard = 'primary';
  begin
    if v_current is distinct from v_prior then
      perform public.set_communication_operating_mode(v_prior,
        'restore_after_controlled_live_execution:' || p_execution_id::text);
    end if;
    update communication_controlled_live_execution
       set restored_operating_mode = v_prior,
           cleanup_state = 'restored',
           updated_at = now()
     where id = p_execution_id;
    return jsonb_build_object('ok', true, 'restored', true, 'operating_mode', v_prior);
  exception when others then
    v_err := SQLERRM;
    begin
      perform public.set_communication_operating_mode('EMERGENCY_STOP'::communication_operating_mode,
        'fail_safe_after_restore_failure:' || p_execution_id::text);
    exception when others then null;
    end;
    update communication_controlled_live_execution
       set cleanup_state = 'restore_failed_emergency_stop_engaged',
           cleanup_error = v_err,
           updated_at = now()
     where id = p_execution_id;
    return jsonb_build_object('ok', false, 'restored', false, 'fail_safe_engaged', true, 'error', v_err);
  end;
end $$;

-- 6. Operator/admin visibility RPCs
create or replace function public.get_my_comm_hub_controlled_live_executions(p_limit int default 50)
returns setof communication_controlled_live_execution
language sql stable security definer set search_path = public as $$
  select * from communication_controlled_live_execution
   where requested_by = auth.uid()
   order by started_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 200))
$$;

create or replace function public.get_comm_hub_controlled_live_execution(p_execution_id uuid)
returns communication_controlled_live_execution
language plpgsql stable security definer set search_path = public as $$
declare v_row communication_controlled_live_execution%rowtype;
begin
  select * into v_row from communication_controlled_live_execution where id = p_execution_id;
  if not found then return null; end if;
  if v_row.requested_by = auth.uid() or public.is_comm_hub_admin(auth.uid()) then
    return v_row;
  end if;
  return null;
end $$;

create or replace function public.admin_get_comm_hub_controlled_live_grant(p_grant_id uuid)
returns communication_controlled_live_grant
language plpgsql stable security definer set search_path = public as $$
declare v_row communication_controlled_live_grant%rowtype;
begin
  if not public.is_comm_hub_admin(auth.uid()) then
    raise exception 'not_authorised' using errcode = '42501';
  end if;
  select * into v_row from communication_controlled_live_grant where id = p_grant_id;
  begin
    insert into communication_hub_control_audit(event_type, actor_id, payload, created_at)
      values ('controlled_live_grant_admin_read', auth.uid(),
              jsonb_build_object('grant_id', p_grant_id), now());
  exception when others then null;
  end;
  return v_row;
end $$;

grant execute on function public.reserve_comm_hub_controlled_live_grant(uuid,uuid,text,text,text) to service_role;
grant execute on function public.consume_comm_hub_controlled_live_grant(uuid,uuid,text) to service_role;
grant execute on function public.revoke_comm_hub_controlled_live_grant(uuid,uuid,text)  to service_role;
grant execute on function public.record_comm_hub_controlled_live_provider_attempt(uuid,text,text) to service_role;
grant execute on function public.record_comm_hub_controlled_live_provider_outcome(uuid,text,text,jsonb,jsonb) to service_role;
grant execute on function public.finalize_comm_hub_controlled_live(uuid,text,communication_operating_mode,boolean,text,text,jsonb,text) to service_role;
grant execute on function public.restore_comm_hub_operating_mode_after_controlled_live(uuid) to service_role;
grant execute on function public.get_my_comm_hub_controlled_live_executions(int) to authenticated;
grant execute on function public.get_comm_hub_controlled_live_execution(uuid) to authenticated;
grant execute on function public.admin_get_comm_hub_controlled_live_grant(uuid) to authenticated;
grant execute on function public.is_comm_hub_admin(uuid) to authenticated, service_role;

-- 7. Runtime harness
create or replace function public.run_ch_p3e_b_runtime_tests()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  results jsonb := '[]'::jsonb;
  passed  int := 0;
  failed  int := 0;
  v_bool  boolean;
  v_int   int;
begin
  -- 1. authenticated has no privileges on grant table
  select bool_or(has_table_privilege('authenticated', 'public.communication_controlled_live_grant', p))
    into v_bool from unnest(array['SELECT','INSERT','UPDATE','DELETE']) as p;
  if coalesce(v_bool, false) then
    failed := failed + 1;
    results := results || jsonb_build_object('name','grant_table_locked_down','ok',false);
  else
    passed := passed + 1;
    results := results || jsonb_build_object('name','grant_table_locked_down','ok',true);
  end if;

  -- 2. execution table also locked down
  if has_table_privilege('authenticated','public.communication_controlled_live_execution','SELECT') then
    failed := failed + 1;
    results := results || jsonb_build_object('name','execution_table_locked_down','ok',false);
  else
    passed := passed + 1;
    results := results || jsonb_build_object('name','execution_table_locked_down','ok',true);
  end if;

  -- 3. all orchestrator RPCs present & SECURITY DEFINER
  select count(*) into v_int from pg_proc
    where proname in (
      'reserve_comm_hub_controlled_live_grant',
      'consume_comm_hub_controlled_live_grant',
      'revoke_comm_hub_controlled_live_grant',
      'record_comm_hub_controlled_live_provider_attempt',
      'record_comm_hub_controlled_live_provider_outcome',
      'finalize_comm_hub_controlled_live',
      'restore_comm_hub_operating_mode_after_controlled_live'
    ) and prosecdef = true;
  if v_int = 7 then
    passed := passed + 1;
    results := results || jsonb_build_object('name','orchestrator_rpcs_present','ok',true);
  else
    failed := failed + 1;
    results := results || jsonb_build_object('name','orchestrator_rpcs_present','ok',false,'count',v_int);
  end if;

  -- 4. provider_invocation_key unique
  select count(*) into v_int from pg_indexes
    where schemaname='public' and indexname='uq_cda_provider_invocation_key';
  if v_int = 1 then
    passed := passed + 1;
    results := results || jsonb_build_object('name','provider_invocation_key_unique','ok',true);
  else
    failed := failed + 1;
    results := results || jsonb_build_object('name','provider_invocation_key_unique','ok',false);
  end if;

  -- 5. active-grant-per-execution unique index preserved
  select count(*) into v_int from pg_indexes
    where schemaname='public' and indexname='uq_cclg_active_per_execution';
  if v_int = 1 then
    passed := passed + 1;
    results := results || jsonb_build_object('name','uq_active_grant_per_execution','ok',true);
  else
    failed := failed + 1;
    results := results || jsonb_build_object('name','uq_active_grant_per_execution','ok',false);
  end if;

  -- 6. execution columns
  select count(*) into v_int from information_schema.columns
    where table_schema='public' and table_name='communication_controlled_live_execution'
      and column_name in ('prior_operating_mode','restored_operating_mode','cleanup_state',
                          'cleanup_succeeded','provider_call_attempted','provider_invocation_key',
                          'provider_invocation_started_at','provider_call_completed_at',
                          'provider_status','provider_response_safe','final_operating_mode');
  if v_int = 11 then
    passed := passed + 1;
    results := results || jsonb_build_object('name','execution_columns_present','ok',true);
  else
    failed := failed + 1;
    results := results || jsonb_build_object('name','execution_columns_present','ok',false,'count',v_int);
  end if;

  -- 7. delivery_attempt columns
  select count(*) into v_int from information_schema.columns
    where table_schema='public' and table_name='communication_delivery_attempt'
      and column_name in ('controlled_live_execution_id','grant_id','provider_invocation_key',
                          'provider_status','provider_response_safe','preview_approval_id',
                          'dry_run_certification_id','result');
  if v_int = 8 then
    passed := passed + 1;
    results := results || jsonb_build_object('name','delivery_attempt_columns_present','ok',true);
  else
    failed := failed + 1;
    results := results || jsonb_build_object('name','delivery_attempt_columns_present','ok',false,'count',v_int);
  end if;

  -- 8. admin gate helper
  select count(*) into v_int from pg_proc
    where proname = 'is_comm_hub_admin' and prosecdef = true;
  if v_int >= 1 then
    passed := passed + 1;
    results := results || jsonb_build_object('name','is_comm_hub_admin_present','ok',true);
  else
    failed := failed + 1;
    results := results || jsonb_build_object('name','is_comm_hub_admin_present','ok',false);
  end if;

  -- 9. visibility RPCs
  select count(*) into v_int from pg_proc
    where proname in ('get_my_comm_hub_controlled_live_executions',
                      'get_comm_hub_controlled_live_execution',
                      'admin_get_comm_hub_controlled_live_grant')
      and prosecdef = true;
  if v_int = 3 then
    passed := passed + 1;
    results := results || jsonb_build_object('name','visibility_rpcs_present','ok',true);
  else
    failed := failed + 1;
    results := results || jsonb_build_object('name','visibility_rpcs_present','ok',false,'count',v_int);
  end if;

  return jsonb_build_object(
    'ok', failed = 0,
    'passed', passed,
    'failed', failed,
    'results', results,
    'evaluated_at', now()
  );
end $$;

grant execute on function public.run_ch_p3e_b_runtime_tests() to authenticated, service_role;
