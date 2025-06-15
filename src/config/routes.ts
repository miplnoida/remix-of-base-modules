
// Route configuration for the application
export const routes = [
  // Dashboard
  { path: '/', component: 'Index' },
  
  // Employer Management
  { path: '/employer/register', component: 'EmployerRegistration' },
  { path: '/employer/approval', component: 'EmployerApproval' },
  { path: '/employer/directory', component: 'EmployerDirectory' },
  { path: '/employer/contribution-entry', component: 'ContributionEntry' },
  { path: '/employer/compliance', component: 'ComplianceMonitoring' },
  { path: '/employer/contributions', component: 'ContributionTracking' },
  
  // Insured Persons
  { path: '/person/register', component: 'PersonRegistration' },
  { path: '/person/approval', component: 'PersonApproval' },
  { path: '/person/directory', component: 'PersonDirectory' },
  
  // Benefits
  { path: '/benefits/all', component: 'AllBenefitsTabs' },
  { path: '/benefits/maternity', component: 'MaternityBenefits' },
  { path: '/benefits/unemployment', component: 'UnemploymentBenefits' },
  { path: '/benefits/work-injury', component: 'WorkInjuryBenefits' },
  { path: '/benefits/death', component: 'DeathBenefits' },
  { path: '/benefits/educational', component: 'EducationalBenefits' },
  
  // Compliance & Audit
  { path: '/compliance/dashboard', component: 'ComplianceDashboard' },
  { path: '/compliance/employer', component: 'EmployerComplianceManagement' },
  { path: '/compliance/reports', component: 'ComplianceReports' },
  { path: '/compliance/legal', component: 'LegalProceedings' },
  { path: '/compliance/audits', component: 'AuditManagement' },
  { path: '/compliance/penalties', component: 'PenaltyManagement' },
];
