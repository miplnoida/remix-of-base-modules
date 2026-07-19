# Award 360 · Stage D9-OPS Operator Runbook

**Purpose.** Execute runtime attestation for Award 360 Wave 1 in the approved pilot environment and collect real operational evidence. This runbook is executable by release, database, operations, security, and business teams.

**Preconditions.**

- Code manifest: `WAVE_1_PRODUCTION_READY` / `AW360-WAVE-1-C1-D8` (unchanged by D9-OPS)
- Runtime attestation: `NOT_STARTED` / `AW360-WAVE-1-C1-D9`
- Exactly four executable handlers: `SEND_LIFE_CERTIFICATE_REMINDER`, `SCHEDULE_MEDICAL_REVIEW`, `PROPOSE_SUSPENSION`, `PROPOSE_RESUMPTION`
- All other Award 360 mutations remain dark-launched

**Non-negotiables.**

- No runtime status may advance without real recorded evidence via the D9 intake surface (`awardRuntimeEvidenceIntake.ts`).
- Automated test fixtures are **never** valid live evidence.
- Runtime status **cannot** transition directly to `PASSED`; every hop is governed by `transitionRuntimeAttestation`.
- Values in "Template" tables below are **placeholders only** — they are not recorded evidence.

---

## 1. Roles and responsibilities

| Role | Responsibility |
|---|---|
| Release operator | Deploys approved commit, records deployment evidence |
| Database operator | Verifies migration, RLS, grants, retention; executes policy tests |
| Technical owner | Reviews scope, runtime SLO, multi-instance drills |
| Business owner | Approves cohort expansions, per-action attestations |
| Operations owner | Drives drills, DR, reconciliation cadence |
| Security reviewer | Executes 13-control review, closes blocking findings |
| Incident owner | Classifies incidents, triggers suspension when required |
| Kill-switch owner | Owns kill-switch drills and activation |

For each stage the responsible role, required approver, evidence produced, blocking condition, and rollback action are listed in each section header table.

---

## 2. Pre-activation checklist

| Item | Recorded value | Verified by |
|---|---|---|
| Approved commit SHA | | Release operator |
| Deployment ID | | Release operator |
| Environment | | Release operator |
| Supabase project ref | | Database operator |
| Migration version (`20260719064039_*`) | | Database operator |
| Code manifest status/version | `WAVE_1_PRODUCTION_READY` / `AW360-WAVE-1-C1-D8` | Technical owner |
| Runtime attestation status/version | `NOT_STARTED` / `AW360-WAVE-1-C1-D9` | Technical owner |
| Registry size | 4 | Technical owner |
| Approved action list matches `APPROVED_PILOT_ACTIONS` | Yes/No | Technical owner |
| All non-pilot mutations dark-launched | Yes/No | Technical owner |
| Kill-switch initial state | | Kill-switch owner |
| Pilot tenant | | Business owner |
| Named users (Tech, Business, Cohort) | | Business owner |
| Telemetry destination reachable | Yes/No | Operations owner |
| Reconciliation scheduler online | Yes/No | Operations owner |
| Alert recipients confirmed | Yes/No | Operations owner |
| Backups verified available | Yes/No | Database operator |

> **Template only.** Do not copy example values into evidence records.

---

## 3. Deployment verification

**Owner.** Release operator. **Approver.** Technical owner.

Procedure:

1. Confirm deployed commit SHA equals approved SHA from change ticket.
2. Record deployment ID from platform.
3. Read `AWARD360_LOADER_MANIFEST` in the deployed bundle. Expect `WAVE_1_PRODUCTION_READY` / `AW360-WAVE-1-C1-D8`.
4. Read `AWARD360_RUNTIME_ATTESTATION`. Expect `NOT_STARTED` / `AW360-WAVE-1-C1-D9`.
5. Enumerate `AWARD_COMMAND_REGISTRY` keys. Expect exactly the four approved actions.
6. Read `AWARD_PILOT_D9_DIAGNOSTICS` and record the counts.
7. Confirm kill switches are in expected initial state.
8. Confirm pilot cohort configuration matches `AWARD_PILOT_SCOPE_FREEZE`.

**Pass.** All items match. **Fail.** Any mismatch. **Escalate to.** Technical owner; block window opening.

Record via `recordDeploymentEvidence`.

---

## 4. Database migration verification

**Owner.** Database operator. **Approver.** Technical owner.

Read-only SQL:

```sql
-- Existence
SELECT to_regclass('public.bn_award_pilot_idempotency') IS NOT NULL AS exists;

-- Composite PK
SELECT a.attname
  FROM pg_index i
  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
 WHERE i.indrelid = 'public.bn_award_pilot_idempotency'::regclass AND i.indisprimary;
-- Expect: tenant_id, idempotency_key

-- Indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'bn_award_pilot_idempotency';

-- RLS enabled
SELECT relrowsecurity FROM pg_class WHERE oid = 'public.bn_award_pilot_idempotency'::regclass;

-- Policies
SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'public.bn_award_pilot_idempotency'::regclass;

-- Grants
SELECT grantee, privilege_type FROM information_schema.role_table_grants
 WHERE table_schema='public' AND table_name='bn_award_pilot_idempotency';

-- Retention + correlation + award reference columns
SELECT column_name FROM information_schema.columns
 WHERE table_schema='public' AND table_name='bn_award_pilot_idempotency'
 ORDER BY ordinal_position;
```

Inspection is read-only. Do **not** run production destructive rollback here — that path is in `awardPilotProductionRollback.ts` and requires the incident/kill-switch owner.

Record via `recordDatabaseVerification`.

---

## 5. Live tenant-policy test procedure

**Owner.** Database operator + security reviewer. **Approver.** Security reviewer.

Execute each scenario against the deployed pilot database using named test sessions. Do not expose production tokens in the evidence record — reference session labels only.

| Test ID | DB session | Tenant ctx | Operation | Expected |
|---|---|---|---|---|
| POL-001 | tenant_a_user | A | SELECT own row | Success |
| POL-002 | tenant_b_user | B | SELECT own row | Success |
| POL-003 | unauth_session | — | SELECT any row | Denied |
| POL-004 | tenant_a_user | A | SELECT tenant B row | 0 rows |
| POL-005 | tenant_a_user | A | UPDATE tenant B row | Denied / 0 rows |
| POL-006 | tenant_a_user + tenant_b_user | A & B | INSERT same idempotency_key | Both succeed, isolated |
| POL-007 | tenant_a_user | manipulated | Attempt B ctx via app | Denied |
| POL-008 | service_role (approved server task) | A | INSERT via approved handler | Success |

Each row records identity, session, tenant, operation, expected, actual, timestamp, reviewer, evidence reference. Record via `recordTenantPolicyExecution`.

---

## 6. Runtime scope verification

**Owner.** Technical owner. **Approver.** Operations owner.

Procedure:

1. Call `runInProcessScopeCheck` in the deployed runtime.
2. Confirm `frozen = true`, `findings = []`, `cohortExpansionAllowed = true`.
3. Confirm the inventory returned by `AWARD_ACTION_CONSUMER_INVENTORY` equals `APPROVED_PILOT_ACTIONS`.
4. Confirm every non-pilot mutation returns dark-launched from `awardActionGuard.check`.

**Blocking.** Any drift finding. **Action on drift.** Immediate alert to `operationalOwner` + `technicalOwner`; suspend cohort expansion; open incident.

Record via `recordRuntimeScopeCheck`.

---

## 7. Evidence-window activation

**Owner.** Operations owner. **Approvers.** Business, technical, operations, security owners.

Form:

- Pilot tenant
- Named users (Tech / Business / Cohort) with roles
- Start / End ISO timestamps
- Minimum duration (days)
- Min volume per action
- Max daily volume per action
- Reconciliation cadence
- Business-review cadence
- Kill-switch drill date
- Provider-degradation drill date
- Promotion-review date
- Rollback triggers
- Suspension triggers
- Four approver identities + timestamps

Transition:

- `NOT_STARTED → IN_PROGRESS` is allowed **only** after §3–§6 evidence records exist and are validated by the intake surface.
- Direct transition to `PASSED` is **prohibited** and rejected by `transitionRuntimeAttestation`.

Record via `openEvidenceWindow`.

---

## 8. Multi-instance idempotency drill

**Owner.** Technical owner. **Approver.** Operations owner.

Requirements:

- At least two independent application instances (`instance-1`, `instance-2`) on separate database connections. Process-local locks are **not** valid proof.

For each scenario, record instance IDs, connection IDs, timestamps, idempotency key, command ID, correlation ID, mutation count, audit count, final result:

1. Concurrent identical requests
2. One atomic claim + one business mutation + one audit event
3. Stable IN_FLIGHT observation
4. Completed replay returns same outcome, zero new mutation
5. Fingerprint conflict rejected
6. Same key in another tenant permitted (isolated)
7. Process termination after claim, before commit → recoverable
8. Process termination after commit → replay-safe
9. Retry after response loss → idempotent
10. Abandoned claim handled by TTL/recovery

**Invariant.** Zero duplicate business effects across all scenarios.

Record via `recordMultiInstanceObservation`.

---

## 9. Named-user rollout

**Owner.** Operations owner. **Approver.** Business owner.

Phase order (from `ROLLOUT_PHASE_ORDER`): Internal Tech → 1 Business user → Named Cohort → Full Pilot.

Each expansion requires:

- Clean reconciliation since last phase
- No unresolved CRITICAL/HIGH incident
- Minimum volume for previous phase met
- Business + technical approval recorded

Record via `advanceRolloutPhase`.

---

## 10. Per-command live evidence

Every executed command records the following via `recordLiveCommandEvidence`. **Forbidden fields**: password, token, full payload, DOB, SSN, PIN, CVV, secrets, unnecessary personal data. `assertNoSensitiveFields` runs on every submission.

Required fields: action, commandId, correlationId, tenantId, awardId, actorUserId, effectiveRole, resolverDecision, guardDecision, killSwitchState, cohortDecision, payloadValid, expectedVersion, resultingVersion, idempotencyResult, commandOutcome, auditReference, telemetryCompleted, externalAckReceived, reconciliationStatus, userVisibleResult, compensationStatus, appVersion, manifestVersion, capturedAt, deploymentId, commitSha, runtimeManifestVersion.

---

## 11. Action-specific validation

### SEND_LIFE_CERTIFICATE_REMINDER
- Command success ≠ delivery. Delivery is proven only by provider acknowledgement (`externalAckReceived`).
- User-visible result must match expected reminder outcome.

### SCHEDULE_MEDICAL_REVIEW
- New/updated review row with correct scheduled date; cancellation/reschedule drill exercised.

### PROPOSE_SUSPENSION
- Creates a **proposal** only. Award state must not transition to final suspension during D9-OPS.
- Withdrawal drill exercised.

### PROPOSE_RESUMPTION
- Creates a **proposal** only. Resumption is never final in this pilot.
- Withdrawal drill exercised.

Record via `recordActionValidation`.

---

## 12. Reconciliation execution

Reconcile after every pilot batch, on schedule, after immediate alerts, before cohort expansion, before promotion. Each run records triggers and per-class discrepancy counts. **Any unexplained discrepancy is a promotion blocker.** Record via `recordReconciliationRun`.

---

## 13. Alert delivery verification

Controlled test procedure for: audit persistence failure, execution outside cohort, cross-tenant mismatch, reconciliation discrepancy, unexpected command exception.

Each recorded delivery must include: alert generated, delivered timestamp, named recipient, correlation ID, runbook reference, acknowledgement timestamp, owner assignment, closure or suspension decision. Record via `recordAlertDelivery`.

---

## 14. Operational drills

Execute and record all twelve drills defined in `REQUIRED_OPERATIONAL_DRILLS`:

1. Kill-switch activation
2. Cohort removal after UI load
3. Concurrent duplicate submission
4. Stale-version conflict
5. Provider timeout
6. Process termination
7. Response loss after commit
8. Deployment rollback
9. Reconciliation discrepancy
10. Correlation-ID investigation
11. Proposal withdrawal
12. Medical-review cancellation or rescheduling

Record via `recordOperationalDrill` (one row per drill).

---

## 15. Disaster-recovery procedure

Backup then restore all eight datasets in `RUNTIME_DR_DATASETS` (award state, idempotency, command outcomes, audits, reconciliation history, incidents, pilot evidence, provider references).

After restore, verify: completed commands replay-safe; zero business commands re-executed; audit relationships intact; reconciliation succeeds; provider references traceable; kill switch safe; registry/manifest compatible.

Record via `recordDRResult`.

---

## 16. Security review checklist

All 13 controls (`RUNTIME_SECURITY_CONTROLS`). For each: control, reviewer, result, evidence, severity, remediation, due date, closure approval. **Any unresolved CRITICAL or HIGH blocks promotion.** Record via `recordSecurityFinding`.

---

## 17. Runtime SLO evaluation

Evidence table columns: metric, threshold, measurement, sample count, window, measured by, source. Metrics: availability, p50/p95/p99 latency, failure rate, audit persistence, reconciliation duration, alert delivery time, provider ack time, incident acknowledgement, recovery time, plus hard invariants (zero cross-tenant, zero unauthorised, zero duplicate business effects). Record via `recordSloMeasurement`.

---

## 18. Per-action attestation

Independent form per action. Decisions: `APPROVED_FOR_TENANT`, `EXPAND_COHORT`, `REMAIN_PILOT`, `REQUIRES_REMEDIATION`, `SUSPENDED`. Requires evidence period, volume, business outcome, SLO/reconciliation/incident/security/compensation results, four sign-offs, rationale, rollback condition. Aggregate totals cannot approve an individual action. Record via `recordActionAttestation` (validated by `validateActionAttestation`).

---

## 19. Final runtime transition

- `IN_PROGRESS → SUSPENDED` on any blocking incident, drill failure, or evidence gap; requires reason.
- `IN_PROGRESS → FAILED` on unrecoverable blocker.
- `SUSPENDED → IN_PROGRESS` after remediation evidence recorded.
- `IN_PROGRESS → PASSED` only when the promotion checklist in `evaluatePromotionReadiness` returns `ready=true`:
  - evidence window complete
  - required volumes met per action
  - reconciliation zero unexplained discrepancies
  - alerts delivered + acknowledged
  - all 12 drills pass
  - DR passed
  - no unresolved CRITICAL/HIGH incident
  - security review no blocking findings
  - SLOs pass
  - four sign-offs per promoted action
  - automated tests remain green
  - code manifest unchanged

`PASSED` sets `WAVE_1_PRODUCTION_ATTESTED` on the runtime attestation record only — the code manifest is never altered by this runbook.
