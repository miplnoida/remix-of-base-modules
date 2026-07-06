# SSB Policy Standardization Backlog

**Companion to:** `SSB_CANONICAL_POLICY_FRAMEWORK.md`
**Scope:** Bring every SSB policy onto the canonical framework.
**Non-goal:** No BN/BEMA/IA/legacy table changes. No new business functionality.

Legend:

- **READY** — Fully implements the canonical framework (header + children + lifecycle clone-on-edit + validator + resolver + governance + shell UI). No JSON residue for active configuration.
- **PARTIAL** — Meets some canonical interfaces (typically header-only tables that avoid JSON but do not yet route through the shared registry / lifecycle wrapper).
- **NEEDS CONVERSION** — JSON-driven active configuration or missing lifecycle/resolver contract that must be reshaped.

---

## Classification

| Policy | Status | Notes |
|---|---|---|
| Address | **READY** | Header + `ssb_address_policy_field` + `ssb_address_policy_admin_level`, clone-on-edit implemented, validator + resolver + shell UI in place. |
| Contribution Calendar | **READY** | Header + `ssb_contribution_calendar_weekend_day`, rule-based due-date preview, clone-on-edit, validator + resolver + shell UI. |
| Identity | **PARTIAL** | Header-only, no JSON residue. Needs registry entry + resolver/validator wrappers + `SsbPolicySectionShell` mount. |
| Numbering | **PARTIAL** | Header-only, no JSON residue. Needs registry entry + resolver/validator wrappers + shell mount. |
| Financial | **PARTIAL** | Header-only, no JSON residue. Needs registry entry + resolver/validator wrappers + shell mount. |
| Legal | **PARTIAL** | Header-only, no JSON residue. Needs registry entry + resolver/validator wrappers + shell mount. |
| Documents | **PARTIAL** | Header-only, no JSON residue. Needs registry entry + resolver/validator wrappers + shell mount. |
| Communication | **PARTIAL** | Header-only, no JSON residue. Needs registry entry + resolver/validator wrappers + shell mount. |
| Workflow | **PARTIAL** | Header-only, no JSON residue. Needs registry entry + resolver/validator wrappers + shell mount. |

**NEEDS CONVERSION:** none. The JSON audit (`SSB_POLICY_JSON_USAGE_AUDIT.md`) confirmed that all remaining active-configuration JSON has been eliminated.

---

## Work remaining per policy

The work items below are strictly *standardization*, not business changes.

### Identity (`ssb_identity_policy`)
- [ ] Register in `POLICY_REGISTRY` with empty child list.
- [ ] Wrap resolver as `resolveActivePolicy(country)`.
- [ ] Wrap validator to canonical signature; keep existing rules.
- [ ] Mount `IdentityPolicyForm` inside `SsbPolicySectionShell`.
- [ ] Add lifecycle actions (Edit-clone / Submit / Approve / Activate / Rollback).

### Numbering (`ssb_numbering_policy`)
- [ ] Same 5 items as Identity.
- [ ] Confirm no future child table is needed for prefix components — none required today.

### Financial (`ssb_financial_policy`)
- [ ] Same 5 items.
- [ ] Confirm bank/currency references remain on shared domain tables (`ssp_bank`, `ssp_currency_profile`); do not duplicate.

### Legal (`ssb_legal_policy`)
- [ ] Same 5 items.
- [ ] Continue to reference `core_legal_reference` — no local copies.

### Documents (`ssb_document_policy`)
- [ ] Same 5 items.
- [ ] Continue to reference `core_dms_document_type` — no local copies.

### Communication (`ssb_communication_policy`)
- [ ] Same 5 items.
- [ ] Continue to reference `ssp_communication_channel` — no local copies.

### Workflow (`ssb_workflow_policy`)
- [ ] Same 5 items.
- [ ] Workflow steps remain flat header fields for now; add a child table only when multi-step configuration is introduced.

### Address & Contribution Calendar
- [ ] No work — already READY. Retained here for auditability.

---

## Sequencing recommendation

1. Land `POLICY_REGISTRY` + `POLICY_CHILD_REGISTRY` scaffolding (code only, no schema).
2. Convert the seven PARTIAL policies one at a time in this order (lowest coupling first): Numbering → Identity → Documents → Communication → Financial → Legal → Workflow.
3. Each conversion is a single PR: wrap + mount + register + governance test. No consumer changes.
4. After all seven are READY, retire any bespoke resolver call sites still bypassing the registry.

---

## Acceptance mapping

- **One canonical framework exists** → `SSB_CANONICAL_POLICY_FRAMEWORK.md`.
- **Remaining conversions follow the same template** → checklist above; identical 5 items per policy.
- **No duplicate implementations** → all consumers use `resolveActivePolicy` from the registry.
- **No legacy table changes** → backlog explicitly excludes any BN/BEMA/IA/legacy modification.
