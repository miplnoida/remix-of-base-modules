# Legal Platform — Business Process Map

**Version:** 1.0

---

## 1. End-to-End Flow

```mermaid
flowchart TD
  A[Compliance Case] --> B{Referral Eligible?}
  B -- No --> B1[Return to Compliance]
  B -- Yes --> C[Legal Referral Created]
  C --> D[Legal Intake Queue]
  D --> E{Qualification Checklist Pass?}
  E -- No --> E1[Info Request / Return]
  E1 --> D
  E -- Yes --> F[Case Created lg_case]
  F --> G[Assignment & Team Routing]
  G --> H[Liabilities Loaded from Compliance]
  H --> I{Pre-Litigation Recovery?}
  I -- Settled --> Z1[Settlement / Consent Order]
  I -- No --> J[Court Filing]
  J --> K[Hearings]
  K --> L{Judgment?}
  L -- No --> K
  L -- Yes --> M[Order Published]
  M --> N{Appeal Filed?}
  N -- Yes --> N1[Appeal Track] --> M
  N -- No --> O[Enforcement Action]
  O --> P[Post-Judgment Recovery Assignment]
  P --> Q{Recovered in Full?}
  Q -- Yes --> Z2[Case Closed - Recovered]
  Q -- Partial --> R[Payment Arrangement]
  R --> P
  Q -- No/Uncollectible --> Z3[Write-off / Close]
  Z1 --> Z2
```

## 2. Decision Points
| # | Decision | Owner | Data |
|---|----------|-------|------|
| B | Referral eligibility | Compliance Lead | `ce_legal_referrals.status` |
| E | Intake qualification | Legal Officer | `lg_intake_checklist_response` |
| I | Pre-litigation resolution | Legal Officer | `lg_settlement`, `lg_consent_order` |
| L | Judgment obtained | Court + Legal Officer | `lg_order` |
| N | Appeal filed | External Party | `lg_appeal` |
| Q | Recovery outcome | Recovery Officer | `v_lg_case_financials.total_outstanding` |

## 3. Stage Transitions
Managed by `lg_workflow_policy` + `lg_stage_transition_rule`. Actions gated by `lg_stage_action_rule`; required documents by `lg_stage_document_rule`.
