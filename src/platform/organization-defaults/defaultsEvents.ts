/**
 * Epic OM-9.5 — Canonical audit event codes for Organisation Default seeding,
 * update, preview, test-resolve and health activity.
 * Import from here — do NOT hardcode literals in pages/services.
 */
export const ORG_DEFAULT_EVENTS = {
  seeded:                'ORG_DEFAULTS_SEEDED',
  updated:               'ORG_DEFAULTS_UPDATED',
  assignmentCreated:     'ORG_DEFAULT_ASSIGNMENT_CREATED',
  assignmentUpdated:     'ORG_DEFAULT_ASSIGNMENT_UPDATED',
  assignmentValidated:   'ORG_DEFAULT_ASSIGNMENT_VALIDATED',
  previewRun:            'ORG_DEFAULT_PREVIEW_RUN',
  previewFailed:         'ORG_DEFAULT_PREVIEW_FAILED',
  testResolveRun:        'ORG_DEFAULT_TEST_RESOLVE_RUN',
  healthCheckRun:        'ORG_DEFAULT_HEALTH_CHECK_RUN',
  healthIssueDetected:   'ORG_DEFAULT_HEALTH_ISSUE_DETECTED',
  uiStabilized:          'ORG_DEFAULT_UI_STABILIZED',
} as const;

export type OrgDefaultEventCode = (typeof ORG_DEFAULT_EVENTS)[keyof typeof ORG_DEFAULT_EVENTS];
