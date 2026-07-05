# Epic 0.36B — Implementation Gap Backlog

**Status:** Read-only audit. Prioritised backlog derived from the domain, route, table, service, and UI matrices in this epic.

Priority scheme:

- **P0** — Architecture blockers (must resolve before BN Product Builder resumes).
- **P1** — Shared service blockers (required for operational go-live).
- **P2** — Organisation-level improvements.
- **P3** — Business-module improvements.

Complexity scale: **S** small, **M** medium, **L** large, **XL** extra-large.

---

## P0 — Architecture blockers

### P0-1 · Extract Country Pack to SSP
- **Description:** Move `bn_country`, `bn_country_id_rule`, `bn_country_address_model`, `bn_country_participant_type`, `bn_country_participant_proof_link`, `bn_country_payment_config`, `bn_country_payment_cycle_method`, `bn_country_config_package`, `bn_country_config_package_item` from BN ownership to SSP.
- **Current:** BN writes and reads directly via `useBnCountryPack`, `useBnCountryMaster`, `services/bn/registries/*`, `services/bn/skn/*`.
- **Target:** SSP owns; BN consumes via `useSspCountryPack`, `useSspCountry`, `useSspAddressModel`, `useSspIdentityRules`, `useSspParticipantTypes`.
- **Risk:** High — every registration and claim path reads Country Pack.
- **Dependencies:** Epic 0.36C plan; Epic 0.36D read-only service layer.
- **Suggested epic:** 0.36C (plan) + 0.36D (facade).
- **Complexity:** L.

### P0-2 · Extract Payment / Bank masters to SSP
- **Description:** `bn_bank_master`, `bn_bank_branch`, `bn_payment_method`, `bn_eft_format`, `bn_eft_format_field`, plus `tb_bank_code`.
- **Current:** BN-owned. `useBnPaymentMasters` reads directly.
- **Target:** SSP-owned; expose `useSspPaymentChannels`, `useSspBankBranches`.
- **Risk:** High — payment execution + BN payment profiles depend on it.
- **Suggested epic:** 0.36C + 0.36D.
- **Complexity:** L.

### P0-3 · Extract Legal Reference to SSP
- **Description:** `core_legal_reference*`, `core_module_legal_reference`, `core_template_legal_reference`, `core_generated_document_legal_reference`, `core_legal_referral_document`, `core_legal_referral_item`, `legal_reference_type`, `tb_legal_status`.
- **Current:** Split between `core_*` shared and BN/Legal-local usage.
- **Target:** Single SSP-owned Legal Reference service.
- **Risk:** Medium — Legal V1 relies on it; refactor must preserve behaviour.
- **Suggested epic:** 0.36C + 0.36D.
- **Complexity:** M.

### P0-4 · Reference Data consolidation (`tb_*` → `core_reference_*`)
- **Description:** Fold populated `tb_*` code lists into `core_reference_group` + `core_reference_value` under a governed admin surface.
- **Current:** Dozens of `tb_*` tables served under `/admin/master-data/*`.
- **Target:** Shared Reference Data Administration capability with maker-checker.
- **Risk:** Medium — many callers.
- **Suggested epic:** 0.36D.
- **Complexity:** L.

### P0-5 · Enterprise Authorisation consolidation
- **Description:** Converge `useHasCapability` (CE), `useLgAccess` (LG), route capability configs (`legalRouteCapabilities`) into a single Enterprise Authorisation facade; retire duplicate auth contexts (`AuthContext`, `NewBenefitAuthContext`, `LegalAuthContext`).
- **Current:** Fragmented; BN routes still ungated by capability.
- **Target:** Single capability engine; single auth context (`SupabaseAuthContext`).
- **Risk:** Medium.
- **Suggested epic:** 0.37.
- **Complexity:** M.

---

## P1 — Shared service blockers

### P1-1 · Shared Workflow consolidation
- **Description:** Merge `bn_workflow_template` + `bn_approval_policy` + `bn_escalation_policy*` + `ce_workflow_mappings` + `lg_workflow_policy` + `la_routing_rule` + `ia_plan_workflow_bindings` behind a shared workflow engine.
- **Target:** Enterprise Workflow Management + Task/Workbasket + SLA/Escalation.
- **Risk:** High — every module orchestrates its own flows today.
- **Suggested epic:** 0.37.
- **Complexity:** XL.

### P1-2 · Shared Notification consolidation
- **Description:** Merge `bn_comm_*`, `bn_communication_log`, `bn_letter`, `ce_audit_communication*`, `lg_notification_rule`, `lg_hearing_communication` into the shared `notification_*` stack.
- **Target:** Enterprise Notification Management.
- **Risk:** High.
- **Suggested epic:** 0.37.
- **Complexity:** L.

### P1-3 · Org Document Master seeding
- **Description:** Elevate `core_dms_document_type` + `core_document_profile` to Organisation ownership; migrate `bn_service_doc_type`, `ce_org_document_foundation`, `ia_org_document_foundation`, per-module template settings to consume Org master.
- **Target:** Organisation Document Type Master.
- **Risk:** Medium.
- **Suggested epic:** 0.38.
- **Complexity:** M.

### P1-4 · Person master consolidation
- **Description:** Canonicalise `ip_master`; reduce `contributor_profiles`, `bema_contributors` to read-only views/shims; retain `au_ip_master` as audit shadow; keep `bn_claim_person_snapshot` immutable.
- **Suggested epic:** 0.38.
- **Complexity:** L.

### P1-5 · Employer master consolidation
- **Description:** Canonicalise `er_master`; reduce `bema_registrations`, `compliance_registrations` to read-only shims.
- **Suggested epic:** 0.38.
- **Complexity:** L.

### P1-6 · BN Consumption Refactor
- **Description:** Swap all BN direct reads of SSP-target masters to shared facades (Country, Bank, Payment, Legal Ref, ID Rules, Address, Participant Types, Reference Data, Workflow, Notification, Document Master).
- **Target:** BN uses only shared services for foreign data; retains ownership of product-specific bindings.
- **Suggested epic:** 0.39.
- **Complexity:** XL.

---

## P2 — Organisation improvements

### P2-1 · Organisation profile facade
- Consolidate `core_organization`, `core_department*`, `office_locations`, `system_office_settings`, `designation_hierarchy`, `role_hierarchy` behind a single Org service.
- **Suggested epic:** 0.37.
- **Complexity:** M.

### P2-2 · IA Document Foundation to Org
- Migrate `ia_org_document_foundation` and IA template settings to Org master.
- **Suggested epic:** 0.38.
- **Complexity:** S.

### P2-3 · Admin split
- Split `/admin/*` (214 routes) into Platform admin, Org admin, SSP admin, Shared admin sub-areas.
- **Suggested epic:** 0.37 (documentation) → later route refactor.
- **Complexity:** M (doc) / L (route move).

---

## P3 — Business-module improvements

### P3-1 · Legal legacy consolidation
- Merge `/legal-advanced`, `/legal-final` into `/legal`. Retire `legal_*` legacy tables (retain per Epic 0.2).
- **Complexity:** M.

### P3-2 · C3 consolidation
- Merge `/c3-management`, `/cashier`, `/self-employed` into `/c3`. Reduce `bema_*` reads.
- **Complexity:** M.

### P3-3 · Employer app consolidation
- Merge `/employer`, `/employers`, `/employers-management`, `/employer-registration` into a single `/employer/*` tree.
- **Complexity:** M.

### P3-4 · Person / Registration consolidation
- Merge `/person`, `/insured-persons`, `/ip-registration`, `/registration` behind a shared Party Registration surface.
- **Complexity:** M.

### P3-5 · Medical relocation
- Move `/medical/*` under `/bn/medical/*`.
- **Complexity:** S.

### P3-6 · Portal facade
- Route portal calls through Enterprise Portal Interaction Management instead of `publicBenefitApiClient` direct calls.
- **Complexity:** M.

### P3-7 · Finance consolidation
- Bring `core_ledger*`, `core_payment_*`, `bn_payment_*`, `cn_*`, `lg_fee_*` computation under a Finance app.
- **Complexity:** XL (deferred beyond BN Product Builder).

### P3-8 · Demo / test surface
- Document `sample-application/`, `test/`, `FoundationComponentsDemo`, `/components-demo` as non-production. Fence off from menus.
- **Complexity:** S.

---

## Backlog totals

| Priority | Count | Suggested epics |
|---|---|---|
| P0 | 5 | 0.36C, 0.36D, 0.37 |
| P1 | 6 | 0.37, 0.38, 0.39 |
| P2 | 3 | 0.37, 0.38 |
| P3 | 8 | Post-0.40 |

---

## Product Builder gate re-evaluation

- Resolved since Epic 0.35: architecture, capability model, domain model — ✅.
- Still open: **all five P0 gates** (Country/Payment/Legal-Ref SSP extraction, Reference Data consolidation, Enterprise Authorisation) plus **P1-1 / P1-2 / P1-3 / P1-6**.
- **Decision:** BN Product Builder **remains on hold**. Prerequisite epics in order: **0.36C → 0.36D → 0.37 → 0.38 → 0.39 → 0.40**.
