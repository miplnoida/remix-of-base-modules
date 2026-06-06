
# Make Funeral Grant Eligibility Rules Evaluable

## Background

On claim `100047` (Funeral Grant), two eligibility rules always fail:

1. **FUN-DEATH-DOC — "Death certificate present"** — actual=`true`, required=`—`. Rule JSON uses `requires_document: "DEATH_CERT"`, but the engine reads `value`/`operator`/`document_type_code`. The uploaded evidence is also tagged `document_type_code='GENERAL'`, so even a fixed comparison wouldn't match the death-certificate filter.
2. **FUN-RELATION — "Insured / spouse / dependent child"** — actual=`—`, required=`—`. Rule JSON references `claim.benefit_type` and stores `deceased_relationship: [...]`. The engine has no resolver for the deceased's relationship, and the existing participants on the claim have `relationship_to_insured = null`.

The fix has four small pieces: rule data, engine resolver, upload UI, and participants UI.

## Changes

### 1. Engine — new resolver `participant.deceased_relationship`
File: `src/services/bn/eligibility/fieldRegistry.ts`, `src/services/bn/eligibility/fieldResolver.ts`, `src/services/bn/claimActionRunner.ts`

- Register a new field:
  ```
  key: 'participant.deceased_relationship'
  valueType: 'string'
  operators: ['==','!=','IN']
  resolver: 'participant.deceasedRelationship'
  dataSource: 'bn_claim_participant.relationship_to_insured (where participant_role = DECEASED_INSURED_PERSON)'
  ```
- Implement the resolver: query `bn_claim_participant` for the claim, pick the row with `participant_role = 'DECEASED_INSURED_PERSON'`, return `relationship_to_insured` (uppercased), source label `bn_claim_participant`.
- No engine logic change needed for the `IN` operator — it is already supported by `operatorEvaluator.ts`.

### 2. Fix the two seeded rule definitions
Update `bn_eligibility_rule.rule_definition` for the two rule codes on product version `aa100001-6666-4000-a000-000000000007`:

- `FUN-DEATH-DOC` →
  ```json
  {
    "field_key": "evidence.document_verified",
    "operator": "==",
    "value": true,
    "document_type_code": "DEATH_CERT"
  }
  ```
- `FUN-RELATION` →
  ```json
  {
    "field_key": "participant.deceased_relationship",
    "operator": "IN",
    "value": ["INSURED", "SPOUSE", "DEPENDENT_CHILD"]
  }
  ```

### 3. Upload Evidence Document dialog — let the user pick a Document Type
File: `src/components/bn/evidence/EvidenceUploadDialog.tsx`

- Add a required `Document Type` `SearchableSelect` populated from `bn_doc_requirement` for the product (fallback: a hard-coded set including `DEATH_CERT`, `FUNERAL_INVOICE`, `BIRTH_CERT`, `EMPLOYER_REPORT`, `GENERAL`).
- Persist the choice into `bn_claim_evidence.document_type_code` on upload.
- Default to the requirement attached to the upload trigger when launched from a checklist row.

### 4. Participants tab — capture `relationship_to_insured` for the deceased
File: `src/components/bn/workbench/...` (the Participants tab editor / `bn_claim_participant` form)

- When the participant's `participant_role = 'DECEASED_INSURED_PERSON'` (or `kind = 'DECEASED'`), show a required `Relationship to Insured` dropdown:
  - `INSURED`, `SPOUSE`, `DEPENDENT_CHILD`, `OTHER`.
- Save to `bn_claim_participant.relationship_to_insured`.

### 5. Backfill / re-run
- For claim `db5cc8c4-71bf-49f3-9eb5-dd81945fedce`, after the UI changes the user must:
  1. Edit the existing deceased participant and set `relationship_to_insured`.
  2. Re-upload (or edit) the evidence row so `document_type_code = 'DEATH_CERT'`.
  3. Click **Re-run** on the Eligibility tab — both rules should pass.
- No automatic data backfill ships with this change.

## Out of scope

- No changes to other benefit products' rules.
- No changes to the calculation/decision engine beyond the new resolver registration.
- No RLS work.

## Acceptance

- New resolver is selectable in the Eligibility Rule editor; saving a rule with operator `IN` and a string array works.
- For the test claim: setting deceased relationship to `INSURED` and uploading a verified `DEATH_CERT` makes both FUN-* rules pass and the overall Eligibility flips to PASS (subject to other rules).
- Existing rules for other benefit products continue to evaluate unchanged.
