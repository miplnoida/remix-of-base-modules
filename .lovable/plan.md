# Benefits Communications & Central Reference Numbering

## Scope
Complete the Benefits communication framework so that:
1. All Benefits emails/SMS/letters/in-app go through central `notification_templates`.
2. A new **central reference-number service** issues unique IDs (e.g. `BN/LETTER/2026/000001`) usable by every module.
3. Every generated letter carries logo, office details, reference number, and a frozen snapshot of rendered content.

This builds on what already exists (BenefitCommunicationTemplates page, bnPlaceholderRegistry, letter snapshotting, menu/permissions) and adds the missing pieces.

## Work plan

### A. Database migration (single migration)
- Create `system_reference_sequence` (department_code, module_code, document_type, prefix_pattern, current_number, padding, financial_year, active). Grants + no RLS (per project rule).
- Create `system_office_settings` (office_code, office_name, department_name, address_line_1/2, phone, email, logo_url, signature_block, is_default).
- Extend `bn_letter` with: `reference_number`, `department_code`, `document_type`, `issued_by_office` (if not already present).
- Add SQL function `next_reference_number(p_module, p_dept, p_doc_type)` that atomically increments and returns formatted string.

### B. Seed data (insert calls after migration)
- Seed default office row (SKN SSB head office) with logo URL placeholder.
- Seed reference sequences: BN/LETTER, BN/CLAIM_NOTICE, BN/DECISION_LETTER, BN/EVIDENCE_REQUEST, FIN/PAYMENT_NOTICE, COM/GENERAL_NOTICE.
- Seed/Upsert the full set of central templates listed (Acknowledgement, Eligibility, Evidence, Decision, Award/Payment, Servicing) — email/SMS/letter variants — with REFERENCE_NUMBER placeholder where letters.

### C. Services
- `src/services/reference/referenceNumberService.ts` — `generate / preview / reserve / markUsed` wrapping the SQL function.
- `src/services/system/officeSettingsService.ts` — fetch default + by-code office.
- Extend `bnPlaceholderRegistry.ts` with REFERENCE_NUMBER, OFFICE_NAME, OFFICE_ADDRESS, DEPARTMENT_NAME.
- Update `letterGenerator.ts`:
  - On generate, call reference service if `bn_letter.reference_number` is null → persist.
  - Merge office context (logo, address, signature) into render context.
  - Render branded letter header (logo + office block) into the HTML before body.
  - Persist `department_code`, `document_type`, `issued_by_office`, snapshot fields (already done).
- Update `bnCommunicationAdapter.createLetter` to set `department_code` + `document_type` from the comm mapping/event when creating the row.

### D. UI
- `BenefitCommunicationTemplates.tsx` — already exists; add a "Reference Sequences" link/notice and surface REFERENCE_NUMBER in the placeholder palette (auto from registry).
- `LetterPreviewDialog.tsx` — show reference number, office, department, document type.
- `CommunicationTab.tsx` — when generation blocked due to missing reference sequence/office, show actionable BLOCKED reason.
- New page `src/pages/system/ReferenceSequencesAdmin.tsx` (Super Admin) for managing sequences. Route + sidebar entry under System Admin.

### E. Audit
- Reuse `writeBnAudit` for: REFERENCE_NUMBER_GENERATED, LETTER_GENERATED (already), TEMPLATE_PUBLISHED (already).
- Log reference generation centrally too via `system_audit_trail` insert.

### F. Verification
- TypeScript build passes (harness).
- Spot-check: generate eligibility-failed letter end-to-end (reference number + branded header + snapshot persisted).

## Out of scope
- Rewriting the existing template management UI.
- Migrating non-BN modules to call the reference service (service is created and seeded so they can adopt it; only BN letters wired now).
- Real PDF logo asset upload (uses a configurable `logo_url`, defaults to placeholder).

## Notes / assumptions
- No RLS per project rule; grants to authenticated + service_role.
- Sequences are per (module, department, document_type, financial_year). FY computed from current year unless overridden.
- Reference format: `{MODULE}/{DOC_TYPE}/{YYYY}/{padded_number}` by default; overridable via `prefix_pattern`.
