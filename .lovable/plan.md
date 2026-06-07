# Unified BN Claim Workbench + Catalog-Driven Data, Amendments & Communications

This is a large, multi-week initiative spanning schema, services, and UI. Delivering it in one shot would be unsafe — it would touch dozens of tables and ~50+ Workbench/Catalog files. I'm proposing a phased rollout where each phase ships a working slice with tests, then the next phase builds on it.

Most of the backbone already exists in the codebase:
- `bn_product_channel_config`, `bn_product_amendment_policy`, `bn_claim_field_ownership`, `bn_claim_amendment_log`, `bn_claim_correction_request/_field`
- `bn_comm_mapping`, `bn_comm_event`, `bn_communication_log`, central `notification_templates`
- `bn_claim_application` (submission snapshot), `bn_claim_event`, `system_audit_trail`
- `useClaimEditability`, `useApplicationFormDefinition`, `bnCommunicationAdapter`, `bnAuditService`

So this is mostly **wiring + UI standardization + gap-filling**, not greenfield.

---

## Phase A — Catalog completeness & validation (foundation)

Goal: Product Catalog truly drives everything before Workbench depends on it.

- Audit `bn_product_channel_config` / `bn_field_metadata` and seed missing field configs for every active product version (public, offline, workbench visibility, editable roles/channels, editable-until status, validation).
- Seed default sections per product family (Claimant, Insured, Deceased, Employer, Injury, Medical, Survivors, Funeral, Bank, Documents, Declaration).
- Seed Injury section field set (Incident / Medical / Employment Context / Questionnaire) for EI products.
- Seed amendment policy rows for every active product version.
- Add a `bn_catalog_validation` service + admin screen that lints each product version: missing sections, missing amendment policy, missing comm mappings, orphan templates, channel/method mismatch, unresolved placeholders. Surface results in Product Catalog → Validation tab.

## Phase B — Submission snapshot + Application tab

- Ensure every new claim writes an immutable `bn_claim_application` snapshot (payload, participants, product version, channel, submitted_by/date). Add DB trigger or service guard so it's never overwritten.
- Backfill snapshots for existing claims from current claim record (best-effort, flagged as `reconstructed=true`).
- New Workbench **Application tab** with sub-tabs: *Submitted Application* (read-only snapshot, dynamic render from catalog), *Current Record* (live), *Differences* (field-by-field diff with changed_by / date / reason), *Amendment History* (from `bn_claim_amendment_log`).
- Reusable `<DynamicSectionRenderer>` that walks catalog sections and renders fields with status badges (Original / Amended / Stale).

## Phase C — Dynamic Benefit Details + Injury

- Replace any hardcoded EI injury UI with `<DynamicSectionRenderer>` reading catalog `INJURY` section.
- Wire amendment controls (per `useClaimEditability` + `bn_claim_field_ownership`) — show *Amend*, *Request Correction*, *View History* buttons only where policy + channel allow.
- On amendment of any field where `affects_eligibility` or `affects_calculation` is true, mark the eligibility/calculation run stale and surface a banner with *Re-run* actions.
- All writes go through a single `amendClaimField()` service that enforces reason, before/after, channel, status, and writes both `bn_claim_amendment_log` and `system_audit_trail` atomically.

## Phase D — Communications: diagnostics, statuses, retry

- Extend `bnCommunicationAdapter` with a **recipient diagnostics** pre-flight: resolves recipient by participant + delivery method, returns a structured `{ resolvable, missing: [...], reason }`.
- Introduce status taxonomy in `bn_communication_log`: `SENT | GENERATED | PRINT_PENDING | PRINTED | DISPATCHED | SKIPPED | FAILED | BLOCKED` (migration to add CHECK + backfill).
- Stop returning SKIPPED when the real cause is missing data — return BLOCKED with reason.
- New Workbench **Communications tab** with sub-tabs Timeline / Letters / Emails / SMS / In-App / Failed-Blocked / Diagnostics.
- Per-row actions: *View Failure Details*, *Retry*, *Update Contact Details* (deep-link to participant edit), *Generate Letter Instead*, *Mark Manually Dispatched*.

## Phase E — Letter pipeline

- Standard letter generator: render catalog-bound template → PDF (use existing `htmlToPdf`), store as `bn_letter` row + storage object, link to `bn_communication_log`.
- Preview / Print / Download / Mark Printed / Mark Dispatched / Reprint actions, each audited.

## Phase F — Benefit Communication Templates screen

- New route under BN → Configuration → Benefit Communication Templates.
- Thin Benefits-scoped view over central `notification_templates` (no duplicate table) — filter `module='benefit_management'`.
- Features: list, filter by product/event/channel, create/edit version, clone, preview with sample claim data, placeholder validator, retire, show linked products (via `bn_comm_mapping`), audit changes.
- Seed default templates (BN_ACKNOWLEDGEMENT_*, BN_ELIGIBILITY_FAILED_*, BN_EVIDENCE_REQUEST_*, BN_APPROVAL_LETTER, BN_DENIAL_LETTER) and standard placeholders.

## Phase G — Audit hardening & acceptance tests

- Wrap every Workbench mutation through `useAuditedMutation` / `writeBnAudit` with `critical: true` for amendments, decisions, comms send/print/dispatch, template changes, contact updates.
- Add acceptance test fixtures matching the spec (EI claim amend flow, comm SENT/BLOCKED flows, catalog-driven new injury question round-trip).

---

## Technical notes

- No new tables required for most of this; we extend existing ones. New migrations are limited to: (1) status enum/check on `bn_communication_log`, (2) `bn_letter` columns if missing (print/dispatch timestamps), (3) `bn_claim_application.reconstructed` boolean, (4) optional `bn_catalog_validation_result` cache table.
- Per project rule: no RLS; role-based only. All new tables get explicit GRANTs.
- All Workbench rendering goes through one renderer reading catalog metadata — zero hardcoded product fields.
- Communications adapter becomes the single resolver; no component-level recipient logic.

---

## Suggested order of execution

```text
A (1–2 days)  Catalog seed + validator
B (1 day)     Application tab + snapshot guard
C (1–2 days)  Dynamic Benefit Details + injury + amendments
D (1–2 days)  Comm diagnostics + statuses + retry
E (1 day)     Letter pipeline
F (1 day)     Templates management screen
G (0.5 day)   Audit + acceptance
```

---

## What I need from you

This is too large to ship in a single turn safely. Please confirm one of:

1. **Proceed phase-by-phase**, starting with **Phase A** in this turn. I'll seed catalog config + build the validator screen and report back before Phase B.
2. **Start with a different phase** (e.g. Phase D — fix the comms status/diagnostics issues you're hitting right now), then loop back to the foundation.
3. **Adjust scope** — drop or merge phases.

My recommendation: do **D first** (it solves the live pain — SKIPPED-when-actually-BLOCKED, missing retry, no diagnostics), then **A → B → C → E → F → G**. That gives you a working Communications tab in one turn while we build the catalog foundation underneath.
