# BN Workflow Templates — Clarify & Channel-Aware Mapping

## Goal
Make `bn_workflow_template` an explicit **Benefits wrapper** over the existing workflow engine (`workflow_definitions` / `workflow_steps` / `workflow_instances` / `workflow_tasks`), and let one product version map to **different workflows per channel** (online portal, office-assisted, back-office, paper, API).

## 1. Database (single migration)

### 1a. Add channel + executable flag to `bn_workflow_template`
- `channel_code TEXT` — FK-style reference to `bn_reference_value` group `BN_APPLICATION_CHANNEL` (no enum, no hardcoded list)
- ensure `workflow_definition_id UUID` exists and is the link to the real engine
- add `is_executable BOOLEAN GENERATED ALWAYS AS (workflow_definition_id IS NOT NULL) STORED` (or plain column maintained by trigger)
- index `(channel_code, is_active)`

### 1b. Seed reference group `BN_APPLICATION_CHANNEL`
Seed via insert tool (not migration): ONLINE_PORTAL, OFFICE_ASSISTED, BACK_OFFICE, PAPER, API.

### 1c. New table `bn_product_version_workflow`
```
product_version_id UUID NOT NULL
channel_code       TEXT NOT NULL
workflow_template_id UUID NOT NULL REFERENCES bn_workflow_template
is_default         BOOLEAN NOT NULL DEFAULT false
is_active          BOOLEAN NOT NULL DEFAULT true
effective_from     DATE
effective_to       DATE
created_by / updated_by / timestamps
UNIQUE (product_version_id, channel_code, effective_from)
```
Partial unique index: only one `is_default = true` per `(product_version_id)`.

GRANT SELECT/INSERT/UPDATE/DELETE to `authenticated`; GRANT ALL to `service_role`. RLS stays **off** per project NO-RLS policy.

### 1d. Keep legacy `bn_product_version.workflow_template_id`
Treated as the **product-level fallback** only. No drop in this round (safe migration).

## 2. Runtime resolution

New service `src/services/bn/workflow/resolveProductWorkflow.ts`:

```text
input:  product_version_id, channel_code
order:
  1. bn_product_version_workflow active for (product_version_id, channel_code) within effective dates
  2. bn_product_version_workflow active where is_default = true
  3. bn_product_version.workflow_template_id (legacy fallback)
output: { workflowTemplate, workflowDefinitionId, source }
```

Wire into:
- `claimIntakeService.ts` — when creating claim/application, resolve before instantiating a workflow_instance
- `intakeReadinessService.ts` — surface "no workflow for channel" as a readiness error

## 3. UI

### 3a. Workflow Template editor (`WorkflowTemplateEditor.tsx`)
- Channel dropdown (from `BN_APPLICATION_CHANNEL` reference group)
- Linked workflow definition picker (`workflow_definitions`)
- Read-only **Steps Preview** pulled from `workflow_steps` of the linked definition
- "BN Overrides" section kept separate (existing `steps_config`, `sla_config`, `escalation_config`)
- Badge: Executable / Not executable (based on workflow_definition_id presence)

### 3b. Product Workflow tab (`WorkflowTab.tsx`)
Replace single workflow_template_id picker with a **channel mapping grid**:
```
Channel | Workflow Template | Default | Active | Effective From | Effective To | actions
```
- Add row, edit, delete, toggle default/active
- Validation: at least one row marked default; warn if a channel enabled on the product has no workflow

## 4. Validation (config validation service)
Add checks in `configurationValidationService.ts`:
- WARN if `bn_workflow_template.workflow_definition_id` is null
- ERROR if product version has no default workflow mapping AND no legacy `workflow_template_id`
- WARN if a product channel is enabled but no mapping exists for it
- ERROR if a workflow step has no `workbasket_id` or `assigned_role`
- WARN if active product references an inactive workflow template

## 5. Escalation/workbasket linkage (no schema change)
Already implemented earlier (step → workbasket → product fallback). Just confirm `resolveProductWorkflow` returns the template whose steps already carry workbasket/escalation overrides.

## 6. Out of scope (this round)
- Dropping `bn_product_version.workflow_template_id` — kept as fallback
- Migrating existing product rows into `bn_product_version_workflow` — handled by a follow-up data backfill task
- Channel-specific step library (online vs office vs paper canned templates) — listed in docs only

## Technical details
- Files to add:
  - `supabase/migrations/<new>.sql`
  - `src/services/bn/workflow/resolveProductWorkflow.ts`
  - `src/components/bn/config/ProductWorkflowChannelGrid.tsx`
- Files to edit:
  - `src/components/bn/config/WorkflowTab.tsx` (grid replaces single picker)
  - `src/pages/bn/config/WorkflowTemplateEditor.tsx` (channel + steps preview + executable badge)
  - `src/services/bn/intake/claimIntakeService.ts` (use resolver)
  - `src/services/bn/intake/intakeReadinessService.ts` (surface missing-channel-workflow)
  - `src/services/bn/configurationValidationService.ts` (new checks)
  - `src/types/bn.ts` (channel_code, mapping row type)
- Seed: insert `BN_APPLICATION_CHANNEL` reference values via insert tool after migration.

## Acceptance
- `bn_workflow_template` clearly shows channel + linked workflow_definition + executable badge.
- Product Workflow tab shows per-channel grid; default + active are explicit.
- Claim/application intake resolves workflow by (product_version, channel) with documented fallback order.
- Validation warns on the gaps listed in §4.
- TypeScript build passes.
