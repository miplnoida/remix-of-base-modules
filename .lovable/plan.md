# BN Hardening: Audit Enforcement, Submission Readiness & Config Governance

This is a large, multi-phase initiative. I'll execute it in **3 shippable milestones** (not 11 separate phases) so each milestone is verifiable on its own and the system remains stable between deliveries.

---

## Milestone 1 — Mandatory Audit Foundation (blocking)

Establish a **service-layer audit layer that fails closed**. After this milestone, no BN mutation can succeed silently.

### Build

1. **`src/services/bn/audit/bnAuditService.ts`** — central, **awaited** (not fire-and-forget) audit writer.
   - `auditConfigChange`, `auditClaimAction`, `auditSubmission`, `auditWorkflowAction`, `auditCommunicationAction`, `auditDocumentAction`
   - Writes to `system_audit_trail` with `entity_type`, `entity_id`, `action`, `before_state`, `after_state`, `notes`, `performed_by` (UserCode), `performed_at`, `module='BN'`, `correlation_id`
   - **Critical actions** (PUBLISH/RETIRE/DELETE/APPROVE/DENY/SUBMIT): if insert fails → throw, mutation rolls back.
   - **Non-critical** (read traces): logs warning but does not block.

2. **Wrap mutations in `configService.ts`, `productChannelConfigService.ts`, `claimIntakeService.ts`, `claimActionRunner.ts`, `rulesAdminService.ts`** with the new audit calls. Pattern:
   ```
   before → mutate → after → await audit → return
   ```

3. **Demote `useBnConfigAudit`** to a thin wrapper around the new service so existing call sites keep working but go through enforced path.

### Verify
- Manually trigger a config update and confirm a `system_audit_trail` row appears synchronously.
- Force an audit failure (bad payload) and confirm the parent mutation is reported as failed.

---

## Milestone 2 — Submission Readiness & RPC De-risking

Make public/offline submission production-safe.

### Build

1. **`src/services/bn/intake/intakeReadinessService.ts`**
   - `validateChannelAllowed(productVersionId, channel)` — reads `bn_product_channel_config.is_enabled`
   - `validateSubmissionRequirements(productVersionId, channel, payload)` — checks SSN lookup, identity verification, OTP per channel config
   - `validateRequiredDocuments(productVersionId, channel, uploadedDocs)` — joins `bn_doc_requirement`
   - `validateLookupRequirements(productVersionId, channel, payload)` — person/employer existence

2. **`claimIntakeService.ts`** calls readiness service **before** RPC. On failure: throw with structured errors; no claim created.

3. **RPC `bn_submit_claim_application` migration:**
   - Remove direct `workflow_instances` insert (workflow is now exclusively started by `claimIntakeService` via central engine).
   - Replace `EXCEPTION WHEN OTHERS THEN NULL` on contribution snapshot / evidence checklist with inserts into `bn_claim_intake_validation` (WARN/FAIL) so failures are visible.

4. **Audit submission** end-to-end: channel, resolved version, lookup results, snapshot outcomes, workflow start result → `system_audit_trail` + `bn_claim_event`.

### Verify
- PUBLIC_ONLINE with disabled channel → blocked before any DB write.
- STAFF_OFFLINE with missing docs but `blocks_submission_if_documents_missing=false` → submission proceeds, WARN validation recorded.
- Force snapshot failure → claim still created, FAIL row in `bn_claim_intake_validation`, no silent loss.

---

## Milestone 3 — Config Governance: Impact Analysis & Version Lock

Prevent destructive edits to active configuration.

### Build

1. **`src/services/bn/config/configImpactService.ts`**
   - `getFormulaUsage`, `getDocumentUsage`, `getReasonCodeUsage`, `getWorkbasketUsage`, `getEscalationPolicyUsage`, `getMedicalPolicyUsage`, `getScreenTemplateUsage`
   - Each returns `{ activeVersionCount, totalReferences, references: [...] }`

2. **Delete/deactivate guard** in each config service: if used by an ACTIVE `bn_product_version` → throw `ConfigInUseError` with impact report; UI shows impact dialog.

3. **Active-version read-only**: `productService` rejects mutation of any `bn_product_version` whose `status='ACTIVE'`. Editing requires clone-to-draft (already exists) — surface a clear error if caller forgets.

4. **Validation Dashboard — "Audit Coverage" card**: lists services routed through `bnAuditService` and flags any BN page found doing raw `.insert/.update/.delete` (static scan results checked in as JSON).

### Verify
- Delete an unused formula → succeeds + audit.
- Delete a formula referenced by an ACTIVE version → blocked with impact list.
- Try to update an ACTIVE version directly → blocked, suggests clone.
- Dashboard shows green coverage for all wrapped services.

---

## Out of scope for this initiative

- Rewriting every page-level `.insert/.update` in non-BN modules.
- New UI for cross-tab conflict detection (already shipped in prior turn).
- Workflow engine internals beyond the RPC cleanup.

---

## Risks & mitigations

- **Risk:** Awaited audit increases mutation latency. **Mitigation:** Single insert, indexed table, acceptable for config/claim actions (not hot-path reads).
- **Risk:** RPC change breaks existing in-flight claims. **Mitigation:** Migration is additive (validation rows + removing best-effort workflow insert); frontend already handles missing `workflow_instance_id`.
- **Risk:** Active-version lock breaks existing flows. **Mitigation:** All known editors already go through draft; lock only catches mistakes.

---

**Estimated tool calls:** ~40–60 across all three milestones. I'll deliver Milestone 1 first, ask for sign-off, then proceed.

Confirm to proceed, or tell me to drop/reorder milestones.
