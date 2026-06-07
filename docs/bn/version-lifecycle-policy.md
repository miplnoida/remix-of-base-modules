# BN Product Version Lifecycle — Knowledge Repository Entry

Last modified: 2026-06-07  
Responsible user identity: Lovable agent

## Feature / Module
BN Product Catalog — product version copy, submit, approval/publish, and retire lifecycle.

## Behavior
- DRAFT is the only editable status.
- Copying configuration into a DRAFT replaces existing target-version eligibility, calculation, timeline, document, and unified approval/override policy rows to avoid duplicate/constraint conflicts.
- SUBMIT moves DRAFT to PENDING_APPROVAL.
- APPROVE publishes the selected PENDING_APPROVAL version as ACTIVE after publish-gate validation passes.
- Publish validation must evaluate the selected candidate version, not the currently active version.
- Workflow validation for BN product versions must check `bn_workflow_template`, not central `workflow_definitions`, when `bn_product_version.workflow_template_id` is populated.
- Publishing a replacement ACTIVE version automatically closes the previous open ACTIVE version by setting its `effective_to` to the day before the new version's `effective_from`.
- Manual RETIRE is blocked unless another ACTIVE replacement exists or the version already has an `effective_to` date.

## Input / Output Expectations
- Input: source version id, target DRAFT version id, effective-from date, comments, current user's UserCode.
- Output: copied rule counts, version status transition, audit row with `performed_by` populated from UserCode, or a clear lifecycle validation error.

## Dependencies
- `bn_product_version`
- `bn_eligibility_rule`
- `bn_calculation_rule`
- `bn_timeline_rule`
- `bn_doc_requirement`
- `bn_approval_policy`
- `bn_workflow_template`
- BN publish gate and cross-tab conflict detection services.

## Test Cases
- TC-BN-VERSION-001: Copy configuration from an ACTIVE version into a DRAFT with existing target rows; expect target rows replaced and no unique-constraint error.
- TC-BN-VERSION-002: Approve a PENDING_APPROVAL version whose workflow exists in `bn_workflow_template`; expect publish gate to pass workflow existence validation.
- TC-BN-VERSION-003: Approve a replacement version with a later effective date; expect new version ACTIVE and previous open ACTIVE version closed to previous day.
- TC-BN-VERSION-004: Attempt to manually retire the only open ACTIVE version without a replacement; expect blocked action with a user-readable reason.
- TC-BN-VERSION-005: Lifecycle audit row stores the current UserCode, not a hardcoded system value, when an action succeeds.

## Version History
- 2026-06-07: Standardized publish validation to use selected candidate version and BN workflow templates; clarified retire process; linked copy flow to unified `bn_approval_policy` runtime source.