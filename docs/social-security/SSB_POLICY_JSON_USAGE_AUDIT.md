# SSB Policy JSON Usage Audit

Status: DELIVERED — refactor complete
Focus: Social Security Board — St. Kitts & Nevis

Every JSON / JSONB column present on SSB tables was inspected. Each is
classified below. See
`docs/social-security/SSB_POLICY_RELATIONAL_MODEL_ACCEPTANCE.md` for the
relational replacement and rollback.

## Live audit result (before refactor)

| Table                                | Column               | Classification    | Notes |
| ------------------------------------ | -------------------- | ----------------- | ----- |
| `ssb_address_policy`                 | `mandatory_fields`   | **MUST REPLACE**  | JSON string array of address components. Replaced by `ssb_address_policy_field(field_kind='mandatory')`. |
| `ssb_address_policy`                 | `optional_fields`    | **MUST REPLACE**  | JSON string array of address components. Replaced by `ssb_address_policy_field(field_kind='optional')`. |
| `ssb_address_policy`                 | `admin_level_codes`  | **MUST REPLACE**  | JSON string array of `ssp_admin_level.code` values. Replaced by `ssb_address_policy_admin_level`. |
| `ssb_contribution_calendar_policy`   | `weekend_days`       | **MUST REPLACE**  | JSON int array (0..6). Replaced by `ssb_contribution_calendar_weekend_day`. |
| `ssb_configuration_snapshot`         | `snapshot_json`      | **SNAPSHOT ONLY** | Immutable configuration snapshot payload — allowed. |
| `ssb_policy_audit`                   | `snapshot`           | **SNAPSHOT ONLY** | Immutable audit payload — allowed. |
| `ssb_setup_readiness`                | `detail`             | **ALLOWED**       | Cached readiness detail computed from relational sources; not authoritative policy configuration. |

## Tables/services checked

- Policy tables inspected: `ssb_implementation_profile`, `ssb_address_policy`,
  `ssb_identity_policy`, `ssb_numbering_policy`,
  `ssb_contribution_calendar_policy`, `ssb_financial_policy`,
  `ssb_legal_policy`, `ssb_document_policy`, `ssb_communication_policy`,
  `ssb_workflow_policy`, `ssb_setup_readiness`,
  `ssb_configuration_asset|dependency|package|package_item|snapshot|validation_run|validation_result`.
- Services inspected: `ssbPolicyLifecycleService`,
  `ssbBusinessProcessConfigService`,
  `ssbConfigurationGovernanceService`, `ssbPolicyHealthService`,
  `ssbContributionCalendarService`.
- `/admin/ssb-setup` section forms: all nine.

### Already relational (no JSON found)

`ssb_identity_policy`, `ssb_numbering_policy`, `ssb_financial_policy`,
`ssb_legal_policy`, `ssb_document_policy`, `ssb_communication_policy`,
`ssb_workflow_policy`, `ssb_implementation_profile` — all rules are already
stored in scalar / typed columns; no JSON to remove.

## Decision

Only the four `MUST REPLACE` fields required a relational refactor. All
other JSON usage falls into `SNAPSHOT ONLY` (audit / immutable snapshot) or
cached-derived `ALLOWED` and is out of scope per the task's Allowed JSON
list.

No BN/BEMA/IA/legacy table was touched.
