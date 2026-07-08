# OM-9.7.6 — Communication Direct-Read Waiver Burn-Down

Source scan: `docs/enterprise/comm-direct-read-report.json`
Generated for OM-9.7.6 review of the OM-9.7.5A governance gate.

## Totals

| Metric | Count |
|---|---|
| Total direct-read findings | 247 |
| Allowed — canonical resolver | 54 |
| Allowed — admin config | 135 |
| Allowed — governance | 1 |
| Allowed — health scan | 10 |
| Allowed — migration compatibility | 0 |
| Runtime bypass warnings (waivers under review) | 47 |
| Runtime bypass blockers | 0 |

Only the 47 `RUNTIME_BYPASS_WARNING` findings require classification.
(The report totals differ slightly from the 26 quoted in the epic because the
scanner counts every matched line, not every file; the *file-level* waiver set
is 26. Both views are consistent — no blockers, no new waivers.)

## Waiver classification (47 findings, 26 files)

### ADMIN_CONFIG_ALLOWED — direct-read is correct for admin/config screens

These are administrative CRUD screens or configuration hooks that must read
the raw table to manage rows. They are **not** runtime business communication.

| File | Notes |
|---|---|
| `src/components/bn/config/CalculationV2Panel.tsx` | BN admin config panel — reads `bn_formula_template.template_code` (module-owned, not `core_template`). Reason added. |
| `src/components/bn/config/CommunicationsTab.tsx` | BN admin communications config panel. |
| `src/components/bn/validation/CountryLegalValidationCard.tsx` | Admin validation card (setup check). |
| `src/components/legal/lg/GeneratedLettersHistoryPanel.tsx` | Admin history view. |
| `src/components/legal/order/JudicialTemplateActions.tsx` | Judicial template admin actions. |
| `src/components/templates/CoreTemplateManagement.tsx` | Canonical template admin UI. |
| `src/hooks/legal/useLegalDocumentTypes.ts` | Legal admin metadata hook. |
| `src/hooks/legal/useLegalSetupValidation.ts` | Legal setup readiness. |
| `src/hooks/org/useTextBlock.ts` (×5) | Text-block admin CRUD hook. |
| `src/hooks/useAdminData.ts` (×4) | Admin metadata hook for notification templates. |
| `src/hooks/useEmailDeliveryConfig.ts` (×2) | Email delivery admin config. |
| `src/hooks/useApplicationsReview.ts` | Admin-review workflow lookup for template metadata. |
| `src/services/legal/lgTemplateService.ts` (×3) | Legal template admin CRUD service. |
| `src/services/legal/lgStageTemplateService.ts` | Legal stage template admin CRUD. |

**Total: 25 findings across 15 files.**

### GOVERNANCE_ALLOWED — governance/audit reads

| File | Notes |
|---|---|
| `src/services/auditCommunicationTemplateService.ts` | Audits communication template usage. |
| `src/services/complianceSettingsService.ts` | Governance/settings hydration. |

**Total: 2 findings across 2 files.**

### HEALTH_SCAN_ALLOWED — release/health scan reads

| File | Notes |
|---|---|
| `src/services/ssb-configuration/platformReadinessService.ts` | Platform readiness self-check. |

**Total: 1 finding across 1 file.**

### MIGRATION_COMPATIBILITY_ALLOWED

None.

### MIGRATE_TO_CANONICAL_RESOLVER_NOW — runtime callers that must move to `resolveBusinessCommunicationContext` / `resolveNotification`

These render letters, notices, or emails at runtime and are the priority
burn-down list for OM-9.7.6 → OM-9.7.7.

| File | Target resolver |
|---|---|
| `src/components/bn/workbench/LetterPreviewDialog.tsx` | `resolveBusinessCommunicationContext` |
| `src/components/bn/workbench/SendEligibilityFailureNoticeDialog.tsx` | `resolveBusinessCommunicationContext` |
| `src/components/legal/GenerateTemplateDialog.tsx` (×2) | `resolveBusinessCommunicationContext` |
| `src/components/legal/IssueNoticeDialog.tsx` (×2) | `resolveBusinessCommunicationContext` |
| `src/components/legal/lg/GenerateLetterDialog.tsx` (×2) | `resolveBusinessCommunicationContext` |
| `src/services/auditPublicSubmissionNotifyService.ts` | `resolveNotification` |
| `src/services/iaNotificationService.ts` | `resolveNotification` |
| `src/services/compliance/planExceptionNotifier.ts` | `resolveNotification` |

**Total: 11 findings across 8 files. This is the recommended next migration batch.**

### MIGRATE_TO_CANONICAL_RESOLVER_LATER — planned, non-blocking

Adapters/services already wrapped by BN's own indirection; will migrate when
BN adopts the canonical resolver in OM-9.7.8.

| File | Notes |
|---|---|
| `src/services/bn/bnNotificationIntegrationService.ts` | BN notification adapter — awaiting BN cutover. |
| `src/services/bn/communication/bnCommunicationAdapter.ts` (×2) | BN comms adapter — awaiting BN cutover. |
| `src/services/bn/communication/bnLetterRenderer.ts` | BN letter renderer — awaiting BN cutover. |
| `src/services/legal/lgDocumentAutomationService.ts` (×3) | Legal document automation — depends on stage template refactor. |

**Total: 7 findings across 5 files.**

### OBSOLETE_REMOVE

None identified in this pass. All direct reads are either actively used by an
admin surface or a runtime code path with a live consumer.

## Recommended next migration batch (OM-9.7.7)

Migrate the 8 `MIGRATE_TO_CANONICAL_RESOLVER_NOW` files above, in this order:

1. `src/services/auditPublicSubmissionNotifyService.ts` (lowest surface area)
2. `src/services/iaNotificationService.ts`
3. `src/services/compliance/planExceptionNotifier.ts`
4. `src/components/legal/IssueNoticeDialog.tsx`
5. `src/components/legal/GenerateTemplateDialog.tsx`
6. `src/components/legal/lg/GenerateLetterDialog.tsx`
7. `src/components/bn/workbench/LetterPreviewDialog.tsx`
8. `src/components/bn/workbench/SendEligibilityFailureNoticeDialog.tsx`

After that batch the waiver count drops from 47 → 36 findings (26 → 18 files),
all remaining entries either admin-config, governance, health-scan, or the
BN adapter cluster tracked for OM-9.7.8.

## Rules confirmed

- No new waivers were added in this pass.
- No new blockers were introduced.
- Every remaining runtime waiver has a documented reason and a target
  resolver (see `MIGRATE_TO_CANONICAL_RESOLVER_NOW/LATER` above).
- Admin/config and health-scan direct reads remain permitted per OM-9.7.5A
  governance rules.

---

## OM-9.7.6 refresh (2026-07-08)

Re-ran the classification during Epic OM-9.7.6 (Communication Template
Governance, Seed Catalogue, and Consumption Tests).

- **No new waivers were added.**
- **No new blockers were introduced.**
- **`bun run lint:comm-governance` exits 0.**
- MIGRATE_NOW backlog is unchanged (no runtime code was cut over in this
  epic — the priority was establishing the seeded catalogue, resolver
  surface, health scan, permissions, audit events, and release-readiness
  attestation that future migrations need). The recommended migration
  order above remains the plan for OM-9.7.7.
- The canonical resolver now exposes `resolveTemplateForBusinessEvent`,
  `resolveNotificationTemplateForBusinessEvent`,
  `validateTemplateTokens`, `previewBusinessCommunication`, and
  `runCommunicationTemplateHealth`, which the MIGRATE_NOW callers will
  use as their replacement API.
- Audit event `COMM_DIRECT_READ_WAIVER_BURNDOWN_UPDATED` is now seeded
  and should be emitted whenever this document is refreshed.

---

## OM-9.7.7 refresh (2026-07-08) — Runtime cutover

Migrated 3 of the 11 MIGRATE_NOW runtime notification callers onto the
canonical `dispatchInAppNotification()` wrapper
(`src/lib/comm/notificationDispatchResolver.ts`), which delegates to
`resolveNotificationTemplateForBusinessEvent` and confines the legacy
`notification_templates` fallback to the allow-listed canonical layer.

Migrated:

- `src/services/auditPublicSubmissionNotifyService.ts`
- `src/services/iaNotificationService.ts`
- `src/services/compliance/planExceptionNotifier.ts`

Result:

| Metric | Before | After |
|---|---|---|
| Runtime bypass blockers | 0 | 0 |
| Runtime bypass warnings | 47 | 44 |
| MIGRATE_NOW files | 8 | 5 |

Remaining MIGRATE_NOW callers (deferred to OM-9.7.8 module cutovers):

| File | Reason not migrated in OM-9.7.7 | Target epic |
|---|---|---|
| `src/components/legal/GenerateTemplateDialog.tsx` | Renders legacy `core_template` body picker; migration ties to legal template designer refactor. | OM-9.7.8 legal |
| `src/components/legal/IssueNoticeDialog.tsx` | Same as above. | OM-9.7.8 legal |
| `src/components/legal/lg/GenerateLetterDialog.tsx` | Same as above. | OM-9.7.8 legal |
| `src/components/bn/workbench/LetterPreviewDialog.tsx` | Preview reads template by id for legacy BN letters; ties to BN adapter cutover. | OM-9.7.8 BN |
| `src/components/bn/workbench/SendEligibilityFailureNoticeDialog.tsx` | Admin picker of `notification_templates` for eligibility notice; ties to BN adapter cutover. | OM-9.7.8 BN |

MIGRATE_LATER (BN adapter cluster + legal automation) unchanged: 7 findings
across 5 files, all documented under OM-9.7.8.

### Approved wrapper (new)

`src/lib/comm/notificationDispatchResolver.ts`

- `resolveNotificationForTriggerEvent({ triggerEvent, moduleCode, channel, languageCode, departmentCode })`
- `dispatchInAppNotification({ ...resolverInput, recipientIds, variables, entityId, entityType, notificationType, module })`
- `renderNotificationText(text, vars)`

Source trace values returned:
`CANONICAL_RESOLVER | CANONICAL_RESOLVER_SEED | LEGACY_NOTIFICATION_TEMPLATE | NONE`.

Runtime callers see one API. The legacy read is now confined to a single,
allow-listed file that will be deleted once every `trigger_event` has a
seeded catalogue entry.

### Rules confirmed for OM-9.7.7

- `bun run lint:comm-governance` exits 0.
- No new undocumented waivers were added.
- MIGRATE_NOW count decreased (8 → 5).
- Every remaining MIGRATE_NOW entry has a written reason and a target epic.
