/**
 * Catalog of all known mobile/compliance endpoints.
 * Used by Endpoint Explorer + Compliance Runner.
 */
export interface CatalogEndpoint {
  id: string;
  group: 'auth' | 'officer' | 'cases' | 'violations' | 'inspections' | 'notices' | 'legal' | 'employer' | 'evidence' | 'other';
  name: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  requiresAuth: boolean;
  requiresApiKey: boolean;
  destructive?: boolean;
  description: string;
  sampleBody?: any;
  pathParams?: string[];
  expectedStatus?: number;
}

export const ENDPOINT_CATALOG: CatalogEndpoint[] = [
  // ─── Auth ──────────────────────────────────────────────────
  { id: 'auth.login', group: 'auth', name: 'Login (email + password)', method: 'POST', path: '/compliance-mobile-auth/login', requiresAuth: false, requiresApiKey: true, description: 'Officer email/password login. Returns JWT, refresh token, and registers the device.', sampleBody: { email: 'admin@secureserve.gov', password: 'Admin@123', device_id: 'console-test-device', device_name: 'API Test Console', platform: 'web', app_version: '1.0.0' }, expectedStatus: 200 },
  { id: 'auth.set-pin', group: 'auth', name: 'Set device PIN', method: 'POST', path: '/compliance-mobile-auth/set-pin', requiresAuth: true, requiresApiKey: true, description: 'Stores a salted hash of the PIN for the registered device.', sampleBody: { device_id: 'console-test-device', pin: '1234' }, expectedStatus: 200 },
  { id: 'auth.pin-unlock', group: 'auth', name: 'PIN unlock', method: 'POST', path: '/compliance-mobile-auth/pin-unlock', requiresAuth: false, requiresApiKey: true, description: 'Unlocks an already-registered device using the device PIN.', sampleBody: { device_id: 'console-test-device', pin: '1234' }, expectedStatus: 200 },
  { id: 'auth.refresh', group: 'auth', name: 'Refresh token', method: 'POST', path: '/compliance-mobile-auth/refresh', requiresAuth: false, requiresApiKey: true, description: 'Rotates the refresh token and issues a new access token.', sampleBody: { refresh_token: '<paste refresh token>' }, expectedStatus: 200 },
  { id: 'auth.logout', group: 'auth', name: 'Logout', method: 'POST', path: '/compliance-mobile-auth/logout', requiresAuth: true, requiresApiKey: true, destructive: true, description: 'Revokes the refresh token. Optionally revokes the device.', sampleBody: { device_id: 'console-test-device' }, expectedStatus: 200 },

  // ─── Officer ───────────────────────────────────────────────
  { id: 'me', group: 'officer', name: 'My profile', method: 'GET', path: '/compliance-mobile-api/api/v1/compliance/me', requiresAuth: true, requiresApiKey: true, description: 'Officer profile of the bearer-token holder.', expectedStatus: 200 },
  { id: 'my.inspections', group: 'officer', name: 'My inspections', method: 'GET', path: '/compliance-mobile-api/api/v1/compliance/my/inspections', requiresAuth: true, requiresApiKey: true, description: 'List inspections assigned to me.', expectedStatus: 200 },
  { id: 'my.cases', group: 'officer', name: 'My cases', method: 'GET', path: '/compliance-mobile-api/api/v1/compliance/my/cases', requiresAuth: true, requiresApiKey: true, description: 'List compliance cases assigned to me.', expectedStatus: 200 },

  // ─── Employer 360 ─────────────────────────────────────────
  { id: 'employer.360', group: 'employer', name: 'Employer 360 view', method: 'GET', path: '/compliance-mobile-api/api/v1/compliance/employers/{regno}/360', requiresAuth: true, requiresApiKey: true, pathParams: ['regno'], description: '360 view of an employer by registration number.', expectedStatus: 200 },

  // ─── Inspections ──────────────────────────────────────────
  { id: 'inspections.list', group: 'inspections', name: 'List inspections', method: 'GET', path: '/compliance-mobile-api/api/v1/compliance/inspections', requiresAuth: true, requiresApiKey: true, description: 'Paginated list of inspections.', expectedStatus: 200 },
  { id: 'inspections.get', group: 'inspections', name: 'Get inspection', method: 'GET', path: '/compliance-mobile-api/api/v1/compliance/inspections/{id}', requiresAuth: true, requiresApiKey: true, pathParams: ['id'], description: 'Single inspection by ID.', expectedStatus: 200 },
  { id: 'inspections.checkin', group: 'inspections', name: 'Check-in', method: 'POST', path: '/compliance-mobile-api/api/v1/compliance/inspections/{id}/check-in', requiresAuth: true, requiresApiKey: true, destructive: true, pathParams: ['id'], sampleBody: { lat: 17.30, lng: -62.72 }, description: 'GPS check-in for a scheduled inspection.', expectedStatus: 200 },
  { id: 'inspections.checkout', group: 'inspections', name: 'Check-out + findings', method: 'POST', path: '/compliance-mobile-api/api/v1/compliance/inspections/{id}/check-out', requiresAuth: true, requiresApiKey: true, destructive: true, pathParams: ['id'], sampleBody: { lat: 17.30, lng: -62.72, findings: 'No violations observed.', completion_status: 'COMPLETED' }, description: 'Check-out and submit findings.', expectedStatus: 200 },
  { id: 'inspections.evidence', group: 'evidence', name: 'Append evidence', method: 'POST', path: '/compliance-mobile-api/api/v1/compliance/inspections/{id}/evidence', requiresAuth: true, requiresApiKey: true, destructive: true, pathParams: ['id'], sampleBody: { kind: 'photo', url: 'https://example.com/storage/photo.jpg', caption: 'Wage book p.12', lat: 17.30, lng: -62.72 }, description: 'Attach a photo or document URL to an inspection.', expectedStatus: 200 },

  // ─── Cases ────────────────────────────────────────────────
  { id: 'cases.list', group: 'cases', name: 'List cases', method: 'GET', path: '/compliance-mobile-api/api/v1/compliance/cases', requiresAuth: true, requiresApiKey: true, description: 'Paginated list of compliance cases.', expectedStatus: 200 },
  { id: 'cases.get', group: 'cases', name: 'Get case', method: 'GET', path: '/compliance-mobile-api/api/v1/compliance/cases/{id}', requiresAuth: true, requiresApiKey: true, pathParams: ['id'], description: 'Single case by ID.', expectedStatus: 200 },
  { id: 'cases.update', group: 'cases', name: 'Update case', method: 'PATCH', path: '/compliance-mobile-api/api/v1/compliance/cases/{id}', requiresAuth: true, requiresApiKey: true, destructive: true, pathParams: ['id'], sampleBody: { status: 'RESOLVED', closure_reason: 'Paid in full' }, description: 'Patch case status / fields.', expectedStatus: 200 },

  // ─── Violations ───────────────────────────────────────────
  { id: 'violations.list', group: 'violations', name: 'List violations', method: 'GET', path: '/compliance-mobile-api/api/v1/compliance/violations', requiresAuth: true, requiresApiKey: true, description: 'Paginated list of violations.', expectedStatus: 200 },
  { id: 'violation-types.list', group: 'violations', name: 'List violation types', method: 'GET', path: '/compliance-mobile-api/api/v1/compliance/violation-types', requiresAuth: true, requiresApiKey: true, description: 'Reference table of violation types.', expectedStatus: 200 },

  // ─── Notices ──────────────────────────────────────────────
  { id: 'notices.list', group: 'notices', name: 'List notices', method: 'GET', path: '/compliance-mobile-api/api/v1/compliance/notices', requiresAuth: true, requiresApiKey: true, description: 'Paginated list of notices.', expectedStatus: 200 },
  { id: 'notice-templates.list', group: 'notices', name: 'List notice templates', method: 'GET', path: '/compliance-mobile-api/api/v1/compliance/notice-templates', requiresAuth: true, requiresApiKey: true, description: 'Reference table of notice templates.', expectedStatus: 200 },

  // ─── Legal ────────────────────────────────────────────────
  { id: 'legal-recommendations.list', group: 'legal', name: 'List legal recommendations', method: 'GET', path: '/compliance-mobile-api/api/v1/compliance/legal-recommendations', requiresAuth: true, requiresApiKey: true, description: 'Recommendations queue.', expectedStatus: 200 },
  { id: 'legal-referrals.list', group: 'legal', name: 'List legal referrals', method: 'GET', path: '/compliance-mobile-api/api/v1/compliance/legal-referrals', requiresAuth: true, requiresApiKey: true, description: 'Cases referred to legal.', expectedStatus: 200 },
];

export const GROUP_LABELS: Record<CatalogEndpoint['group'], string> = {
  auth: 'Authentication',
  officer: 'Officer & My',
  employer: 'Employer 360',
  inspections: 'Inspections',
  evidence: 'Evidence Upload',
  cases: 'Cases',
  violations: 'Violations',
  notices: 'Notices',
  legal: 'Legal',
  other: 'Other',
};
