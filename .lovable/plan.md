

# Phase 3 — Notice Automation Implementation Plan

## Current State

| Component | Status |
|-----------|--------|
| `ce_notices` table | Exists — 23 columns, 4 delivered records |
| `ce_notice_templates` table | Exists — 7 templates seeded |
| Notices Management UI | Exists — manual create/view at `/compliance/legal/notices` |
| Notice delivery tracking table | Missing |
| Auto-generation on violation aging | Missing |
| Notice status lifecycle (DRAFT→SENT→DELIVERED→ACKNOWLEDGED) | Partial — no transition controls |
| Response tracking | Schema exists (`response_received`, `response_date`, `response_notes`) — no UI |
| Violation Detail → Notices tab | Exists — read-only list |

## What Will Be Built

### 1. `ce_notice_delivery_log` Table (New)
Tracks every delivery attempt per notice for full auditability.

```text
ce_notice_delivery_log
├── id (UUID PK)
├── notice_id (FK → ce_notices)
├── attempt_number (INT)
├── channel (VARCHAR) — EMAIL, SMS, REGISTERED_MAIL, HAND_DELIVERED
├── recipient_address (VARCHAR) — email/phone/address used
├── status (VARCHAR) — PENDING, SENT, DELIVERED, FAILED, BOUNCED
├── sent_at (TIMESTAMPTZ)
├── delivered_at (TIMESTAMPTZ)
├── failure_reason (TEXT)
├── provider_message_id (VARCHAR) — external tracking ref
├── created_by (VARCHAR)
├── created_at (TIMESTAMPTZ)
```

### 2. Notice Status Lifecycle Controls
Add status transition buttons to the Notices Management UI and Violation Detail Notices tab:
- **DRAFT** → Send (→ SENT)
- **SENT** → Mark Delivered (→ DELIVERED)
- **DELIVERED** → Record Acknowledgment (→ ACKNOWLEDGED)
- **Any active** → Cancel (→ CANCELLED)
- Each transition inserts a delivery log entry and updates `ce_notices`

### 3. Response Tracking UI
Add "Record Response" action on delivered/acknowledged notices:
- Captures `response_date`, `response_notes`, sets `response_received = true`
- Visible in both Notices Management and Violation Detail

### 4. Auto-Notice Generation on Violation Aging
Create a new automation job `JOB-NOTICE-GENERATION` with an Edge Function handler:
- **Rule engine**: Configurable aging thresholds → template mapping
  - Violation OPEN > 7 days, no notice → generate 1st notice (TPL-VN-001)
  - Violation OPEN > 21 days, only 1st notice → generate 2nd notice (TPL-VN-002)
  - Violation OPEN > 45 days, no final → generate Final Warning (TPL-VN-003)
- **Dedupe**: Skip if an active notice of the same template already exists for that violation
- **Dry-run support**: Preview what would be generated without creating records
- **Idempotency**: Uses `NOTICE-GEN-{date}` key pattern

### 5. Notice Service Layer
New `src/services/noticeService.ts`:
- `sendNotice(id)` — transitions DRAFT→SENT, creates delivery log
- `markDelivered(id)` — SENT→DELIVERED
- `recordAcknowledgment(id)` — DELIVERED→ACKNOWLEDGED
- `recordResponse(id, notes, date)` — sets response fields
- `cancelNotice(id, reason)` — any→CANCELLED
- `fetchDeliveryLog(noticeId)` — returns delivery attempts

### 6. Enhanced Violation Detail Notices Tab
Upgrade from read-only list to operational:
- Show notice status with transition buttons
- Show delivery log per notice (expandable)
- "Record Response" action
- Link to full notice body view

### 7. Register Job in `ce_automation_jobs`
Insert `JOB-NOTICE-GENERATION` as a canonical job with:
- `job_type: 'employer_compliance'`
- `frequency: 'daily'`
- `has_runtime: true`

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `supabase/migrations/xxx_notice_delivery_log.sql` |
| Create | `supabase/functions/run-notice-generation/index.ts` |
| Create | `src/services/noticeService.ts` |
| Modify | `src/pages/compliance/legal/NoticesManagement.tsx` — add status transitions + response recording |
| Modify | `src/pages/compliance/violations/ViolationDetails.tsx` — enhance Notices tab |
| Modify | `supabase/functions/run-compliance-job/index.ts` — add routing for `JOB-NOTICE-GENERATION` |

## Phased Delivery Order
1. Migration: `ce_notice_delivery_log` + seed `JOB-NOTICE-GENERATION` job
2. Notice service with lifecycle transitions
3. UI enhancements (Notices Management + Violation Detail)
4. Edge Function for auto-generation
5. Wire job dispatcher routing

