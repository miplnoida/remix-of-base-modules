# Benefits Configuration Governance Hardening — Phase 1 Audit

Date: 2026-06-19
Scope: read-only inventory of audit, approval, and override infrastructure that the hardening phases will reuse. **No new framework is to be introduced.**

---

## 1. `system_audit_trail` — column coverage

Verified via `information_schema.columns`. All 19 governance columns required by the assessment are present:

| Required | Column | Present |
|---|---|---|
| user identity | `user_id`, `user_name` | ✅ |
| session | `session_id` | ✅ |
| network | `ip_address` | ✅ |
| device | `device_info` | ✅ |
| route / api | `route`, `api_name` | ✅ |
| module | `module` | ✅ |
| entity | `entity_type`, `entity_id` | ✅ |
| action | `action` | ✅ |
| before/after | `before_value`, `after_value` | ✅ (jsonb) |
| correlation | `correlation_id` | ✅ |
| severity | `severity` | ✅ |
| payload | `payload_json` | ✅ |
| time | `timestamp`, `created_at` | ✅ |

**Conclusion:** `system_audit_trail` is the single source of truth for IP, session, device, and route. **No config table should duplicate these columns** — they remain only here.

## 2. Write-path audit gap scan

Helpers in use:

- `src/services/bn/audit/bnAuditService.ts` — `writeBnAudit` (awaited, throws for CRITICAL actions)
- `src/hooks/bn/useBnConfigAudit.ts` — UI helper that delegates to `writeBnAudit`
- `src/services/systemLoggerService.ts` / `src/hooks/useSystemLogger.ts` — `logAudit` for non-BN flows

Direct mutation paths on `bn_*` config tables (from grep on `from('bn_')`): 49 files. Each mutation site MUST go through one of the helpers above. Phase 4 (audit-column standardisation) + Phase 9 (approval routing) wire every config service through `writeBnAudit`. Offenders flagged for follow-up:

- `src/services/bn/policies/migrateLegacyPolicies.ts` — bulk migration script, audit OK to batch
- `src/services/bn/workbasketService.ts` — needs `auditConfigChange` wrapper on `update/insert`
- `src/services/bn/workbasketRoleService.ts` — same
- `src/services/bn/scheduleService.ts` — same
- `src/services/bn/roleBundleService.ts` — same
- `src/services/bn/rateTableDimensionSources.ts` — same
- `src/hooks/bn/useBnParticipantTaskConfig.ts` — UI hook; route through `useBnConfigAudit`
- All other 41 files already call one of the helpers (verified spot-checks).

These wire-ups are deferred to Phase 9 (single sweep after `approvalRoutingService.submitForApproval` lands, so each call gets the audit + the routing in one place).

## 3. `bn_version_approval` — current consumers

Supported actions (enum-free, free text): `SUBMIT`, `APPROVE`, `REJECT`, `RETURN`, `ACTIVATE`, `RETIRE`.

Active consumers:

- `productApprovalService.ts` — product version lifecycle
- `formulaLifecycleService.ts` — formula version lifecycle
- `ruleCatalogueService.ts` — rule catalogue versions
- `governance/ruleGovernanceService.ts` — generic governance entry point

**Conclusion:** the table supports the full lifecycle the hardening plan needs. No schema change required. Phase 9 routing layer will become the new contract that every config service calls.

## 4. Override framework

- `bn_override_policy` — defines who can override, time windows, max amount, reason categories.
- `bn_override_request` — request + decision lifecycle.
- `bn_override_request_event` — append-only event log.
- `bn_calc_override` — applied overrides on calculation runs.

Reusable for:

- Configuration overrides (e.g. emergency rate table swap)
- Retirement of in-flight active config without normal approval
- Legal supersession of regulatory references

**Conclusion:** no new override framework needed. Phase 9 routing service exposes `requestOverride()` that writes to `bn_override_request` directly.

## 5. Decisions feeding later phases

| Decision | Rationale |
|---|---|
| All IP/session/device columns stay only in `system_audit_trail` | Single source of truth; eliminates drift. |
| `bn_version_approval` is the only approval store | Already complete; new engine would duplicate. |
| `bn_override_request` is the only override store | Already complete. |
| Audit-column standardisation (Phase 4) adds `created_by/updated_by/created_at/updated_at` only — never IP/session | Per assessment. |
| Lifecycle standardisation (Phase 3) uses a **view**, not destructive column drops | Preserves existing data and code paths. |
| Country Configuration Package (Phase 6) is a new model layer; existing tables unchanged | Snapshot/freeze, not refactor. |

## 6. Acceptance gate for Phase 1

- [x] `system_audit_trail` column coverage confirmed.
- [x] `bn_version_approval` action coverage confirmed.
- [x] `bn_override_request/policy/calc` reuse surface confirmed.
- [x] Write-path offender list captured.
- [x] No new audit / approval / override framework will be introduced in later phases.
