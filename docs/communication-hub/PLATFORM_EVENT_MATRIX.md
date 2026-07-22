# Communication Hub Platform Event Matrix (Phase 1)

Companion to `PLATFORM_TEMPLATE_INVENTORY.md`. One row per registered event in
`communication_hub_module_event_registry`. Read-only enumeration.

**Totals:** 42 registered events; **0 Go-Live eligible today** under the Phase 4 activation-gate definition.

**Channel coverage:** all 42 events are `email`. No SMS / letter / notice / document / push events are registered.

**Legend**
- `Ver` = total `core_template_version` rows for the mapping's template code.
- `Act` = rows with lowercase `status='active'`. **All zero today** because of defect D2 (status stored as `ACTIVE`/`PUBLISHED`/`published`, not `active`).
- `Map` = rows in `communication_hub_event_template_map`.
- `VarCtr` = rows in `communication_hub_template_variable_contract` joined by template code — **all zero** because the contract rows carry NULL template linkage (defect D3).
- `Sch` = `communication_hub_event_payload_schema` rows.
- `Scen` = `communication_hub_event_test_scenario` rows.
- `RevP` / `SndP` = review / send policy rows.
- `Sndr` = mapping carries `sender_profile_id`.

| Module | Event | Ch | Template | Ver | Act | Map | VarCtr | Sch | Scen | RevP | SndP | Sndr | GoLive | Blockers |
|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|:-:|:-:|---|
| APPEALS | APPEAL_RECEIVED_NOTICE | email | `APPEALS_APPEAL_RECEIVED_EMAIL` | 1 | 0 | 1 | 0 | 1 | 1 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_review_policy, no_send_policy |
| APPEALS | HEARING_SCHEDULE_NOTICE | email | `APPEALS_HEARING_SCHEDULE_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| APPEALS | INTERNAL_REVIEW_ASSIGNMENT_NOTICE | email | `APPEALS_INTERNAL_REVIEW_ASSIGNMENT_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| APPEALS | REVIEW_DECISION_NOTICE | email | `APPEALS_REVIEW_DECISION_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| BENEFITS | CLAIM_APPROVAL_NOTICE | email | `BENEFITS_CLAIM_APPROVAL_EMAIL` | 1 | 0 | 1 | 0 | 0 | 1 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_review_policy, no_send_policy |
| BENEFITS | CLAIM_RECEIVED_NOTICE | email | `BENEFITS_CLAIM_RECEIVED_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| BENEFITS | CLAIM_REJECTION_NOTICE | email | `BENEFITS_CLAIM_REJECTION_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| BENEFITS | DOCUMENT_REQUEST_NOTICE | email | `BENEFITS_DOCUMENT_REQUEST_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| BENEFITS | INTERNAL_CLAIM_REVIEW_NOTICE | email | `BENEFITS_INTERNAL_CLAIM_REVIEW_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| BENEFITS | PAYMENT_PROCESSED_NOTICE | email | `BENEFITS_PAYMENT_PROCESSED_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| COMM_HUB | ADMIN_TEST_NOTICE | email | `` | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 1 | y | NO | template_missing, no_version, unbound_variable_contract(D3), no_payload_schema, no_test_scenario |
| COMM_HUB | LIVE_PROPOSAL_CREATED_NOTICE | email | `COMM_HUB_LIVE_PROPOSAL_CREATED_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| COMM_HUB | OPERATOR_REHEARSAL_RESULT_NOTICE | email | `COMM_HUB_OPERATOR_REHEARSAL_RESULT_EMAIL` | 1 | 0 | 1 | 0 | 1 | 1 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_review_policy, no_send_policy |
| COMPLIANCE | CASE_CLOSURE_NOTICE | email | `COMPLIANCE_CASE_CLOSURE_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| COMPLIANCE | EMPLOYER_CASE_NOTICE | email | `COMPLIANCE_EMPLOYER_CASE_NOTICE_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| COMPLIANCE | INSPECTION_SCHEDULE_NOTICE | email | `COMPLIANCE_INSPECTION_SCHEDULE_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| COMPLIANCE | INTERNAL_CASE_STATUS_NOTICE | email | `COMPLIANCE_INTERNAL_CASE_STATUS_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| COMPLIANCE | NON_COMPLIANCE_NOTICE | email | `COMPLIANCE_NON_COMPLIANCE_NOTICE_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| COMPLIANCE | PENALTY_NOTICE | email | `COMPLIANCE_PENALTY_NOTICE_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| EMPLOYER_REGISTRATION | APPLICATION_RECEIVED_NOTICE | email | `EMPLOYER_REGISTRATION_APPLICATION_RECEIVED_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| EMPLOYER_REGISTRATION | APPROVAL_NOTICE | email | `EMPLOYER_REGISTRATION_APPROVAL_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| EMPLOYER_REGISTRATION | DOCUMENT_REQUEST_NOTICE | email | `EMPLOYER_REGISTRATION_DOCUMENT_REQUEST_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| EMPLOYER_REGISTRATION | INTERNAL_ACKNOWLEDGEMENT_NOTICE | email | `EMPLOYER_REGISTRATION_INTERNAL_ACK_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| EMPLOYER_REGISTRATION | INTERNAL_APPROVAL_REVIEW_NOTICE | email | `EMPLOYER_REGISTRATION_INTERNAL_APPROVAL_REVIEW_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| EMPLOYER_REGISTRATION | REJECTION_NOTICE | email | `EMPLOYER_REGISTRATION_REJECTION_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| INSURED_PERSON | BENEFIT_APPLICATION_RECEIVED_NOTICE | email | `INSURED_PERSON_BENEFIT_APPLICATION_RECEIVED_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| INSURED_PERSON | BENEFIT_STATUS_NOTICE | email | `INSURED_PERSON_BENEFIT_STATUS_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| INSURED_PERSON | CONTRIBUTION_HISTORY_NOTICE | email | `INSURED_PERSON_CONTRIBUTION_HISTORY_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| INSURED_PERSON | DOCUMENT_REQUEST_NOTICE | email | `INSURED_PERSON_DOCUMENT_REQUEST_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| INSURED_PERSON | INTERNAL_PROFILE_REVIEW_NOTICE | email | `INSURED_PERSON_INTERNAL_PROFILE_REVIEW_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| INSURED_PERSON | PROFILE_UPDATE_NOTICE | email | `INSURED_PERSON_PROFILE_UPDATE_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| INSURED_PERSON | REGISTRATION_ACKNOWLEDGEMENT_NOTICE | email | `INSURED_PERSON_REGISTRATION_ACK_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| LEGAL | APPEAL_NOTICE | email | `LEGAL_APPEAL_NOTICE_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_send_policy |
| LEGAL | DOCUMENT_SUBMISSION_NOTICE | email | `LEGAL_DOCUMENT_SUBMISSION_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| LEGAL | HEARING_SCHEDULE_NOTICE | email | `LEGAL_HEARING_SCHEDULE_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_send_policy |
| LEGAL | INTERNAL | email | `LEGAL_3_EMAIL` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | n | NO | template_missing, no_version, no_mapping, unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy, no_sender_on_mapping |
| LEGAL | INTERNAL_CASE_ASSIGNMENT_NOTICE | email | `LEGAL_INTERNAL_CASE_ASSIGNMENT_EMAIL` | 2 | 0 | 1 | 0 | 0 | 0 | 1 | 1 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario |
| LEGAL | LEGAL_DECISION_NOTICE | email | `LEGAL_DECISION_NOTICE_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_send_policy |
| LEGAL | LEGAL_REVIEW_REQUIRED_NOTICE | email | `LEGAL_REVIEW_REQUIRED_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| WORKFLOW | APPROVER_ASSIGNMENT_NOTICE | email | `WORKFLOW_APPROVER_ASSIGNMENT_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| WORKFLOW | REQUESTER_STATUS_NOTICE | email | `WORKFLOW_REQUESTER_STATUS_EMAIL` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | y | NO | no_lowercase_active_version(D2), unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy |
| (41 rows) | None | None | `` | None | None | None | None | None | None | None | None | n | NO | template_missing, no_version, no_mapping, unbound_variable_contract(D3), no_payload_schema, no_test_scenario, no_review_policy, no_send_policy, no_sender_on_mapping |

## Roll-up

- **0 / 42** events are certified for Go Live under Phase 4 rules.
- The blocker distribution is identical across modules — this is a platform defect, not an event defect. Fixing D1–D10 in the inventory unblocks all events at once.
- `LEGAL / INTERNAL` (template `LEGAL_3_EMAIL`) is the only event whose template row itself is missing — treat as data-quality cleanup, not architecture.
- The matrix, once Phases 2–4 are landed, becomes the input to the Phase 5 platform-wide certification run.
