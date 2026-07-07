/**
 * Epic OM-7 — Configuration Center v2 audit event codes.
 * Registered in the OM-7 migration (see supabase/migrations).
 */
export const CONFIG_CENTER_EVENTS = {
  guidedCreated:      'CONFIG_GUIDED_ASSIGNMENT_CREATED',
  guidedUpdated:      'CONFIG_GUIDED_ASSIGNMENT_UPDATED',
  guidedDeactivated:  'CONFIG_GUIDED_ASSIGNMENT_DEACTIVATED',
  guidedReactivated:  'CONFIG_GUIDED_ASSIGNMENT_REACTIVATED',
  guidedValidated:    'CONFIG_GUIDED_ASSIGNMENT_VALIDATED',
  conflictDetected:   'CONFIG_ASSIGNMENT_CONFLICT_DETECTED',
  advancedViewed:     'CONFIG_ASSIGNMENT_ADVANCED_VIEWED',
  advancedUpdated:    'CONFIG_ASSIGNMENT_ADVANCED_UPDATED',
  testResolveRun:     'CONFIG_TEST_RESOLVE_RUN',
  testResolveFailed:  'CONFIG_TEST_RESOLVE_FAILED',
  centerV2Verified:   'CONFIG_CENTER_V2_VERIFIED',
} as const;

export type ConfigCenterEventKey = keyof typeof CONFIG_CENTER_EVENTS;
