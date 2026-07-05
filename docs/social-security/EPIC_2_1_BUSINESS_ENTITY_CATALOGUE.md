# Epic 2.1 — Business Entity Catalogue

Planning only. No table proposals here — additive schema, if any, is a later epic.

Legend: **C**anonical · **R**eusable · **D**uplicate · **L**egacy · **M**issing.

Each entry lists: Business meaning · Canonical owner · Existing implementation · Reuse strategy · Consumers · Dependencies · Future supporting domains.

---

## 1. Member (Insured Person / Participant)
- **Meaning**: Natural person registered with the scheme; the human subject of contributions, benefits, claims and cases.
- **Owner**: Identity / Participant shared domain.
- **Existing**: `ip_master`, `ip_name(s)`, `ip_alias`, `ip_status`, `ip_verify`, `ip_documents`, `ip_depend`, `ip_bank_hist` (Legacy). Modern read paths in `pages/insuredPersons`, `pages/ip-registration`, `pages/person`.
- **Class**: **L → C via adapter** (`v_member`, `v_member_identity`, `v_member_status`).
- **Reuse**: `useMember(memberId)` façade, read-only, backed by adapter views. No rewrite.
- **Consumers**: Contributions, Benefits (claim, award, entitlement), Compliance, Case Management, Payments, Appeals, Portals.
- **Dependencies**: Identity, Geography (address), Communication (contact channels), Document (proofs).

## 2. Employer
- **Meaning**: Legal entity liable to contribute for its employees.
- **Owner**: Identity / Participant shared domain (employer sub-type).
- **Existing**: `er_master`, `er_locations`, `er_owner`, `er_commence`, `er_notes`, `er_documents`, `er_notification`, `er_suit`, `er_visit` (Legacy). Modern UI in `pages/employer`, `pages/employer-registration`, `pages/employersManagement`, `portals/employer`.
- **Class**: **L → C via adapter** (`v_employer`, `v_employer_location`, `v_employer_owner`).
- **Reuse**: `useEmployer(employerId)` façade.
- **Consumers**: Contributions (payer), Benefits (claim employer snapshot), Compliance, Legal, Payments, Cashier.
- **Dependencies**: Identity, Geography, Legal (references), Financial (ledger head).

## 3. Employment (Employee ↔ Employer link)
- **Meaning**: Time-bounded relationship between a Member and an Employer used to attribute wages and eligibility.
- **Owner**: Contributions shared domain (canonical) with participant view surfaced by Identity.
- **Existing**: `ip_employer`, `ip_employer_susp`, `ip_wages`, `ip_wages_sum`, `ip_last_asp`, `ip_last_self_emp` (Legacy).
- **Class**: **L → C via adapter** (`v_employment`, `v_employment_period`).
- **Reuse**: `useEmployment(memberId, employerId, period)`.
- **Consumers**: Benefits eligibility, Compliance, Contribution reconciliation.
- **Dependencies**: Member, Employer, Contribution Period.

## 4. Scheme
- **Meaning**: A social insurance programme (Long-Term, Short-Term, Employment Injury, Non-Contributory, Medical, etc.) that groups rules, contribution types and benefit products.
- **Owner**: Social Security shared domain (new canonical).
- **Existing**: Implicit only — expressed today by scattered flags in `bn_coverage_type`, `bn_country_config_package`, `cn_*` account types, benefit code lists.
- **Class**: **M** (no canonical entity; concept currently duplicated across BN configuration).
- **Reuse**: Deferred — future additive `ss_scheme` catalogue to be proposed via the Registration Pipeline; must not go into BEMA.
- **Consumers**: Contributions, Benefits, Compliance, Reporting.
- **Dependencies**: Legal (governing act), Financial (ledger head), Contribution Type, Benefit Product.

## 5. Scheme Membership
- **Meaning**: A Member's participation in a specific Scheme with an effective period and status.
- **Owner**: Social Security shared domain.
- **Existing**: Implicit — derived from `ip_status`, `ip_employer`, `ip_vol_contrib`, `ip_self_employ`.
- **Class**: **M** (concept implicit, no unified surface).
- **Reuse**: Deferred — future `v_scheme_membership` derived view then additive persistence if required.
- **Consumers**: Benefits eligibility, Contributions liability, Compliance.
- **Dependencies**: Member, Scheme, Employment.

## 6. Contribution Type
- **Meaning**: The classification of a contribution (Employer, Employee, Self-Employed, Voluntary, Levy, Fine, Interest, Adjustment).
- **Owner**: Contributions shared domain.
- **Existing**: Fragmented across `cn_payer`, `cn_payment_header`, `cn_fines_journal`, `cn_adjustments_journal`, `core_ledger_head`, `core_reference_value` groups.
- **Class**: **D → C** (duplicate — consolidate onto `core_reference_value` group `contribution_type` and `core_ledger_head` mapping).
- **Reuse**: `useContributionType()` façade over `core_reference_value` + ledger head binding.
- **Consumers**: Cashier, C3, Ledger, Payments, Reporting.
- **Dependencies**: Financial (ledger head), Scheme.

## 7. Contribution Period
- **Meaning**: The reporting/coverage period a contribution applies to (weekly, monthly, quarterly per country config).
- **Owner**: Contributions shared domain.
- **Existing**: `cn_period_summary`, `cn_period_summary_det`, `cn_period_summary_est`, `cn_c3_reported`, `ip_wages` (Legacy).
- **Class**: **L → C via adapter** (`v_contribution_period`).
- **Reuse**: `useContributionPeriod()` façade — read-only.
- **Consumers**: Benefits eligibility snapshots, Compliance, Arrears, Reporting.
- **Dependencies**: Calendar, Scheme, Employment.

## 8. Benefit
- **Meaning**: An entitlement of a Member to a monetary or in-kind payment under a Scheme rule.
- **Owner**: Benefits shared domain.
- **Existing**: `bn_entitlement`, `bn_award`, `bn_award_rate_history`, `bn_award_suspension_event`.
- **Class**: **C** (canonical exists in `bn_*`).
- **Reuse**: `useBenefit(entitlementId)` façade.
- **Consumers**: Payments, Cashier, Portals, Recovery.
- **Dependencies**: Member, Scheme Membership, Benefit Product, Claim, Award.

## 9. Benefit Product
- **Meaning**: A named, configurable benefit offering (e.g. Age Pension, Sickness, Maternity, Funeral, Medical Reimbursement) with rules, formulas and evidence requirements.
- **Owner**: Benefits shared domain.
- **Existing**: Expressed across `bn_coverage_type`, `bn_country_config_package`, `bn_calculation_rule`, `bn_formula_template`, `bn_eligibility_rule`, `bn_doc_requirement`.
- **Class**: **D → C** (duplicate configuration surfaces — consolidate on a single `bn_product` façade).
- **Reuse**: `useBenefitProduct(productCode)` façade backed by existing bn tables; no rewrite.
- **Consumers**: Claim intake, Eligibility, Formula, Award.
- **Dependencies**: Scheme, Legal reference, Benefit Category, Document profile.

## 10. Benefit Category
- **Meaning**: Grouping of benefit products (Long-Term, Short-Term, Employment Injury, Medical, Survivors).
- **Owner**: Benefits shared domain.
- **Existing**: Implicit in `bn_coverage_type` and reference groups.
- **Class**: **D → C** (consolidate on `core_reference_value` group `benefit_category`).
- **Reuse**: `useBenefitCategory()` façade.
- **Consumers**: Benefit Product, Reporting, Portals.
- **Dependencies**: Scheme.

## 11. Claim
- **Meaning**: A Member (or nominee) request for a Benefit under a Benefit Product.
- **Owner**: Benefits shared domain.
- **Existing**: `bn_claim`, `bn_claim_application`, `bn_claim_detail`, `bn_claim_decision`, `bn_claim_event`, `bn_claim_document`, `bn_claim_participant`, `bn_claim_status_def`, `bn_claim_transition_rule`.
- **Class**: **C**.
- **Reuse**: `useClaim(claimId)` façade.
- **Consumers**: Award, Appeals, Communication, Case Management.
- **Dependencies**: Member, Benefit Product, Employment, Contribution Period, Documents.

## 12. Award
- **Meaning**: The approved outcome of a Claim; grants an Entitlement and a payment plan.
- **Owner**: Benefits shared domain.
- **Existing**: `bn_award`, `bn_award_beneficiary`, `bn_award_rate_history`, `bn_award_status_event`, `bn_award_suspension_event`.
- **Class**: **C**.
- **Reuse**: `useAward(awardId)`.
- **Consumers**: Payments, Recovery (overpayments), Appeals, Portals.
- **Dependencies**: Claim, Benefit Product, Payment Profile.

## 13. Payment
- **Meaning**: A financial movement — contribution receipt, benefit disbursement, refund, adjustment.
- **Owner**: Payments / Financial shared domain (split by direction).
- **Existing**:
  - Inbound (contributions): `cn_payment`, `cn_payment_header`, `cn_receipt`, `cn_batch*`, `cn_payments_journal` (Legacy).
  - Outbound (benefits): `bn_payment_instruction`, `bn_payment_batch`, `bn_cheque_register`, `bn_eft_file`.
  - Ledger: `core_ledger_head`, `core_payment_allocation`, `core_payment_arrangement`, `core_employer_ledger_*`.
- **Class**: **D / L → C** (two directions consolidate on `v_payment_inbound` and `v_payment_outbound`, with `core_ledger_*` as the shared ledger).
- **Reuse**: `usePayment()` façade with direction discriminator.
- **Consumers**: Cashier, Reconciliation, Reporting, Recovery, Portals.
- **Dependencies**: Member, Employer, Award, Ledger head, Bank.

## 14. Appeal
- **Meaning**: A formal challenge against a Claim decision, Award, Contribution assessment or Compliance action.
- **Owner**: Case Management / Legal shared domain.
- **Existing**: `lg_appeal`, `lg_appeal_liability`. Some `bn_claim_correction_request` semantics overlap.
- **Class**: **D → C** (consolidate on `lg_appeal` as canonical; `bn_claim_correction_request` remains an internal amendment channel, not an appeal).
- **Reuse**: `useAppeal(appealId)`.
- **Consumers**: Benefits, Compliance, Portals.
- **Dependencies**: Case, Member, Award/Assessment, Legal reference.

## 15. Recovery
- **Meaning**: Enforcement to recover monies owed — arrears, overpayments, fines, penalties.
- **Owner**: Compliance / Legal Recovery shared domain.
- **Existing**: `bn_overpayment`, `cn_arrears`, `cn_arrears_liab`, `cn_write_off`, `lg_arrangement_liability`, `core_payment_arrangement`, `core_employer_ledger_*`.
- **Class**: **D → C** (multiple sources — consolidate via a Recovery façade over `v_lg_case_financials` and existing ledger heads).
- **Reuse**: `useRecovery(subjectRef)` façade.
- **Consumers**: Legal, Cashier, Reporting, Portals.
- **Dependencies**: Case, Member/Employer, Payment, Ledger.

## 16. Investigation
- **Meaning**: A fact-finding activity, typically by an inspector, to substantiate compliance breaches or fraud.
- **Owner**: Compliance shared domain.
- **Existing**: `pages/inspector`, `er_visit`, `er_suit`, `lg_case_activity`, `lg_case_action` used ad-hoc. No dedicated investigation entity.
- **Class**: **M** (no canonical entity; behaviour dispersed).
- **Reuse**: Deferred — future `ss_investigation` façade to be proposed later; interim reads via `v_investigation` composed from `er_visit` + `lg_case_activity`.
- **Consumers**: Case Management, Legal, Reporting.
- **Dependencies**: Case, Employer/Member, Document, Communication.

## 17. Case
- **Meaning**: A managed unit of work grouping activities, parties, deadlines and decisions.
- **Owner**: Case Management / Legal shared domain.
- **Existing**: `lg_case`, `lg_case_intake`, `lg_case_party`, `lg_case_assignment`, `lg_case_deadline`, `lg_case_action`, `lg_case_activity`, `lg_case_referral`, `lg_case_calendar_event`.
- **Class**: **C**.
- **Reuse**: `useCase(caseId)` façade already the pattern in `pages/legal*`.
- **Consumers**: Compliance, Appeals, Recovery, Investigation, Portals.
- **Dependencies**: Member/Employer, Legal reference, Team, Workflow/SLA, Calendar.

## 18. Dependant
- **Meaning**: A person financially or legally dependent on a Member; relevant for Survivors, Medical, Funeral.
- **Owner**: Participant shared domain.
- **Existing**: `ip_depend`, `ip_depend_staging` (Legacy); modern intake in `pages/insuredPersons` and `pages/ip-registration`.
- **Class**: **L → C via adapter** (`v_member_dependant`).
- **Reuse**: `useMemberDependants(memberId)`.
- **Consumers**: Claim (Survivors/Medical), Award beneficiaries, Portals.
- **Dependencies**: Member, Identity, Geography, Document.

## 19. Nominee
- **Meaning**: A person designated to receive a specific benefit or payment on behalf of, or after, the Member.
- **Owner**: Benefits shared domain (with Participant identity resolution).
- **Existing**: `bn_award_beneficiary`, `bn_claim_participant` (nominee roles). No standalone nominee master.
- **Class**: **D → C** (consolidate nominee semantics under `bn_award_beneficiary` façade + Participant lookup).
- **Reuse**: `useNominee(awardId | claimId)`.
- **Consumers**: Payments, Portals, Appeals.
- **Dependencies**: Member, Dependant (often overlapping), Payment Profile.

---

## Cross-Cutting Supporting Domains Referenced

- **Identity** — Member, Employer, Nominee, Dependant identity resolution.
- **Geography** — Addresses, jurisdictions, offices.
- **Legal** — Governing acts, sections, legal references for schemes/products/cases.
- **Financial** — Ledger heads, allocations, arrangements, banks.
- **Communication** — Letters, notifications, portals.
- **Document** — Evidence, proofs, generated documents.
- **Calendar / Working Week / Holidays** — Deadlines, SLAs, contribution period boundaries.
