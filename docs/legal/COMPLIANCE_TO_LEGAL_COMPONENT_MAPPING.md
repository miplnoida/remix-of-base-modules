# Compliance → Legal Liability Integration

**Status:** ✅ Wired (referral items now materialize into `lg_recoverable_liability`)
**Depends on:** EPIC-06A (Recoverable Liability), EPIC-03A (Intake), EPIC-06A.2 (Retrofit)

---

## 1. End-to-end flow

```
Compliance Case (ce_cases)
  → Compliance Legal Referral Wizard
  → selected candidate items
  → core_legal_referral_item            (child items, per component / fund / period)
  → ce_legal_referrals                  (header)
  → lg_case_intake                      (Legal intake queue)
  → Legal case creation (lg_case)
  → legalCaseEnrichmentService.enrichCaseFromSource()
       ├─ upsertParty(COMPLAINANT + RESPONDENT)
       ├─ createActionFromReferralItem      → lg_case_action  (kept for legacy screens)
       ├─ createLiabilityFromReferralItem   → lg_recoverable_liability  (NEW, financial SoT)
       └─ linkDocument                      → lg_document_link
  → refreshFinancialSnapshot(case)      (writes lg_case.claim_amount / outstanding)
  → v_lg_case_financials                (authoritative rollup for UI)
```

## 2. Source tables

| Table                        | Role                                                      |
|------------------------------|-----------------------------------------------------------|
| `ce_cases`                   | Compliance case being referred                            |
| `ce_legal_referrals`         | Referral header, links to `legal_case_id` after acceptance|
| `core_legal_referral_item`   | Per-component line item (fund, period, amount, debtor)    |
| `core_legal_referral_document`| Attached evidence                                        |
| `lg_case_intake`             | Legal intake queue entry                                  |
| `lg_case`                    | Legal case created on acceptance                          |
| `lg_recoverable_liability`   | Authoritative recoverable amount (per item)               |
| `lg_case_action`             | Legacy child action (backward-compat, not financial SoT)  |

## 3. Field mapping (referral item → liability)

| `core_legal_referral_item`                | `lg_recoverable_liability`               |
|-------------------------------------------|------------------------------------------|
| `id`                                      | `source_record_id`                       |
| `source_module`                           | `source_module`                          |
| `source_reference_no`                     | `source_reference`                       |
| `fund_code`                               | `fund_type` (SS→SOCIAL_SECURITY, HSD/LV→HOUSING, SEV→SEVERANCE, BN→BENEFIT) |
| `liability_head_code` + `item_type`       | `liability_type` (SS_CONTRIB / HOUSING_LEVY / SEVERANCE / PENALTY / BN_OVERPAYMENT / PENSION_RECOVERY / OTHER) |
| `period_from` / `period_to`               | `contribution_period_from` / `_to`       |
| `principal_amount`                        | `principal`                              |
| `interest_amount`                         | `interest`                               |
| `penalty_amount`                          | `penalty`                                |
| `cost_amount`                             | `court_cost` if head contains "COURT" else `legal_cost` |
| `amount_referred` (or `total_amount`)     | `total_assessed` (computed by DB from components) / `outstanding` |
| `debtor_id` where `debtor_type=EMPLOYER`  | `employer_id`                            |
| `debtor_id` where `debtor_type IN (INSURED_PERSON, BENEFICIARY, ESTATE)` | `insured_person_id` |
| `referral_reason_code`                    | included in `remarks`                    |

## 4. Idempotency

Materialization matches an existing liability by:

```
lg_case_id + source_module + source_record_id (= referral item id)
```

- Existing row → **update** amounts, periods, fund/type, debtor. `paid` is preserved; DB triggers recompute `outstanding`.
- No match → **insert** a fresh row.

Re-running `enrichCaseFromSource` (or `repairCase`) is safe — no duplicates.

## 5. Backward compatibility

- `lg_case_action` continues to be created for existing screens (Financials tab, arrangements, legacy timeline).
- **Financial rollups must read from `lg_recoverable_liability` / `v_lg_case_financials`.** `lg_case_action` totals must not be treated as authoritative.
- Case Completeness now checks `liabilities_count`, not `actions_count`. Missing child actions are no longer blocking.

## 6. Validation

Use `scripts/legal/04_validate.sql` plus:

```sql
-- Every accepted item with amount > 0 has exactly one liability
SELECT r.legal_case_id, i.id AS item_id, i.amount_referred,
       COUNT(l.id) AS matched
FROM ce_legal_referrals r
JOIN core_legal_referral_item i ON i.referral_id = r.id
LEFT JOIN lg_recoverable_liability l
  ON l.lg_case_id = r.legal_case_id
 AND l.source_module = i.source_module
 AND l.source_record_id = i.id::text
WHERE r.legal_case_id IS NOT NULL
  AND i.status IN ('ACCEPTED','REFERRED')
  AND COALESCE(i.amount_referred, i.total_amount, 0) > 0
GROUP BY r.legal_case_id, i.id, i.amount_referred
HAVING COUNT(l.id) <> 1;
```

Case-level reconciliation:

```sql
SELECT lg_case_id,
       SUM(total_assessed) AS liab_assessed,
       SUM(outstanding)    AS liab_outstanding
FROM lg_recoverable_liability
WHERE status = 'ACTIVE'
GROUP BY lg_case_id;

-- Compare against v_lg_case_financials
```

## 7. Gaps / limitations

- `lg_case_action.action_kind` constraint still expects specific fund codes; some exotic `liability_head_code` values fall back to `OTHER`.
- Header `Primary Respondent` chip resolves from `lg_case_party (party_role=RESPONDENT)` → `er_master(regno=employer_id)` → `legacy_primary_entity_name`; fully-orphan cases still fall through to the placeholder.
- Existing pre-integration cases have `lg_case_action` rows but no liabilities; run `repairCase(caseId)` to materialize.
