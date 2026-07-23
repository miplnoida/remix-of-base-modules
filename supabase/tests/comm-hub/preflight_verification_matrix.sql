\set ON_ERROR_STOP on
BEGIN;
-- Elevate role for tests (bypass auth gates since we run as postgres/service).


-- Snapshot ID / Approval ID we mutate then roll back.
\set snap '9a7fc2cd-a715-4888-b029-83ff1de0b76d'
\set appr 'aec5dcf1-ee74-4c42-bc53-ca69bcc8891b'

-- Backfill missing fields to construct a "valid" scenario, then mutate one at a
-- time. All changes roll back at COMMIT/ROLLBACK.
UPDATE public.communication_preview_snapshot SET
  certified_dependency_hash = 'fake_cfg_hash_' || md5(id::text),
  current_dependency_hash   = 'fake_cfg_hash_' || md5(id::text),
  governance_evidence = jsonb_build_object('malformed_braces', jsonb_build_object('count',0)),
  renderer_unresolved_variables = '[]'::jsonb,
  unresolved_variables_normalised = '[]'::jsonb,
  expires_at = now() + interval '1 hour'
WHERE id = :'snap';

UPDATE public.communication_preview_approval SET
  configuration_hash_at_approval = (SELECT certified_dependency_hash FROM public.communication_preview_snapshot WHERE id = :'snap'),
  scanner_version_at_approval = 'comm-hub-raw-placeholder-scanner/v2',
  placeholder_evidence_hash_at_approval = md5('placeholders'),
  expires_at = now() + interval '30 minutes'
WHERE id = :'appr';

-- Recompute canonical approval hash so we have a valid fixture baseline.
UPDATE public.communication_preview_approval a SET
  canonical_approval_evidence_hash = public._comm_hub_compute_canonical_approval_evidence_v1(
    a.snapshot_id_at_approval, a.correlation_id_at_approval, a.content_hash_at_approval,
    a.recipient_set_hash_at_approval, a.template_version_id_at_approval,
    a.configuration_hash_at_approval, a.scanner_version_at_approval,
    a.placeholder_evidence_hash_at_approval, a.approved_by, a.approved_at, a.expires_at)
WHERE id = :'appr';

-- Helper macro: report row per case (case_name, blocker_count, status)
CREATE TEMP TABLE matrix_results(case_name text, status text, blocker_count int, first_blocker text, ready boolean);

CREATE OR REPLACE FUNCTION pg_temp.record_case(p_case text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r jsonb; ev jsonb; BEGIN
  r := public.inspect_comm_hub_dry_run_preflight(:'snap'::uuid,:'appr'::uuid,'APPEALS','APPEAL_RECEIVED_NOTICE','email');
  ev := r->'evidence';
  INSERT INTO matrix_results VALUES (
    p_case,
    r->>'status',
    jsonb_array_length(coalesce(r->'blockers','[]'::jsonb)),
    coalesce((r->'blockers'->0->>'code'),''),
    (r->>'status') = 'PREFLIGHT_READY'
  );
END $$;

-- Case 40: baseline valid fixture — expect PREFLIGHT_READY
SELECT pg_temp.record_case('40_valid_baseline');

-- Case 5: preview not PREPARED
UPDATE public.communication_preview_snapshot SET status='SUPERSEDED' WHERE id=:'snap';
SELECT pg_temp.record_case('05_preview_not_prepared');
UPDATE public.communication_preview_snapshot SET status='PREPARED' WHERE id=:'snap';

-- Case 7: expired preview
UPDATE public.communication_preview_snapshot SET expires_at = now() - interval '1 minute' WHERE id=:'snap';
SELECT pg_temp.record_case('07_preview_expired');
UPDATE public.communication_preview_snapshot SET expires_at = now() + interval '1 hour' WHERE id=:'snap';

-- Case 8: approval not ACTIVE (RESERVED)
UPDATE public.communication_preview_approval SET status='RESERVED' WHERE id=:'appr';
SELECT pg_temp.record_case('08_approval_reserved');
UPDATE public.communication_preview_approval SET status='ACTIVE' WHERE id=:'appr';

-- Case 11: revoked
UPDATE public.communication_preview_approval SET status='REVOKED' WHERE id=:'appr';
SELECT pg_temp.record_case('11_approval_revoked');
UPDATE public.communication_preview_approval SET status='ACTIVE' WHERE id=:'appr';

-- Case 12: expired approval
UPDATE public.communication_preview_approval SET expires_at = now() - interval '1 minute' WHERE id=:'appr';
SELECT pg_temp.record_case('12_approval_expired');
UPDATE public.communication_preview_approval SET expires_at = now() + interval '30 minutes' WHERE id=:'appr';

-- Case 13: missing approval actor
UPDATE public.communication_preview_approval SET approved_at = NULL WHERE id=:'appr';
SELECT pg_temp.record_case('13_approval_actor_missing');
UPDATE public.communication_preview_approval SET approved_at = now() WHERE id=:'appr';

-- Case 14: missing approval correlation
UPDATE public.communication_preview_approval SET correlation_id_at_approval = NULL WHERE id=:'appr';
SELECT pg_temp.record_case('14_approval_correlation_missing');
UPDATE public.communication_preview_approval SET correlation_id_at_approval = (SELECT correlation_id FROM public.communication_preview_snapshot WHERE id=:'snap') WHERE id=:'appr';

-- Case 15: correlation mismatch (rebase canonical)
UPDATE public.communication_preview_approval SET correlation_id_at_approval = gen_random_uuid() WHERE id=:'appr';
UPDATE public.communication_preview_approval a SET canonical_approval_evidence_hash = public._comm_hub_compute_canonical_approval_evidence_v1(
  a.snapshot_id_at_approval, a.correlation_id_at_approval, a.content_hash_at_approval, a.recipient_set_hash_at_approval,
  a.template_version_id_at_approval, a.configuration_hash_at_approval, a.scanner_version_at_approval,
  a.placeholder_evidence_hash_at_approval, a.approved_by, a.approved_at, a.expires_at) WHERE id=:'appr';
SELECT pg_temp.record_case('15_correlation_mismatch');
UPDATE public.communication_preview_approval SET correlation_id_at_approval = (SELECT correlation_id FROM public.communication_preview_snapshot WHERE id=:'snap') WHERE id=:'appr';
UPDATE public.communication_preview_approval a SET canonical_approval_evidence_hash = public._comm_hub_compute_canonical_approval_evidence_v1(
  a.snapshot_id_at_approval, a.correlation_id_at_approval, a.content_hash_at_approval, a.recipient_set_hash_at_approval,
  a.template_version_id_at_approval, a.configuration_hash_at_approval, a.scanner_version_at_approval,
  a.placeholder_evidence_hash_at_approval, a.approved_by, a.approved_at, a.expires_at) WHERE id=:'appr';

-- Case 16: missing approval evidence field (configuration_hash_at_approval)
UPDATE public.communication_preview_approval SET configuration_hash_at_approval = NULL WHERE id=:'appr';
SELECT pg_temp.record_case('16_appr_ev_missing_config_hash');
UPDATE public.communication_preview_approval a SET configuration_hash_at_approval = (SELECT certified_dependency_hash FROM public.communication_preview_snapshot WHERE id=:'snap'),
  canonical_approval_evidence_hash = public._comm_hub_compute_canonical_approval_evidence_v1(
    a.snapshot_id_at_approval,a.correlation_id_at_approval,a.content_hash_at_approval,a.recipient_set_hash_at_approval,
    a.template_version_id_at_approval,(SELECT certified_dependency_hash FROM public.communication_preview_snapshot WHERE id=:'snap'),
    a.scanner_version_at_approval,a.placeholder_evidence_hash_at_approval,a.approved_by,a.approved_at,a.expires_at) WHERE id=:'appr';

-- Case 18: canonical approval hash tampered
UPDATE public.communication_preview_approval SET canonical_approval_evidence_hash = md5('tampered') WHERE id=:'appr';
SELECT pg_temp.record_case('18_canonical_hash_mismatch');
UPDATE public.communication_preview_approval a SET canonical_approval_evidence_hash = public._comm_hub_compute_canonical_approval_evidence_v1(
  a.snapshot_id_at_approval,a.correlation_id_at_approval,a.content_hash_at_approval,a.recipient_set_hash_at_approval,
  a.template_version_id_at_approval,a.configuration_hash_at_approval,a.scanner_version_at_approval,
  a.placeholder_evidence_hash_at_approval,a.approved_by,a.approved_at,a.expires_at) WHERE id=:'appr';

-- Case 19: scanner v1
UPDATE public.communication_preview_snapshot SET placeholder_scanner_version='comm-hub-raw-placeholder-scanner/v1' WHERE id=:'snap';
SELECT pg_temp.record_case('19_scanner_v1');
UPDATE public.communication_preview_snapshot SET placeholder_scanner_version='comm-hub-raw-placeholder-scanner/v2' WHERE id=:'snap';

-- Case 20: raw placeholder residue
UPDATE public.communication_preview_snapshot SET raw_placeholder_count=3 WHERE id=:'snap';
SELECT pg_temp.record_case('20_raw_placeholder_residue');
UPDATE public.communication_preview_snapshot SET raw_placeholder_count=0 WHERE id=:'snap';

-- Case 21: malformed brace evidence missing
UPDATE public.communication_preview_snapshot SET governance_evidence='{}'::jsonb WHERE id=:'snap';
SELECT pg_temp.record_case('21_mb_evidence_missing');

-- Case 22: malformed brace evidence invalid (string)
UPDATE public.communication_preview_snapshot SET governance_evidence=jsonb_build_object('malformed_braces','not-an-object') WHERE id=:'snap';
SELECT pg_temp.record_case('22_mb_evidence_invalid');

-- Case 23: malformed braces present
UPDATE public.communication_preview_snapshot SET governance_evidence=jsonb_build_object('malformed_braces',jsonb_build_object('count',2)) WHERE id=:'snap';
SELECT pg_temp.record_case('23_mb_present');
UPDATE public.communication_preview_snapshot SET governance_evidence=jsonb_build_object('malformed_braces',jsonb_build_object('count',0)) WHERE id=:'snap';

-- Case 24: renderer evidence invalid (object instead of array)
UPDATE public.communication_preview_snapshot SET renderer_unresolved_variables='{"bad":1}'::jsonb WHERE id=:'snap';
SELECT pg_temp.record_case('24_renderer_evidence_invalid');
UPDATE public.communication_preview_snapshot SET renderer_unresolved_variables='[]'::jsonb WHERE id=:'snap';

-- Case 25: renderer unresolved present
UPDATE public.communication_preview_snapshot SET renderer_unresolved_variables='["x"]'::jsonb WHERE id=:'snap';
SELECT pg_temp.record_case('25_renderer_unresolved');
UPDATE public.communication_preview_snapshot SET renderer_unresolved_variables='[]'::jsonb WHERE id=:'snap';

-- Case 26: resolver evidence invalid (non-object entry)
UPDATE public.communication_preview_snapshot SET unresolved_variables_normalised='["str_entry"]'::jsonb WHERE id=:'snap';
SELECT pg_temp.record_case('26_resolver_evidence_invalid');
UPDATE public.communication_preview_snapshot SET unresolved_variables_normalised='[]'::jsonb WHERE id=:'snap';

-- Case 27: resolver required unresolved
UPDATE public.communication_preview_snapshot SET unresolved_variables_normalised='[{"name":"x","required":true}]'::jsonb WHERE id=:'snap';
SELECT pg_temp.record_case('27_resolver_required_unresolved');
UPDATE public.communication_preview_snapshot SET unresolved_variables_normalised='[]'::jsonb WHERE id=:'snap';

-- Case 28: configuration hash missing on snapshot
UPDATE public.communication_preview_snapshot SET certified_dependency_hash=NULL WHERE id=:'snap';
SELECT pg_temp.record_case('28_cfg_hash_missing');
UPDATE public.communication_preview_snapshot SET certified_dependency_hash=(SELECT configuration_hash_at_approval FROM public.communication_preview_approval WHERE id=:'appr') WHERE id=:'snap';

-- Case 30: dependency drift
UPDATE public.communication_preview_snapshot SET current_dependency_hash='different_hash' WHERE id=:'snap';
SELECT pg_temp.record_case('30_dependency_drift');
UPDATE public.communication_preview_snapshot SET current_dependency_hash=certified_dependency_hash WHERE id=:'snap';

-- Case 31: malformed recipient container (non-array TO)
UPDATE public.communication_preview_snapshot SET to_recipients='"not-an-array"'::jsonb WHERE id=:'snap';
SELECT pg_temp.record_case('31_recipient_container_invalid');
UPDATE public.communication_preview_snapshot SET to_recipients='["rohit@mishainfotech.com"]'::jsonb WHERE id=:'snap';

-- Case 34/35: invalid recipient entry (no @)
UPDATE public.communication_preview_snapshot SET to_recipients='["not-an-email"]'::jsonb WHERE id=:'snap';
SELECT pg_temp.record_case('35_recipient_address_invalid');
UPDATE public.communication_preview_snapshot SET to_recipients='["rohit@mishainfotech.com"]'::jsonb WHERE id=:'snap';

-- Case 36: duplicate within one role
UPDATE public.communication_preview_snapshot SET to_recipients='["rohit@mishainfotech.com","rohit@mishainfotech.com"]'::jsonb WHERE id=:'snap';
SELECT pg_temp.record_case('36_duplicate_within_role');
UPDATE public.communication_preview_snapshot SET to_recipients='["rohit@mishainfotech.com"]'::jsonb WHERE id=:'snap';

-- Case 37: duplicate across roles (same address in TO and CC)
UPDATE public.communication_preview_snapshot SET cc_recipients='["rohit@mishainfotech.com"]'::jsonb WHERE id=:'snap';
SELECT pg_temp.record_case('37_duplicate_across_roles');
UPDATE public.communication_preview_snapshot SET cc_recipients='[]'::jsonb WHERE id=:'snap';

-- Case 38: Preview recipient hash mismatch (tamper stored hash)
UPDATE public.communication_preview_snapshot SET recipient_set_hash='deadbeef' WHERE id=:'snap';
SELECT pg_temp.record_case('38_recipient_hash_recompute_mismatch');
UPDATE public.communication_preview_snapshot s SET recipient_set_hash=(public.comm_hub_normalize_recipient_set(s.to_recipients,s.cc_recipients,s.bcc_recipients)->>'recipient_set_hash') WHERE id=:'snap';

-- Case 39: approval recipient hash mismatch
UPDATE public.communication_preview_approval SET recipient_set_hash_at_approval='different' WHERE id=:'appr';
SELECT pg_temp.record_case('39_approval_recipient_hash_mismatch');
UPDATE public.communication_preview_approval a SET recipient_set_hash_at_approval=(SELECT recipient_set_hash FROM public.communication_preview_snapshot WHERE id=:'snap'),
  canonical_approval_evidence_hash = public._comm_hub_compute_canonical_approval_evidence_v1(
    a.snapshot_id_at_approval,a.correlation_id_at_approval,a.content_hash_at_approval,
    (SELECT recipient_set_hash FROM public.communication_preview_snapshot WHERE id=:'snap'),
    a.template_version_id_at_approval,a.configuration_hash_at_approval,a.scanner_version_at_approval,
    a.placeholder_evidence_hash_at_approval,a.approved_by,a.approved_at,a.expires_at) WHERE id=:'appr';

-- Re-run baseline to confirm still PREFLIGHT_READY after reverts
SELECT pg_temp.record_case('40_valid_baseline_recheck');

-- Report
\echo ---MATRIX RESULTS---
SELECT case_name, status, blocker_count, first_blocker, ready FROM matrix_results ORDER BY case_name;

-- Zero-row-delta proof (these tables must have identical counts pre/post; since we ROLLBACK, trivially true).
\echo ---ROWCOUNT SANITY---
SELECT 'dry_run_execution' AS tbl, count(*) FROM public.communication_dry_run_execution
UNION ALL SELECT 'dry_run_certification', count(*) FROM public.communication_dry_run_certification
UNION ALL SELECT 'communication_request', count(*) FROM public.communication_request
UNION ALL SELECT 'communication_message', count(*) FROM public.communication_message;

ROLLBACK;
