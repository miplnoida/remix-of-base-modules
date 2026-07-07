/**
 * Epic OM-6 — Canonical audit event codes for organisation-settings
 * inheritance and override operations. Registered rows live in
 * core_audit_event_type (see the OM-6 migration).
 */
export const INHERITANCE_EVENTS = {
  overrideEnabled:       'DEPARTMENT_SETTING_OVERRIDE_ENABLED',
  overrideDisabled:      'DEPARTMENT_SETTING_OVERRIDE_DISABLED',
  resetToOrgDefault:     'DEPARTMENT_SETTING_RESET_TO_ORG_DEFAULT',
  settingUpdated:        'DEPARTMENT_SETTING_UPDATED',
  deptEffectivePreview:  'DEPARTMENT_EFFECTIVE_SETTINGS_PREVIEWED',
  orgEffectivePreview:   'ORG_EFFECTIVE_SETTINGS_PREVIEWED',
  effectiveResolved:     'EFFECTIVE_SETTINGS_RESOLVED',
  healthCheckRun:        'INHERITANCE_HEALTH_CHECK_RUN',
  mismatchDetected:      'INHERITANCE_MISMATCH_DETECTED',
  modelVerified:         'INHERITANCE_MODEL_VERIFIED',
} as const;

export type InheritanceEventKey = keyof typeof INHERITANCE_EVENTS;
