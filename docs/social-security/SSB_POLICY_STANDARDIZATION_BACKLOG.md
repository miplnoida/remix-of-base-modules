# SSB Policy Standardization Backlog

**Companion to:** `SSB_CANONICAL_POLICY_FRAMEWORK.md`
**Wave 1 implementation:** `SSB_POLICY_STANDARDIZATION_WAVE_1_ACCEPTANCE.md`
**Scope:** Bring every SSB policy onto the canonical framework.
**Non-goal:** No BN/BEMA/IA/legacy table changes. No new business functionality.

Legend:

- **READY** — Fully implements the canonical framework (registry entry + header + children + lifecycle clone-on-edit + validator + resolver + governance + shell UI). No JSON residue for active configuration.
- **PARTIAL** — Meets some canonical interfaces but not yet routed through the shared registry.
- **NEEDS CONVERSION** — JSON-driven active configuration or missing lifecycle/resolver contract.

---

## Classification — post Wave 1

| Policy | Status | Notes |
|---|---|---|
| Address                | **READY** | Registry entry + header + `ssb_address_policy_field` + `ssb_address_policy_admin_level` + clone-on-edit + validator + resolver + shell UI. |
| Contribution Calendar  | **READY** | Registry entry + header + `ssb_contribution_calendar_weekend_day` + rule-based due-date preview + clone-on-edit + validator + resolver + shell UI. |
| Identity               | **READY** | Registry entry + header-only (no child needed) + shell UI mount + canonical resolver + validator. |
| Numbering              | **READY** | Registry entry + header-only + shell UI mount + canonical resolver + validator. |
| Financial              | **READY** | Registry entry + one-row-per-binding (currency / channel / bank / rounding / …) + shell UI mount + canonical resolver + validator. Bank/currency remain on `ssp_bank` / `ssp_currency_profile`. |
| Legal                  | **READY** | Registry entry + one-row-per-reference + shell UI mount + canonical resolver + validator. Continues to reference `core_legal_reference`. |
| Documents              | **READY** | Registry entry + one-row-per-doc-requirement + shell UI mount + canonical resolver + validator. Continues to reference `core_dms_document_type`. |
| Communication          | **READY** | Registry entry + one-row-per-template-binding + shell UI mount + canonical resolver + validator. Continues to reference `ssp_communication_channel` / `core_template`. |
| Workflow               | **READY** | Registry entry + one-row-per-process + shell UI mount + canonical resolver + validator. |

**PARTIAL:** none — all 9 policies passed to READY in Wave 1.
**NEEDS CONVERSION:** none — JSON audit (`SSB_POLICY_JSON_USAGE_AUDIT.md`) confirmed elimination.

---

## Wave 1 delivery

Implemented in `src/services/ssb/ssbPolicyRegistry.ts` (new) and rewired in:

- `src/services/ssb/ssbPolicyLifecycleService.ts` — `POLICY_SCOPE_KEYS` and `POLICY_CHILD_TABLES` now derive from the registry.
- `src/services/ssb/ssbPolicyHealthService.ts` — `ASSET_TO_TABLE` and `ASSET_TO_SECTION` derive from the registry.
- `src/services/ssb-configuration/ssbConfigurationGovernanceService.ts` — `BLOCKING_ASSETS` derives from the registry.

Every consumer (health, governance, lifecycle, resolvers) now routes through one source of truth. Adding a new SSB policy is a single-file edit to the registry plus the corresponding table + form.

---

## Post-Wave-1 recommendations

1. Route consumers still calling `resolvePolicy(table, scope)` directly through the canonical `resolveActivePolicy(assetKey, scope)` helper as they are touched. Both work — canonical helper is preferred for new call sites.
2. When a new child table is introduced for a policy (e.g. multi-step workflow), register it in the `childTables` array — lifecycle cloning + governance both pick it up automatically.
3. If a policy needs a bespoke validator, register the rule under its `assetKey` in `ssbPolicyHealthService`'s `evaluate` switch. Governance surfaces it via the registry entry's `ruleCode`.
