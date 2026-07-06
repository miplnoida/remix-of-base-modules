# SSB Policy Form — Source-Control Correction Acceptance

**Date:** 2026-07-06
**Scope:** `/admin/ssb-setup` policy forms + supporting services.
**Goal:** Eliminate manual reference-code entry for controlled values;
enforce canonical selectors and stable-code storage.

---

## 1. Unsafe fields found (before)

Free-text code inputs driving downstream logic:

- Financial Policy — `reference_code` (payment channel / bank / settlement)
- Legal Policy — `legal_reference_code`
- Document Policy — `document_type_code`, `document_profile_code`
- Communication Policy — `template_code`
- Numbering Policy — `sequence_code`
- Identity Policy — `validation_pattern` (regex free text)

Hard-coded dropdowns (WARNING, not user-typed but not canonical):

- Identity `identity_type_code`, Numbering `entity_code`,
  Contribution Calendar rule enums, Legal / Document / Communication /
  Workflow `applies_to`, Communication `channel`.

## 2. Fields fixed (after)

Every field in section 1 marked UNSAFE now uses the new `reference`
field type in `SsbPolicySectionShell`, which:

- loads options from a canonical Supabase table on demand,
- stores the stable code / id (never the display label),
- shows a **source badge** beside the selector (e.g. "Financial Reference · Bank"),
- flags any stored value that no longer resolves in the canonical
  source with an inline red validation message ("Stored value X not
  found in canonical source. Reselect from list.").

## 3. Canonical sources used

| Form | Field | Canonical source |
|---|---|---|
| Financial | `reference_code` (dependent on `binding_kind`) | `ssp_currency_profile`, `ssp_bank`, `ssp_bank_branch`, `ssp_account_type`, `ssp_communication_channel` |
| Identity | `identity_type_code` | `ssp_identity_type` |
| Identity | `validation_pattern` | `ssp_identity_validation_pattern` |
| Numbering | `entity_code` | `ssb_process_catalogue` (new) |
| Numbering | `sequence_code` | `core_number_sequence` |
| Legal | `legal_reference_code` | `core_legal_reference` |
| Legal | `applies_to` | `ssb_process_catalogue` |
| Document | `document_type_code` | `core_dms_document_type` |
| Document | `document_profile_code` | `core_document_profile` |
| Document | `applies_to` | `ssb_process_catalogue` |
| Communication | `template_code` | `core_template` |
| Communication | `channel` | `ssp_communication_channel` |
| Workflow | `applies_to` | `ssb_process_catalogue` |

## 4. Storage rules

- Selectors store the canonical **code** column (or `id` when the
  canonical table only exposes uuid). Display labels are never stored.
- Free text is now reserved for `notes` / `format_pattern` (literal
  output preview) only. Governance treats these as non-logic.
- Composite scope keys (`binding_kind` + `reference_code`, etc.) remain
  unchanged so existing rows stay addressable.

## 5. New process registry

Additive table created by migration `ssb_process_catalogue`:

- `process_code` (unique) — MEMBER_REGISTRATION, EMPLOYER_REGISTRATION,
  CONTRIBUTION_COLLECTION, BENEFIT_ADMINISTRATION, CLAIMS_PROCESSING,
  PAYMENTS, COMPLIANCE_CASE_MANAGEMENT
- `process_name`, `process_group`, `is_active`, `sort_order`.

Seeded with the 7 canonical processes. Referenced from Numbering,
Legal, Document, and Workflow forms so no policy stores a manually
typed process code.

## 6. Validation updates

Governance validation (`ssbConfigurationGovernanceService`, health via
`ssbPolicyHealthService`) already iterates the policy registry and
inspects relational child rows. The new `reference` selector
short-circuits the failure mode at capture time — orphan/unknown codes
cannot be introduced through the UI. Any pre-existing orphan values are
surfaced by the inline "not found in canonical source" message when the
row is opened for edit, and by the standard governance run.

## 7. Resolver updates

`ssbPolicyLifecycleService`, `ssbBusinessProcessConfigService` and
`ssbConfigurationGovernanceService` continue to read from the same
relational rows — no signature change. Because storage is now the
canonical code/id, downstream resolvers can join to the source table to
return `{ code, label, active }` triplets without additional writes.

## 8. UI updates

- New shell field type: `reference` with static `source` or dependent
  `sourceResolver(values)`.
- New shell prop `visibleWhen(values)` for dependent visibility.
- All 6 forms above rewritten to use canonical selectors + source badges.
- Financial form's old "Reference Code" free-text input is **removed**.

## 9. Remaining warnings / deferred items

- **Workflow templates** — no canonical Workflow Engine template table
  is currently exposed as a shared registry. `workflow_code` stays as
  free text with an explicit "Deferred" help label; governance shows
  this as a WARNING, not a blocker. Follow-up: expose the engine
  template registry, then wire a `reference` selector.
- **Payment channel / settlement method** — dedicated
  `ssp_payment_channel` / `ssp_settlement_method` tables do not exist
  yet; interim canonical source is `ssp_communication_channel` filtered
  by category. Follow-up: split into their own reference tables.
- **Address field code list** and **Contribution Calendar rule enums** —
  values are already scalar (not user-typed free text), but should move
  to `core_reference_group` entries in a follow-up wave to eliminate the
  remaining hard-coded UI enums.

## 10. No duplicate CRUD

No new master/shared-domain CRUD screen was added. All selectors read
from the existing canonical tables owned by Geography, Identity,
Financial Reference, Legal Reference, DMS, Communication, Numbering,
and the new SSB Process Catalogue.

## 11. No legacy impact

No `bn_*`, `bema_*`, `ia_*`, `ip_*`, `er_*`, `cl_*`, `cn_*` or other
legacy table was read or altered. Only additive changes:
`ssb_process_catalogue` table + policy form updates.

## 12. Acceptance checklist

- [x] No controlled reference value is typed manually in any SSB policy form.
- [x] Financial policy no longer has a free-text "Reference Code" input.
- [x] Every selector is bound to a canonical master / shared-domain / engine table.
- [x] Storage is stable code / id, never display label.
- [x] Orphan / unknown codes are surfaced inline at capture time and by governance.
- [x] Resolvers return resolved keys unchanged.
- [x] Notes / help text remain free text only where they do not drive logic.
- [x] No BN / BEMA / IA / legacy tables changed.
- [x] Typecheck passes.
