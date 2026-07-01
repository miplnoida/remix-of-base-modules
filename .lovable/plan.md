
# Auto-Generated Code Rollout — System Codes via Central Numbering Engine

Extend the Text Block pattern (`TB-{MODULE}-{SEQ}` via `core_number_sequence` + `core_generate_number` / `core_preview_next_number`) to every screen that currently asks admins to invent a technical code.

## 1. Classification Rule (applied per screen)

| Type | Source | UI treatment |
|---|---|---|
| **System / internal code** (surrogate identifier, no external meaning) | Central numbering engine, generated on save | Read-only preview box, no manual entry (Admin override toggle, off by default) |
| **Business / reference code** (regulator, statute, bank, court, legacy import) | User-entered or picked from reference list | Validated input with uniqueness + format check |

Guardrails for every system-code screen:
- Preview via `core_preview_next_number` (non-consuming).
- Final value assigned server-side by `core_generate_number` inside the save mutation.
- DB unique index on the code column (fail-closed on duplicates).
- No frontend counters, no `Math.random`, no `Date.now()` codes, no client-side sequence math.
- Admin override (manual code) is a feature-flagged toggle, off by default, audited.

## 2. Screen-by-screen classification

### System codes → convert to auto-generate

| Screen | Table.column | Proposed pattern | Sequence key |
|---|---|---|---|
| Templates | `core_template.template_code` | `TPL-{MODULE}-{SEQ}` | CORE / TEMPLATE |
| Template categories | `core_template_category.category_code` | `TCAT-{SEQ}` | CORE / TEMPLATE_CATEGORY |
| Template tokens | `core_template_token.token_code` | `TTOK-{MODULE}-{SEQ}` | CORE / TEMPLATE_TOKEN |
| Channels | `core_template_channel.channel_code` | `CH-{SEQ}` | CORE / TEMPLATE_CHANNEL |
| Legal stages | `lg_case_source_stage.stage_code` | `LGS-{SOURCE}-{SEQ}` | LEGAL / STAGE |
| Legal rules (routing/precedence/action/transition/doc) | `lg_*_rule.rule_code` | `LGR-{RULE_KIND}-{SEQ}` | LEGAL / RULE |
| SLA rules | `legal_referral_sla_rule.rule_code`, `legal_sla_rules.code` | `SLA-{MODULE}-{SEQ}` | CORE / SLA_RULE |
| Fee rules | `lg_fee_rule.rule_code` | `FEE-{SEQ}` | LEGAL / FEE_RULE |
| Fee waiver policies | `lg_fee_waiver_policy.policy_code` | `FWP-{SEQ}` | LEGAL / FEE_WAIVER |
| Workflow rules (approval / escalation / policy) | `lg_workflow_policy.policy_code`, `bn_approval_policy.code`, etc. | `WFR-{MODULE}-{SEQ}` | CORE / WORKFLOW_RULE |
| Document rules | `lg_stage_document_rule.rule_code`, `core_document_profile.profile_code` | `DOC-{MODULE}-{SEQ}` | CORE / DOC_RULE |
| Communication assets (letterhead, signature, disclaimer, footer, media) | `comm_*.code` | `CA-{ASSET_TYPE}-{SEQ}` | CORE / COMM_ASSET |

### Business/reference codes → keep as controlled input (do NOT auto-generate)

- Legal reference codes (statute / regulation / section) — `core_legal_reference.reference_code`
- Court / venue codes — `lg_court.code`, `lg_court_venue.code`
- Bank & branch codes — `bn_bank_master.bank_code`, `bn_bank_branch.branch_code`
- Country / language / currency codes — ISO
- Reason codes with regulatory meaning — `bn_reason_code.code`
- Product / scheme codes exposed to external parties — `bn_product.product_code`

Treatment: keep manual input, add uppercase + regex validation + uniqueness check, offer picker where a master list exists.

## 3. Implementation approach

Reusable primitives to build once and reuse everywhere:

1. **Hook**: `useAutoCode({ moduleCode, entityType, departmentCode? })` — wraps `core_preview_next_number`; returns `{ preview, refresh }`.
2. **Component**: `<AutoCodeField />` — read-only preview box + optional Admin override toggle (feature-flagged). Drops into every create dialog.
3. **Save helper**: `generateCodeOnSave({ moduleCode, entityType, ... })` — called inside each save mutation before insert; throws on failure. Central place ensures no screen bypasses the engine.
4. **Migration per entity type**: one row in `core_number_sequence` seeding pattern/padding/reset policy (mirror the Text Block migration).
5. **DB uniqueness**: add unique index on each `*_code` column if missing.
6. **Lint rule** (`scripts/lint-no-manual-code.ts`): fail CI if any create form binds an editable `<Input>` to a `*_code` field flagged as system-code in a registry file.

## 4. Rollout order

Phase A — highest churn / most user complaints:
- Templates, Template categories, Template tokens, Channels
- Communication assets (letterhead, signature, disclaimer, print footer)

Phase B — Legal configuration:
- Legal stages, routing/action/transition/document rules
- Fee rules, Fee waiver policies
- SLA rules

Phase C — Workflow & approvals:
- Workflow policies, approval policies, escalation policies

Each phase = one migration (seed sequences + unique indexes) + UI edits (preview field, remove manual input, save-time generation) + a short verification pass.

## 5. Registry & documentation

- Add `src/config/autoCodeRegistry.ts` — single source listing every `{ entity, pattern, module, isSystemCode }`. Both the hook and the lint rule read from it.
- Doc: `docs/architecture/auto-code-standards.md` — codifies the System vs Business classification, the override policy, and how to add a new entity.

## 6. Non-goals / decisions to confirm

- **Existing seeded codes**: leave as-is; engine only affects new inserts.
- **Admin override**: default OFF everywhere. Confirm whether we want a global feature flag or per-entity toggle.
- **Legacy imports**: bulk imports may need a bypass path — proposed: import scripts call `core_generate_number` in a loop (no manual codes even for imports) unless the source system provides an externally meaningful code (business type).

## Pending confirmations

1. Approve the classification table in §2 (especially any borderline entries you want moved between System vs Business).
2. Approve Admin override policy: **global feature flag** (single switch) vs **per-entity toggle**.
3. Approve rollout order (A → B → C) or reprioritize.

Once confirmed, I'll implement Phase A first (single migration + UI edits + registry + lint rule) and verify before moving on.
