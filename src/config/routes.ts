export const routes = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_ROLES: '/admin/roles',
  ADMIN_SECURITY: '/admin/security',
  ADMIN_PERMISSIONS: '/admin/permissions',
  EXAMPLE_CRUD: '/example-crud',
  ACCESS_DENIED: '/access-denied',
  UNAUTHORIZED: '/unauthorized',
  MAINTENANCE: '/maintenance',
  NOT_FOUND: '/404',
  FORBIDDEN: '/403',
  SERVER_ERROR: '/500',

  // Employer routes
  EMPLOYER_REGISTER: '/employer/register',
  EMPLOYER_APPROVAL: '/employer/approval',
  EMPLOYER_DIRECTORY: '/employer/directory',
  EMPLOYER_CONTRIBUTION_ENTRY: '/employer/contribution-entry',
  EMPLOYER_CONTRIBUTIONS: '/employer/contributions',

  // Insured Person routes
  PERSON_MANAGEMENT: '/person/management',
  PERSON_REGISTRATION: '/person/register',
  PERSON_LISTING: '/person/listing',
  PERSON_VIEW: '/person/view/:ssn',
  PERSON_EDIT: '/person/edit/:ssn',
  PERSON_VIEW_SPECIFIC: (ssn: string) => `/person/view/${ssn}`,
  PERSON_EDIT_SPECIFIC: (ssn: string) => `/person/edit/${ssn}`,
  PERSON_APPROVAL: '/person/approval',
  PERSON_DIRECTORY: '/person/directory',
  PENDING_REVIEWS: '/person/pending-reviews',
  WAGES_HISTORY: '/person/wages-history',
  CLAIM_HISTORY: '/person/claim-history',
  BENEFIT_ELIGIBILITY: '/person/benefit-eligibility',
  ID_CARD_GENERATION: '/person/id-card',

  // Employers Management routes
  EMPLOYERS_MANAGEMENT: '/employers-management',
  EMPLOYERS_MANAGEMENT_DASHBOARD: '/employers-management/dashboard',
  EMPLOYERS_MANAGEMENT_MANAGE: '/employers-management/manage',
  EMPLOYERS_MANAGEMENT_ADD: '/employers-management/add',
  EMPLOYERS_MANAGEMENT_REPORTS: '/employers-management/reports',

  // C3 Management routes
  C3_MANAGEMENT: '/c3-management',
  C3_MANAGEMENT_DASHBOARD: '/c3-management/dashboard',
  C3_MANAGEMENT_MANAGE: '/c3-management/manage',
  C3_MANAGEMENT_ADD: '/c3-management/add',
  

  
  C3_MANAGEMENT_INPUT_FORM: '/c3-management/input-form',
  C3_MANAGEMENT_REPORTS: '/c3-management/reports',
  C3_MANAGEMENT_VERIFICATION: '/c3-management/verification',
  C3_MANAGEMENT_ELECTRONIC_CONFIG: '/c3-management/configure-electronic-c3',
  C3_MANAGEMENT_VIEW: '/c3-management/view/:id',
  C3_MANAGEMENT_EDIT: '/c3-management/edit/:id',
  C3_MANAGEMENT_VIEW_SPECIFIC: (id: string) => `/c3-management/view/${id}`,
  C3_MANAGEMENT_EDIT_SPECIFIC: (id: string) => `/c3-management/edit/${id}`,

  // Test routes
  TEST_DATA_ENTRY: '/test/data-entry',

  // Legal Module routes
  LEGAL_MODULE: '/legal',
  LEGAL_CASE_INTAKE: '/legal/case-intake',
  LEGAL_CASE_TRACKING: '/legal/case-tracking',
  LEGAL_CASE_DETAIL: '/legal/case-detail/:id',
  LEGAL_CASE_EDIT: '/legal/case-edit/:id',
  LEGAL_NOTICES: '/legal/notices',
  LEGAL_APPEALS: '/legal/appeals',
  LEGAL_ENFORCEMENT: '/legal/enforcement',
  LEGAL_EVIDENCE: '/legal/evidence',
  LEGAL_REPORTS: '/legal/reports',
  LEGAL_CASE_DETAIL_SPECIFIC: (id: string) => `/legal/case-detail/${id}`,
  LEGAL_CASE_EDIT_SPECIFIC: (id: string) => `/legal/case-edit/${id}`,

  // BeMA Compliance routes
  BEMA_DASHBOARD: '/bema/dashboard',
  BEMA_REGISTRATIONS: '/bema/registrations',
  BEMA_C3_FILING: '/bema/c3-filing',
  BEMA_ARREARS: '/bema/arrears',
  BEMA_AUDITS: '/bema/audits',
  BEMA_INSPECTOR_MOBILE: '/bema/inspector-mobile',
  BEMA_CONTRIBUTORS: '/bema/contributors',
  BEMA_WAIVERS: '/bema/waivers',
  BEMA_REPORTS: '/bema/reports',
  BEMA_ZONES: '/bema/zones',
  BEMA_WORKPLAN: '/bema/workplan',
  BEMA_SCOUTING: '/bema/scouting',
  BEMA_ADMIN_RULES: '/bema/admin/rules',
  BEMA_ADMIN_TEMPLATES: '/bema/admin/templates',
  BEMA_ADMIN_ROLES: '/bema/admin/roles',
  BEMA_ADMIN_LOGS: '/bema/admin/logs',
  
  // Workflow Engine routes
  WORKFLOW_MANAGEMENT: '/admin/workflows',
  WORKFLOW_CREATE: '/admin/workflows/new',
  WORKFLOW_EDIT: (id: string) => `/admin/workflows/${id}`,
  WORKFLOW_TRIGGERS: '/admin/workflow-triggers',
  WORKFLOW_LOGS: '/admin/workflow-logs',
  WORKFLOW_ANALYTICS: '/admin/workflow-analytics',
  MY_WORKFLOW_TASKS: '/workflow/my-tasks',
  APPLICATIONS_REVIEW: '/workflow/applications-review',
  WORKFLOW_INSTANCES: '/admin/workflow-instances',
  WORKFLOW_INSTANCE_DETAIL: (id: string) => `/admin/workflow-instances/${id}`,

  // Sample Application routes
  SAMPLE_APPLICATION_LIST: '/sample-applications',
  SAMPLE_APPLICATION_NEW: '/sample-applications/new',
  SAMPLE_APPLICATION_VIEW: (id: string) => `/sample-applications/${id}`,
  SAMPLE_APPLICATION_EDIT: (id: string) => `/sample-applications/${id}/edit`,
} as const;
