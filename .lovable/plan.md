
# Legal / Benefits / Compliance Template Framework — Audit & Redesign Plan

## Phase 1 — Current State (measured from DB)

**Templates in `core_template`:** 33 — all `module_code = LEGAL`, all `country_code = KN`, all `status = ACTIVE`.
**Versions:** 33 (one per template, all `PUBLISHED`, all `v1`). No multi-version history.
**Legal references linked:** 44 links across 32 templates (1 template has no reference).
**Generated documents:** 7 (low test coverage).
**Tokens registered:** 44 in `core_template_token`.
**Layouts:** single shared `core_template_layout` set, no module/country/channel variants.

### Entities present
- `core_template`, `core_template_version`, `core_template_layout`, `core_template_section`, `core_template_token`, `core_template_legal_reference`, `core_template_schedule_policy`, `core_template_usage`, `core_generated_document`, `core_generated_document_legal_reference`.

### Entities MISSING (critical)
- `core_template_category` (categories are free-text strings — "court", "COURT", "Court & Hearing" all coexist → data quality issue).
- `core_template_channel` and `core_template_channel_variant` (no channel concept exists; only PDF/HTML body is implied).
- `core_template_country_override` (no override mechanism; SKN is the only country).
- `core_template_approval` / `core_template_workflow_state` (no review/approval audit trail; templates jump straight to PUBLISHED).
- `core_template_token_group` (tokens have no grouping/category column).
- `core_template_variable_binding` (no declared variable contract per template).
- `core_template_localization` (no i18n).

### Data quality issues found
- `template_category` case-inconsistent: `court` vs `COURT`, `enforcement` vs `ENFORCEMENT`, `settlement` vs `SETTLEMENT`, etc.
- No Benefits (`BN`) or Compliance (`CE`) templates in `core_template` — those modules still rely on legacy `legal_templates`, `ce_audit_communication_templates`, `ce_document_templates`, `ce_notice_templates`, `bn_letter`, etc. → fragmentation.
- All templates SKN-only — no global base.
- No DRAFT/REVIEW templates → no working lifecycle.
- Channels not modeled — emails, SMS, in-app notifications go through `notification_templates` (separate silo).

---

## Phase 2 — Channel Strategy (target)

Add `core_template_channel` (master) and `core_template_channel_variant` (per template-version × channel body).

Channels to register:
- **Document:** PDF, DOCX, PRINT_LETTER, ORDER, DECISION, JUDGMENT, NOTICE, CERTIFICATE
- **Digital:** EMAIL, SMS, PUSH, WHATSAPP, IN_APP, PORTAL_MSG
- **Regulatory:** COMPLIANCE_FILING, REG_SUBMISSION, GOV_NOTICE, OFFICIAL_PUB
- **Integration:** API_PAYLOAD, JSON_EXPORT, XML_EXPORT, PARTNER_DELIVERY

Each template version declares 1..N supported channels; each variant has its own body, subject, max_length, attachments policy.

---

## Phase 3 — Legal Module Catalog Gap

Existing 33 templates cover Demand/Enforcement/Settlement/Hearing/Judgment well. **Missing (to seed):**

| Group | Missing |
|---|---|
| Case Mgmt | Case Creation Notice, Case Transfer Notice |
| Hearings | Hearing Reschedule, Hearing Cancellation, Hearing Reminder |
| Orders | Interim Order, Final Order, Suspension Order, Revocation Order |
| Decisions | Preliminary Decision, Final Decision, Appeal Decision |
| Legal Notices | Show Cause, Warning, Breach, Compliance Notice, Investigation Notice |
| Enforcement | Penalty Notice, Fine Notice |
| Appeals | Appeal Acknowledgement, Appeal Hearing Notice |
| Certificates | Compliance Certificate, Registration Certificate, Approval Certificate |
| Correspondence | Legal Memo, Legal Opinion, Advisory Letter |

→ **~23 missing Legal templates.**

---

## Phase 4 — Benefits Module (0 in `core_template`)

All 11 standard templates missing from core framework: Approval, Rejection, Suspension, Termination, Appeal, Payment Notice, Eligibility Notice, Review Notice, Renewal Notice, Overpayment Notice, Recovery Notice. Currently scattered in `bn_letter` / `bn_comm_mapping`.

## Phase 5 — Compliance Module (0 in `core_template`)

All 8 standard templates missing: Warning, Investigation, Finding, Breach, Closure, Escalation, Audit Result, Remediation Notice. Currently in `ce_audit_communication_templates`, `ce_notice_templates`, `ce_document_templates`.

---

## Phase 6 — Architecture Redesign

Target hierarchy:

```text
core_template (MASTER, global)
  └─ core_template_version (immutable when PUBLISHED)
        ├─ core_template_country_override  (SKN, JAM, BRB ...)
        │     └─ core_template_channel_variant (PDF, EMAIL, SMS ...)
        └─ core_template_channel_variant (default channel bodies)
              └─ core_template_legal_reference (pinned legal_reference_version_id)
```

Schema additions:
1. `core_template.scope` enum (GLOBAL / COUNTRY / JURISDICTION).
2. `core_template.parent_template_id` (override chain).
3. `core_template_channel` master + `core_template_channel_variant` (template_version_id, channel_code, subject, body, format, max_length).
4. `core_template_category` master with code/name/module/sort_order; FK `core_template.category_id` (replace text column).
5. `core_template_workflow_state` enum: DRAFT, REVIEW, APPROVED, PUBLISHED, RETIRED.
6. `core_template_approval` (version_id, action, actor, decided_at, notes) for audit.
7. `core_template_token.token_group` + `data_type` + `is_required` + sample resolver.
8. `core_template_variable_binding` (template_version_id, token_code, required, default_value).
9. `core_template_localization` (template_version_id, locale, subject, body).

---

## Phase 7 — Variable Framework

Current 44 tokens are flat. Group into:
- **system.*** — date, generated_by, organization, reference_no
- **person.*** — name, address, contact, ssn_masked
- **employer.*** — name, regno, address
- **case.*** — number, status, hearing_date, court_name
- **legal_reference.*** — citation, act_name, regulation, version_number (exists, expand)
- **benefit.*** — product, amount, eligibility_status, payment_date
- **compliance.*** — breach_type, severity, due_date, finding_id
- **payment.*** — amount_due, arrears, plan_terms

Target ~120 tokens with strict naming `{group}.{field}` and resolver service per group.

---

## Phase 8 — Legal Reference Integration (audit)

✅ `core_template_legal_reference` exists with `legal_reference_version_id` pinning.
✅ `core_generated_document_legal_reference` snapshot exists.
⚠️ Only 32/33 templates linked — `LG-TPL-EVIDENCE-COVER` missing references.
⚠️ No UI warning when a linked reference is SUPERSEDED (service exists; not wired to template editor banner).
⚠️ Publish action does not auto-freeze `legal_reference_version_id` (manual call required).

---

## Phase 9 — Workflow Gaps

Lifecycle DRAFT→REVIEW→APPROVED→PUBLISHED→RETIRED **not enforced**. Today: all rows jump to PUBLISHED v1. Need:
- Approval policy per module.
- Multi-reviewer support.
- Rollback (revert active_version_id to previous PUBLISHED).
- Change diff between versions (UI exists for legal refs; reuse for template body).

---

## Phase 10 — Country Pack Strategy

- Promote SKN templates to GLOBAL base where content is country-agnostic.
- Add `parent_template_id` so JAM/BRB inherit and only override jurisdiction-specific clauses + legal references.
- Country Pack export/import: bundle (template + version + legal refs + channels + tokens used).

---

## Phase 11 — Generated Documents (audit)

`core_generated_document` already stores `template_id`, `template_version_id`, `layout_id`, `resolved_tokens`, snapshot of legal refs. **Missing:** `channel_code`, `delivery_status`, `delivered_at`, `recipient_address`, `content_hash` (immutability proof). Add these columns.

---

## Phase 12 — Gap Analysis Summary

| Area | Have | Gap |
|---|---|---|
| Templates seeded | 33 (LEGAL only) | +23 Legal, +11 BN, +8 CE = **42 missing** |
| Modules covered | 1 | 2 missing (BN, CE) |
| Countries | 1 (KN) | Global base + overrides absent |
| Channels | 1 (PDF/HTML) | 18+ channels not modeled |
| Categories | free text, inconsistent | needs master table |
| Workflow states | DRAFT/PUBLISHED only | REVIEW, APPROVED, RETIRED + approvals |
| Versions | all v1 | no real version history exercised |
| Tokens | 44 flat | grouping + binding + resolvers |
| Legal refs | 32/33 linked | 1 missing; auto-freeze + supersession warning |
| Localization | none | locale support |
| Generated docs | basic snapshot | channel + delivery + hash |
| Legacy silos | `legal_templates`, `bn_letter`, `ce_*_templates`, `notification_templates` | consolidate into core framework |

---

## Phase 13 — Implementation Roadmap

**Stage 1 — Foundation (schema)**
- Add `core_template_category`, `core_template_channel`, `core_template_channel_variant`, `core_template_approval`, `core_template_workflow_state` enum, `parent_template_id`, `scope`, `token_group`, `core_template_variable_binding`, `core_template_localization`.
- Backfill: normalize `template_category` text → FK; assign default PDF channel variants to existing 33 templates.
- Add `channel_code`, `delivery_status`, `content_hash` to `core_generated_document`.

**Stage 2 — Legal Catalog Completion**
- Seed 23 missing Legal templates with categories, legal references, default PDF + EMAIL variants.
- Link `LG-TPL-EVIDENCE-COVER` to `SSA_S46_RECOVERY` or appropriate reference.

**Stage 3 — Channel Expansion**
- Implement renderers per channel (EMAIL via React Email, SMS short body, IN_APP, API_PAYLOAD JSON schema).
- Wire `coreDocumentGenerationService` to pick variant by channel.

**Stage 4 — Benefits + Compliance Catalogs**
- Seed 11 BN + 8 CE templates in `core_template`.
- Migrate active content from `bn_letter`, `ce_audit_communication_templates`, `ce_notice_templates` and deprecate the silos with read-only flag + redirect.

**Stage 5 — Country Pack**
- Promote SKN templates → GLOBAL where content is jurisdictionally neutral.
- Introduce override chain for JAM/BRB pilot.
- Country Pack import/export tool.

**Stage 6 — Workflow & Automation**
- Enforce DRAFT→REVIEW→APPROVED→PUBLISHED with `core_template_approval` audit.
- Auto-freeze `legal_reference_version_id` on publish.
- Supersession warning banner in `CoreTemplateManagement`.
- Rollback action; version diff view.
- Verification report extension: channel coverage, category normalization, missing refs.

---

## Deliverables (ready when you approve)

1. SQL migration for Stage 1 schema (single file).
2. Seed migrations for Stages 2 + 4 (Legal/BN/CE catalogs).
3. Service updates: `coreTemplateChannelService`, extend `coreDocumentGenerationService` for channel routing.
4. UI: channel matrix editor, category dropdown from master, approval workflow panel, override-chain view, supersession banner.
5. Verification page extension to show channel/category/country gaps.

---

**Recommended next action:** approve Stage 1 (foundation schema + category normalization + channel model) before any further seeding — every later stage depends on it.
