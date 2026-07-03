# Legal V1 — UAT Role-Wise Scenarios

**Version:** 1.0

Day-in-the-life walkthroughs. Each scenario references test cases in `UAT_TEST_CASES.md`.

---

## Role 1 — Compliance Officer (upstream)

**Scenario CO-1: Forward multi-component case to Legal**
1. Open `CC-2024-0002`.
2. Select 5 due components (SS Jan24, HSD Jan24, SEV Feb24, Interest Jan-Feb24, Penalty Mar24).
3. Forward to Legal.  → **UAT-A-001..A-003**
4. Confirm referral number `CMP-LR-SKN-2026-000002` issued.

**Scenario CO-2: Recall referral before Legal accepts** → UAT-A-011

---

## Role 2 — LG_READ_ONLY

**Scenario RO-1: Search and view matter**
1. Login as read-only user.
2. Navigate `/legal/lg/cases` → open `LG-SKN-2026-000017`.  → UAT-I-001
3. Attempt to click "Assign officer" → button disabled.  → UAT-I-002

---

## Role 3 — LG_LEGAL_ASSISTANT (Legal Officer — junior)

**Scenario LA-1: Prepare intake for approval**
1. Open intake `LG-INT-SKN-2026-000017`.
2. Complete qualification checklist. → UAT-B-002/003
3. Request information from Compliance. → UAT-B-004
4. Attempt "Approve" → blocked. → UAT-B-010 / UAT-N-004

**Scenario LA-2: Draft notice**
1. Open `SEED-LG-2026-0001` → Documents → Generate notice.
2. Save as DRAFT. Cannot approve. → UAT-I-003

---

## Role 4 — LG_CASE_HANDLER (Senior Legal Officer)

**Scenario CH-1: Case operations on CE-originated matter**
1. Open `LG-SKN-2026-000018`.
2. Add party note, add hearing. → UAT-E-001/002
3. Record ADJOURNED outcome. → UAT-E-003
4. Verify Case Completeness. → UAT-C-010

**Scenario CH-2: Handle liabilities**
1. Verify 5 liabilities present. → UAT-D-001..005
2. Trigger "Refresh from Compliance" (idempotent). → UAT-A-008
3. Reconcile financials with view. → UAT-D-008/009

---

## Role 5 — LG_REVIEWER

**Scenario RV-1: Approve notice**
1. Open drafted notice from LA-2.
2. Approve. → UAT-I-005
3. Attempt to close matter → blocked.

---

## Role 6 — LG_APPROVER (Legal Manager)

**Scenario AP-1: Accept intake and create matter**
1. Open `LG-INT-SKN-2026-000019`.
2. Approve intake. → UAT-B-007
3. Confirm `LG-SKN-2026-000019` created. → UAT-A-005/006/007

**Scenario AP-2: Judicial workflow**
1. Record hearing outcome JUDGMENT on SEED-LG-2026-0001. → UAT-E-004
2. Publish order. → UAT-I-006
3. Approve settlement / consent order. → UAT-E-005

**Scenario AP-3: Post-judgment recovery**
1. Create recovery assignment. → UAT-G-002
2. Trigger enforcement on breached consent order. → UAT-E-008 / UAT-G-005

**Scenario AP-4: Close matter (fully paid)**
1. Open SEED-LG-2026-0003. → UAT-C-014
2. Close.  → UAT-N-013 (block if outstanding).

---

## Role 7 — LG_ADMIN

**Scenario ADM-1: Master data & policy**
1. Manage templates. → UAT-I-007
2. Configure fee rule.
3. Update workflow policy version — verify version banner on matters.

---

## Role 8 — SYSTEMADMIN

**Scenario SA-1: Cross-role access**
1. Login as SYSTEMADMIN → confirm every Legal route reachable. → UAT-I-008

---

## Cross-role handoff — full lifecycle

`CO → LA → AP → CH → AP` on Compliance case `A Fulton & Co (654548)`:

1. Compliance Officer forwards 5 components. → UAT-A-001
2. LG_LEGAL_ASSISTANT reviews intake, completes checklist. → UAT-B-001..004
3. LG_APPROVER approves intake → creates `LG-SKN-2026-000019`. → UAT-B-007
4. LG_CASE_HANDLER runs Matter Workspace validation. → UAT-C-*
5. LG_APPROVER files hearing, records judgment, publishes order. → UAT-E-*
6. LG_APPROVER assigns to recovery, files enforcement. → UAT-G-*
7. Financial rollup verified in Dashboard. → UAT-H-004
8. Close matter after full recovery. → UAT-C-014
