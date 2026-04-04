

# Benefit Documents & Evidence Module

## Summary

Expand the existing `bn_claim_document` (simple upload tracker) into a full evidence management subsystem with configurable requirements per product version and stage, a multi-status document lifecycle, waiver authority, expiry tracking, file validation, and special service document support. Integrate with the decision engine to gate transitions on evidence completeness.

## Architecture

```text
┌──────────────────────────────────────────────────────┐
│              DOCUMENTS & EVIDENCE ENGINE              │
│                                                       │
│  ┌─────────────────┐  ┌──────────────────────────┐   │
│  │ Requirement      │  │ Transactional Evidence   │   │
│  │ Config           │  │ (bn_claim_evidence)      │   │
│  │ (bn_doc_req)     │  │                          │   │
│  └─────────────────┘  └──────────────────────────┘   │
│  ┌─────────────────┐  ┌──────────────────────────┐   │
│  │ Evidence Status  │  │ Waiver / Authority       │   │
│  │ Workflow         │  │ Model                    │   │
│  └─────────────────┘  └──────────────────────────┘   │
│  ┌─────────────────┐  ┌──────────────────────────┐   │
│  │ Evidence Audit   │  │ Service Document         │   │
│  │ Trail            │  │ Registry                 │   │
│  └─────────────────┘  └──────────────────────────┘   │
│                                                       │
│  Gates: Decision Engine → requires_evidence_complete  │
└──────────────────────────────────────────────────────┘
```

---

## Database Changes (Migration)

### Table 1: `bn_doc_requirement` — Replaces loose `bn_document_rule`

Configurable per product_version + stage. Drives what documents a claim needs.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| product_version_id | uuid FK bn_product_version | |
| document_type_code | varchar(30) | FK to `bn_service_doc_type` |
| stage | varchar(30) | INTAKE, EVIDENCE_REVIEW, DECISION, POST_AWARD, PERIODIC_REVIEW |
| requirement_level | varchar(20) | MANDATORY, OPTIONAL, WAIVABLE |
| allowed_extensions | text[] | e.g. {pdf,jpg,png} |
| max_file_size_mb | numeric(6,2) DEFAULT 10 | |
| expiry_days | int NULL | If set, doc expires N days after upload |
| requires_notarization | boolean DEFAULT false | |
| description | text NULL | |
| sort_order | int DEFAULT 0 | |
| is_active | boolean DEFAULT true | |
| entered_by / entered_at | audit | |

### Table 2: `bn_service_doc_type` — Special document type registry

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| type_code | varchar(30) UNIQUE | LIFE_CERT, DEATH_CERT, SCHOOL_CERT, BANK_EFT, EMPLOYER_CONF, MEDICAL_CERT, PROOF_RELATION, SURVIVOR_CERT, BIRTH_CERT, ID_CARD, etc. |
| type_name | varchar(100) | |
| category | varchar(30) | IDENTITY, FINANCIAL, MEDICAL, RELATIONSHIP, EMPLOYMENT, PERIODIC |
| default_expiry_days | int NULL | |
| requires_witness | boolean DEFAULT false | |
| description | text NULL | |
| is_active | boolean DEFAULT true | |
| entered_by / entered_at | audit | |

Seeded with: LIFE_CERT, DEATH_CERT, SCHOOL_CERT, BANK_EFT, EMPLOYER_CONF, MEDICAL_CERT, PROOF_RELATION, BIRTH_CERT, ID_CARD, MARRIAGE_CERT, POLICE_REPORT, INJURY_REPORT.

### Table 3: `bn_claim_evidence` — Replaces `bn_claim_document`

Full transactional evidence tracking per claim.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| claim_id | uuid FK bn_claim | |
| requirement_id | uuid FK bn_doc_requirement NULL | NULL for ad-hoc uploads |
| document_type_code | varchar(30) | |
| document_name | varchar(200) | |
| file_name | varchar(300) NULL | |
| file_path | text NULL | Storage path |
| file_size | int NULL | |
| mime_type | varchar(100) NULL | |
| storage_bucket | varchar(100) NULL | |
| checksum_sha256 | varchar(64) NULL | |
| source | varchar(20) DEFAULT 'UPLOAD' | UPLOAD, SCAN, ONLINE, LEGACY, GENERATED |
| status | varchar(20) DEFAULT 'RECEIVED' | RECEIVED, VERIFIED, REJECTED, WAIVED, PENDING_INFO, EXPIRED |
| status_reason | text NULL | |
| verified_by | varchar(50) NULL | |
| verified_at | timestamptz NULL | |
| rejected_by | varchar(50) NULL | |
| rejected_at | timestamptz NULL | |
| rejection_reason | text NULL | |
| waived_by | varchar(50) NULL | |
| waived_at | timestamptz NULL | |
| waiver_reason | text NULL | |
| waiver_authority_level | int NULL | |
| expires_at | date NULL | Computed from requirement expiry_days |
| metadata | jsonb DEFAULT '{}' | Notarization info, witness, etc. |
| entered_by / entered_at, modified_by / modified_at | audit | |

### Table 4: `bn_evidence_audit` — Immutable log of every evidence status change

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| evidence_id | uuid FK bn_claim_evidence | |
| claim_id | uuid FK bn_claim | |
| action | varchar(30) | UPLOAD, VERIFY, REJECT, WAIVE, REQUEST_INFO, EXPIRE, REPLACE, DELETE |
| from_status | varchar(20) NULL | |
| to_status | varchar(20) | |
| reason | text NULL | |
| performed_by | varchar(50) | |
| performed_at | timestamptz DEFAULT now() | |

### Table 5: `bn_evidence_checklist` — Materialized checklist view per claim

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| claim_id | uuid FK bn_claim | |
| requirement_id | uuid FK bn_doc_requirement | |
| evidence_id | uuid FK bn_claim_evidence NULL | Linked when fulfilled |
| status | varchar(20) DEFAULT 'OUTSTANDING' | OUTSTANDING, FULFILLED, WAIVED, REJECTED, EXPIRED |
| is_blocking | boolean | True if MANDATORY and not fulfilled/waived |
| entered_at | timestamptz DEFAULT now() | |
| modified_at | timestamptz DEFAULT now() | |

---

## Types (added to `src/types/bn.ts`)

New interfaces: `BnServiceDocType`, `BnDocRequirement`, `BnClaimEvidence`, `BnEvidenceAudit`, `BnEvidenceChecklist`.

New enums/constants: `BN_EVIDENCE_STATUSES`, `BN_EVIDENCE_ACTIONS`, `BN_DOC_CATEGORIES`, `BN_REQUIREMENT_LEVELS`, `BN_EVIDENCE_STAGES`.

---

## Services

### `src/services/bn/evidenceService.ts`
- `fetchDocRequirements(productVersionId, stage?)` — config requirements
- `fetchClaimEvidence(claimId)` — all evidence for a claim
- `uploadEvidence(claimId, file, meta)` — upload to Supabase Storage `bn-evidence` bucket, write `bn_claim_evidence`, compute SHA-256, set expiry, write audit
- `verifyEvidence(evidenceId, userCode)` — set VERIFIED, write audit, update checklist
- `rejectEvidence(evidenceId, reason, userCode)` — set REJECTED, write audit
- `waiveEvidence(evidenceId, reason, authorityLevel, userCode)` — set WAIVED, write audit, update checklist
- `requestMoreInfo(evidenceId, reason, userCode)` — set PENDING_INFO, write audit
- `getEvidenceChecklist(claimId)` — returns checklist with blocking status
- `isEvidenceComplete(claimId)` — boolean: all mandatory items fulfilled/waived
- `generateEvidenceChecklist(claimId, productVersionId, stage)` — creates checklist rows from requirements
- `fetchEvidenceAudit(claimId)` — full audit trail
- `fetchServiceDocTypes()` — reference data CRUD

### File validation strategy (client + service):
- Client-side: extension check, file size check against `max_file_size_mb`
- Service-side: MIME type validation, SHA-256 checksum generation
- Future: virus scan hook (placeholder function `scanFile()` that returns `{clean: true}` for now, to be replaced with ClamAV/external API integration)

---

## Hooks — `src/hooks/bn/useBnEvidence.ts`

- `useBnDocRequirements(productVersionId, stage?)` — query
- `useBnClaimEvidence(claimId)` — query
- `useBnEvidenceChecklist(claimId)` — query
- `useBnEvidenceAudit(claimId)` — query
- `useBnServiceDocTypes()` — query
- `useUploadEvidence()` — mutation
- `useVerifyEvidence()` — mutation
- `useRejectEvidence()` — mutation
- `useWaiveEvidence()` — mutation
- `useRequestMoreInfo()` — mutation
- `useBnIsEvidenceComplete(claimId)` — derived boolean

---

## UI Components

### 1. `src/components/bn/evidence/EvidenceChecklist.tsx`
Main claim evidence workspace (used in Claim360 Documents tab):
- Shows checklist grid: requirement name, category, level (mandatory/optional/waivable), status badge, linked file, actions
- Upload button per row opens file picker with extension/size validation
- Action buttons: Verify, Reject, Waive, Request Info (role-gated)
- Waive action opens modal requiring reason + authority level
- Expired documents highlighted in amber
- "Evidence Complete" / "X items blocking" summary banner at top

### 2. `src/components/bn/evidence/EvidenceUploadDialog.tsx`
Upload modal:
- File picker with drag-drop
- Auto-selects document type from checklist context
- Extension and size validation with inline errors
- Source selector (Upload/Scan/Online)
- Notes field
- Progress indicator

### 3. `src/components/bn/evidence/EvidenceActionDialog.tsx`
Shared modal for Verify/Reject/Waive/RequestInfo:
- Action-specific fields (reason required for reject/waive, authority level for waive)
- Confirmation step
- Role check before rendering action buttons

### 4. `src/components/bn/evidence/EvidenceAuditTimeline.tsx`
Read-only chronological view of all evidence actions:
- Each entry: action, document name, from/to status, reason, user, timestamp
- Color-coded by action type
- Export to JSON/CSV

### 5. `src/components/bn/evidence/EvidenceStatusBadge.tsx`
Reusable badge with status-specific colors.

### 6. Admin: `src/pages/bn/config/ServiceDocTypes.tsx`
CRUD page for `bn_service_doc_type` reference data.

### 7. Admin: Doc Requirement config already exists in `DocumentRulesTab.tsx`
Extend to use `bn_doc_requirement` with the new fields (requirement_level, expiry_days, requires_notarization).

---

## Integration Points

### Decision Engine Gating
The existing `bn_claim_transition_rule.requires_evidence_complete` flag is already checked in `decisionEngine.ts`. Update `validateTransitionPreconditions` to call `isEvidenceComplete(claimId)` from the new evidence service instead of the simple `bn_claim_document.verified` check.

### Claim360 Integration
Replace the existing Documents tab content with `EvidenceChecklist`. Add `EvidenceAuditTimeline` as a sub-tab.

### Calculation Engine
The calculation engine's eligibility layer already checks evidence state. Wire `isEvidenceComplete` into the `runEligibility` step so calculations are blocked if mandatory evidence is missing.

### Storage
Create a `bn-evidence` storage bucket for file uploads. Files stored at path: `{claim_id}/{evidence_id}/{file_name}`.

---

## Navigation

Add to `bnMenuItems.ts` under Configuration:
- "Service Document Types" → `/bn/config/service-doc-types`

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | Migration SQL (5 tables + seeds + storage bucket) |
| Create | `src/services/bn/evidenceService.ts` |
| Create | `src/hooks/bn/useBnEvidence.ts` |
| Create | `src/components/bn/evidence/EvidenceChecklist.tsx` |
| Create | `src/components/bn/evidence/EvidenceUploadDialog.tsx` |
| Create | `src/components/bn/evidence/EvidenceActionDialog.tsx` |
| Create | `src/components/bn/evidence/EvidenceAuditTimeline.tsx` |
| Create | `src/components/bn/evidence/EvidenceStatusBadge.tsx` |
| Create | `src/pages/bn/config/ServiceDocTypes.tsx` |
| Modify | `src/types/bn.ts` — add 5 interfaces + constants |
| Modify | `src/pages/bn/claims/Claim360.tsx` — replace Documents tab with EvidenceChecklist |
| Modify | `src/services/bn/decisionEngine.ts` — wire `isEvidenceComplete` |
| Modify | `src/components/bn/config/DocumentRulesTab.tsx` — extend with new fields |
| Modify | `src/components/routing/AppRoutes.tsx` — add ServiceDocTypes route |
| Modify | `src/components/sidebar/menuItems/bnMenuItems.ts` — add nav item |

