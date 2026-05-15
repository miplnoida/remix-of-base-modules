import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { InspectorLayout } from '@/components/inspector/InspectorLayout';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useLegalAuth } from '@/contexts/LegalAuthContext';
import React, { Suspense, lazy } from 'react';
import { AuditFeatureGate } from '@/components/audit/AuditFeatureGate';

const InspectorLogin = lazy(() => import('@/pages/inspector/InspectorLogin').then((m) => ({ default: m.InspectorLogin })));
const InspectorDashboard = lazy(() => import('@/pages/inspector/InspectorDashboard').then((m) => ({ default: m.InspectorDashboard })));
const InspectorWeeklyPlan = lazy(() => import('@/pages/inspector/InspectorWeeklyPlan').then((m) => ({ default: m.InspectorWeeklyPlan })));
const InspectorActivities = lazy(() => import('@/pages/inspector/InspectorActivities').then((m) => ({ default: m.InspectorActivities })));
const InspectorViolations = lazy(() => import('@/pages/inspector/InspectorViolations').then((m) => ({ default: m.InspectorViolations })));
const InspectorReports = lazy(() => import('@/pages/inspector/InspectorReports').then((m) => ({ default: m.InspectorReports })));
const RecordViolationForm = lazy(() => import('@/pages/inspector/RecordViolationForm').then((m) => ({ default: m.RecordViolationForm })));

// DB Diagram
const DbDiagramPage = lazy(() => import('@/pages/db-diagram/DbDiagramPage'));

// Embedded satellite micro-frontends (iframe + postMessage bridge)
const SatelliteFrame = lazy(() => import('@/components/integrations/SatelliteFrame'));

// Page imports
const Index = lazy(() => import('@/pages/dashboard/Index'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Unauthorized = lazy(() => import('@/pages/Unauthorized'));
const ViewInsuredPerson = lazy(() => import('@/pages/insuredPersons/ViewInsuredPerson'));
const EditInsuredPerson = lazy(() => import('@/pages/insuredPersons/EditInsuredPerson'));

// CRD Module
const CardManagement = lazy(() => import('@/pages/crd/CardManagement'));
const CRDPrintedSpoiledCardsReport = lazy(() => import('@/pages/crd/reports/PrintedSpoiledCardsReport'));

// Compliance Module
const ViolationsManagement = lazy(() => import('@/pages/compliance/violations/ViolationsManagement'));
const ViolationDetails = lazy(() => import('@/pages/compliance/violations/ViolationDetails'));
const InspectorPlans = lazy(() => import('@/pages/compliance/audit-planning/InspectorPlans'));
const PaymentArrangements = lazy(() => import('@/pages/compliance/arrangements/PaymentArrangements'));
// Retired: FieldOperations (hard cutover)
const NoticesManagement = lazy(() => import('@/pages/compliance/legal/NoticesManagement'));
const EmployerStatements = lazy(() => import('@/pages/compliance/employers/EmployerStatements'));
const ComplianceSettings = lazy(() => import('@/pages/compliance/settings/ComplianceSettings'));
const CompletionGateSettings = lazy(() => import('@/pages/compliance/settings/CompletionGateSettings'));
const ComplianceDashboard = lazy(() => import('@/pages/compliance/dashboards/ComplianceDashboard'));
const ComplianceReports = lazy(() => import('@/pages/compliance/reports/ComplianceReports'));
const CaseAnalytics = lazy(() => import('@/pages/compliance/reports/CaseAnalytics'));
const InspectorPerformance = lazy(() => import('@/pages/compliance/reports/InspectorPerformance'));
const C3Compliance = lazy(() => import('@/pages/compliance/reports/C3Compliance'));
const ArrearsReports = lazy(() => import('@/pages/compliance/reports/ArrearsReports'));
const ComplianceAuditReports = lazy(() => import('@/pages/compliance/reports/AuditReports'));
const ArrangementReports = lazy(() => import('@/pages/compliance/reports/ArrangementReports'));
const LegalEscalationReports = lazy(() => import('@/pages/compliance/reports/LegalEscalationReports'));
const RiskSamplingSettings = lazy(() => import('@/pages/compliance/sampling/RiskSamplingSettings'));
const SamplingDashboard = lazy(() => import('@/pages/compliance/sampling/SamplingDashboard'));
// Retired: MonthlyAuditCandidates, MyUpcomingAudits (hard cutover)
const EmployerRiskProfile = lazy(() => import('@/pages/compliance/sampling/EmployerRiskProfile'));
const LegalEscalationPolicy = lazy(() => import('@/pages/compliance/settings/LegalEscalationPolicy'));
const LegalRecommendationQueue = lazy(() => import('@/pages/compliance/legal/LegalRecommendationQueue'));
const LegalReferralWizard = lazy(() => import('@/pages/compliance/legal/LegalReferralWizard'));
const RiskRulePolicy = lazy(() => import('@/pages/compliance/settings/RiskRulePolicy'));

// New Compliance & Enforcement pages
const WorkbenchLanding = lazy(() => import('@/pages/compliance/workbench/WorkbenchLanding'));
const ComplianceManagerDashboard = lazy(() => import('@/pages/compliance/dashboards/ManagerDashboard'));
const ComplianceInspectorDashboard = lazy(() => import('@/pages/compliance/dashboards/InspectorDashboard'));
const ComplianceLegalDashboard = lazy(() => import('@/pages/compliance/dashboards/LegalDashboard'));
const ComplianceCaseManagement = lazy(() => import('@/pages/compliance/cases/CaseManagement'));
const ComplianceCaseQueue = lazy(() => import('@/pages/compliance/cases/CaseQueue'));
const ComplianceCaseDetailView = lazy(() => import('@/pages/compliance/cases/CaseDetailView'));

// Retired: ComplianceInspectionManagement (hard cutover)
const ComplianceBreachMonitoring = lazy(() => import('@/pages/compliance/arrangements/BreachMonitoring'));
const ComplianceLegalQueue = lazy(() => import('@/pages/compliance/legal/LegalQueue'));
const ComplianceLegalProceedings = lazy(() => import('@/pages/compliance/legal/LegalProceedingsPage'));
const ComplianceWaivers = lazy(() => import('@/pages/compliance/legal/WaiversOverrides'));
const ComplianceJobConfiguration = lazy(() => import('@/pages/compliance/automation/JobConfiguration'));
const ComplianceJobHistory = lazy(() => import('@/pages/compliance/automation/JobHistory'));
const ComplianceRuleEngine = lazy(() => import('@/pages/compliance/settings/RuleEngine'));
const ComplianceViolationTypes = lazy(() => import('@/pages/compliance/settings/ViolationTypes'));
const ComplianceNumberTemplates = lazy(() => import('@/pages/compliance/settings/NumberTemplates'));
const ComplianceRiskScoringConfig = lazy(() => import('@/pages/compliance/settings/RiskScoringConfig'));
const ComplianceTemplates = lazy(() => import('@/pages/compliance/settings/ComplianceTemplates'));
const AuditCommunicationTemplatesPage = lazy(() => import('@/pages/compliance/admin/AuditCommunicationTemplatesPage'));
const AuditCommunicationTemplateEditorPage = lazy(() => import('@/pages/compliance/admin/AuditCommunicationTemplateEditorPage'));
const OnlineResponseConfigPage = lazy(() => import('@/pages/compliance/admin/OnlineResponseConfigPage'));
const WeeklyPlanBuilder = lazy(() => import('@/pages/compliance/audit-planning/WeeklyPlanBuilder'));
const WeeklyPlanBuilderV2 = lazy(() => import('@/pages/compliance/audit-planning/WeeklyPlanBuilderV2'));
const WeeklyPlanBuilderV3 = lazy(() => import('@/pages/compliance/audit-planning/WeeklyPlanBuilderV3'));
const PlannerApprovalInbox = lazy(() => import('@/pages/compliance/audit-planning/PlannerApprovalInbox'));
const PlannerApprovalDecidePage = lazy(() => import('@/pages/compliance/audit-planning/PlannerApprovalDecidePage'));
const RevisionsPending = lazy(() => import('@/pages/compliance/audit-planning/RevisionsPending'));
const PlanRevisionReview = lazy(() => import('@/pages/compliance/audit-planning/PlanRevisionReview'));
const MyPlans = lazy(() => import('@/pages/compliance/audit-planning/MyPlans'));
const AllWeeklyReports = lazy(() => import('@/pages/compliance/audit-planning/AllWeeklyReports'));
const FieldExecution = lazy(() => import('@/pages/compliance/audit-planning/FieldExecution'));
// Retired: WeeklyReports (use AllWeeklyReports at /compliance/field/all-reports)
const CompliancePendingReview = lazy(() => import('@/pages/compliance/audit-planning/PendingReview'));
const WeeklyPlanReview = lazy(() => import('@/pages/compliance/audit-planning/WeeklyPlanReview').then((m) => ({ default: m.WeeklyPlanReview })));
const PlanExecutionDashboard = lazy(() => import('@/pages/compliance/audit-planning/PlanExecutionDashboard'));
const AuditVisitWorkspace = lazy(() => import('@/pages/compliance/audit-planning/AuditVisitWorkspace'));
const EmployerAuditReportViewer = lazy(() => import('@/pages/compliance/audit-planning/EmployerAuditReportViewer'));
const AuditReportPrintPage = lazy(() => import('@/pages/compliance/audit-planning/AuditReportPrintPage'));
const AuditReportAcknowledgePage = lazy(() => import('@/pages/public/AuditReportAcknowledgePage'));
const WeeklyReportReview = lazy(() => import('@/pages/compliance/audit-planning/WeeklyReportReview'));
const WeeklyReportSubmission = lazy(() => import('@/pages/compliance/violations/WeeklyReportSubmission'));
const ManualViolationEntry = lazy(() => import('@/pages/compliance/violations/ManualViolationEntry'));
const EmployerFindings = lazy(() => import('@/pages/compliance/employers/EmployerFindings'));
const EmployerVisitWorkspace = lazy(() => import('@/pages/compliance/employers/EmployerVisitWorkspace'));
const EmployerStatementDetail = lazy(() => import('@/pages/compliance/employers/EmployerStatementDetail'));
const Employer360 = lazy(() => import('@/pages/compliance/employers/Employer360'));
const Employer360Search = lazy(() => import('@/pages/compliance/employers/Employer360Search'));
const ComplianceRuleSimulator = lazy(() => import('@/pages/compliance/tools/RuleSimulator'));
const ComplianceRiskSimulator = lazy(() => import('@/pages/compliance/tools/RiskSimulator'));

// Compliance Operations, Geography, Staff
const AssignmentQueues = lazy(() => import('@/pages/compliance/operations/AssignmentQueues'));
const ReviewQueue = lazy(() => import('@/pages/compliance/operations/ReviewQueue'));
const Reassignment = lazy(() => import('@/pages/compliance/operations/Reassignment'));
const ZoneManagement = lazy(() => import('@/pages/compliance/geography/ZoneManagement'));
const OfficeZoneMapping = lazy(() => import('@/pages/compliance/geography/OfficeZoneMapping'));
const VillageZoneMapping = lazy(() => import('@/pages/compliance/geography/VillageZoneMapping'));
const OfficerManagement = lazy(() => import('@/pages/compliance/staff/OfficerManagement'));
const QueueMembers = lazy(() => import('@/pages/compliance/staff/QueueMembers'));
const SupervisorHierarchy = lazy(() => import('@/pages/compliance/staff/SupervisorHierarchy'));
const LegacyInspectorLinking = lazy(() => import('@/pages/compliance/staff/LegacyInspectorLinking'));
const AssignmentRoutingRules = lazy(() => import('@/pages/compliance/settings/AssignmentRoutingRules'));

const LevySchemesList = lazy(() => import('@/pages/c3/settings/levy/LevySchemesList'));
const LevySchemeDetail = lazy(() => import('@/pages/c3/settings/levy/LevySchemeDetail'));
const LevySimulator = lazy(() => import('@/pages/c3/settings/levy/LevySimulator'));
const SSSchemesList = lazy(() => import('@/pages/c3/settings/ss/SSSchemesList'));
const SSSchemeDetail = lazy(() => import('@/pages/c3/settings/ss/SSSchemeDetail'));
const SSSimulator = lazy(() => import('@/pages/c3/settings/ss/SSSimulator'));
const SeveranceSchemesList = lazy(() => import('@/pages/c3/settings/severance/SeveranceSchemesList'));
const SeveranceSchemeDetail = lazy(() => import('@/pages/c3/settings/severance/SeveranceSchemeDetail'));
const SeveranceSimulator = lazy(() => import('@/pages/c3/settings/severance/SeveranceSimulator'));
const InjurySchemesList = lazy(() => import('@/pages/c3/settings/injury/InjurySchemesList'));
const InjurySchemeDetail = lazy(() => import('@/pages/c3/settings/injury/InjurySchemeDetail'));
const InjurySimulator = lazy(() => import('@/pages/c3/settings/injury/InjurySimulator'));
const C3FormatsList = lazy(() => import('@/pages/c3/settings/c3file/C3FormatsList'));
const C3FormatDetail = lazy(() => import('@/pages/c3/settings/c3file/C3FormatDetail'));

// CyberSource & Reconciliation
const CyberSourceSettings = lazy(() => import('@/pages/c3Management/CyberSourceSettings'));
const ReconciliationPage = lazy(() => import('@/pages/c3Management/ReconciliationPage'));
const SettingsConfiguration = lazy(() => import('@/pages/c3Management/SettingsConfiguration'));
const EmailTemplates = lazy(() => import('@/pages/c3Management/EmailTemplates'));

// C3 Details Screens
const C3ContributionList = lazy(() => import('@/pages/c3Management/c3Details/C3ContributionList'));
const NwDirectorList = lazy(() => import('@/pages/c3Management/c3Details/NwDirectorList'));
const SelfEmployedContributionList = lazy(() => import('@/pages/c3Management/c3Details/SelfEmployedContributionList'));
const OfflinePaymentPage = lazy(() => import('@/pages/c3Management/c3Details/OfflinePaymentPage'));

const EmployerRegistration = lazy(() => import('@/pages/employersManagement/EmployerRegistration'));
const EmployerApproval = lazy(() => import('@/pages/employersManagement/EmployerApproval'));
const EmployerDirectory = lazy(() => import('@/pages/employersManagement/EmployerDirectory'));
const ContributionEntry = lazy(() => import('@/pages/employersManagement/ContributionEntry'));
const ComplianceMonitoring = lazy(() => import('@/pages/compliance/dashboards/ComplianceMonitoring'));
const ContributionTracking = lazy(() => import('@/pages/employersManagement/ContributionTracking'));

// Insured Persons - New consolidated page
const IPManagement = lazy(() => import('@/pages/insuredPersons/IPManagement'));
const PersonIPManagement = lazy(() => import('@/pages/insuredPersons/PersonIPManagement'));

// Quick Actions Pages
const WagesHistory = lazy(() => import('@/pages/insuredPersons/WagesHistory'));
const ClaimHistory = lazy(() => import('@/pages/insuredPersons/ClaimHistory'));
const BenefitEligibility = lazy(() => import('@/pages/insuredPersons/BenefitEligibility'));
const PendingReviews = lazy(() => import('@/pages/insuredPersons/PendingReviews'));

// Service Request Pages
const ServiceRequestNew = lazy(() => import('@/pages/person/ServiceRequestNew'));
const ServiceRequestList = lazy(() => import('@/pages/person/ServiceRequestList'));
const ServiceRequestDetail = lazy(() => import('@/pages/person/ServiceRequestDetail'));
const PendingVerification = lazy(() => import('@/pages/person/PendingVerification'));
const InsuredPersonProfile = lazy(() => import('@/pages/person/InsuredPersonProfile'));

// Insured Persons Reports
const IPEntryVerificationReport = lazy(() => import('@/pages/person/reports/IPEntryVerificationReport'));
const Age62WithoutClaimReport = lazy(() => import('@/pages/person/reports/Age62WithoutClaimReport'));
const OnlineRenewalUpdateReport = lazy(() => import('@/pages/person/reports/OnlineRenewalUpdateReport'));
const RegistrationPaymentsReport = lazy(() => import('@/pages/person/reports/RegistrationPaymentsReport'));
const ContributionStatementPaymentReport = lazy(() => import('@/pages/person/reports/ContributionStatementPaymentReport'));
const PensionLettersPaymentReport = lazy(() => import('@/pages/person/reports/PensionLettersPaymentReport'));
const NonNationalWorkersSSNReport = lazy(() => import('@/pages/person/reports/NonNationalWorkersSSNReport'));
const NewRegistrantsByOfficerReport = lazy(() => import('@/pages/person/reports/NewRegistrantsByOfficerReport'));
const EmployerRegistrationByOfficerReport = lazy(() => import('@/pages/person/reports/EmployerRegistrationByOfficerReport'));
const LifeCertificatesReport = lazy(() => import('@/pages/person/reports/LifeCertificatesReport'));
const SelfEmployedByOfficerReport = lazy(() => import('@/pages/person/reports/SelfEmployedByOfficerReport'));
const ClaimsEnteredByOfficerReport = lazy(() => import('@/pages/person/reports/ClaimsEnteredByOfficerReport'));
const SelfEmployedWithoutLicenseReport = lazy(() => import('@/pages/person/reports/SelfEmployedWithoutLicenseReport'));
const ClaimsToBenefitsReport = lazy(() => import('@/pages/person/reports/ClaimsToBenefitsReport'));
const CRMActivityReport = lazy(() => import('@/pages/person/reports/CRMActivityReport'));
const C3EntryVerificationReport = lazy(() => import('@/pages/person/reports/C3EntryVerificationReport'));
const PendingC3Report = lazy(() => import('@/pages/person/reports/PendingC3Report'));
const MissingSSNReport = lazy(() => import('@/pages/person/reports/MissingSSNReport'));
const C3LineItemChangesReport = lazy(() => import('@/pages/person/reports/C3LineItemChangesReport'));
const ElectronicC3UploadsReport = lazy(() => import('@/pages/person/reports/ElectronicC3UploadsReport'));
const EmployerNotificationsReport = lazy(() => import('@/pages/person/reports/EmployerNotificationsReport'));
const HighWageMultiEmployerReport = lazy(() => import('@/pages/person/reports/HighWageMultiEmployerReport'));
const ScanningActivityReport = lazy(() => import('@/pages/person/reports/ScanningActivityReport'));
const OutstandingDiscrepanciesReport = lazy(() => import('@/pages/person/reports/OutstandingDiscrepanciesReport'));
const LongTermClaimsReport = lazy(() => import('@/pages/person/reports/LongTermClaimsReport'));
const AuditSampleReport = lazy(() => import('@/pages/person/reports/AuditSampleReport'));
const RefundsToCRUReport = lazy(() => import('@/pages/person/reports/RefundsToCRUReport'));
const AuditSampleIPReport = lazy(() => import('@/pages/person/reports/AuditSampleIPReport'));

// Finance Settings Pages
const FeeConfigurationDetail = lazy(() => import('@/pages/finance/settings/FeeConfigurationDetail'));
const FeeConfigurationList = lazy(() => import('@/pages/finance/settings/FeeConfigurationList'));
const ServiceTypeManagement = lazy(() => import('@/pages/finance/settings/ServiceTypeManagement'));
const PaymentArrangementsPage = lazy(() => import('@/pages/finance/PaymentArrangements'));
const ArrangementDetail = lazy(() => import('@/pages/finance/ArrangementDetail'));
const VerificationSettings = lazy(() => import('@/pages/finance/settings/VerificationSettings'));
const MultiCurrencySettings = lazy(() => import('@/pages/finance/settings/MultiCurrencySettings'));

// Benefits
const AllBenefitsTabs = lazy(() => import('@/pages/benefits/AllBenefitsTabs'));
const OnlineBenefitApplications = lazy(() => import('@/pages/benefits/OnlineBenefitApplications'));
const MaternityBenefits = lazy(() => import('@/pages/benefits/MaternityBenefits'));
const UnemploymentBenefits = lazy(() => import('@/pages/benefits/UnemploymentBenefits'));
const WorkInjuryBenefits = lazy(() => import('@/pages/benefits/WorkInjuryBenefits'));
const DeathBenefits = lazy(() => import('@/pages/benefits/DeathBenefits'));
const EducationalBenefits = lazy(() => import('@/pages/benefits/EducationalBenefits'));

// Compliance & Audit (ComplianceDashboard already imported above)
const EmployerComplianceManagement = lazy(() => import('@/pages/compliance/employers/EmployerComplianceManagement'));
const LegalProceedings = lazy(() => import('@/pages/compliance/legal/LegalProceedings'));
const AuditManagement = lazy(() => import('@/pages/compliance/audit-planning/AuditManagement'));
const PenaltyManagement = lazy(() => import('@/pages/compliance/cases/PenaltyManagement'));
const ComplianceAnalytics = lazy(() => import('@/pages/compliance/dashboards/ComplianceAnalytics'));
const EmployerHierarchy = lazy(() => import('@/pages/compliance/employers/EmployerHierarchy'));
const EmployerFinancialStatement = lazy(() => import('@/pages/compliance/employers/EmployerFinancialStatement'));
const EmployerComplianceJobs = lazy(() => import('@/pages/compliance/automation/EmployerComplianceJobs'));
const C3LedgerSync = lazy(() => import('@/pages/compliance/settings/C3LedgerSync'));
const LedgerAdministration = lazy(() => import('@/pages/compliance/settings/LedgerAdministration'));
const LedgerOperationsDashboard = lazy(() => import('@/pages/compliance/settings/LedgerOperationsDashboard'));
const LedgerPostingAdmin = lazy(() => import('@/pages/compliance/settings/LedgerPostingAdmin'));
const LedgerHelpCenter = lazy(() => import('@/pages/compliance/settings/LedgerHelpCenter'));
const PaymentLedgerSync = lazy(() => import('@/pages/compliance/settings/PaymentLedgerSync'));
const TrendReports = lazy(() => import('@/pages/compliance/reports/TrendReports'));

// Legal Module
const LegalAuth = lazy(() => import('@/pages/legal/LegalAuth'));
const LegalHearingCalendar = lazy(() => import('@/pages/legal/LegalHearingCalendar'));
const LegalOrderRegistry = lazy(() => import('@/pages/legal/LegalOrderRegistry'));
const LegalDocumentCenter = lazy(() => import('@/pages/legal/DocumentCenter'));
const SSBCaseListPage = lazy(() => import('@/pages/legal/SSBCaseList'));
const SSBCaseIntake = lazy(() => import('@/pages/legal/SSBCaseIntake'));
const SSBCaseViewPage = lazy(() => import('@/pages/legal/SSBCaseView'));
const SSBLegalReports = lazy(() => import('@/pages/legal/SSBLegalReports'));
const SSBLegalDashboard = lazy(() => import('@/pages/legal/SSBLegalDashboard'));

// Audit Module — Simplified Department Function Audit
const AuditDashboard = lazy(() => import('@/pages/audit/AuditDashboard'));
const AuditPlansNew = lazy(() => import('@/pages/audit/AuditPlansNew'));
const AuditPlanDetail = lazy(() => import('@/pages/audit/AuditPlanDetail'));
const AuditReports = lazy(() => import('@/pages/audit/AuditReports'));
const AuditReportBuilder = lazy(() => import('@/pages/audit/AuditReportBuilder'));
const DepartmentMaster = lazy(() => import('@/pages/audit/DepartmentMaster'));
const FunctionMaster = lazy(() => import('@/pages/audit/FunctionMaster'));
const DepartmentView = lazy(() => import('@/pages/audit/DepartmentView'));
const RiskAssessment = lazy(() => import('@/pages/audit/RiskAssessment'));
const EntitySummary = lazy(() => import('@/pages/audit/EntitySummary'));
const RiskMatrix = lazy(() => import('@/pages/audit/RiskMatrix'));
const AuditEngagements = lazy(() => import('@/pages/audit/AuditEngagements'));
const EngagementDetail = lazy(() => import('@/pages/audit/EngagementDetail'));
const PlanApproval = lazy(() => import('@/pages/audit/PlanApproval'));
const AuditConfig = lazy(() => import('@/pages/audit/AuditConfig'));
const RiskSettings = lazy(() => import('@/pages/audit/RiskSettings'));
const DocumentTemplateSettings = lazy(() => import('@/pages/audit/DocumentTemplateSettings'));
const ComplianceReportTemplates = lazy(() => import('@/pages/compliance/admin/ComplianceReportTemplates'));
const AuditQueries = lazy(() => import('@/pages/audit/AuditQueries'));

const RiskRegister = lazy(() => import('@/pages/audit/RiskRegister'));
const AuditorProfiles = lazy(() => import('@/pages/audit/AuditorProfiles'));
const WorkloadCapacity = lazy(() => import('@/pages/audit/WorkloadCapacity'));
const TimeTracking = lazy(() => import('@/pages/audit/TimeTracking'));

const AuditorLeaveManagement = lazy(() => import('@/pages/audit/AuditorLeaveManagement'));

// Reports
const ReportsHub = lazy(() => import('@/pages/reports/ReportsHub'));
const EmployerStatement = lazy(() => import('@/pages/reports/EmployerStatement'));

// System Administration
const WebUsers = lazy(() => import('@/pages/users/WebUsers'));

const CentralScheduler = lazy(() => import('@/pages/admin/CentralScheduler'));
const UserManagement = lazy(() => import('@/pages/systemAdmin/UserManagement'));
const BackupRecovery = lazy(() => import('@/pages/systemAdmin/BackupRecovery'));
const SystemLogs = lazy(() => import('@/pages/systemAdmin/SystemLogs'));
const EmployeeList = lazy(() => import('@/pages/systemAdmin/EmployeeList'));
const OrgUnitList = lazy(() => import('@/pages/systemAdmin/OrgUnitList'));
const PositionList = lazy(() => import('@/pages/systemAdmin/PositionList'));
const RoleList = lazy(() => import('@/pages/systemAdmin/RoleList'));
// System Administration Routes - Approval Matrix modules added
const DelegationList = lazy(() => import('@/pages/systemAdmin/DelegationList'));
const ApprovalMatrixPayment = lazy(() => import('@/pages/systemAdmin/ApprovalMatrixPayment'));
const ApprovalMatrixFeeWaiver = lazy(() => import('@/pages/systemAdmin/ApprovalMatrixFeeWaiver'));
const ApprovalMatrixJournal = lazy(() => import('@/pages/systemAdmin/ApprovalMatrixJournal'));
const ApprovalMatrixRefund = lazy(() => import('@/pages/systemAdmin/ApprovalMatrixRefund'));
const ApprovalMatrixWriteOff = lazy(() => import('@/pages/systemAdmin/ApprovalMatrixWriteOff'));
const WorkflowSchemeList = lazy(() => import('@/pages/systemAdmin/WorkflowSchemeList'));
const NotificationLog = lazy(() => import('@/pages/systemAdmin/NotificationLog'));
const NotificationTemplates = lazy(() => import('@/pages/systemAdmin/NotificationTemplates'));
const NotificationChannelSettings = lazy(() => import('@/pages/systemAdmin/NotificationChannelSettings'));
const WorkflowManagement = lazy(() => import('@/pages/workflow/WorkflowManagement'));

// Enterprise Admin Module
const UserManagementAdmin = lazy(() => import('@/pages/admin/UserManagementAdmin'));
const RolePermissionManagement = lazy(() => import('@/pages/admin/RolePermissionManagement'));

const NotificationManagement = lazy(() => import('@/pages/admin/NotificationManagement'));
const OfficeManagement = lazy(() => import('@/pages/admin/OfficeManagement'));
const OfficeIPManagement = lazy(() => import('@/pages/admin/OfficeIPManagement'));
const DepartmentManagement = lazy(() => import('@/pages/admin/DepartmentManagement'));
const ModuleManagement = lazy(() => import('@/pages/admin/ModuleManagement'));
const DesignationManagement = lazy(() => import('@/pages/admin/DesignationManagement'));
const DesignationHierarchy = lazy(() => import('@/pages/admin/DesignationHierarchy'));
const RoleHierarchy = lazy(() => import('@/pages/admin/RoleHierarchy'));
const UserNotificationPreferences = lazy(() => import('@/pages/admin/UserNotificationPreferences'));
const DataMigration = lazy(() => import('@/pages/admin/DataMigration'));
const ReleaseManagement = lazy(() => import('@/pages/admin/ReleaseManagement'));
const UpdateUserPassword = lazy(() => import('@/pages/admin/users/UpdateUserPassword'));
const ModuleButtonBindings = lazy(() => import('@/pages/admin/ModuleButtonBindings'));
const ApiKeysManagement = lazy(() => import('@/pages/admin/ApiKeysManagement'));
const ApiTestDashboard = lazy(() => import('@/pages/admin/api-test-console/ApiTestDashboard'));
const ApiKeysConsole = lazy(() => import('@/pages/admin/api-test-console/ApiKeysConsole'));
const EnvironmentsConsole = lazy(() => import('@/pages/admin/api-test-console/EnvironmentsConsole'));
const AuthTestLab = lazy(() => import('@/pages/admin/api-test-console/AuthTestLab'));
const EndpointExplorer = lazy(() => import('@/pages/admin/api-test-console/EndpointExplorer'));
const ComplianceRunner = lazy(() => import('@/pages/admin/api-test-console/ComplianceRunner'));
const SavedCasesConsole = lazy(() => import('@/pages/admin/api-test-console/SavedCasesConsole'));
const SuitesConsole = lazy(() => import('@/pages/admin/api-test-console/SuitesConsole'));
const ExecutionLogs = lazy(() => import('@/pages/admin/api-test-console/ExecutionLogs'));
const PublicApiManagement = lazy(() => import('@/pages/admin/PublicApiManagement'));
const DocumentConfigurationPage = lazy(() => import('@/pages/admin/DocumentConfigurationPage'));
const ExternalApiManagement = lazy(() => import('@/pages/admin/ExternalApiManagement'));
const ExternalApiDocs = lazy(() => import('@/pages/external/ExternalApiDocs'));
const PublicApiDocs = lazy(() => import('@/pages/public/PublicApiDocs'));

const WorkflowList = lazy(() => import('@/pages/admin/workflows/WorkflowList'));
const WorkflowForm = lazy(() => import('@/pages/admin/workflows/WorkflowForm'));
const WorkflowTriggers = lazy(() => import('@/pages/admin/workflows/WorkflowTriggers'));
const WorkflowLogs = lazy(() => import('@/pages/admin/workflows/WorkflowLogs'));
const WorkflowAnalytics = lazy(() => import('@/pages/admin/workflows/WorkflowAnalytics'));
const WorkflowSecuritySettings = lazy(() => import('@/pages/admin/workflows/WorkflowSecuritySettings'));
const SecuredWorkflowApprovals = lazy(() => import('@/pages/admin/workflows/SecuredWorkflowApprovals'));
const WorkflowInstanceList = lazy(() => import('@/pages/admin/workflows/WorkflowInstanceList'));
const WorkflowRoleAssignment = lazy(() => import('@/pages/admin/workflows/WorkflowRoleAssignment'));
const WorkflowInstanceDetail = lazy(() => import('@/pages/admin/workflows/WorkflowInstanceDetail'));
const MyWorkflowTasks = lazy(() => import('@/pages/workflow/MyWorkflowTasks'));
const ApplicationsReview = lazy(() => import('@/pages/workflow/ApplicationsReview'));

// Sample Application
const SampleApplicationList = lazy(() => import('@/pages/sample-application/SampleApplicationList'));
const SampleApplicationForm = lazy(() => import('@/pages/sample-application/SampleApplicationForm'));
const SampleApplicationView = lazy(() => import('@/pages/sample-application/SampleApplicationView'));

// Data Access Control
const DataScopeRules = lazy(() => import('@/pages/admin/data-access/DataScopeRules'));
const FieldSecurity = lazy(() => import('@/pages/admin/data-access/FieldSecurity'));
const RoleDataPolicies = lazy(() => import('@/pages/admin/data-access/RoleDataPolicies'));
const UserDataOverrides = lazy(() => import('@/pages/admin/data-access/UserDataOverrides'));
const PolicyTestConsole = lazy(() => import('@/pages/admin/data-access/PolicyTestConsole'));

// System Cleanup
const SystemCleanupDashboard = lazy(() => import('@/pages/admin/system-cleanup/SystemCleanupDashboard'));
const ActiveModulesInventory = lazy(() => import('@/pages/admin/system-cleanup/ActiveModulesInventory'));
const DependencyScan = lazy(() => import('@/pages/admin/system-cleanup/DependencyScan'));
const CleanupReview = lazy(() => import('@/pages/admin/system-cleanup/CleanupReview'));
const RollbackScreen = lazy(() => import('@/pages/admin/system-cleanup/RollbackScreen'));

// Online Applications Module
const ApiConfiguration = lazy(() => import('@/pages/admin/settings/ApiConfiguration'));
const GlobalSettings = lazy(() => import('@/pages/systemAdmin/GlobalSettings'));
const C3CalculationConfigPage = lazy(() => import('@/pages/admin/C3CalculationConfigPage'));
const C3PeriodConfigPage = lazy(() => import('@/pages/admin/C3PeriodConfigPage'));
const C3ConfigurationPage = lazy(() => import('@/pages/admin/C3ConfigurationPage'));
const InsuredPersonApplications = lazy(() => import('@/pages/online-applications/InsuredPersonApplications'));
const ApplicationDetailPage = lazy(() => import('@/pages/online-applications/ApplicationDetailPage'));
const EmployerApplications = lazy(() => import('@/pages/online-applications/EmployerApplications'));
const EmployerApplicationDetailPage = lazy(() => import('@/pages/online-applications/EmployerApplicationDetailPage'));
const DoctorApplications = lazy(() => import('@/pages/online-applications/DoctorApplications'));

// QA Framework
const QADashboard = lazy(() => import('@/pages/admin/qa/QADashboard'));
const KnowledgeRepository = lazy(() => import('@/pages/admin/qa/KnowledgeRepository'));
const QAChangeRequests = lazy(() => import('@/pages/admin/qa/QAChangeRequests'));
const DoctorApplicationDetailPage = lazy(() => import('@/pages/online-applications/DoctorApplicationDetailPage'));

// IP Registration Module
const IPRegistrationList = lazy(() => import('@/pages/ip-registration/IPRegistrationList'));
const IPRegistrationForm = lazy(() => import('@/pages/ip-registration/IPRegistrationForm'));
const ExternalApplicationsScreen = lazy(() => import('@/pages/ip-registration/ExternalApplicationsScreen'));

// Employer Registration Module
const EmployerRegistrationList = lazy(() => import('@/pages/employer-registration/EmployerRegistrationList'));
const EmployerRegistrationForm = lazy(() => import('@/pages/employer-registration/EmployerRegistrationForm'));

// Enterprise Admin - User Management (Separate Screens)
const UserList = lazy(() => import('@/pages/admin/users/UserList'));
const UserCreate = lazy(() => import('@/pages/admin/users/UserCreate'));
const UserView = lazy(() => import('@/pages/admin/users/UserView'));
const UserEdit = lazy(() => import('@/pages/admin/users/UserEdit'));
const UserRoles = lazy(() => import('@/pages/admin/users/UserRoles'));
const SeedTestUsers = lazy(() => import('@/pages/admin/SeedTestUsers'));

// Enterprise Admin - Role Management
const AdminRoleList = lazy(() => import('@/pages/admin/roles/RoleList'));

// Enterprise Admin - Security Settings
const PasswordPolicySettings = lazy(() => import('@/pages/admin/security/PasswordPolicySettings'));
const MFASettings = lazy(() => import('@/pages/admin/security/MFASettings'));
const SecurityPolicySettingsPage = lazy(() => import('@/pages/admin/security/SecurityPolicySettings'));
const IPAccessRulesManagement = lazy(() => import('@/pages/admin/security/IPAccessRulesManagement'));
const Maintenance = lazy(() => import('@/pages/Maintenance'));

// Profile Pages
const ProfileChangePassword = lazy(() => import('@/pages/profile/ChangePassword'));
const NotificationPreferences = lazy(() => import('@/pages/profile/NotificationPreferences'));
const ActiveSessions = lazy(() => import('@/pages/profile/ActiveSessions'));
const MyProfile = lazy(() => import('@/pages/profile/MyProfile'));

// Notification Pages
const NotificationCenter = lazy(() => import('@/pages/notifications/NotificationCenter'));
const ProviderSettings = lazy(() => import('@/pages/admin/notifications/ProviderSettings'));
const EmailCampaigns = lazy(() => import('@/pages/admin/EmailCampaigns'));
const EmailLogs = lazy(() => import('@/pages/admin/EmailLogs'));

// System Monitoring & Logs
const TechnicalLogs = lazy(() => import('@/pages/system-logs/TechnicalLogs'));
const ErrorLogs = lazy(() => import('@/pages/system-logs/ErrorLogs'));
const BusinessEvents = lazy(() => import('@/pages/system-logs/BusinessEvents'));
const AuditTrail = lazy(() => import('@/pages/system-logs/AuditTrail'));
const SecurityLogs = lazy(() => import('@/pages/system-logs/SecurityLogs'));
const LoginSecurityLogs = lazy(() => import('@/pages/system-logs/LoginSecurityLogs'));
const IntegrationLogs = lazy(() => import('@/pages/system-logs/IntegrationLogs'));
const PerformanceMonitor = lazy(() => import('@/pages/system-logs/PerformanceMonitor'));
const SystemWorkflowLogs = lazy(() => import('@/pages/system-logs/WorkflowLogs'));
const AdminNotificationLogs = lazy(() => import('@/pages/admin/NotificationLogs'));
const AdminNotificationTemplates = lazy(() => import('@/pages/admin/NotificationTemplates'));
const NotificationTemplateManager = lazy(() => import('@/pages/admin/notifications/NotificationTemplateManager'));

const SicknessBenefit = lazy(() => import('@/pages/nbenefit/short-term/SicknessBenefit'));
const MaternityBenefit = lazy(() => import('@/pages/nbenefit/short-term/MaternityBenefit'));
const EmploymentInjuryBenefit = lazy(() => import('@/pages/nbenefit/short-term/EmploymentInjuryBenefit'));
const FuneralGrantBenefit = lazy(() => import('@/pages/nbenefit/short-term/FuneralGrantBenefit'));
const AgeBenefit = lazy(() => import('@/pages/nbenefit/long-term/AgeBenefit'));
const ClaimApprovalEnhanced = lazy(() => import('@/pages/nbenefit/ClaimApprovalEnhanced'));
const BenefitRulesList = lazy(() => import('@/pages/nbenefit/config/BenefitRulesList'));
const BenefitRuleEditor = lazy(() => import('@/pages/nbenefit/config/BenefitRuleEditor'));
const MedicalRulesConfig = lazy(() => import('@/pages/nbenefit/config/MedicalRulesConfig'));
const BeneficiaryRegistry = lazy(() => import('@/pages/nbenefit/long-term/BeneficiaryRegistry'));
const BeneficiaryDetail = lazy(() => import('@/pages/nbenefit/long-term/BeneficiaryDetail'));
const LifeCertificateManagement = lazy(() => import('@/pages/nbenefit/long-term/LifeCertificateManagement'));
const CreatePayRun = lazy(() => import('@/pages/finance/accounts-payable/CreatePayRun'));
const PayRunList = lazy(() => import('@/pages/finance/accounts-payable/PayRunList'));
const GeneratePayments = lazy(() => import('@/pages/finance/accounts-payable/GeneratePayments'));
const PaymentInquiry = lazy(() => import('@/pages/finance/accounts-payable/PaymentInquiry'));
const BenefitFinanceMapping = lazy(() => import('@/pages/finance/settings/BenefitFinanceMapping'));
const LifeCertificateConfig = lazy(() => import('@/pages/nbenefit/config/LifeCertificateConfig'));

// Meetings Module
const ManageMeetingsPage = lazy(() => import('@/pages/meetings/ManageMeetingsPage'));
const StartMeetingPage = lazy(() => import('@/pages/meetings/StartMeetingPage'));

// Accounts Payable Module
const APPendingPayables = lazy(() => import('@/pages/finance/accounts-payable/PendingPayables'));
const APCreateBatch = lazy(() => import('@/pages/finance/accounts-payable/CreateAPBatch'));
const APBatchList = lazy(() => import('@/pages/finance/accounts-payable/APBatchList'));
const APBatchDetail = lazy(() => import('@/pages/finance/accounts-payable/APBatchDetail'));
const APAccountsVerification = lazy(() => import('@/pages/finance/accounts-payable/AccountsVerification'));
const APBenefitsVerification = lazy(() => import('@/pages/finance/accounts-payable/BenefitsVerification'));
const APCheckPrinting = lazy(() => import('@/pages/finance/accounts-payable/CheckPrinting'));
const APDirectDepositGeneration = lazy(() => import('@/pages/finance/accounts-payable/DirectDepositGeneration'));
const APPostingHistory = lazy(() => import('@/pages/finance/accounts-payable/APPostingHistory'));
const APCorrections = lazy(() => import('@/pages/finance/accounts-payable/APCorrections'));
const APReports = lazy(() => import('@/pages/finance/accounts-payable/APReports'));
const APVerificationExceptions = lazy(() => import('@/pages/finance/accounts-payable/APVerificationExceptions'));
const InvalidityBenefit = lazy(() => import('@/pages/nbenefit/long-term/InvalidityBenefit'));
const CorrespondenceDashboard = lazy(() => import('@/pages/correspondence/CorrespondenceDashboard'));
const IncomingCommunications = lazy(() => import('@/pages/correspondence/IncomingCommunications'));
const OutgoingCommunications = lazy(() => import('@/pages/correspondence/OutgoingCommunications'));
const SearchHistory = lazy(() => import('@/pages/correspondence/SearchHistory'));
const Archive = lazy(() => import('@/pages/correspondence/Archive'));
const ModuleTemplates = lazy(() => import('@/pages/templates/ModuleTemplates'));
const AssistanceBenefit = lazy(() => import('@/pages/nbenefit/long-term/AssistanceBenefit'));
const SurvivorsBenefit = lazy(() => import('@/pages/nbenefit/long-term/SurvivorsBenefit'));
const AssistancePension = lazy(() => import('@/pages/nbenefit/non-contributory/AssistancePension'));
const InvalidityAssistance = lazy(() => import('@/pages/nbenefit/non-contributory/InvalidityAssistance'));
const RegistrySearch = lazy(() => import('@/pages/nbenefit/shared/RegistrySearch'));
const CommonEligibilityRules = lazy(() => import('@/pages/nbenefit/shared/CommonEligibilityRules'));
const CalculationEngines = lazy(() => import('@/pages/nbenefit/shared/CalculationEngines'));
const DocumentTemplates = lazy(() => import('@/pages/nbenefit/shared/DocumentTemplates'));
const BenefitWorkflows = lazy(() => import('@/pages/nbenefit/shared/BenefitWorkflows'));
const BenefitApplicationFormPage = lazy(() => import('@/pages/nbenefit/BenefitApplicationFormPage'));

// Medical Module
const DoctorApplicationsList = lazy(() => import('@/pages/medical/DoctorApplicationsList'));
const DoctorApplicationDetail = lazy(() => import('@/pages/medical/DoctorApplicationDetail'));
const NewManualApplication = lazy(() => import('@/pages/medical/NewManualApplication'));
const DoctorRegistry = lazy(() => import('@/pages/medical/DoctorRegistry'));
const ClaimsByDoctors = lazy(() => import('@/pages/medical/ClaimsByDoctors'));

const ManageEmployers = lazy(() => import('@/pages/employersManagement/ManageEmployers'));
const EmployersDashboard = lazy(() => import('@/pages/employersManagement/EmployersDashboard'));

// New pages for missing routes
const AddEmployer = lazy(() => import('@/pages/employersManagement/AddEmployer'));
const EmployersReports = lazy(() => import('@/pages/reports/EmployersReports'));


const ManageSelfEmployed = lazy(() => import('@/pages/selfEmployed/ManageSelfEmployed'));
const AddSelfEmployed = lazy(() => import('@/pages/selfEmployed/AddSelfEmployed'));
const SelfEmployedReports = lazy(() => import('@/pages/selfEmployed/SelfEmployedReports'));
const InsuredPersonGuide = lazy(() => import('@/pages/insuredPersons/InsuredPersonGuide'));
const EmployerRules = lazy(() => import('@/pages/employersManagement/EmployerRules'));
const ApprovalWorkflow = lazy(() => import('@/pages/registration/ApprovalWorkflow'));
const DocumentationRequirements = lazy(() => import('@/pages/registration/DocumentationRequirements'));
const UserProfile = lazy(() => import('@/pages/users/UserProfile'));
const ChangePassword = lazy(() => import('@/pages/users/ChangePassword'));
const ManageRoles = lazy(() => import('@/pages/users/ManageRoles'));
const SystemSettings = lazy(() => import('@/pages/systemAdmin/SystemSettings'));
const SecuritySettings = lazy(() => import('@/pages/systemAdmin/SecuritySettings'));
const PersonRegistration = lazy(() => import('@/pages/insuredPersons/PersonRegistration'));
const RegisterPersonTabs = lazy(() => import('@/pages/insuredPersons/RegisterPersonTabs'));
const PendingVerificationPage = lazy(() => import('@/pages/insuredPersons/PendingVerificationPage'));

// C3 Management
const C3Dashboard = lazy(() => import('@/pages/c3Management/C3Dashboard'));
const C3Management = lazy(() => import('@/pages/c3Management/C3Management'));
const C3InputForm = lazy(() => import('@/pages/c3Management/C3InputForm'));
const C3Simulation = lazy(() => import('@/pages/c3Management/C3Simulation'));


const C3Reports = lazy(() => import('@/pages/c3Management/C3Reports'));
const C3Verification = lazy(() => import('@/pages/c3Management/C3Verification'));
const ElectronicC3Config = lazy(() => import('@/pages/c3Management/ElectronicC3Config'));
const ViewC3Record = lazy(() => import('@/pages/c3Management/ViewC3Record'));
const EditC3Record = lazy(() => import('@/pages/c3Management/EditC3Record'));

// C3 Wizard Admin - Employer Management
const WizEmployerList = lazy(() => import('@/pages/c3Management/employers/WizEmployerList'));
const WizEmployerDetailsEdit = lazy(() => import('@/pages/c3Management/employers/WizEmployerDetailsEdit'));
const WizCompanyUsers = lazy(() => import('@/pages/c3Management/employers/WizCompanyUsers'));
const WizEmployeeList = lazy(() => import('@/pages/c3Management/employers/WizEmployeeList'));

// C3 Wizard Admin - Self-Employed Management
const WizSelfEmployedList = lazy(() => import('@/pages/c3Management/selfEmployed/WizSelfEmployedList'));
const WizSelfEmployedDetailsEdit = lazy(() => import('@/pages/c3Management/selfEmployed/WizSelfEmployedDetailsEdit'));
const WizSelfEmployedUserEdit = lazy(() => import('@/pages/c3Management/selfEmployed/WizSelfEmployedUserEdit'));

// C3 Wizard Admin - Manage Users Module
const WizEmployerUsers = lazy(() => import('@/pages/c3Management/manageUsers/WizEmployerUsers'));
const WizSelfEmployedUsers = lazy(() => import('@/pages/c3Management/manageUsers/WizSelfEmployedUsers'));
const WizRolePermission = lazy(() => import('@/pages/c3Management/manageUsers/WizRolePermission'));
const WizRoleMaster = lazy(() => import('@/pages/c3Management/manageUsers/WizRoleMaster'));

// C3 Wizard Admin - Payment Details
const WizPaymentDetails = lazy(() => import('@/pages/c3Management/payments/WizPaymentDetails'));

// C3 Wizard Admin - Reports
const WizEmployerHistory = lazy(() => import('@/pages/c3Management/reports/WizEmployerHistory'));
const WizSelfEmployedHistory = lazy(() => import('@/pages/c3Management/reports/WizSelfEmployedHistory'));
const WizPaymentsHistory = lazy(() => import('@/pages/c3Management/reports/WizPaymentsHistory'));
const WizReconciliationHistory = lazy(() => import('@/pages/c3Management/reports/WizReconciliationHistory'));
const WizUsersHistory = lazy(() => import('@/pages/c3Management/reports/WizUsersHistory'));
const ViewEmployer = lazy(() => import('@/pages/employersManagement/ViewEmployer').then((m) => ({ default: m.ViewEmployer })));
const EditEmployer = lazy(() => import('@/pages/employersManagement/EditEmployer').then((m) => ({ default: m.EditEmployer })));

// Test pages
const TestDataEntry = lazy(() => import('@/pages/test/TestDataEntry'));

// Legal Module pages
const NewLegalModule = lazy(() => import('@/pages/legal/NewLegalModule'));
const CaseIntake = lazy(() => import('@/pages/legal/CaseIntake'));
const IntakeDetail = lazy(() => import('@/pages/legal/IntakeDetail'));
const CaseTracking = lazy(() => import('@/pages/legal/CaseTracking'));
const CaseDetailView = lazy(() => import('@/pages/legal/CaseDetailView'));
const CaseEditView = lazy(() => import('@/pages/legal/CaseEditView'));
const LegalDashboard = lazy(() => import('@/pages/legal/LegalDashboard'));
const LegalWorkbench = lazy(() => import('@/pages/legal/LegalWorkbench'));
const DelinquentCases = lazy(() => import('@/pages/legal/DelinquentCases'));
const CourtOrdersManagement = lazy(() => import('@/pages/legal/CourtOrdersManagement'));
const EnforcementActions = lazy(() => import('@/pages/legal/EnforcementActions'));
const LegalPaymentPlans = lazy(() => import('@/pages/legal/LegalPaymentPlans'));
const CasesByStageReport = lazy(() => import('@/pages/legal/reports/CasesByStageReport'));
const RecoveryAnalysis = lazy(() => import('@/pages/legal/reports/RecoveryAnalysis'));
const AgingReceivables = lazy(() => import('@/pages/legal/reports/AgingReceivables'));
const CourtCostsFees = lazy(() => import('@/pages/legal/reports/CourtCostsFees'));
const PerformanceMetrics = lazy(() => import('@/pages/legal/reports/PerformanceMetrics'));
const PendingHearings = lazy(() => import('@/pages/legal/reports/PendingHearings'));
const CourtsJudges = lazy(() => import('@/pages/legal/settings/CourtsJudges'));
const HearingTypes = lazy(() => import('@/pages/legal/settings/HearingTypes'));
const CaseStatuses = lazy(() => import('@/pages/legal/settings/CaseStatuses'));
const LegalRoles = lazy(() => import('@/pages/legal/settings/LegalRoles'));
const FeeMappings = lazy(() => import('@/pages/legal/settings/FeeMappings'));
const TerritorySettings = lazy(() => import('@/pages/legal/settings/TerritorySettings'));

const MiscellaneousPayments = lazy(() => import('@/pages/cashier/MiscellaneousPayments'));
const C3Payments = lazy(() => import('@/pages/cashier/C3Payments'));
const EFTEntry = lazy(() => import('@/pages/cashier/EFTEntry'));
const CashDetails = lazy(() => import('@/pages/cashier/CashDetails'));
const FundsTransfer = lazy(() => import('@/pages/cashier/FundsTransfer'));
const Receipt = lazy(() => import('@/pages/cashier/Receipt'));
const CheckManagement = lazy(() => import('@/pages/cashier/CheckManagement'));
const PaymentAnalytics = lazy(() => import('@/pages/cashier/PaymentAnalytics'));
const CashierReports = lazy(() => import('@/pages/cashier/CashierReports'));
const CreateInvoice = lazy(() => import('@/pages/cashier/CreateInvoice'));
const SearchPayInvoices = lazy(() => import('@/pages/cashier/SearchPayInvoices'));
const BatchClosing = lazy(() => import('@/pages/cashier/BatchClosing'));
const CardMachineChangeRequests = lazy(() => import('@/pages/cashier/CardMachineChangeRequests'));
const CashierBatchManagement = lazy(() => import('@/pages/cashier/BatchManagement'));
const PaymentModuleConfig = lazy(() => import('@/pages/cashier/PaymentModuleConfig'));
const HeadCashierOfficeAssignment = lazy(() => import('@/pages/cashier/HeadCashierOfficeAssignment'));
const HeadCashierAssignment = lazy(() => import('@/pages/cashier/HeadCashierAssignment'));
const CardMachineManagement = lazy(() => import('@/pages/cashier/CardMachineManagement'));
const DailyInvoiceReport = lazy(() => import('@/pages/cashier/DailyInvoiceReport'));
const ChartAccountsMapping = lazy(() => import('@/pages/cashier/ChartAccountsMapping'));
const PaymentTypesMapping = lazy(() => import('@/pages/cashier/PaymentTypesMapping'));
const SageSynchronization = lazy(() => import('@/pages/cashier/SageSynchronization'));
const CurrentAccountsSetup = lazy(() => import('@/pages/cashier/CurrentAccountsSetup'));
const BankReconciliationAccounts = lazy(() => import('@/pages/cashier/BankReconciliationAccounts'));
const GLPostingSummary = lazy(() => import('@/pages/cashier/GLPostingSummary'));
const ContributionReceipts = lazy(() => import('@/pages/cashier/ContributionReceipts'));
const RentReceipts = lazy(() => import('@/pages/cashier/RentReceipts'));
const LoanReceipts = lazy(() => import('@/pages/cashier/LoanReceipts'));
const ServiceReceipts = lazy(() => import('@/pages/cashier/ServiceReceipts'));
const NoticeGeneration = lazy(() => import('@/pages/legal/NoticeGeneration'));
const AppealSubmission = lazy(() => import('@/pages/legal/AppealSubmission'));
const EnforcementPenalty = lazy(() => import('@/pages/legal/EnforcementPenalty'));
const LegalEvidenceManagement = lazy(() => import('@/pages/legal/EvidenceManagement'));
const LegalReports = lazy(() => import('@/pages/legal/LegalReports'));
const LegalReportsAnalytics = lazy(() => import('@/pages/legal/ReportsAnalytics'));
const LegalAdminConfig = lazy(() => import('@/pages/legal/AdminConfig'));
const CaseWorkflow = lazy(() => import('@/pages/legal/settings/CaseWorkflow'));

// LegalFinal Module pages
const LegalFinalDashboard = lazy(() => import('@/pages/legalFinal/LegalFinalDashboard').then((m) => ({ default: m.LegalFinalDashboard })));
const NewCaseForm = lazy(() => import('@/pages/legalFinal/NewCaseForm').then((m) => ({ default: m.NewCaseForm })));
const LegalCaseManagement = lazy(() => import('@/pages/legalFinal/CaseManagement').then((m) => ({ default: m.CaseManagement })));
const LegalFinalReports = lazy(() => import('@/pages/legalFinal/LegalReports').then((m) => ({ default: m.LegalReports })));
const CaseStatusUpdateForm = lazy(() => import('@/pages/legalFinal/CaseStatusUpdateForm').then((m) => ({ default: m.CaseStatusUpdateForm })));
const DocumentUploadForm = lazy(() => import('@/pages/legalFinal/DocumentUploadForm').then((m) => ({ default: m.DocumentUploadForm })));
const HearingJudgmentForm = lazy(() => import('@/pages/legalFinal/HearingJudgmentForm').then((m) => ({ default: m.HearingJudgmentForm })));
const EnforcementForm = lazy(() => import('@/pages/legalFinal/EnforcementForm').then((m) => ({ default: m.EnforcementForm })));
const HearingSchedule = lazy(() => import('@/pages/legalFinal/HearingSchedule').then((m) => ({ default: m.HearingSchedule })));
const EnforcementManagement = lazy(() => import('@/pages/legalFinal/EnforcementManagement').then((m) => ({ default: m.EnforcementManagement })));

// BeMA Compliance Pages (lazy loaded)

// Notification Pages
const NotificationDashboard = lazy(() => import('@/pages/notifications/NotificationDashboard'));
const TemplateManagement = lazy(() => import('@/pages/notifications/TemplateManagement'));
const ActionMapping = lazy(() => import('@/pages/notifications/ActionMapping'));
const DeliveryManagement = lazy(() => import('@/pages/notifications/DeliveryManagement'));
const UserPreferences = lazy(() => import('@/pages/notifications/UserPreferences'));
// NotificationCenter already imported above
const ReportsAnalytics = lazy(() => import('@/pages/notifications/ReportsAnalytics'));
const Administration = lazy(() => import('@/pages/notifications/Administration'));

// NewBenefit Pages
const ContributorDashboard = lazy(() => import('@/pages/newBenefit/ContributorDashboard').then((m) => ({ default: m.ContributorDashboard })));
const ApplyForBenefits = lazy(() => import('@/pages/newBenefit/ApplyForBenefits').then((m) => ({ default: m.ApplyForBenefits })));
const BenefitApplicationForm = lazy(() => import('@/pages/newBenefit/BenefitApplicationForm').then((m) => ({ default: m.BenefitApplicationForm })));
const NewReferralForm = lazy(() => import('@/pages/newBenefit/NewReferralForm').then((m) => ({ default: m.NewReferralForm })));
const NewVerificationRequest = lazy(() => import('@/pages/newBenefit/NewVerificationRequest').then((m) => ({ default: m.NewVerificationRequest })));
const EmploymentVerificationDetail = lazy(() => import('@/pages/newBenefit/EmploymentVerificationDetail').then((m) => ({ default: m.EmploymentVerificationDetail })));
const MyClaims = lazy(() => import('@/pages/newBenefit/MyClaims').then((m) => ({ default: m.MyClaims })));
const ContributorReports = lazy(() => import('@/pages/newBenefit/ContributorReports').then((m) => ({ default: m.ContributorReports })));
const ContributorInbox = lazy(() => import('@/pages/newBenefit/ContributorInbox').then((m) => ({ default: m.ContributorInbox })));
const WorklistsHome = lazy(() => import('@/pages/newBenefit/WorklistsHome').then((m) => ({ default: m.WorklistsHome })));
const Claim360View = lazy(() => import('@/pages/newBenefit/Claim360View').then((m) => ({ default: m.Claim360View })));
const IntakeConsole = lazy(() => import('@/pages/newBenefit/IntakeConsole').then((m) => ({ default: m.IntakeConsole })));
const MedicalBoardHub = lazy(() => import('@/pages/newBenefit/MedicalBoardHub').then((m) => ({ default: m.MedicalBoardHub })));
const EmployerHub = lazy(() => import('@/pages/newBenefit/EmployerHub').then((m) => ({ default: m.EmployerHub })));
const PensionAdministration = lazy(() => import('@/pages/newBenefit/PensionAdministration').then((m) => ({ default: m.PensionAdministration })));
const PaymentsModule = lazy(() => import('@/pages/newBenefit/PaymentsModule').then((m) => ({ default: m.PaymentsModule })));
const LettersCommunications = lazy(() => import('@/pages/newBenefit/LettersCommunications'));
const AdminConfig = lazy(() => import('@/pages/newBenefit/AdminConfig'));
const AuditorView = lazy(() => import('@/pages/newBenefit/AuditorView'));

// Benefit Management Module (bn_)
const BenefitsDashboard = lazy(() => import('@/pages/bn/dashboard/BenefitsDashboard'));
const BnProductCatalog = lazy(() => import('@/pages/bn/config/ProductCatalog'));
const BnProductEditor = lazy(() => import('@/pages/bn/config/ProductEditor'));
const BnClaimWorklist = lazy(() => import('@/pages/bn/claims/ClaimWorklist'));
const BnClaim360 = lazy(() => import('@/pages/bn/claims/Claim360'));
const BnClaimWorkbench = lazy(() => import('@/pages/bn/claims/ClaimWorkbench'));
const BnCalculationEngine = lazy(() => import('@/pages/bn/engine/CalculationEngine'));
const BnBenefitDetermination = lazy(() => import('@/pages/bn/claims/BenefitDetermination'));
const BnClaimRegistration = lazy(() => import('@/pages/bn/intake/ClaimRegistration'));
const BnApprovalConsole = lazy(() => import('@/pages/bn/approval/ApprovalConsole'));
const BnApprovalQueue = lazy(() => import('@/pages/bn/approval/ApprovalQueue'));
const BnAdjudicationWorkspace = lazy(() => import('@/pages/bn/approval/AdjudicationWorkspace'));
const BnEligibilityReview = lazy(() => import('@/pages/bn/claims/EligibilityReview'));
const BnCalculationWorkspace = lazy(() => import('@/pages/bn/engine/CalculationWorkspace'));
const BnDeterminationRecommendation = lazy(() => import('@/pages/bn/claims/DeterminationRecommendation'));
const BnEntitlementManagement = lazy(() => import('@/pages/bn/entitlement/EntitlementManagement'));
const BnPayablesQueue = lazy(() => import('@/pages/bn/payables/PayablesQueue'));
const BnPaymentSchedule = lazy(() => import('@/pages/bn/schedule/PaymentScheduleManagement'));
const BnBatchOperations = lazy(() => import('@/pages/bn/batch/BatchOperations'));
const BnPaymentIssue = lazy(() => import('@/pages/bn/issue/PaymentIssue'));
const BnPostIssueReview = lazy(() => import('@/pages/bn/postissue/PostIssueReview'));
const BnHistoricalInquiry = lazy(() => import('@/pages/bn/history/HistoricalInquiry'));
const BnClaimQueue = lazy(() => import('@/pages/bn/claims/ClaimQueue'));
const BnReasonCodes = lazy(() => import('@/pages/bn/config/ReasonCodes'));
const BnTransitionMatrix = lazy(() => import('@/pages/bn/config/TransitionMatrix'));
const BnWorkbasketConfig = lazy(() => import('@/pages/bn/config/WorkbasketConfig'));
const BnEscalationConfig = lazy(() => import('@/pages/bn/config/EscalationConfig'));
const BnServiceDocTypes = lazy(() => import('@/pages/bn/config/ServiceDocTypes'));
const BnCountryPackPage = lazy(() => import('@/pages/bn/config/country/CountryPackPage'));
const BnCountryIdRules = lazy(() => import('@/pages/bn/config/country/CountryIdRules'));
const BnCountryAddressModel = lazy(() => import('@/pages/bn/config/country/CountryAddressModel'));
const BnCountryParticipantTypes = lazy(() => import('@/pages/bn/config/country/CountryParticipantTypes'));
const BnCountryPaymentConfig = lazy(() => import('@/pages/bn/config/country/CountryPaymentConfig'));
const BnCountryLegalRefs = lazy(() => import('@/pages/bn/config/country/CountryLegalRefs'));
const BnRuleConfiguration = lazy(() => import('@/pages/bn/config/RuleConfiguration'));
const BnRulesAdministration = lazy(() => import('@/pages/bn/config/RulesAdministration'));
const BnFormulaConfiguration = lazy(() => import('@/pages/bn/config/FormulaConfiguration'));
const BnDocumentSetup = lazy(() => import('@/pages/bn/config/DocumentSetup'));
const BnScreenMetadataSetup = lazy(() => import('@/pages/bn/config/ScreenMetadataSetup'));
// Medical Benefit Setup
const BnMedicalSetupHome = lazy(() => import('@/pages/bn/config/medical/MedicalSetupHome'));
const BnMedicalProceduresCatalog = lazy(() => import('@/pages/bn/config/medical/MedicalProceduresCatalog'));
const BnFacilityAvailabilityMatrix = lazy(() => import('@/pages/bn/config/medical/FacilityAvailabilityMatrix'));
const BnReferralRulesPage = lazy(() => import('@/pages/bn/config/medical/ReferralRulesPage'));
const BnReimbursementLimitsPage = lazy(() => import('@/pages/bn/config/medical/ReimbursementLimitsPage'));
const BnExpenseTypeConfiguration = lazy(() => import('@/pages/bn/config/medical/ExpenseTypeConfiguration'));
const BnMedicalReviewRulesPage = lazy(() => import('@/pages/bn/config/medical/MedicalReviewRulesPage'));
const BnMedicalDocumentsPage = lazy(() => import('@/pages/bn/config/medical/MedicalDocumentsPage'));
const BnSimulationDashboard = lazy(() => import('@/pages/bn/simulation/SimulationDashboard'));
const BnScenarioBuilder = lazy(() => import('@/pages/bn/simulation/ScenarioBuilder'));
const BnRunSimulation = lazy(() => import('@/pages/bn/simulation/RunSimulation'));
const BnSimulationResult = lazy(() => import('@/pages/bn/simulation/SimulationResultSummary'));
const BnPerson360 = lazy(() => import('@/pages/bn/person360/BnPerson360'));
const BnPaymentExceptions = lazy(() => import('@/pages/bn/issue/PaymentExceptions'));
const BnPostIssueEnhanced = lazy(() => import('@/pages/bn/postissue/PostIssueEnhanced'));
const BnClaimWorklistEnhanced = lazy(() => import('@/pages/bn/claims/ClaimWorklistEnhanced'));
const BnPaymentHistoryInquiry = lazy(() => import('@/pages/bn/history/PaymentHistoryInquiry'));
const BnAuditDecisionHistory = lazy(() => import('@/pages/bn/history/AuditDecisionHistory'));
const BnLifeCertificateManagement = lazy(() => import('@/pages/bn/servicing/LifeCertificateManagement'));
const BnMedicalReviewScheduler = lazy(() => import('@/pages/bn/servicing/MedicalReviewScheduler'));
const BnOverpaymentRecovery = lazy(() => import('@/pages/bn/servicing/OverpaymentRecovery'));
const BnAwardSuspensionConsole = lazy(() => import('@/pages/bn/servicing/AwardSuspensionConsole'));
const BnSurvivorsBenefitProcessing = lazy(() => import('@/pages/bn/servicing/SurvivorsBenefitProcessing'));

// SSB Legal Module - already imported above
const CaseIntakeWizard = lazy(() => import('@/pages/legal/CaseIntakeWizard'));

// BeMA Compliance - deprecated, routes redirect to /compliance/*
const IATemplatesManagement = lazy(() => import("@/pages/audit/TemplatesManagement"));

// Authentication
const DummyLoginPage = lazy(() => import('@/pages/auth/DummyLoginPage'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const ChangePasswordPage = lazy(() => import('@/pages/auth/ChangePassword').then((m) => ({ default: m.ChangePassword })));
const MFAVerify = lazy(() => import('@/pages/auth/MFAVerify'));
const BootstrapAdmin = lazy(() => import('@/pages/setup/BootstrapAdmin'));

// Foundation Components Demo
const FoundationComponentsDemo = lazy(() => import('@/pages/FoundationComponentsDemo'));
const FeeConfiguration = lazy(() => import('@/pages/admin/FeeConfiguration'));
const IPCardConfiguration = lazy(() => import('@/pages/admin/IPCardConfiguration'));
const KnowledgeBaseAdmin = lazy(() => import('@/pages/admin/settings/KnowledgeBaseAdmin'));

// Report Pages
const InsuredPersonsSummaryReport = lazy(() => import('@/pages/reports/insured-persons/InsuredPersonsSummaryReport'));
const CoverageByAgeReport = lazy(() => import('@/pages/reports/insured-persons/CoverageByAgeReport'));
const ContributionHistoryReport = lazy(() => import('@/pages/reports/insured-persons/ContributionHistoryReport'));
const RegisteredSummaryReport = lazy(() => import('@/pages/reports/employers/RegisteredSummaryReport'));
const ActiveInactiveReport = lazy(() => import('@/pages/reports/employers/ActiveInactiveReport'));
const ContributionComplianceReport = lazy(() => import('@/pages/reports/employers/ContributionComplianceReport'));
const NonPaying3MonthsReport = lazy(() => import('@/pages/reports/employers/NonPaying3MonthsReport'));
const NonPaying6MonthsReport = lazy(() => import('@/pages/reports/employers/NonPaying6MonthsReport'));
const NonPaying9MonthsReport = lazy(() => import('@/pages/reports/employers/NonPaying9MonthsReport'));
const TopMissingC3Report = lazy(() => import('@/pages/reports/employers/TopMissingC3Report'));
const MissingC3PerZoneReport = lazy(() => import('@/pages/reports/employers/MissingC3PerZoneReport'));
const C3WithoutPaymentReport = lazy(() => import('@/pages/reports/employers/C3WithoutPaymentReport'));
const NoPaymentPerZoneReport = lazy(() => import('@/pages/reports/employers/NoPaymentPerZoneReport'));
const EmployeeTurnoverReport = lazy(() => import('@/pages/reports/employers/EmployeeTurnoverReport'));
const ByEmployeeCountReport = lazy(() => import('@/pages/reports/employers/ByEmployeeCountReport'));
const ByMonthlyContributionsReport = lazy(() => import('@/pages/reports/employers/ByMonthlyContributionsReport'));
const ByArrearsReport = lazy(() => import('@/pages/reports/employers/ByArrearsReport'));
const ByWaiversReport = lazy(() => import('@/pages/reports/employers/ByWaiversReport'));
const WaiversPerZoneReport = lazy(() => import('@/pages/reports/employers/WaiversPerZoneReport'));
const EmployeesPerZoneReport = lazy(() => import('@/pages/reports/employers/EmployeesPerZoneReport'));
const ContributionsPerZoneReport = lazy(() => import('@/pages/reports/employers/ContributionsPerZoneReport'));
const QueriesPerZoneReport = lazy(() => import('@/pages/reports/employers/QueriesPerZoneReport'));
const MostQueriesReport = lazy(() => import('@/pages/reports/employers/MostQueriesReport'));
const ByLitigationCountReport = lazy(() => import('@/pages/reports/employers/ByLitigationCountReport'));
const ArrearsPerZoneReport = lazy(() => import('@/pages/reports/employers/ArrearsPerZoneReport'));
const ArrearsOver50kReport = lazy(() => import('@/pages/reports/employers/ArrearsOver50kReport'));
const ArrearsOver100kReport = lazy(() => import('@/pages/reports/employers/ArrearsOver100kReport'));
const ArrearsOver200kReport = lazy(() => import('@/pages/reports/employers/ArrearsOver200kReport'));
const ArrearsOver300kReport = lazy(() => import('@/pages/reports/employers/ArrearsOver300kReport'));
const ArrearsOver400kReport = lazy(() => import('@/pages/reports/employers/ArrearsOver400kReport'));
const Arrears50kByZoneReport = lazy(() => import('@/pages/reports/employers/Arrears50kByZoneReport'));
const TopCompliantReport = lazy(() => import('@/pages/reports/employers/TopCompliantReport'));
const Arrears30DaysReport = lazy(() => import('@/pages/reports/employers/Arrears30DaysReport'));
const Arrears60DaysReport = lazy(() => import('@/pages/reports/employers/Arrears60DaysReport'));
const Arrears90DaysReport = lazy(() => import('@/pages/reports/employers/Arrears90DaysReport'));
const ArrearsOver90DaysReport = lazy(() => import('@/pages/reports/employers/ArrearsOver90DaysReport'));
const UnderLitigationReport = lazy(() => import('@/pages/reports/employers/UnderLitigationReport'));
const WithPaymentPlansReport = lazy(() => import('@/pages/reports/employers/WithPaymentPlansReport'));
const DefaultedPlansReport = lazy(() => import('@/pages/reports/employers/DefaultedPlansReport'));
const CeasedEmployersReport = lazy(() => import('@/pages/reports/employers/CeasedEmployersReport'));
const OutOfFederationReport = lazy(() => import('@/pages/reports/employers/OutOfFederationReport'));
const DeceasedEmployersReport = lazy(() => import('@/pages/reports/employers/DeceasedEmployersReport'));
const OverseasSubmissionsReport = lazy(() => import('@/pages/reports/employers/OverseasSubmissionsReport'));
const NILReturns3MonthsReport = lazy(() => import('@/pages/reports/employers/NILReturns3MonthsReport'));
const NILReturnsOver3MonthsReport = lazy(() => import('@/pages/reports/employers/NILReturnsOver3MonthsReport'));
const MonthlyCollectionsReport = lazy(() => import('@/pages/reports/c3/MonthlyCollectionsReport'));
const ArrearsReport = lazy(() => import('@/pages/reports/c3/ArrearsReport'));
const TopContributorsReport = lazy(() => import('@/pages/reports/c3/TopContributorsReport'));
const ContributionsVsBenefitsReport = lazy(() => import('@/pages/reports/finance/ContributionsVsBenefitsReport'));
const CashFlowReport = lazy(() => import('@/pages/reports/finance/CashFlowReport'));
const InvestmentPortfolioReport = lazy(() => import('@/pages/reports/finance/InvestmentPortfolioReport'));
const PaymentsByTypeReport = lazy(() => import('@/pages/reports/benefits/PaymentsByTypeReport'));
const ClaimsVolumeReport = lazy(() => import('@/pages/reports/benefits/ClaimsVolumeReport'));
const OverpaymentsReport = lazy(() => import('@/pages/reports/benefits/OverpaymentsReport'));
const EmployerStatusReport = lazy(() => import('@/pages/reports/compliance/EmployerStatusReport'));
const EngagementSummaryReport = lazy(() => import('@/pages/reports/audit/EngagementSummaryReport'));
const CommunicationComplianceReport = lazy(() => import('@/pages/reports/audit/CommunicationComplianceReport'));
const PlanSlippageReport = lazy(() => import('@/pages/reports/audit/PlanSlippageReport'));
const OverdueActionsReport = lazy(() => import('@/pages/reports/audit/OverdueActionsReport'));
const CarryForwardAgingReport = lazy(() => import('@/pages/reports/audit/CarryForwardAgingReport'));
const AccountRolesReport = lazy(() => import('@/pages/reports/admin/AccountRolesReport'));
const PermissionChangesReport = lazy(() => import('@/pages/reports/admin/PermissionChangesReport'));
const ConfigurationAuditReport = lazy(() => import('@/pages/reports/admin/ConfigurationAuditReport'));

// Finance Module
const FinanceDashboard = lazy(() => import('@/pages/finance/FinanceDashboard'));
const BatchManagement = lazy(() => import('@/pages/finance/BatchManagement'));
const PaymentEntry = lazy(() => import('@/pages/finance/PaymentEntry'));
const ReceiptSearch = lazy(() => import('@/pages/finance/ReceiptSearch'));
const InvoiceManagement = lazy(() => import('@/pages/finance/InvoiceManagement'));
const GLExport = lazy(() => import('@/pages/finance/GLExport'));
const DailyReports = lazy(() => import('@/pages/finance/DailyReports'));
const ReversalsAndPenalties = lazy(() => import('@/pages/finance/ReversalsAndPenalties'));
const AdminConfiguration = lazy(() => import('@/pages/finance/AdminConfiguration'));
const FinanceUserManagement = lazy(() => import('@/pages/finance/UserManagement'));
const IncomeCategoryManagement = lazy(() => import('@/pages/admin/IncomeCategoryManagement'));
const SepContribRateManagement = lazy(() => import('@/pages/admin/SepContribRateManagement'));
const IncomeCodeManagement = lazy(() => import('@/pages/admin/IncomeCodeManagement'));

// Master Data CRUD Pages
const ActivityManagement = lazy(() => import('@/pages/admin/master-data/ActivityManagement'));
const BankCodeManagement = lazy(() => import('@/pages/admin/master-data/BankCodeManagement'));
const BatchStatusManagement = lazy(() => import('@/pages/admin/master-data/BatchStatusManagement'));
const PayPeriodManagement = lazy(() => import('@/pages/admin/master-data/PayPeriodManagement'));
const C3StatusManagement = lazy(() => import('@/pages/admin/master-data/C3StatusManagement'));
const CountryManagement = lazy(() => import('@/pages/admin/master-data/CountryManagement'));
const DependentRelationManagement = lazy(() => import('@/pages/admin/master-data/DependentRelationManagement'));
const DistrictManagement = lazy(() => import('@/pages/admin/master-data/DistrictManagement'));
const EyeColorManagement = lazy(() => import('@/pages/admin/master-data/EyeColorManagement'));
const IndustryManagement = lazy(() => import('@/pages/admin/master-data/IndustryManagement'));
const InspectorMDManagement = lazy(() => import('@/pages/admin/master-data/InspectorManagement'));
const InvoiceStatusMDManagement = lazy(() => import('@/pages/admin/master-data/InvoiceStatusManagement'));
const InvoiceTypesMDManagement = lazy(() => import('@/pages/admin/master-data/InvoiceTypesManagement'));
const LegalStatusManagement = lazy(() => import('@/pages/admin/master-data/LegalStatusManagement'));
const MaritalStatusManagement = lazy(() => import('@/pages/admin/master-data/MaritalStatusManagement'));
const MerchantManagement = lazy(() => import('@/pages/admin/master-data/MerchantManagement'));
const MethodOfPaymentManagement = lazy(() => import('@/pages/admin/master-data/MethodOfPaymentManagement'));
const OccupationManagement = lazy(() => import('@/pages/admin/master-data/OccupationManagement'));
const PayerTypeManagement = lazy(() => import('@/pages/admin/master-data/PayerTypeManagement'));
const PaymentSourcesManagement = lazy(() => import('@/pages/admin/master-data/PaymentSourcesManagement'));
const PaymentTypeMDManagement = lazy(() => import('@/pages/admin/master-data/PaymentTypeManagement'));
const PenaltyMDManagement = lazy(() => import('@/pages/admin/master-data/PenaltyManagement'));
const PostalDistrictManagement = lazy(() => import('@/pages/admin/master-data/PostalDistrictManagement'));
const ReceiptStatusManagement = lazy(() => import('@/pages/admin/master-data/ReceiptStatusManagement'));
const RelationManagement = lazy(() => import('@/pages/admin/master-data/RelationManagement'));
const SectorManagement = lazy(() => import('@/pages/admin/master-data/SectorManagement'));
const SscRatesManagement = lazy(() => import('@/pages/admin/master-data/SscRatesManagement'));
const VcContribRateManagement = lazy(() => import('@/pages/admin/master-data/VcContribRateManagement'));
const VcEligibilityConfigManagement = lazy(() => import('@/pages/admin/master-data/VcEligibilityConfigManagement'));
const VerifyManagement = lazy(() => import('@/pages/admin/master-data/VerifyManagement'));
const VillagesManagement = lazy(() => import('@/pages/admin/master-data/VillagesManagement'));
const DesignationMasterManagement = lazy(() => import('@/pages/admin/master-data/DesignationMasterManagement'));

// Contribution Payments Module
const PaymentDataEntry = lazy(() => import('@/pages/cashier/PaymentDataEntry'));
const PaymentHistoricalEntry = lazy(() => import('@/pages/cashier/PaymentHistoricalEntry'));
const PaymentHistoryManagement = lazy(() => import('@/pages/cashier/PaymentHistoryManagement'));
const TransferPayments = lazy(() => import('@/pages/cashier/TransferPayments'));
const PaymentHistoryReport = lazy(() => import('@/pages/cashier/PaymentHistoryReport'));
const VCPaymentUpdate = lazy(() => import('@/pages/cashier/VCPaymentUpdate'));

const routeFallback = <div className="min-h-screen bg-background" />;

export const AppRoutes = () => {
  return (
    <Suspense fallback={routeFallback}>
      <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/acknowledge-audit/:token" element={<AuditReportAcknowledgePage />} />
      <Route path="/setup" element={<BootstrapAdmin />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      <Route path="/mfa-verify" element={<MFAVerify />} />
      <Route path="/inspector/login" element={<InspectorLogin />} />
      <Route path="/public/api-docs" element={<PublicApiDocs />} />
      
      {/* Inspector Routes */}
      <Route path="/inspector" element={<InspectorLayout />}>
        <Route path="dashboard" element={<InspectorDashboard />} />
        <Route path="plan" element={<Suspense fallback={<div>Loading...</div>}><InspectorWeeklyPlan /></Suspense>} />
        <Route path="activities" element={<Suspense fallback={<div>Loading...</div>}><InspectorActivities /></Suspense>} />
        <Route path="violations" element={<Suspense fallback={<div>Loading...</div>}><InspectorViolations /></Suspense>} />
        <Route path="violations/record" element={<Suspense fallback={<div>Loading...</div>}><RecordViolationForm /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<div>Loading...</div>}><InspectorReports /></Suspense>} />
      </Route>
      <Route path="/demo-login" element={<DummyLoginPage />} />
      <Route path="/components-demo" element={<ProtectedLayout><FoundationComponentsDemo /></ProtectedLayout>} />
      
      {/* Dashboard */}
      <Route path="/" element={<ProtectedLayout><Index /></ProtectedLayout>} />

      {/* Embedded satellite micro-frontends (iframe + postMessage bridge) */}
      <Route
        path="/compliance-hub/*"
        element={
          <ProtectedLayout>
            <Suspense fallback={<div>Loading...</div>}>
              <SatelliteFrame app="compliance" basePath="compliance-hub" title="Compliance & Enforcement" />
            </Suspense>
          </ProtectedLayout>
        }
      />
      <Route
        path="/audit-hub/*"
        element={
          <ProtectedLayout>
            <Suspense fallback={<div>Loading...</div>}>
              <SatelliteFrame app="audit" basePath="audit-hub" title="Internal Audit" />
            </Suspense>
          </ProtectedLayout>
        }
      />
      
      {/* Employers Management Routes */}
      <Route path="/employers-management/dashboard" element={<ProtectedLayout><EmployersDashboard /></ProtectedLayout>} />
      <Route path="/employers-management/manage" element={<ProtectedLayout><ManageEmployers /></ProtectedLayout>} />
      <Route path="/employers-management/add" element={<ProtectedLayout><AddEmployer /></ProtectedLayout>} />
      <Route path="/employers-management/view/:regNo" element={<ProtectedLayout><ViewEmployer /></ProtectedLayout>} />
      <Route path="/employers-management/edit/:regNo" element={<ProtectedLayout><EditEmployer /></ProtectedLayout>} />
      <Route path="/employers-management/reports" element={<ProtectedLayout><EmployersReports /></ProtectedLayout>} />
      <Route path="/employers-management/pending-verification" element={<ProtectedLayout><PendingVerificationPage /></ProtectedLayout>} />

      {/* C3 Management Routes */}
      <Route path="/c3-management/dashboard" element={<ProtectedLayout><C3Dashboard /></ProtectedLayout>} />
      <Route path="/c3-management/manage" element={<ProtectedLayout><C3Management /></ProtectedLayout>} />
      <Route path="/c3-management/add" element={<ProtectedLayout><C3InputForm /></ProtectedLayout>} />
      

      <Route path="/c3-management/input-form" element={<ProtectedLayout><C3InputForm /></ProtectedLayout>} />
      <Route path="/c3-management/reports" element={<ProtectedLayout><C3Reports /></ProtectedLayout>} />
      <Route path="/c3-management/verification" element={<ProtectedLayout><C3Verification /></ProtectedLayout>} />
      <Route path="/c3-management/configure-electronic-c3" element={<ProtectedLayout><ElectronicC3Config /></ProtectedLayout>} />
      <Route path="/c3-management/view/:id" element={<ProtectedLayout><ViewC3Record /></ProtectedLayout>} />
      <Route path="/c3-management/edit/:id" element={<ProtectedLayout><EditC3Record /></ProtectedLayout>} />
      <Route path="/c3-management/simulation" element={<ProtectedLayout><C3Simulation /></ProtectedLayout>} />
      
      {/* C3 Wizard Admin - Employer Management Routes */}
      <Route path="/c3-management/employer-details" element={<ProtectedLayout><WizEmployerList /></ProtectedLayout>} />
      <Route path="/c3-management/employer-details/:companyId" element={<ProtectedLayout><WizEmployerDetailsEdit /></ProtectedLayout>} />
      <Route path="/c3-management/employer-users/:companyId" element={<ProtectedLayout><WizCompanyUsers /></ProtectedLayout>} />
      <Route path="/c3-management/employer-employees/:companyId" element={<ProtectedLayout><WizEmployeeList /></ProtectedLayout>} />
      
      {/* C3 Wizard Admin - Self-Employed Management Routes */}
      <Route path="/c3-management/self-employed-details" element={<ProtectedLayout><WizSelfEmployedList /></ProtectedLayout>} />
      <Route path="/c3-management/self-employed-details/:selfEmployedId" element={<ProtectedLayout><WizSelfEmployedDetailsEdit /></ProtectedLayout>} />
      <Route path="/c3-management/self-employed-user/:userId" element={<ProtectedLayout><WizSelfEmployedUserEdit /></ProtectedLayout>} />

      {/* C3 Wizard Admin - Manage Users Module */}
      <Route path="/c3-management/users/employers" element={<ProtectedLayout><WizEmployerUsers /></ProtectedLayout>} />
      <Route path="/c3-management/users/self-employed" element={<ProtectedLayout><WizSelfEmployedUsers /></ProtectedLayout>} />
      <Route path="/c3-management/users/role-permission" element={<ProtectedLayout><WizRolePermission /></ProtectedLayout>} />
      <Route path="/c3-management/users/role-master" element={<ProtectedLayout><WizRoleMaster /></ProtectedLayout>} />

      {/* C3 Details - Contribution Screens */}
      <Route path="/c3-management/c3-contribution" element={<ProtectedLayout><C3ContributionList /></ProtectedLayout>} />
      <Route path="/c3-management/nw-director" element={<ProtectedLayout><NwDirectorList /></ProtectedLayout>} />
      <Route path="/c3-management/self-employed-c3" element={<ProtectedLayout><SelfEmployedContributionList /></ProtectedLayout>} />
      <Route path="/c3-management/offline-payment/:entityType/:headerId" element={<ProtectedLayout><OfflinePaymentPage /></ProtectedLayout>} />

      {/* C3 Wizard Admin - Payment Details Route */}
      <Route path="/c3-management/payment-details" element={<ProtectedLayout><WizPaymentDetails /></ProtectedLayout>} />
      <Route path="/c3-management/payments" element={<ProtectedLayout><WizPaymentDetails /></ProtectedLayout>} />
      
      {/* C3 Settings Routes */}
      <Route path="/c3-management/settings/levy/schemes" element={<ProtectedLayout><LevySchemesList /></ProtectedLayout>} />
      <Route path="/c3-management/settings/levy/schemes/:schemeId" element={<ProtectedLayout><LevySchemeDetail /></ProtectedLayout>} />
      <Route path="/c3-management/settings/levy/simulator" element={<ProtectedLayout><LevySimulator /></ProtectedLayout>} />
      <Route path="/c3-management/settings/ss/schemes" element={<ProtectedLayout><SSSchemesList /></ProtectedLayout>} />
      <Route path="/c3-management/settings/ss/schemes/:schemeId" element={<ProtectedLayout><SSSchemeDetail /></ProtectedLayout>} />
      <Route path="/c3-management/settings/ss/simulator" element={<ProtectedLayout><SSSimulator /></ProtectedLayout>} />
      <Route path="/c3-management/settings/severance/schemes" element={<ProtectedLayout><SeveranceSchemesList /></ProtectedLayout>} />
      <Route path="/c3-management/settings/severance/schemes/:schemeId" element={<ProtectedLayout><SeveranceSchemeDetail /></ProtectedLayout>} />
      <Route path="/c3-management/settings/severance/simulator" element={<ProtectedLayout><SeveranceSimulator /></ProtectedLayout>} />
      <Route path="/c3-management/settings/injury/schemes" element={<ProtectedLayout><InjurySchemesList /></ProtectedLayout>} />
      <Route path="/c3-management/settings/injury/schemes/:schemeId" element={<ProtectedLayout><InjurySchemeDetail /></ProtectedLayout>} />
      <Route path="/c3-management/settings/injury/simulator" element={<ProtectedLayout><InjurySimulator /></ProtectedLayout>} />
      <Route path="/c3-management/settings/c3file/formats" element={<ProtectedLayout><C3FormatsList /></ProtectedLayout>} />
      <Route path="/c3-management/settings/c3file/formats/:formatId" element={<ProtectedLayout><C3FormatDetail /></ProtectedLayout>} />
      <Route path="/c3-management/settings/cybersource" element={<Navigate to="/c3-management/settings-configuration" replace />} />
      <Route path="/c3-management/settings-configuration" element={<ProtectedLayout><SettingsConfiguration /></ProtectedLayout>} />
      <Route path="/c3-management/email-templates" element={<ProtectedLayout><EmailTemplates /></ProtectedLayout>} />
      <Route path="/c3-management/reconciliation" element={<ProtectedLayout><ReconciliationPage /></ProtectedLayout>} />

      {/* C3 Wizard Admin - Reports Routes */}
      <Route path="/c3-management/reports/employer-history" element={<ProtectedLayout><WizEmployerHistory /></ProtectedLayout>} />
      <Route path="/c3-management/reports/self-employed-history" element={<ProtectedLayout><WizSelfEmployedHistory /></ProtectedLayout>} />
      <Route path="/c3-management/reports/payments-history" element={<ProtectedLayout><WizPaymentsHistory /></ProtectedLayout>} />
      <Route path="/c3-management/reports/reconciliation-history" element={<ProtectedLayout><WizReconciliationHistory /></ProtectedLayout>} />
      <Route path="/c3-management/reports/users-history" element={<ProtectedLayout><WizUsersHistory /></ProtectedLayout>} />

      <Route path="/self-employed/manage" element={<ProtectedLayout><ManageSelfEmployed /></ProtectedLayout>} />
      <Route path="/self-employed/add" element={<ProtectedLayout><AddSelfEmployed /></ProtectedLayout>} />
      <Route path="/self-employed/reports" element={<ProtectedLayout><SelfEmployedReports /></ProtectedLayout>} />

      {/* ═══════════════════════════════════════════════════════════════
          COMPLIANCE MODULE — Canonical Routes (new structure)
          ═══════════════════════════════════════════════════════════════ */}

      {/* ── Workbench ── */}
      <Route path="/compliance/workbench" element={<ProtectedLayout><WorkbenchLanding /></ProtectedLayout>} />
      <Route path="/compliance/workbench/manager" element={<ProtectedLayout><ComplianceManagerDashboard /></ProtectedLayout>} />
      <Route path="/compliance/workbench/inspector" element={<ProtectedLayout><ComplianceInspectorDashboard /></ProtectedLayout>} />
      <Route path="/compliance/workbench/legal" element={<ProtectedLayout><ComplianceLegalDashboard /></ProtectedLayout>} />
      <Route path="/compliance/workbench/analytics" element={<ProtectedLayout><ComplianceAnalytics /></ProtectedLayout>} />
      <Route path="/compliance/workbench/monitoring" element={<ProtectedLayout><ComplianceMonitoring /></ProtectedLayout>} />
      <Route path="/compliance/workbench/queues" element={<ProtectedLayout><AssignmentQueues /></ProtectedLayout>} />
      <Route path="/compliance/workbench/review-queue" element={<ProtectedLayout><ReviewQueue /></ProtectedLayout>} />
      <Route path="/compliance/workbench/reassignment" element={<ProtectedLayout><Reassignment /></ProtectedLayout>} />

      {/* ── Violations ── */}
      <Route path="/compliance/violations" element={<ProtectedLayout><ViolationsManagement /></ProtectedLayout>} />
      <Route path="/compliance/violations/manual-entry" element={<ProtectedLayout><ManualViolationEntry /></ProtectedLayout>} />
      <Route path="/compliance/violations/:id" element={<ProtectedLayout><ViolationDetails /></ProtectedLayout>} />

      {/* ── Cases ── */}
      <Route path="/compliance/cases" element={<ProtectedLayout><ComplianceCaseManagement /></ProtectedLayout>} />
      <Route path="/compliance/cases/queue" element={<ProtectedLayout><ComplianceCaseQueue /></ProtectedLayout>} />
      <Route path="/compliance/cases/penalties" element={<ProtectedLayout><PenaltyManagement /></ProtectedLayout>} />
      <Route path="/compliance/cases/:id" element={<ProtectedLayout><ComplianceCaseDetailView /></ProtectedLayout>} />

      {/* ── Field — planning, execution, inspections, employer views ── */}
      <Route path="/compliance/field/plan-builder" element={<ProtectedLayout><WeeklyPlanBuilder /></ProtectedLayout>} />
      <Route path="/compliance/field/plan-builder-v2" element={<ProtectedLayout><WeeklyPlanBuilderV2 /></ProtectedLayout>} />
      <Route path="/compliance/field/plan-builder-v3" element={<ProtectedLayout><WeeklyPlanBuilderV3 /></ProtectedLayout>} />
      <Route path="/compliance/field/approval-inbox" element={<ProtectedLayout><PlannerApprovalInbox /></ProtectedLayout>} />
      <Route path="/approval/inbox" element={<ProtectedLayout><PlannerApprovalInbox /></ProtectedLayout>} />
      <Route path="/approval/decide" element={<PlannerApprovalDecidePage />} />
      <Route path="/compliance/field/revisions-pending" element={<ProtectedLayout><RevisionsPending /></ProtectedLayout>} />
      <Route path="/compliance/field/revision-review/:revisionId" element={<ProtectedLayout><PlanRevisionReview /></ProtectedLayout>} />
      <Route path="/compliance/field/my-plans" element={<ProtectedLayout><MyPlans /></ProtectedLayout>} />
      <Route path="/compliance/field/pending-review" element={<ProtectedLayout><CompliancePendingReview /></ProtectedLayout>} />
      <Route path="/compliance/field/pending-review/:planId" element={<ProtectedLayout><WeeklyPlanReview /></ProtectedLayout>} />
      <Route path="/compliance/field/execution" element={<ProtectedLayout><FieldExecution /></ProtectedLayout>} />
      {/* Retired (hard cutover): /compliance/field/operations, /compliance/field/inspections — see .lovable/plan.md */}
      <Route path="/compliance/field/findings" element={<ProtectedLayout><EmployerFindings /></ProtectedLayout>} />
      <Route path="/compliance/field/employer-statements" element={<ProtectedLayout><EmployerStatements /></ProtectedLayout>} />
      <Route path="/compliance/field/employer-statement/:employerId" element={<ProtectedLayout><EmployerStatementDetail /></ProtectedLayout>} />
      <Route path="/compliance/field/visit/:employerId" element={<ProtectedLayout><EmployerVisitWorkspace /></ProtectedLayout>} />
      <Route path="/compliance/field/employer-360" element={<ProtectedLayout><Employer360Search /></ProtectedLayout>} />
      <Route path="/compliance/field/employer-360/:employerId" element={<ProtectedLayout><Employer360 /></ProtectedLayout>} />
      <Route path="/compliance/field/employer-risk/:employerId" element={<ProtectedLayout><EmployerRiskProfile /></ProtectedLayout>} />
      <Route path="/compliance/employers/management" element={<ProtectedLayout><EmployerComplianceManagement /></ProtectedLayout>} />
      <Route path="/compliance/employers/hierarchy" element={<ProtectedLayout><EmployerHierarchy /></ProtectedLayout>} />
      <Route path="/compliance/employers/financial-statement/:employerId" element={<ProtectedLayout><EmployerFinancialStatement /></ProtectedLayout>} />
      <Route path="/compliance/field/audit-management" element={<ProtectedLayout><AuditManagement /></ProtectedLayout>} />
      <Route path="/compliance/field/weekly-report" element={<ProtectedLayout><WeeklyReportSubmission /></ProtectedLayout>} />
      {/* Retired (hard cutover): /compliance/field/weekly-reports — use /compliance/field/all-reports */}
      <Route path="/compliance/field/all-reports" element={<ProtectedLayout><AllWeeklyReports /></ProtectedLayout>} />
      <Route path="/compliance/field/execution-dashboard/:planId" element={<ProtectedLayout><PlanExecutionDashboard /></ProtectedLayout>} />
      <Route path="/compliance/field/execution-dashboard/:planId/visit/:planItemId" element={<ProtectedLayout><AuditVisitWorkspace /></ProtectedLayout>} />
      <Route path="/compliance/field/audit-visit/:planItemId" element={<ProtectedLayout><AuditVisitWorkspace /></ProtectedLayout>} />
      <Route path="/compliance/field/audit-report/:inspectionId" element={<ProtectedLayout><EmployerAuditReportViewer /></ProtectedLayout>} />
      <Route path="/compliance/field/audit-report/:reportId/print/:variant" element={<ProtectedRoute><AuditReportPrintPage /></ProtectedRoute>} />
      <Route path="/compliance/field/weekly-report-review" element={<ProtectedLayout><WeeklyReportReview /></ProtectedLayout>} />
      {/* Retired (hard cutover): /compliance/field/my-upcoming */}
      <Route path="/compliance/field/sampling" element={<ProtectedLayout><SamplingDashboard /></ProtectedLayout>} />
      {/* Retired (hard cutover): /compliance/field/sampling/candidates — folded into Sampling Dashboard */}

      {/* ── Enforcement — legal, notices, arrangements, waivers ── */}
      <Route path="/compliance/enforcement/recommendation-queue" element={<ProtectedLayout><LegalRecommendationQueue /></ProtectedLayout>} />
      <Route path="/compliance/enforcement/legal-referral" element={<ProtectedLayout><LegalReferralWizard /></ProtectedLayout>} />
      <Route path="/compliance/enforcement/legal-queue" element={<ProtectedLayout><ComplianceLegalQueue /></ProtectedLayout>} />
      <Route path="/compliance/enforcement/proceedings" element={<ProtectedLayout><ComplianceLegalProceedings /></ProtectedLayout>} />
      <Route path="/compliance/enforcement/notices" element={<ProtectedLayout><NoticesManagement /></ProtectedLayout>} />
      <Route path="/compliance/enforcement/arrangements" element={<ProtectedLayout><PaymentArrangements /></ProtectedLayout>} />
      <Route path="/compliance/enforcement/breaches" element={<ProtectedLayout><ComplianceBreachMonitoring /></ProtectedLayout>} />
      <Route path="/compliance/enforcement/waivers" element={<ProtectedLayout><ComplianceWaivers /></ProtectedLayout>} />

      {/* ── Reports (unchanged paths) ── */}
      <Route path="/compliance/reports" element={<ProtectedLayout><ComplianceReports /></ProtectedLayout>} />
      <Route path="/compliance/reports/violations-analytics" element={<ProtectedLayout><CaseAnalytics /></ProtectedLayout>} />
      <Route path="/compliance/reports/inspector-performance" element={<ProtectedLayout><InspectorPerformance /></ProtectedLayout>} />
      <Route path="/compliance/reports/c3-compliance" element={<ProtectedLayout><C3Compliance /></ProtectedLayout>} />
      <Route path="/compliance/reports/arrears" element={<ProtectedLayout><ArrearsReports /></ProtectedLayout>} />
      <Route path="/compliance/reports/audit" element={<ProtectedLayout><ComplianceAuditReports /></ProtectedLayout>} />
      <Route path="/compliance/reports/arrangements" element={<ProtectedLayout><ArrangementReports /></ProtectedLayout>} />
      <Route path="/compliance/reports/legal" element={<ProtectedLayout><LegalEscalationReports /></ProtectedLayout>} />
      <Route path="/compliance/reports/trends" element={<ProtectedLayout><TrendReports /></ProtectedLayout>} />

      {/* ── Admin — settings, geography, staff, automation, tools ── */}
      <Route path="/compliance/admin/settings/rule-engine" element={<ProtectedLayout><ComplianceRuleEngine /></ProtectedLayout>} />
      <Route path="/compliance/admin/settings/violation-types" element={<ProtectedLayout><ComplianceViolationTypes /></ProtectedLayout>} />
      <Route path="/compliance/admin/settings/assignment-routing" element={<ProtectedLayout><AssignmentRoutingRules /></ProtectedLayout>} />
      <Route path="/compliance/admin/settings/number-templates" element={<ProtectedLayout><ComplianceNumberTemplates /></ProtectedLayout>} />
      <Route path="/compliance/admin/settings/risk-policy" element={<ProtectedLayout><RiskRulePolicy /></ProtectedLayout>} />
      <Route path="/compliance/admin/settings/templates" element={<ProtectedLayout><ComplianceTemplates /></ProtectedLayout>} />
      <Route path="/compliance/admin/communication-templates" element={<ProtectedLayout><AuditCommunicationTemplatesPage /></ProtectedLayout>} />
      <Route path="/compliance/admin/communication-templates/new" element={<ProtectedLayout><AuditCommunicationTemplateEditorPage /></ProtectedLayout>} />
      <Route path="/compliance/admin/communication-templates/:id" element={<ProtectedLayout><AuditCommunicationTemplateEditorPage /></ProtectedLayout>} />
      <Route path="/compliance/admin/report-templates" element={<ProtectedLayout><Suspense fallback={<div />}><ComplianceReportTemplates defaultTab="templates" /></Suspense></ProtectedLayout>} />
      <Route path="/compliance/admin/document-foundation" element={<ProtectedLayout><Suspense fallback={<div />}><ComplianceReportTemplates defaultTab="foundation" foundationFocused pageTitle="Shared Sections & Foundation" pageDescription="Reusable section library, common clauses/disclaimers, branding and merge fields shared across all employer-audit report templates." /></Suspense></ProtectedLayout>} />
      <Route path="/compliance/admin/online-response" element={<ProtectedLayout><OnlineResponseConfigPage /></ProtectedLayout>} />
      <Route path="/compliance/admin/settings/sampling" element={<ProtectedLayout><RiskSamplingSettings /></ProtectedLayout>} />
      <Route path="/compliance/admin/settings/c3-ledger-sync" element={<ProtectedLayout><C3LedgerSync /></ProtectedLayout>} />
      <Route path="/compliance/admin/settings/payment-ledger-sync" element={<ProtectedLayout><PaymentLedgerSync /></ProtectedLayout>} />
      <Route path="/compliance/admin/settings/ledger-admin" element={<ProtectedLayout><LedgerAdministration /></ProtectedLayout>} />
      <Route path="/compliance/admin/settings/ledger-operations" element={<ProtectedLayout><LedgerOperationsDashboard /></ProtectedLayout>} />
      <Route path="/compliance/admin/settings/ledger-posting" element={<ProtectedLayout><LedgerPostingAdmin /></ProtectedLayout>} />
      <Route path="/compliance/admin/settings/ledger-help" element={<ProtectedLayout><LedgerHelpCenter /></ProtectedLayout>} />
      <Route path="/compliance/admin/geography/zones" element={<ProtectedLayout><ZoneManagement /></ProtectedLayout>} />
      <Route path="/compliance/admin/geography/office-zone-mapping" element={<ProtectedLayout><OfficeZoneMapping /></ProtectedLayout>} />
      <Route path="/compliance/admin/geography/village-zone-mapping" element={<ProtectedLayout><VillageZoneMapping /></ProtectedLayout>} />
      <Route path="/compliance/admin/staff/officers" element={<ProtectedLayout><OfficerManagement /></ProtectedLayout>} />
      <Route path="/compliance/admin/staff/queue-members" element={<ProtectedLayout><QueueMembers /></ProtectedLayout>} />
      <Route path="/compliance/admin/staff/supervisors" element={<ProtectedLayout><SupervisorHierarchy /></ProtectedLayout>} />
      <Route path="/compliance/admin/staff/link-legacy" element={<ProtectedLayout><LegacyInspectorLinking /></ProtectedLayout>} />
      <Route path="/compliance/admin/automation/jobs" element={<ProtectedLayout><ComplianceJobConfiguration /></ProtectedLayout>} />
      <Route path="/compliance/admin/automation/history" element={<ProtectedLayout><ComplianceJobHistory /></ProtectedLayout>} />
      <Route path="/compliance/admin/automation/employer-jobs" element={<ProtectedLayout><EmployerComplianceJobs /></ProtectedLayout>} />
      <Route path="/compliance/admin/tools/rule-simulator" element={<ProtectedLayout><ComplianceRuleSimulator /></ProtectedLayout>} />
      <Route path="/compliance/admin/tools/risk-simulator" element={<ProtectedLayout><ComplianceRiskSimulator /></ProtectedLayout>} />

      {/* ═══════════════════════════════════════════════════════════════
          COMPLIANCE — Legacy Redirects (old path → new canonical path)
          All old menu/bookmark URLs continue to work via 301 redirects.
          ═══════════════════════════════════════════════════════════════ */}

      {/* Workbench redirects */}
      <Route path="/compliance/dashboard" element={<Navigate to="/compliance/workbench/manager" replace />} />
      <Route path="/compliance/dashboard/manager" element={<Navigate to="/compliance/workbench/manager" replace />} />
      <Route path="/compliance/dashboard/inspector" element={<Navigate to="/compliance/workbench/inspector" replace />} />
      <Route path="/compliance/dashboard/legal" element={<Navigate to="/compliance/workbench/legal" replace />} />
      <Route path="/compliance/dashboard/analytics" element={<Navigate to="/compliance/workbench/analytics" replace />} />
      <Route path="/compliance/monitoring" element={<Navigate to="/compliance/workbench/monitoring" replace />} />
      <Route path="/compliance/operations/queues" element={<Navigate to="/compliance/workbench/queues" replace />} />
      <Route path="/compliance/operations/review-queue" element={<Navigate to="/compliance/workbench/review-queue" replace />} />
      <Route path="/compliance/operations/reassignment" element={<Navigate to="/compliance/workbench/reassignment" replace />} />

      {/* Field redirects */}
      <Route path="/compliance/audit-planning/weekly-plan-builder" element={<Navigate to="/compliance/field/plan-builder" replace />} />
      <Route path="/compliance/audit-planning/my-plans" element={<Navigate to="/compliance/field/my-plans" replace />} />
      <Route path="/compliance/inspector-plans" element={<Navigate to="/compliance/field/my-plans" replace />} />
      <Route path="/compliance/audit-planning/pending-review" element={<Navigate to="/compliance/field/pending-review" replace />} />
      <Route path="/compliance/audit-planning/pending-review/:planId" element={<Navigate to="/compliance/field/pending-review" replace />} />
      <Route path="/compliance/audit-planning/field-execution" element={<Navigate to="/compliance/field/execution" replace />} />
      <Route path="/compliance/inspections/field-execution" element={<Navigate to="/compliance/field/execution" replace />} />
      {/* Retired redirect targets removed (hard cutover): field-operations, inspections */}
      <Route path="/compliance/employers/findings" element={<Navigate to="/compliance/field/findings" replace />} />
      <Route path="/compliance/employer-statements" element={<Navigate to="/compliance/field/employer-statements" replace />} />
      <Route path="/compliance/employer-statement/:employerId" element={<Navigate to="/compliance/field/employer-statements" replace />} />
      <Route path="/compliance/employers/visit/:employerId" element={<Navigate to="/compliance/field/employer-statements" replace />} />
      <Route path="/compliance/employer-360/:employerId" element={<Navigate to="/compliance/field/employer-statements" replace />} />
      <Route path="/compliance/employers/:employerId/risk-profile" element={<Navigate to="/compliance/field/employer-statements" replace />} />
      <Route path="/compliance/employers/hierarchy" element={<Navigate to="/compliance/field/employer-statements" replace />} />
      <Route path="/compliance/employers/management" element={<Navigate to="/compliance/field/employer-statements" replace />} />
      <Route path="/compliance/employer" element={<Navigate to="/compliance/field/employer-statements" replace />} />
      <Route path="/compliance/audits" element={<Navigate to="/compliance/field/audit-management" replace />} />
      <Route path="/compliance/violations/weekly-reports" element={<Navigate to="/compliance/field/weekly-report" replace />} />
      <Route path="/compliance/audit-planning/weekly-reports" element={<Navigate to="/compliance/field/all-reports" replace />} />
      <Route path="/compliance/audit-planning/all-reports" element={<Navigate to="/compliance/field/all-reports" replace />} />
      {/* Retired redirect targets removed (hard cutover): my-upcoming */}
      {/* Retired (hard cutover): /compliance/my-audits/upcoming */}
      <Route path="/compliance/audit-planning/sampling-dashboard" element={<Navigate to="/compliance/field/sampling" replace />} />
      <Route path="/compliance/sampling" element={<Navigate to="/compliance/field/sampling" replace />} />
      <Route path="/compliance/audit-planning/monthly-candidates" element={<Navigate to="/compliance/field/sampling/candidates" replace />} />
      <Route path="/compliance/sampling/candidates" element={<Navigate to="/compliance/field/sampling/candidates" replace />} />
      <Route path="/compliance/sampling/upcoming" element={<Navigate to="/compliance/field/my-upcoming" replace />} />

      {/* Enforcement redirects */}
      <Route path="/compliance/legal-recommendation-queue" element={<Navigate to="/compliance/enforcement/recommendation-queue" replace />} />
      <Route path="/compliance/legal/queue" element={<Navigate to="/compliance/enforcement/legal-queue" replace />} />
      <Route path="/compliance/legal/proceedings" element={<Navigate to="/compliance/enforcement/proceedings" replace />} />
      <Route path="/compliance/notices" element={<Navigate to="/compliance/enforcement/notices" replace />} />
      <Route path="/compliance/arrangements" element={<Navigate to="/compliance/enforcement/arrangements" replace />} />
      <Route path="/compliance/payment-arrangements" element={<Navigate to="/compliance/enforcement/arrangements" replace />} />
      <Route path="/compliance/arrangements/breaches" element={<Navigate to="/compliance/enforcement/breaches" replace />} />
      <Route path="/compliance/waivers" element={<Navigate to="/compliance/enforcement/waivers" replace />} />
      <Route path="/compliance/penalties" element={<Navigate to="/compliance/cases/penalties" replace />} />

      {/* Admin redirects */}
      <Route path="/compliance/settings" element={<ProtectedLayout><ComplianceSettings /></ProtectedLayout>} />
      <Route path="/compliance/settings/completion-gate" element={<ProtectedLayout><CompletionGateSettings /></ProtectedLayout>} />
      <Route path="/compliance/settings/rule-engine" element={<Navigate to="/compliance/admin/settings/rule-engine" replace />} />
      <Route path="/compliance/settings/violation-types" element={<Navigate to="/compliance/admin/settings/violation-types" replace />} />
      <Route path="/compliance/settings/assignment-routing" element={<Navigate to="/compliance/admin/settings/assignment-routing" replace />} />
      <Route path="/compliance/settings/number-templates" element={<Navigate to="/compliance/admin/settings/number-templates" replace />} />
      <Route path="/compliance/settings/risk-policy" element={<Navigate to="/compliance/admin/settings/risk-policy" replace />} />
      <Route path="/compliance/settings/risk-config" element={<Navigate to="/compliance/admin/settings/risk-policy" replace />} />
      <Route path="/compliance/settings/legal-escalation-policy" element={<Navigate to="/compliance/admin/settings/risk-policy" replace />} />
      <Route path="/compliance/settings/templates" element={<Navigate to="/compliance/admin/settings/templates" replace />} />
      <Route path="/compliance/settings/c3-ledger-sync" element={<Navigate to="/compliance/admin/settings/c3-ledger-sync" replace />} />
      <Route path="/compliance/settings/payment-ledger-sync" element={<Navigate to="/compliance/admin/settings/payment-ledger-sync" replace />} />
      <Route path="/compliance/settings/ledger-admin" element={<Navigate to="/compliance/admin/settings/ledger-admin" replace />} />
      <Route path="/compliance/audit-planning/settings" element={<Navigate to="/compliance/admin/settings/sampling" replace />} />
      <Route path="/compliance/sampling/settings" element={<Navigate to="/compliance/admin/settings/sampling" replace />} />
      <Route path="/compliance/geography/zones" element={<Navigate to="/compliance/admin/geography/zones" replace />} />
      <Route path="/compliance/geography/office-zone-mapping" element={<Navigate to="/compliance/admin/geography/office-zone-mapping" replace />} />
      <Route path="/compliance/geography/village-zone-mapping" element={<Navigate to="/compliance/admin/geography/village-zone-mapping" replace />} />
      <Route path="/compliance/staff/officers" element={<Navigate to="/compliance/admin/staff/officers" replace />} />
      <Route path="/compliance/staff/queue-members" element={<Navigate to="/compliance/admin/staff/queue-members" replace />} />
      <Route path="/compliance/staff/supervisors" element={<Navigate to="/compliance/admin/staff/supervisors" replace />} />
      <Route path="/compliance/staff/link-legacy" element={<Navigate to="/compliance/admin/staff/link-legacy" replace />} />
      <Route path="/compliance/automation/jobs" element={<Navigate to="/compliance/admin/automation/jobs" replace />} />
      <Route path="/compliance/automation/history" element={<Navigate to="/compliance/admin/automation/history" replace />} />
      <Route path="/compliance/automation/employer-jobs" element={<Navigate to="/compliance/admin/automation/employer-jobs" replace />} />
      <Route path="/compliance/tools/rule-simulator" element={<Navigate to="/compliance/admin/tools/rule-simulator" replace />} />
      <Route path="/compliance/tools/risk-simulator" element={<Navigate to="/compliance/admin/tools/risk-simulator" replace />} />
      <Route path="/compliance/risk-profiles" element={<Navigate to="/audit/risk-register" replace />} />

      {/* Audit Module Routes — Simplified Department Function Audit */}
      <Route path="/audit/dashboard" element={<ProtectedLayout><AuditDashboard /></ProtectedLayout>} />
      <Route path="/audit/departments" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_DEPARTMENT_MASTER"><DepartmentMaster /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/universe" element={<Navigate to="/audit/departments" replace />} />
      <Route path="/audit/risk-register" element={<ProtectedLayout><Suspense fallback={<div />}><RiskRegister /></Suspense></ProtectedLayout>} />
      <Route path="/audit/functions" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_FUNCTION_MASTER"><FunctionMaster /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/department-view/:id" element={<ProtectedLayout><DepartmentView /></ProtectedLayout>} />
      <Route path="/audit/risk-assessment" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_RISK_ASSESSMENT"><RiskAssessment /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/entity-summary" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_RISK_ASSESSMENT"><EntitySummary /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/risk-matrix" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_RISK_MATRIX"><RiskMatrix /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/audit-plans" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_PLANS"><AuditPlansNew /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/audit-plans/:id" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><AuditPlanDetail /></Suspense></ProtectedLayout>} />
      <Route path="/audit/audits" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_ENGAGEMENTS"><AuditEngagements /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/audits/:id" element={<ProtectedLayout><EngagementDetail /></ProtectedLayout>} />
      <Route path="/audit/audit-reports" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_REPORTS"><AuditReports /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/report-builder" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><AuditReportBuilder /></Suspense></ProtectedLayout>} />
      <Route path="/audit/plan-approval" element={<ProtectedLayout><PlanApproval /></ProtectedLayout>} />
      <Route path="/audit/config" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_SYSTEM_CONFIG"><AuditConfig /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/risk-settings" element={<ProtectedLayout><Suspense fallback={<div />}><RiskSettings /></Suspense></ProtectedLayout>} />
      <Route path="/audit/document-templates" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_SYSTEM_CONFIG"><Suspense fallback={<div />}><DocumentTemplateSettings /></Suspense></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/queries" element={<ProtectedLayout><Suspense fallback={<div />}><AuditQueries /></Suspense></ProtectedLayout>} />
      <Route path="/audit/auditors" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_AUDITOR_PROFILES"><Suspense fallback={<div />}><AuditorProfiles /></Suspense></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/auditor-profiles" element={<ProtectedLayout><Navigate to="/audit/auditors" replace /></ProtectedLayout>} />
      <Route path="/audit/workload" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_WORKLOAD_CAPACITY"><Suspense fallback={<div />}><WorkloadCapacity /></Suspense></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/time-tracking" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_TIME_TRACKING"><Suspense fallback={<div />}><TimeTracking /></Suspense></AuditFeatureGate></ProtectedLayout>} />
      
      <Route path="/audit/leave" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_LEAVE_MANAGEMENT"><Suspense fallback={<div />}><AuditorLeaveManagement /></Suspense></AuditFeatureGate></ProtectedLayout>} />

      {/* Legacy redirects */}
      <Route path="/audit/engagements" element={<ProtectedLayout><Navigate to="/audit/audits" replace /></ProtectedLayout>} />
      <Route path="/audit/engagements/:id" element={<ProtectedLayout><Navigate to="/audit/audits" replace /></ProtectedLayout>} />
      <Route path="/audit/plans" element={<ProtectedLayout><Navigate to="/audit/audit-plans" replace /></ProtectedLayout>} />
      <Route path="/audit/reports" element={<ProtectedLayout><Navigate to="/audit/audit-reports" replace /></ProtectedLayout>} />

      {/* Registration Rules & Process Routes */}
      <Route path="/registration/insured-person-guide" element={<ProtectedLayout><InsuredPersonGuide /></ProtectedLayout>} />
      <Route path="/registration/employer-rules" element={<ProtectedLayout><EmployerRules /></ProtectedLayout>} />
      <Route path="/registration/approval-workflow" element={<ProtectedLayout><ApprovalWorkflow /></ProtectedLayout>} />
      <Route path="/registration/documentation" element={<ProtectedLayout><DocumentationRequirements /></ProtectedLayout>} />

      {/* User Profile & Permissions Routes */}
      <Route path="/profile" element={<ProtectedLayout><MyProfile /></ProtectedLayout>} />
      <Route path="/profile/change-password" element={<ProtectedLayout><ProfileChangePassword /></ProtectedLayout>} />
      <Route path="/profile/notifications" element={<ProtectedLayout><NotificationPreferences /></ProtectedLayout>} />
      <Route path="/profile/sessions" element={<ProtectedLayout><ActiveSessions /></ProtectedLayout>} />
      <Route path="/profile/roles" element={<ProtectedLayout><ManageRoles /></ProtectedLayout>} />
      <Route path="/admin/security" element={<ProtectedLayout><SecuritySettings /></ProtectedLayout>} />
      <Route path="/admin/settings" element={<ProtectedLayout><SystemSettings /></ProtectedLayout>} />

      {/* Legacy Routes - keeping existing functionality */}
      <Route path="/employer/register" element={<ProtectedLayout><EmployerRegistration /></ProtectedLayout>} />
      <Route path="/employer/approval" element={<ProtectedLayout><EmployerApproval /></ProtectedLayout>} />
      <Route path="/employer/directory" element={<ProtectedLayout><EmployerDirectory /></ProtectedLayout>} />
      <Route path="/employer/contribution-entry" element={<ProtectedLayout><ContributionEntry /></ProtectedLayout>} />
      <Route path="/employer/compliance" element={<ProtectedLayout><ComplianceMonitoring /></ProtectedLayout>} />
      <Route path="/employer/contributions" element={<ProtectedLayout><ContributionTracking /></ProtectedLayout>} />

      {/* Insured Persons Routes - Consolidated */}
      <Route path="/person/listing" element={<ProtectedLayout><IPManagement /></ProtectedLayout>} />
      <Route path="/person/register" element={<ProtectedLayout><PersonRegistration /></ProtectedLayout>} />
      <Route path="/person/register-tabs" element={<ProtectedLayout><RegisterPersonTabs /></ProtectedLayout>} />
      <Route path="/person/management" element={<ProtectedLayout><IPManagement /></ProtectedLayout>} />
      <Route path="/person/ip-management" element={<ProtectedLayout><PersonIPManagement /></ProtectedLayout>} />
      <Route path="/person/view/:ssn" element={<ProtectedLayout><ViewInsuredPerson /></ProtectedLayout>} />
      <Route path="/person/edit/:ssn" element={<ProtectedLayout><EditInsuredPerson /></ProtectedLayout>} />

      {/* Quick Actions Routes */}
      <Route path="/person/wages-history" element={<ProtectedLayout><WagesHistory /></ProtectedLayout>} />
      <Route path="/person/claim-history" element={<ProtectedLayout><ClaimHistory /></ProtectedLayout>} />
      <Route path="/person/benefit-eligibility" element={<ProtectedLayout><BenefitEligibility /></ProtectedLayout>} />
      <Route path="/person/pending-reviews" element={<ProtectedLayout><PendingReviews /></ProtectedLayout>} />
      
      {/* Service Request Routes */}
      <Route path="/person/service-requests" element={<ProtectedLayout><ServiceRequestList /></ProtectedLayout>} />
      <Route path="/person/service-requests/new" element={<ProtectedLayout><ServiceRequestNew /></ProtectedLayout>} />
      <Route path="/person/service-requests/:id" element={<ProtectedLayout><ServiceRequestDetail /></ProtectedLayout>} />
      <Route path="/person/service-requests/pending-verification" element={<ProtectedLayout><PendingVerification /></ProtectedLayout>} />
      <Route path="/person/profile/:id" element={<ProtectedLayout><InsuredPersonProfile /></ProtectedLayout>} />

      {/* Insured Persons Reports - CRD Department */}
      <Route path="/person/reports/ip-entry-verification" element={<ProtectedLayout><IPEntryVerificationReport /></ProtectedLayout>} />
      <Route path="/person/reports/age-62-without-claim" element={<ProtectedLayout><Age62WithoutClaimReport /></ProtectedLayout>} />
      <Route path="/person/reports/online-renewal-update" element={<ProtectedLayout><OnlineRenewalUpdateReport /></ProtectedLayout>} />
      <Route path="/person/reports/registration-payments" element={<ProtectedLayout><RegistrationPaymentsReport /></ProtectedLayout>} />
      <Route path="/person/reports/contribution-statement-payment" element={<ProtectedLayout><ContributionStatementPaymentReport /></ProtectedLayout>} />
      <Route path="/person/reports/pension-letters-payment" element={<ProtectedLayout><PensionLettersPaymentReport /></ProtectedLayout>} />
      <Route path="/person/reports/non-national-workers-ssn" element={<ProtectedLayout><NonNationalWorkersSSNReport /></ProtectedLayout>} />
      <Route path="/person/reports/new-registrants-by-officer" element={<ProtectedLayout><NewRegistrantsByOfficerReport /></ProtectedLayout>} />
      <Route path="/person/reports/employer-registration-by-officer" element={<ProtectedLayout><EmployerRegistrationByOfficerReport /></ProtectedLayout>} />
      <Route path="/person/reports/life-certificates" element={<ProtectedLayout><LifeCertificatesReport /></ProtectedLayout>} />
      <Route path="/person/reports/self-employed-by-officer" element={<ProtectedLayout><SelfEmployedByOfficerReport /></ProtectedLayout>} />
      <Route path="/person/reports/claims-entered-by-officer" element={<ProtectedLayout><ClaimsEnteredByOfficerReport /></ProtectedLayout>} />
      <Route path="/person/reports/self-employed-without-license" element={<ProtectedLayout><SelfEmployedWithoutLicenseReport /></ProtectedLayout>} />
      <Route path="/person/reports/claims-to-benefits" element={<ProtectedLayout><ClaimsToBenefitsReport /></ProtectedLayout>} />
      <Route path="/person/reports/crm-activity" element={<ProtectedLayout><CRMActivityReport /></ProtectedLayout>} />
      <Route path="/person/reports/refunds-to-cru" element={<ProtectedLayout><RefundsToCRUReport /></ProtectedLayout>} />
      <Route path="/person/reports/audit-sample-ip" element={<ProtectedLayout><AuditSampleIPReport /></ProtectedLayout>} />
      
      {/* C3 Management Reports - Moved from Insured Persons */}
      <Route path="/c3/reports/c3-entry-verification" element={<ProtectedLayout><C3EntryVerificationReport /></ProtectedLayout>} />
      <Route path="/c3/reports/pending-c3" element={<ProtectedLayout><PendingC3Report /></ProtectedLayout>} />
      <Route path="/c3/reports/missing-ssn" element={<ProtectedLayout><MissingSSNReport /></ProtectedLayout>} />
      
      {/* C3 Levy Settings Routes */}
      <Route path="/c3-management/settings/levy/schemes" element={<ProtectedLayout><LevySchemesList /></ProtectedLayout>} />
      <Route path="/c3-management/settings/levy/schemes/:schemeId" element={<ProtectedLayout><LevySchemeDetail /></ProtectedLayout>} />
      <Route path="/c3-management/settings/levy/simulator" element={<ProtectedLayout><LevySimulator /></ProtectedLayout>} />
      <Route path="/c3/reports/c3-line-item-changes" element={<ProtectedLayout><C3LineItemChangesReport /></ProtectedLayout>} />
      <Route path="/c3/reports/electronic-c3-uploads" element={<ProtectedLayout><ElectronicC3UploadsReport /></ProtectedLayout>} />
      <Route path="/c3/reports/c3-without-payment" element={<ProtectedLayout><C3WithoutPaymentReport /></ProtectedLayout>} />
      <Route path="/c3/reports/employer-notifications" element={<ProtectedLayout><EmployerNotificationsReport /></ProtectedLayout>} />
      <Route path="/c3/reports/high-wage-multi-employer" element={<ProtectedLayout><HighWageMultiEmployerReport /></ProtectedLayout>} />
      <Route path="/c3/reports/scanning-activity" element={<ProtectedLayout><ScanningActivityReport /></ProtectedLayout>} />
      <Route path="/c3/reports/outstanding-discrepancies" element={<ProtectedLayout><OutstandingDiscrepanciesReport /></ProtectedLayout>} />
      <Route path="/c3/reports/long-term-claims" element={<ProtectedLayout><LongTermClaimsReport /></ProtectedLayout>} />
      <Route path="/c3/reports/audit-sample" element={<ProtectedLayout><AuditSampleReport /></ProtectedLayout>} />

      {/* Finance Settings Routes */}
      <Route path="/finance/settings/fee-configuration" element={<ProtectedLayout><FeeConfigurationList /></ProtectedLayout>} />
      <Route path="/finance/settings/fee-configuration/new" element={<ProtectedLayout><FeeConfigurationDetail /></ProtectedLayout>} />
      <Route path="/finance/settings/fee-configuration/:feeId" element={<ProtectedLayout><FeeConfigurationDetail /></ProtectedLayout>} />
      <Route path="/finance/settings/fee-configuration/:feeId/edit" element={<ProtectedLayout><FeeConfigurationDetail /></ProtectedLayout>} />
      <Route path="/finance/settings/service-types" element={<ProtectedLayout><ServiceTypeManagement /></ProtectedLayout>} />
      <Route path="/finance/settings/verification" element={<ProtectedLayout><VerificationSettings /></ProtectedLayout>} />
      <Route path="/finance/settings/multi-currency" element={<ProtectedLayout><MultiCurrencySettings /></ProtectedLayout>} />

      {/* Benefits Routes */}
      <Route path="/benefits/all" element={<ProtectedLayout><AllBenefitsTabs /></ProtectedLayout>} />
      <Route path="/benefits/online-applications" element={<ProtectedLayout><OnlineBenefitApplications /></ProtectedLayout>} />
      <Route path="/benefits/maternity" element={<ProtectedLayout><MaternityBenefits /></ProtectedLayout>} />
      <Route path="/benefits/unemployment" element={<ProtectedLayout><UnemploymentBenefits /></ProtectedLayout>} />
      <Route path="/benefits/work-injury" element={<ProtectedLayout><WorkInjuryBenefits /></ProtectedLayout>} />
      <Route path="/benefits/death" element={<ProtectedLayout><DeathBenefits /></ProtectedLayout>} />
      <Route path="/benefits/educational" element={<ProtectedLayout><EducationalBenefits /></ProtectedLayout>} />

      {/* Customer Relationship (CRD) Module Routes */}
      <Route path="/crd/cards" element={<ProtectedLayout><CardManagement /></ProtectedLayout>} />
      <Route path="/crd/reports/printed-spoiled-cards" element={<ProtectedLayout><CRDPrintedSpoiledCardsReport /></ProtectedLayout>} />

      {/* System Administration Routes - Using DB-backed Enterprise Admin components */}
      <Route path="/admin/master-data/income-categories" element={<ProtectedLayout><IncomeCategoryManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/sep-contrib-rates" element={<Navigate to="/admin/c3-configuration" replace />} />
      <Route path="/admin/master-data/income-codes" element={<ProtectedLayout><IncomeCodeManagement /></ProtectedLayout>} />
      {/* Master Data CRUD Routes */}
      <Route path="/admin/master-data/activity-types" element={<ProtectedLayout><ActivityManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/designations" element={<ProtectedLayout><DesignationMasterManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/bank-codes" element={<ProtectedLayout><BankCodeManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/batch-status" element={<ProtectedLayout><BatchStatusManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/pay-periods" element={<ProtectedLayout><PayPeriodManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/c3-status" element={<ProtectedLayout><C3StatusManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/countries" element={<ProtectedLayout><CountryManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/dependent-relations" element={<ProtectedLayout><DependentRelationManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/districts" element={<ProtectedLayout><DistrictManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/eye-colors" element={<ProtectedLayout><EyeColorManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/industries" element={<ProtectedLayout><IndustryManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/inspectors" element={<ProtectedLayout><InspectorMDManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/invoice-status" element={<ProtectedLayout><InvoiceStatusMDManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/invoice-types" element={<ProtectedLayout><InvoiceTypesMDManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/legal-status" element={<ProtectedLayout><LegalStatusManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/marital-status" element={<ProtectedLayout><MaritalStatusManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/merchants" element={<ProtectedLayout><MerchantManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/methods-of-payment" element={<ProtectedLayout><MethodOfPaymentManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/occupations" element={<ProtectedLayout><OccupationManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/payer-types" element={<ProtectedLayout><PayerTypeManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/payment-sources" element={<ProtectedLayout><PaymentSourcesManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/payment-types" element={<ProtectedLayout><PaymentTypeMDManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/penalty-rates" element={<ProtectedLayout><PenaltyMDManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/postal-districts" element={<ProtectedLayout><PostalDistrictManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/receipt-status" element={<ProtectedLayout><ReceiptStatusManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/relations" element={<ProtectedLayout><RelationManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/sectors" element={<ProtectedLayout><SectorManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/ssc-rates" element={<ProtectedLayout><SscRatesManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/vc-contrib-rates" element={<ProtectedLayout><VcContribRateManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/vc-eligibility-config" element={<ProtectedLayout><VcEligibilityConfigManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/verification-types" element={<ProtectedLayout><VerifyManagement /></ProtectedLayout>} />
      <Route path="/admin/master-data/villages" element={<ProtectedLayout><VillagesManagement /></ProtectedLayout>} />
      <Route path="/admin" element={<ProtectedLayout><UserList /></ProtectedLayout>} />
      <Route path="/admin/users" element={<ProtectedLayout><UserList /></ProtectedLayout>} />
      <Route path="/admin/users/create" element={<ProtectedLayout><UserCreate /></ProtectedLayout>} />
      <Route path="/admin/users/:userId" element={<ProtectedLayout><UserView /></ProtectedLayout>} />
      <Route path="/admin/users/:userId/edit" element={<ProtectedLayout><UserEdit /></ProtectedLayout>} />
      <Route path="/admin/users/:userId/roles" element={<ProtectedLayout><UserRoles /></ProtectedLayout>} />
      <Route path="/admin/seed-test-users" element={<ProtectedLayout><SeedTestUsers /></ProtectedLayout>} />
      <Route path="/admin/web-users" element={<ProtectedLayout><WebUsers /></ProtectedLayout>} />
      <Route path="/admin/audit-log" element={<Navigate to="/system-logs/audit" replace />} />
      <Route path="/admin/audit-logs" element={<Navigate to="/system-logs/audit" replace />} />
      <Route path="/admin/scheduler" element={<ProtectedLayout><CentralScheduler /></ProtectedLayout>} />
      <Route path="/admin/backup" element={<ProtectedLayout><BackupRecovery /></ProtectedLayout>} />
      <Route path="/admin/logs" element={<ProtectedLayout><SystemLogs /></ProtectedLayout>} />
      <Route path="/admin/employees" element={<ProtectedLayout><EmployeeList /></ProtectedLayout>} />
      <Route path="/admin/org-units" element={<ProtectedLayout><OrgUnitList /></ProtectedLayout>} />
      <Route path="/admin/positions" element={<ProtectedLayout><PositionList /></ProtectedLayout>} />
      <Route path="/admin/roles" element={<ProtectedLayout><AdminRoleList /></ProtectedLayout>} />
      <Route path="/admin/roles-permissions" element={<ProtectedLayout><RolePermissionManagement /></ProtectedLayout>} />
      <Route path="/admin/delegations" element={<ProtectedLayout><DelegationList /></ProtectedLayout>} />
      <Route path="/admin/approval-matrix/payment" element={<ProtectedLayout><ApprovalMatrixPayment /></ProtectedLayout>} />
      <Route path="/admin/approval-matrix/fee-waiver" element={<ProtectedLayout><ApprovalMatrixFeeWaiver /></ProtectedLayout>} />
      <Route path="/admin/approval-matrix/journal" element={<ProtectedLayout><ApprovalMatrixJournal /></ProtectedLayout>} />
      <Route path="/admin/approval-matrix/refund" element={<ProtectedLayout><ApprovalMatrixRefund /></ProtectedLayout>} />
      <Route path="/admin/approval-matrix/write-off" element={<ProtectedLayout><ApprovalMatrixWriteOff /></ProtectedLayout>} />
      <Route path="/admin/workflow-schemes" element={<ProtectedLayout><WorkflowSchemeList /></ProtectedLayout>} />
      <Route path="/admin/workflow-management" element={<ProtectedLayout><WorkflowManagement /></ProtectedLayout>} />
      <Route path="/admin/workflow-management/workflows" element={<ProtectedLayout><WorkflowManagement /></ProtectedLayout>} />
      <Route path="/admin/workflow-management/runs" element={<ProtectedLayout><WorkflowManagement /></ProtectedLayout>} />
      <Route path="/admin/workflow-management/data" element={<ProtectedLayout><WorkflowManagement /></ProtectedLayout>} />
      <Route path="/admin/workflow-management/templates" element={<ProtectedLayout><WorkflowManagement /></ProtectedLayout>} />
      <Route path="/admin/workflow-management/settings" element={<ProtectedLayout><WorkflowManagement /></ProtectedLayout>} />
      <Route path="/admin/notifications" element={<ProtectedLayout><NotificationManagement /></ProtectedLayout>} />
      <Route path="/admin/notifications/log" element={<ProtectedLayout><AdminNotificationLogs /></ProtectedLayout>} />
      <Route path="/admin/notifications/logs" element={<ProtectedLayout><AdminNotificationLogs /></ProtectedLayout>} />
      <Route path="/admin/notifications/templates" element={<ProtectedLayout><AdminNotificationTemplates /></ProtectedLayout>} />
      <Route path="/admin/notifications/notification-templates" element={<ProtectedLayout><NotificationTemplateManager /></ProtectedLayout>} />
      <Route path="/admin/notifications/channels" element={<ProtectedLayout><NotificationChannelSettings /></ProtectedLayout>} />
      <Route path="/admin/notifications/providers" element={<ProtectedLayout><ProviderSettings /></ProtectedLayout>} />
      <Route path="/admin/email-campaigns" element={<ProtectedLayout><EmailCampaigns /></ProtectedLayout>} />
      <Route path="/admin/email-logs" element={<ProtectedLayout><EmailLogs /></ProtectedLayout>} />
      <Route path="/admin/offices" element={<ProtectedLayout><OfficeManagement /></ProtectedLayout>} />
      <Route path="/admin/office-ip-management" element={<ProtectedLayout><OfficeIPManagement /></ProtectedLayout>} />
      <Route path="/admin/departments" element={<ProtectedLayout><DepartmentManagement /></ProtectedLayout>} />
      <Route path="/admin/modules" element={<ProtectedLayout><ModuleManagement /></ProtectedLayout>} />
      <Route path="/admin/security/password-policy" element={<ProtectedLayout><PasswordPolicySettings /></ProtectedLayout>} />
      <Route path="/admin/security/mfa" element={<ProtectedLayout><MFASettings /></ProtectedLayout>} />
      <Route path="/admin/security/policy" element={<ProtectedLayout><SecurityPolicySettingsPage /></ProtectedLayout>} />
      <Route path="/admin/security/ip-access" element={<ProtectedLayout><IPAccessRulesManagement /></ProtectedLayout>} />
      <Route path="/admin/designations" element={<ProtectedLayout><DesignationManagement /></ProtectedLayout>} />
      <Route path="/admin/designation-hierarchy" element={<ProtectedLayout><DesignationHierarchy /></ProtectedLayout>} />
      <Route path="/admin/role-hierarchy" element={<ProtectedLayout><RoleHierarchy /></ProtectedLayout>} />
      <Route path="/admin/user-notification-preferences" element={<ProtectedLayout><UserNotificationPreferences /></ProtectedLayout>} />
      <Route path="/admin/data-migration" element={<ProtectedLayout><DataMigration /></ProtectedLayout>} />
      <Route path="/admin/release-management" element={<ProtectedLayout><ReleaseManagement /></ProtectedLayout>} />
      <Route path="/admin/users/update-password" element={<ProtectedLayout><UpdateUserPassword /></ProtectedLayout>} />
      <Route path="/admin/module-button-bindings" element={<ProtectedLayout><ModuleButtonBindings /></ProtectedLayout>} />
      <Route path="/admin/api-keys" element={<ProtectedLayout><ApiKeysManagement /></ProtectedLayout>} />
      {/* SSC Compliance API Test Console */}
      <Route path="/admin/api-test-console" element={<ProtectedLayout><ApiTestDashboard /></ProtectedLayout>} />
      <Route path="/admin/api-test-console/keys" element={<ProtectedLayout><ApiKeysConsole /></ProtectedLayout>} />
      <Route path="/admin/api-test-console/environments" element={<ProtectedLayout><EnvironmentsConsole /></ProtectedLayout>} />
      <Route path="/admin/api-test-console/auth-lab" element={<ProtectedLayout><AuthTestLab /></ProtectedLayout>} />
      <Route path="/admin/api-test-console/endpoints" element={<ProtectedLayout><EndpointExplorer /></ProtectedLayout>} />
      <Route path="/admin/api-test-console/runner" element={<ProtectedLayout><ComplianceRunner /></ProtectedLayout>} />
      <Route path="/admin/api-test-console/saved-cases" element={<ProtectedLayout><SavedCasesConsole /></ProtectedLayout>} />
      <Route path="/admin/api-test-console/suites" element={<ProtectedLayout><SuitesConsole /></ProtectedLayout>} />
      <Route path="/admin/api-test-console/logs" element={<ProtectedLayout><ExecutionLogs /></ProtectedLayout>} />
      <Route path="/admin/public-api" element={<ProtectedLayout><PublicApiManagement /></ProtectedLayout>} />
      <Route path="/admin/external-apis" element={<ProtectedLayout><ExternalApiManagement /></ProtectedLayout>} />
      <Route path="/external/api-docs" element={<ProtectedLayout><ExternalApiDocs /></ProtectedLayout>} />
      <Route path="/admin/c3-calculation-config" element={<ProtectedLayout><C3CalculationConfigPage /></ProtectedLayout>} />
      <Route path="/admin/c3-period-config" element={<ProtectedLayout><C3PeriodConfigPage /></ProtectedLayout>} />
      <Route path="/admin/c3-configuration" element={<ProtectedLayout><C3ConfigurationPage /></ProtectedLayout>} />
      <Route path="/admin/global-settings" element={<ProtectedLayout><GlobalSettings /></ProtectedLayout>} />
      <Route path="/admin/document-configuration" element={<ProtectedLayout><DocumentConfigurationPage /></ProtectedLayout>} />
      <Route path="/admin/ip-card-configuration" element={<ProtectedLayout><IPCardConfiguration /></ProtectedLayout>} />
      <Route path="/admin/knowledge-base" element={<ProtectedLayout><KnowledgeBaseAdmin /></ProtectedLayout>} />
      
      {/* Workflow Engine Routes */}
      <Route path="/admin/workflows" element={<ProtectedLayout><WorkflowList /></ProtectedLayout>} />
      <Route path="/admin/workflows/new" element={<ProtectedLayout><WorkflowForm /></ProtectedLayout>} />
      <Route path="/admin/workflows/:id" element={<ProtectedLayout><WorkflowForm /></ProtectedLayout>} />
      <Route path="/admin/workflow-triggers" element={<ProtectedLayout><WorkflowTriggers /></ProtectedLayout>} />
      <Route path="/admin/workflow-logs" element={<ProtectedLayout><WorkflowLogs /></ProtectedLayout>} />
      <Route path="/admin/workflow-analytics" element={<ProtectedLayout><WorkflowAnalytics /></ProtectedLayout>} />
      <Route path="/admin/workflow-security" element={<ProtectedLayout><WorkflowSecuritySettings /></ProtectedLayout>} />
      <Route path="/admin/workflow-secured-approvals" element={<ProtectedLayout><SecuredWorkflowApprovals /></ProtectedLayout>} />
      <Route path="/admin/workflow-role-assignment" element={<ProtectedLayout><WorkflowRoleAssignment /></ProtectedLayout>} />
      <Route path="/workflow/my-tasks" element={<ProtectedLayout><MyWorkflowTasks /></ProtectedLayout>} />
      
      <Route path="/finance/settings/benefit-finance-mapping" element={<ProtectedLayout><BenefitFinanceMapping /></ProtectedLayout>} />
      <Route path="/nbenefit/config/life-certificate-config" element={<ProtectedLayout><LifeCertificateConfig /></ProtectedLayout>} />

      {/* Correspondence / Communication Hub Routes */}
      <Route path="/correspondence/dashboard" element={<ProtectedLayout><CorrespondenceDashboard /></ProtectedLayout>} />
      <Route path="/correspondence/incoming" element={<ProtectedLayout><IncomingCommunications /></ProtectedLayout>} />
      <Route path="/correspondence/outgoing" element={<ProtectedLayout><OutgoingCommunications /></ProtectedLayout>} />
      <Route path="/correspondence/search" element={<ProtectedLayout><SearchHistory /></ProtectedLayout>} />
      <Route path="/correspondence/archive" element={<ProtectedLayout><Archive /></ProtectedLayout>} />

      {/* Module Templates Routes */}
      <Route path="/compliance/templates" element={<ProtectedLayout><ModuleTemplates module="Compliance" /></ProtectedLayout>} />
      <Route path="/benefits/templates" element={<ProtectedLayout><ModuleTemplates module="Benefits" /></ProtectedLayout>} />
      <Route path="/finance/templates" element={<ProtectedLayout><ModuleTemplates module="Finance" /></ProtectedLayout>} />
      <Route path="/legal/templates" element={<ProtectedLayout><ModuleTemplates module="Legal" /></ProtectedLayout>} />
      <Route path="/audit/templates" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><IATemplatesManagement /></Suspense></ProtectedLayout>} />
      <Route path="/employers/templates" element={<ProtectedLayout><ModuleTemplates module="Employers" /></ProtectedLayout>} />
      <Route path="/insured-persons/templates" element={<ProtectedLayout><ModuleTemplates module="InsuredPersons" /></ProtectedLayout>} />

      {/* Reports Routes */}
      <Route path="/reports/claims" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/cashier" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/employer" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/employer-statement" element={<ProtectedLayout><EmployerStatement /></ProtectedLayout>} />
      <Route path="/reports/persons" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/statistics" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/financial" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/custom" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />

      {/* BeMA Legacy Redirects - all redirect to Compliance module */}
      <Route path="/bema/workplan" element={<Navigate to="/compliance/field/my-plans" replace />} />
      <Route path="/bema/c3-filing" element={<Navigate to="/compliance/reports/c3-compliance" replace />} />
      <Route path="/bema/registrations" element={<Navigate to="/compliance/field/employer-360" replace />} />
      <Route path="/bema/scouting" element={<Navigate to="/compliance/field/findings" replace />} />
      <Route path="/bema/admin/rules" element={<Navigate to="/compliance/admin/settings/rule-engine" replace />} />
      <Route path="/bema/admin/templates" element={<Navigate to="/compliance/admin/settings/templates" replace />} />
      <Route path="/bema/admin/roles" element={<Navigate to="/compliance/admin/staff/officers" replace />} />
      <Route path="/bema/admin/logs" element={<Navigate to="/compliance/admin/automation/history" replace />} />

      {/* Legal Module Routes - New */}
      <Route path="/legal/dashboard" element={<ProtectedLayout><LegalDashboard /></ProtectedLayout>} />
      <Route path="/legal/workbench" element={<ProtectedLayout><LegalWorkbench /></ProtectedLayout>} />
      <Route path="/legal/cases" element={<ProtectedLayout><CaseTracking /></ProtectedLayout>} />
      <Route path="/legal/cases/intake" element={<ProtectedLayout><CaseIntake /></ProtectedLayout>} />
      <Route path="/legal/cases/delinquent" element={<ProtectedLayout><DelinquentCases /></ProtectedLayout>} />
      <Route path="/legal/hearings" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><LegalHearingCalendar /></Suspense></ProtectedLayout>} />
      <Route path="/legal/court-orders" element={<ProtectedLayout><CourtOrdersManagement /></ProtectedLayout>} />
      <Route path="/legal/enforcement" element={<ProtectedLayout><EnforcementActions /></ProtectedLayout>} />
      <Route path="/legal/payment-plans" element={<ProtectedLayout><LegalPaymentPlans /></ProtectedLayout>} />
      <Route path="/legal/reports/cases-by-stage" element={<ProtectedLayout><CasesByStageReport /></ProtectedLayout>} />
      <Route path="/legal/reports/recovery" element={<ProtectedLayout><RecoveryAnalysis /></ProtectedLayout>} />
      <Route path="/legal/reports/aging" element={<ProtectedLayout><AgingReceivables /></ProtectedLayout>} />
      <Route path="/legal/reports/costs-fees" element={<ProtectedLayout><CourtCostsFees /></ProtectedLayout>} />
      <Route path="/legal/reports/performance" element={<ProtectedLayout><PerformanceMetrics /></ProtectedLayout>} />
      <Route path="/legal/reports/pending-hearings" element={<ProtectedLayout><PendingHearings /></ProtectedLayout>} />
      <Route path="/legal/settings/courts" element={<ProtectedLayout><CourtsJudges /></ProtectedLayout>} />
      <Route path="/legal/settings/hearing-types" element={<ProtectedLayout><HearingTypes /></ProtectedLayout>} />
      <Route path="/legal/settings/statuses" element={<ProtectedLayout><CaseStatuses /></ProtectedLayout>} />
      <Route path="/legal/settings/workflow" element={<ProtectedLayout><CaseWorkflow /></ProtectedLayout>} />
      <Route path="/legal/settings/roles" element={<ProtectedLayout><LegalRoles /></ProtectedLayout>} />
      <Route path="/legal/settings/fee-mappings" element={<ProtectedLayout><FeeMappings /></ProtectedLayout>} />
      <Route path="/legal/settings/territory" element={<ProtectedLayout><TerritorySettings /></ProtectedLayout>} />
      
      {/* Legal Module Routes - Old */}
      <Route path="/legal" element={<ProtectedLayout><NewLegalModule /></ProtectedLayout>} />
      <Route path="/legal/case-intake" element={<ProtectedLayout><CaseIntake /></ProtectedLayout>} />
      <Route path="/legal/cases/intake" element={<ProtectedLayout><CaseIntake /></ProtectedLayout>} />
      <Route path="/legal/cases/intake/:id" element={<ProtectedLayout><IntakeDetail /></ProtectedLayout>} />
      <Route path="/legal/case-tracking" element={<ProtectedLayout><CaseTracking /></ProtectedLayout>} />
      <Route path="/legal/case-detail/:id" element={<ProtectedLayout><CaseDetailView /></ProtectedLayout>} />
      <Route path="/legal/case-edit/:id" element={<ProtectedLayout><CaseEditView /></ProtectedLayout>} />
      <Route path="/legal/notices" element={<ProtectedLayout><NoticeGeneration /></ProtectedLayout>} />
      <Route path="/legal/appeals" element={<ProtectedLayout><AppealSubmission /></ProtectedLayout>} />
      <Route path="/legal/evidence" element={<ProtectedLayout><LegalEvidenceManagement /></ProtectedLayout>} />
      <Route path="/legal/admin" element={<ProtectedLayout><LegalAdminConfig /></ProtectedLayout>} />

      {/* LegalFinal Module Routes */}
      <Route path="/legal-final" element={<ProtectedLayout><LegalFinalDashboard /></ProtectedLayout>} />
      <Route path="/legal-final/new-case" element={<ProtectedLayout><NewCaseForm /></ProtectedLayout>} />
      <Route path="/legal-final/cases" element={<ProtectedLayout><LegalCaseManagement /></ProtectedLayout>} />
      <Route path="/legal-final/cases/:caseId/edit" element={<ProtectedLayout><CaseStatusUpdateForm /></ProtectedLayout>} />
      <Route path="/legal-final/cases/:caseId/documents" element={<ProtectedLayout><DocumentUploadForm /></ProtectedLayout>} />
      <Route path="/legal-final/cases/:caseId/hearing" element={<ProtectedLayout><HearingJudgmentForm /></ProtectedLayout>} />
      <Route path="/legal-final/cases/:caseId/enforcement" element={<ProtectedLayout><EnforcementForm /></ProtectedLayout>} />
      <Route path="/legal-final/hearings" element={<ProtectedLayout><HearingSchedule /></ProtectedLayout>} />
      <Route path="/legal-final/enforcement" element={<ProtectedLayout><EnforcementManagement /></ProtectedLayout>} />
      <Route path="/legal-final/reports" element={<ProtectedLayout><LegalFinalReports /></ProtectedLayout>} />

      {/* Notification Routes */}
      <Route path="/notifications/dashboard" element={<ProtectedLayout><NotificationDashboard /></ProtectedLayout>} />
      <Route path="/notifications/templates" element={<ProtectedLayout><TemplateManagement /></ProtectedLayout>} />
      <Route path="/notifications/actions" element={<ProtectedLayout><ActionMapping /></ProtectedLayout>} />
      <Route path="/notifications/delivery" element={<ProtectedLayout><DeliveryManagement /></ProtectedLayout>} />
      <Route path="/notifications/preferences" element={<ProtectedLayout><UserPreferences /></ProtectedLayout>} />
      <Route path="/notifications/center" element={<ProtectedLayout><NotificationCenter /></ProtectedLayout>} />
      <Route path="/notifications/reports" element={<ProtectedLayout><ReportsAnalytics /></ProtectedLayout>} />
          <Route path="/notifications/admin" element={<ProtectedLayout><Administration /></ProtectedLayout>} />

          {/* NewBenefit Routes */}
          <Route path="/newbenefit/dashboard" element={<ProtectedLayout><ContributorDashboard /></ProtectedLayout>} />
          <Route path="/newbenefit/apply" element={<ProtectedLayout><ApplyForBenefits /></ProtectedLayout>} />
          <Route path="/newbenefit/apply/:benefitType" element={<ProtectedLayout><BenefitApplicationForm /></ProtectedLayout>} />
          <Route path="/newbenefit/new-referral" element={<ProtectedLayout><NewReferralForm /></ProtectedLayout>} />
          <Route path="/newbenefit/new-verification" element={<ProtectedLayout><NewVerificationRequest /></ProtectedLayout>} />
          <Route path="/newbenefit/verification/:verificationId" element={<ProtectedLayout><EmploymentVerificationDetail /></ProtectedLayout>} />
          <Route path="/newbenefit/my-claims" element={<ProtectedLayout><MyClaims /></ProtectedLayout>} />
          <Route path="/newbenefit/reports" element={<ProtectedLayout><ContributorReports /></ProtectedLayout>} />
          <Route path="/newbenefit/inbox" element={<ProtectedLayout><ContributorInbox /></ProtectedLayout>} />
          <Route path="/newbenefit/worklists" element={<ProtectedLayout><WorklistsHome /></ProtectedLayout>} />
          <Route path="/newbenefit/claim-360/:claimId" element={<ProtectedLayout><Claim360View /></ProtectedLayout>} />
          <Route path="/newbenefit/intake" element={<ProtectedLayout><IntakeConsole /></ProtectedLayout>} />
          <Route path="/newbenefit/medical-board" element={<ProtectedLayout><MedicalBoardHub /></ProtectedLayout>} />
          <Route path="/newbenefit/employer-hub" element={<ProtectedLayout><EmployerHub /></ProtectedLayout>} />
          <Route path="/newbenefit/pension-admin" element={<ProtectedLayout><PensionAdministration /></ProtectedLayout>} />
          <Route path="/newbenefit/payments" element={<ProtectedLayout><PaymentsModule /></ProtectedLayout>} />
          <Route path="/newbenefit/communications" element={<ProtectedLayout><LettersCommunications /></ProtectedLayout>} />
          <Route path="/newbenefit/admin" element={<ProtectedLayout><AdminConfig /></ProtectedLayout>} />
          <Route path="/newbenefit/auditor" element={<ProtectedLayout><AuditorView /></ProtectedLayout>} />

      {/* Benefit Management Module (bn_) */}
      <Route path="/bn/dashboard" element={<ProtectedLayout><BenefitsDashboard /></ProtectedLayout>} />
      <Route path="/bn/person-360" element={<ProtectedLayout><BnPerson360 /></ProtectedLayout>} />
      <Route path="/bn/config/products" element={<ProtectedLayout><BnProductCatalog /></ProtectedLayout>} />
      <Route path="/bn/config/products/:id" element={<ProtectedLayout><BnProductEditor /></ProtectedLayout>} />
      <Route path="/bn/claims" element={<ProtectedLayout><BnClaimWorklist /></ProtectedLayout>} />
      <Route path="/bn/claims/:id" element={<ProtectedLayout><BnClaimWorkbench /></ProtectedLayout>} />
      <Route path="/bn/claims/:id/legacy" element={<ProtectedLayout><BnClaim360 /></ProtectedLayout>} />
      <Route path="/bn/claims/:id/determination" element={<ProtectedLayout><BnBenefitDetermination /></ProtectedLayout>} />
      <Route path="/bn/claims/:id/eligibility" element={<ProtectedLayout><BnEligibilityReview /></ProtectedLayout>} />
      <Route path="/bn/claims/:id/calculation" element={<ProtectedLayout><BnCalculationWorkspace /></ProtectedLayout>} />
      <Route path="/bn/claims/:id/recommendation" element={<ProtectedLayout><BnDeterminationRecommendation /></ProtectedLayout>} />
      <Route path="/bn/engine" element={<ProtectedLayout><BnCalculationEngine /></ProtectedLayout>} />
      <Route path="/bn/intake/register" element={<ProtectedLayout><BnClaimRegistration /></ProtectedLayout>} />
      <Route path="/bn/queue" element={<ProtectedLayout><BnClaimQueue /></ProtectedLayout>} />
      <Route path="/bn/approval" element={<ProtectedLayout><BnApprovalConsole /></ProtectedLayout>} />
      <Route path="/bn/approval/queue" element={<ProtectedLayout><BnApprovalQueue /></ProtectedLayout>} />
      <Route path="/bn/approval/workspace/:claimId" element={<ProtectedLayout><BnAdjudicationWorkspace /></ProtectedLayout>} />
      <Route path="/bn/entitlements" element={<ProtectedLayout><BnEntitlementManagement /></ProtectedLayout>} />
      <Route path="/bn/payables" element={<ProtectedLayout><BnPayablesQueue /></ProtectedLayout>} />
      <Route path="/bn/schedules" element={<ProtectedLayout><BnPaymentSchedule /></ProtectedLayout>} />
      <Route path="/bn/batches" element={<ProtectedLayout><BnBatchOperations /></ProtectedLayout>} />
      <Route path="/bn/issue" element={<ProtectedLayout><BnPaymentIssue /></ProtectedLayout>} />
      <Route path="/bn/post-issue" element={<ProtectedLayout><BnPostIssueReview /></ProtectedLayout>} />
      <Route path="/bn/history" element={<ProtectedLayout><BnHistoricalInquiry /></ProtectedLayout>} />
      <Route path="/bn/exceptions" element={<ProtectedLayout><BnPaymentExceptions /></ProtectedLayout>} />
      <Route path="/bn/post-issue-enhanced" element={<ProtectedLayout><BnPostIssueEnhanced /></ProtectedLayout>} />
      <Route path="/bn/worklist" element={<ProtectedLayout><BnClaimWorklistEnhanced /></ProtectedLayout>} />
      <Route path="/bn/payment-history" element={<ProtectedLayout><BnPaymentHistoryInquiry /></ProtectedLayout>} />
      <Route path="/bn/audit-history" element={<ProtectedLayout><BnAuditDecisionHistory /></ProtectedLayout>} />
      <Route path="/bn/life-certificates" element={<ProtectedLayout><BnLifeCertificateManagement /></ProtectedLayout>} />
      <Route path="/bn/medical-reviews" element={<ProtectedLayout><BnMedicalReviewScheduler /></ProtectedLayout>} />
      <Route path="/bn/overpayments" element={<ProtectedLayout><BnOverpaymentRecovery /></ProtectedLayout>} />
      <Route path="/bn/award-suspension" element={<ProtectedLayout><BnAwardSuspensionConsole /></ProtectedLayout>} />
      <Route path="/bn/survivors" element={<ProtectedLayout><BnSurvivorsBenefitProcessing /></ProtectedLayout>} />
      <Route path="/bn/config/reason-codes" element={<ProtectedLayout><BnReasonCodes /></ProtectedLayout>} />
      <Route path="/bn/config/transitions" element={<ProtectedLayout><BnTransitionMatrix /></ProtectedLayout>} />
      <Route path="/bn/config/workbaskets" element={<ProtectedLayout><BnWorkbasketConfig /></ProtectedLayout>} />
      <Route path="/bn/config/escalation" element={<ProtectedLayout><BnEscalationConfig /></ProtectedLayout>} />
      <Route path="/bn/config/service-doc-types" element={<ProtectedLayout><BnServiceDocTypes /></ProtectedLayout>} />
      <Route path="/bn/config/country" element={<ProtectedLayout><BnCountryPackPage /></ProtectedLayout>} />
      <Route path="/bn/config/country/id-rules" element={<ProtectedLayout><BnCountryIdRules /></ProtectedLayout>} />
      <Route path="/bn/config/country/address-model" element={<ProtectedLayout><BnCountryAddressModel /></ProtectedLayout>} />
      <Route path="/bn/config/country/participant-types" element={<ProtectedLayout><BnCountryParticipantTypes /></ProtectedLayout>} />
      <Route path="/bn/config/country/payment-config" element={<ProtectedLayout><BnCountryPaymentConfig /></ProtectedLayout>} />
      <Route path="/bn/config/country/legal-refs" element={<ProtectedLayout><BnCountryLegalRefs /></ProtectedLayout>} />
      <Route path="/bn/config/rules" element={<ProtectedLayout><BnRuleConfiguration /></ProtectedLayout>} />
      <Route path="/bn/config/rules-admin" element={<ProtectedLayout><BnRulesAdministration /></ProtectedLayout>} />
      <Route path="/bn/config/formulas" element={<ProtectedLayout><BnFormulaConfiguration /></ProtectedLayout>} />
      <Route path="/bn/config/document-setup" element={<ProtectedLayout><BnDocumentSetup /></ProtectedLayout>} />
      <Route path="/bn/config/screen-setup" element={<ProtectedLayout><BnScreenMetadataSetup /></ProtectedLayout>} />

      {/* Medical Benefit Setup */}
      <Route path="/bn/config/medical" element={<ProtectedLayout><BnMedicalSetupHome /></ProtectedLayout>} />
      <Route path="/bn/config/medical/procedures" element={<ProtectedLayout><BnMedicalProceduresCatalog /></ProtectedLayout>} />
      <Route path="/bn/config/medical/facility-availability" element={<ProtectedLayout><BnFacilityAvailabilityMatrix /></ProtectedLayout>} />
      <Route path="/bn/config/medical/referral-rules" element={<ProtectedLayout><BnReferralRulesPage /></ProtectedLayout>} />
      <Route path="/bn/config/medical/reimbursement-limits" element={<ProtectedLayout><BnReimbursementLimitsPage /></ProtectedLayout>} />
      <Route path="/bn/config/medical/expense-types" element={<ProtectedLayout><BnExpenseTypeConfiguration /></ProtectedLayout>} />
      <Route path="/bn/config/medical/review-rules" element={<ProtectedLayout><BnMedicalReviewRulesPage /></ProtectedLayout>} />
      <Route path="/bn/config/medical/documents" element={<ProtectedLayout><BnMedicalDocumentsPage /></ProtectedLayout>} />

      {/* Benefit Simulation Engine */}
      <Route path="/bn/simulation" element={<ProtectedLayout><BnSimulationDashboard /></ProtectedLayout>} />
      <Route path="/bn/simulation/new" element={<ProtectedLayout><BnScenarioBuilder /></ProtectedLayout>} />
      <Route path="/bn/simulation/edit/:id" element={<ProtectedLayout><BnScenarioBuilder /></ProtectedLayout>} />
      <Route path="/bn/simulation/:id" element={<ProtectedLayout><BnRunSimulation /></ProtectedLayout>} />
      <Route path="/bn/simulation/:id/run/:runId" element={<ProtectedLayout><BnSimulationResult /></ProtectedLayout>} />


      {/* Benefit Application Form */}
      <Route path="/nbenefit/application/:benefitType" element={<BenefitApplicationFormPage />} />
      
      {/* Claim Approval */}
      <Route path="/nbenefit/claim-approval" element={<ProtectedLayout><ClaimApprovalEnhanced /></ProtectedLayout>} />
      
      {/* Benefit Rules Configuration */}
      <Route path="/nbenefit/config/rules" element={<ProtectedLayout><BenefitRulesList /></ProtectedLayout>} />
      <Route path="/nbenefit/config/rules/:id" element={<ProtectedLayout><BenefitRuleEditor /></ProtectedLayout>} />
      <Route path="/nbenefit/config/rules/:id/edit" element={<ProtectedLayout><BenefitRuleEditor /></ProtectedLayout>} />
      
      {/* Short-Term Benefits */}
      <Route path="/nbenefit/short-term/sickness/*" element={<ProtectedLayout><SicknessBenefit /></ProtectedLayout>} />
      <Route path="/nbenefit/short-term/employment-injury/*" element={<ProtectedLayout><EmploymentInjuryBenefit /></ProtectedLayout>} />
      <Route path="/nbenefit/short-term/maternity/*" element={<ProtectedLayout><MaternityBenefit /></ProtectedLayout>} />
      <Route path="/nbenefit/short-term/funeral-grant/*" element={<ProtectedLayout><FuneralGrantBenefit /></ProtectedLayout>} />
      
      {/* Long-Term Benefits */}
      <Route path="/nbenefit/long-term/age-benefit/*" element={<ProtectedLayout><AgeBenefit /></ProtectedLayout>} />
      <Route path="/nbenefit/long-term/invalidity/*" element={<ProtectedLayout><InvalidityBenefit /></ProtectedLayout>} />
      <Route path="/nbenefit/long-term/assistance/*" element={<ProtectedLayout><AssistanceBenefit /></ProtectedLayout>} />
      <Route path="/nbenefit/long-term/survivors/*" element={<ProtectedLayout><SurvivorsBenefit /></ProtectedLayout>} />
      
      {/* Non-Contributory Pensions */}
      <Route path="/nbenefit/non-contributory/assistance-pension/*" element={<ProtectedLayout><AssistancePension /></ProtectedLayout>} />
      <Route path="/nbenefit/non-contributory/invalidity-assistance/*" element={<ProtectedLayout><InvalidityAssistance /></ProtectedLayout>} />
      
      {/* Shared Config & Tools */}
      <Route path="/nbenefit/shared/common-eligibility-rules" element={<ProtectedLayout><CommonEligibilityRules /></ProtectedLayout>} />
      <Route path="/nbenefit/shared/calculation-engines" element={<ProtectedLayout><CalculationEngines /></ProtectedLayout>} />
      <Route path="/nbenefit/config/medical-rules" element={<ProtectedLayout><MedicalRulesConfig /></ProtectedLayout>} />
      <Route path="/nbenefit/long-term/registry" element={<ProtectedLayout><BeneficiaryRegistry /></ProtectedLayout>} />
      <Route path="/nbenefit/long-term/beneficiary/:id" element={<ProtectedLayout><BeneficiaryDetail /></ProtectedLayout>} />
      <Route path="/nbenefit/long-term/life-certificates" element={<ProtectedLayout><LifeCertificateManagement /></ProtectedLayout>} />
      <Route path="/nbenefit/shared/document-templates" element={<ProtectedLayout><DocumentTemplates /></ProtectedLayout>} />
      <Route path="/nbenefit/shared/workflows" element={<ProtectedLayout><BenefitWorkflows /></ProtectedLayout>} />
      <Route path="/nbenefit/shared/registry-search" element={<ProtectedLayout><RegistrySearch /></ProtectedLayout>} />

      {/* Contribution Payments Module */}
      <Route path="/cashier/payment-data-entry" element={<ProtectedLayout><PaymentDataEntry /></ProtectedLayout>} />
      <Route path="/cashier/payment-historical-entry" element={<ProtectedLayout><PaymentHistoricalEntry /></ProtectedLayout>} />
      <Route path="/cashier/payment-history-mgmt" element={<ProtectedLayout><PaymentHistoryManagement /></ProtectedLayout>} />
      <Route path="/cashier/transfer-payments" element={<ProtectedLayout><TransferPayments /></ProtectedLayout>} />
      <Route path="/cashier/payment-history-report" element={<ProtectedLayout><PaymentHistoryReport /></ProtectedLayout>} />
      <Route path="/cashier/vc-payment-update" element={<ProtectedLayout><VCPaymentUpdate /></ProtectedLayout>} />

      {/* Cashier & Payments Routes */}
      {/* Traditional Payment Processing */}
      <Route path="/cashier/misc-payments" element={<ProtectedLayout><MiscellaneousPayments /></ProtectedLayout>} />
      <Route path="/cashier/c3-payments" element={<ProtectedLayout><C3Payments /></ProtectedLayout>} />
      
      {/* Accounts Payable & Benefit Payments */}
      <Route path="/finance/accounts-payable/pending" element={<ProtectedLayout><APPendingPayables /></ProtectedLayout>} />
      <Route path="/finance/accounts-payable/create-batch" element={<ProtectedLayout><APCreateBatch /></ProtectedLayout>} />
      <Route path="/finance/accounts-payable/batches" element={<ProtectedLayout><APBatchList /></ProtectedLayout>} />
      <Route path="/finance/accounts-payable/batch/:batchId" element={<ProtectedLayout><APBatchDetail /></ProtectedLayout>} />
      <Route path="/finance/accounts-payable/exceptions/:batchId" element={<ProtectedLayout><APVerificationExceptions /></ProtectedLayout>} />
      <Route path="/finance/accounts-payable/accounts-verification" element={<ProtectedLayout><APAccountsVerification /></ProtectedLayout>} />
      <Route path="/finance/accounts-payable/benefits-verification" element={<ProtectedLayout><APBenefitsVerification /></ProtectedLayout>} />
      <Route path="/finance/accounts-payable/check-printing" element={<ProtectedLayout><APCheckPrinting /></ProtectedLayout>} />
      <Route path="/finance/accounts-payable/dd-generation" element={<ProtectedLayout><APDirectDepositGeneration /></ProtectedLayout>} />
      <Route path="/finance/accounts-payable/posting-history" element={<ProtectedLayout><APPostingHistory /></ProtectedLayout>} />
      <Route path="/finance/accounts-payable/corrections" element={<ProtectedLayout><APCorrections /></ProtectedLayout>} />
      <Route path="/finance/accounts-payable/reports" element={<ProtectedLayout><APReports /></ProtectedLayout>} />
      <Route path="/finance/accounts-payable/pay-runs" element={<ProtectedLayout><PayRunList /></ProtectedLayout>} />
      <Route path="/finance/accounts-payable/pay-runs/create" element={<ProtectedLayout><CreatePayRun /></ProtectedLayout>} />
      <Route path="/finance/accounts-payable/generate-payments" element={<ProtectedLayout><GeneratePayments /></ProtectedLayout>} />
      <Route path="/finance/accounts-payable/payment-inquiry" element={<ProtectedLayout><PaymentInquiry /></ProtectedLayout>} />
      
      {/* Central Payment Arrangements */}
      <Route path="/finance/arrangements" element={<ProtectedLayout><PaymentArrangementsPage /></ProtectedLayout>} />
      <Route path="/finance/arrangements/:id" element={<ProtectedLayout><ArrangementDetail /></ProtectedLayout>} />
      
      <Route path="/cashier/eft-entry" element={<ProtectedLayout><EFTEntry /></ProtectedLayout>} />
      <Route path="/cashier/cash-details" element={<ProtectedLayout><CashDetails /></ProtectedLayout>} />
      <Route path="/cashier/funds-transfer" element={<ProtectedLayout><FundsTransfer /></ProtectedLayout>} />
      <Route path="/cashier/check-management" element={<ProtectedLayout><CheckManagement /></ProtectedLayout>} />
      <Route path="/cashier/receipt" element={<ProtectedLayout><Receipt /></ProtectedLayout>} />
      
      {/* Invoice-Based Payment Processing */}
      <Route path="/cashier/create-invoice" element={<ProtectedLayout><CreateInvoice /></ProtectedLayout>} />
      <Route path="/cashier/search-pay-invoices" element={<ProtectedLayout><SearchPayInvoices /></ProtectedLayout>} />
      <Route path="/cashier/daily-invoice-report" element={<ProtectedLayout><DailyInvoiceReport /></ProtectedLayout>} />
      
      {/* Day-End and Management */}
      <Route path="/cashier/batch-closing" element={<ProtectedLayout><BatchClosing /></ProtectedLayout>} />
      <Route path="/cashier/card-machine-change-requests" element={<ProtectedLayout><CardMachineChangeRequests /></ProtectedLayout>} />
      <Route path="/cashier/batch-management" element={<ProtectedLayout><CashierBatchManagement /></ProtectedLayout>} />
      <Route path="/cashier/payment-module-config" element={<ProtectedLayout><PaymentModuleConfig /></ProtectedLayout>} />
      <Route path="/cashier/card-machines" element={<ProtectedLayout><PaymentModuleConfig /></ProtectedLayout>} />
      <Route path="/cashier/head-cashier-office-assignment" element={<ProtectedLayout><HeadCashierOfficeAssignment /></ProtectedLayout>} />
      <Route path="/cashier/head-cashier-assignment" element={<ProtectedLayout><HeadCashierAssignment /></ProtectedLayout>} />
      <Route path="/cashier/gl-posting" element={<ProtectedLayout><GLPostingSummary /></ProtectedLayout>} />
      <Route path="/cashier/analytics" element={<ProtectedLayout><PaymentAnalytics /></ProtectedLayout>} />
      <Route path="/cashier/reports" element={<ProtectedLayout><CashierReports /></ProtectedLayout>} />
      
      {/* Sage Integration Routes */}
      <Route path="/cashier/chart-accounts-mapping" element={<ProtectedLayout><ChartAccountsMapping /></ProtectedLayout>} />
      <Route path="/cashier/payment-types-mapping" element={<ProtectedLayout><PaymentTypesMapping /></ProtectedLayout>} />
      <Route path="/cashier/sage-sync" element={<ProtectedLayout><SageSynchronization /></ProtectedLayout>} />
      
      {/* Bank Account Mapping Routes */}
      <Route path="/cashier/current-accounts" element={<ProtectedLayout><CurrentAccountsSetup /></ProtectedLayout>} />
      <Route path="/cashier/reconciliation-accounts" element={<ProtectedLayout><BankReconciliationAccounts /></ProtectedLayout>} />
      
      {/* Collections Routes */}
      <Route path="/cashier/contribution-receipts" element={<ProtectedLayout><ContributionReceipts /></ProtectedLayout>} />
      <Route path="/cashier/rent-receipts" element={<ProtectedLayout><RentReceipts /></ProtectedLayout>} />
      <Route path="/cashier/loan-receipts" element={<ProtectedLayout><LoanReceipts /></ProtectedLayout>} />
      <Route path="/cashier/service-receipts" element={<ProtectedLayout><ServiceReceipts /></ProtectedLayout>} />

      {/* Legal Module Routes - SSB Legal */}
      <Route path="/legal/auth" element={<Suspense fallback={<div>Loading...</div>}><LegalAuth /></Suspense>} />
      <Route path="/legal/dashboard" element={<ProtectedLayout><SSBLegalDashboard /></ProtectedLayout>} />
      <Route path="/legal/cases" element={<ProtectedLayout><SSBCaseListPage /></ProtectedLayout>} />
      <Route path="/legal/cases/new" element={<ProtectedLayout><SSBCaseIntake /></ProtectedLayout>} />
      <Route path="/legal/cases/:id" element={<ProtectedLayout><SSBCaseViewPage /></ProtectedLayout>} />
      <Route path="/legal/cases/:id/edit" element={<ProtectedLayout><SSBCaseIntake /></ProtectedLayout>} />
      <Route path="/legal/hearings" element={
        <ProtectedLayout>
          <Suspense fallback={<div>Loading...</div>}>
            <LegalHearingCalendar />
          </Suspense>
        </ProtectedLayout>
      } />
      <Route path="/legal/orders" element={
        <ProtectedLayout>
          <Suspense fallback={<div>Loading...</div>}>
            <LegalOrderRegistry />
          </Suspense>
        </ProtectedLayout>
      } />
      <Route path="/legal/documents" element={
        <ProtectedLayout>
          <Suspense fallback={<div>Loading...</div>}>
            <LegalDocumentCenter />
          </Suspense>
        </ProtectedLayout>
      } />
      <Route path="/legal/reports" element={
        <ProtectedLayout>
          <SSBLegalReports />
        </ProtectedLayout>
      } />

      {/* BeMA Legacy Redirects */}
      <Route path="/bema/dashboard" element={<Navigate to="/compliance/workbench/manager" replace />} />
      <Route path="/bema/arrears" element={<Navigate to="/compliance/enforcement/arrangements" replace />} />
      <Route path="/bema/audits" element={<Navigate to="/compliance/field/audit-management" replace />} />
      <Route path="/bema/inspector-mobile" element={<Navigate to="/compliance/field/execution" replace />} />
      <Route path="/bema/contributors" element={<Navigate to="/compliance/field/employer-360" replace />} />
      <Route path="/bema/waivers" element={<Navigate to="/compliance/enforcement/waivers" replace />} />
      <Route path="/bema/reports" element={<Navigate to="/compliance/reports" replace />} />
      <Route path="/bema/zones" element={<Navigate to="/compliance/admin/geography/zones" replace />} />

      {/* Finance Module */}
      <Route path="/finance/dashboard" element={<ProtectedLayout><FinanceDashboard /></ProtectedLayout>} />
      <Route path="/finance/batch-management" element={<ProtectedLayout><BatchManagement /></ProtectedLayout>} />
      <Route path="/finance/payment-entry" element={<ProtectedLayout><PaymentEntry /></ProtectedLayout>} />
      <Route path="/finance/receipt-search" element={<ProtectedLayout><ReceiptSearch /></ProtectedLayout>} />
      <Route path="/finance/invoices" element={<ProtectedLayout><InvoiceManagement /></ProtectedLayout>} />
      <Route path="/finance/gl-export" element={<ProtectedLayout><GLExport /></ProtectedLayout>} />
      <Route path="/finance/daily-reports" element={<ProtectedLayout><DailyReports /></ProtectedLayout>} />
      <Route path="/finance/reversals" element={<ProtectedLayout><ReversalsAndPenalties /></ProtectedLayout>} />
      <Route path="/finance/admin-config" element={<ProtectedLayout><AdminConfiguration /></ProtectedLayout>} />
      <Route path="/finance/user-management" element={<ProtectedLayout><FinanceUserManagement /></ProtectedLayout>} />

      {/* Test Routes */}
      <Route path="/test/data-entry" element={<ProtectedLayout><TestDataEntry /></ProtectedLayout>} />

      {/* Foundation Components Demo */}
      <Route path="/components-demo" element={<FoundationComponentsDemo />} />

      {/* Report Routes - Insured Persons */}
      <Route path="/person/reports/summary" element={<ProtectedLayout><InsuredPersonsSummaryReport /></ProtectedLayout>} />
      <Route path="/person/reports/coverage-by-age" element={<ProtectedLayout><CoverageByAgeReport /></ProtectedLayout>} />
      <Route path="/person/reports/contribution-history" element={<ProtectedLayout><ContributionHistoryReport /></ProtectedLayout>} />
      
      {/* Report Routes - Employers */}
      <Route path="/employers/reports/registered-summary" element={<ProtectedLayout><RegisteredSummaryReport /></ProtectedLayout>} />
      <Route path="/employers/reports/active-inactive" element={<ProtectedLayout><ActiveInactiveReport /></ProtectedLayout>} />
      <Route path="/employers/reports/contribution-compliance" element={<ProtectedLayout><ContributionComplianceReport /></ProtectedLayout>} />
      <Route path="/employers/reports/non-paying-3-months" element={<ProtectedLayout><NonPaying3MonthsReport /></ProtectedLayout>} />
      <Route path="/employers/reports/non-paying-6-months" element={<ProtectedLayout><NonPaying6MonthsReport /></ProtectedLayout>} />
      <Route path="/employers/reports/non-paying-9-months" element={<ProtectedLayout><NonPaying9MonthsReport /></ProtectedLayout>} />
      <Route path="/employers/reports/top-missing-c3" element={<ProtectedLayout><TopMissingC3Report /></ProtectedLayout>} />
      <Route path="/employers/reports/missing-c3-per-zone" element={<ProtectedLayout><MissingC3PerZoneReport /></ProtectedLayout>} />
      <Route path="/employers/reports/c3-without-payment" element={<ProtectedLayout><C3WithoutPaymentReport /></ProtectedLayout>} />
      <Route path="/employers/reports/no-payment-per-zone" element={<ProtectedLayout><NoPaymentPerZoneReport /></ProtectedLayout>} />
      <Route path="/employers/reports/employee-turnover" element={<ProtectedLayout><EmployeeTurnoverReport /></ProtectedLayout>} />
      <Route path="/employers/reports/by-employee-count" element={<ProtectedLayout><ByEmployeeCountReport /></ProtectedLayout>} />
      <Route path="/employers/reports/by-monthly-contributions" element={<ProtectedLayout><ByMonthlyContributionsReport /></ProtectedLayout>} />
      <Route path="/employers/reports/by-arrears" element={<ProtectedLayout><ByArrearsReport /></ProtectedLayout>} />
      <Route path="/employers/reports/by-waivers" element={<ProtectedLayout><ByWaiversReport /></ProtectedLayout>} />
      <Route path="/employers/reports/waivers-per-zone" element={<ProtectedLayout><WaiversPerZoneReport /></ProtectedLayout>} />
      <Route path="/employers/reports/employees-per-zone" element={<ProtectedLayout><EmployeesPerZoneReport /></ProtectedLayout>} />
      <Route path="/employers/reports/contributions-per-zone" element={<ProtectedLayout><ContributionsPerZoneReport /></ProtectedLayout>} />
      <Route path="/employers/reports/queries-per-zone" element={<ProtectedLayout><QueriesPerZoneReport /></ProtectedLayout>} />
      <Route path="/employers/reports/most-queries" element={<ProtectedLayout><MostQueriesReport /></ProtectedLayout>} />
      <Route path="/employers/reports/by-litigation-count" element={<ProtectedLayout><ByLitigationCountReport /></ProtectedLayout>} />
      <Route path="/employers/reports/arrears-per-zone" element={<ProtectedLayout><ArrearsPerZoneReport /></ProtectedLayout>} />
      <Route path="/employers/reports/arrears-over-50k" element={<ProtectedLayout><ArrearsOver50kReport /></ProtectedLayout>} />
      <Route path="/employers/reports/arrears-over-100k" element={<ProtectedLayout><ArrearsOver100kReport /></ProtectedLayout>} />
      <Route path="/employers/reports/arrears-over-200k" element={<ProtectedLayout><ArrearsOver200kReport /></ProtectedLayout>} />
      <Route path="/employers/reports/arrears-over-300k" element={<ProtectedLayout><ArrearsOver300kReport /></ProtectedLayout>} />
      <Route path="/employers/reports/arrears-over-400k" element={<ProtectedLayout><ArrearsOver400kReport /></ProtectedLayout>} />
      <Route path="/employers/reports/arrears-50k-by-zone" element={<ProtectedLayout><Arrears50kByZoneReport /></ProtectedLayout>} />
      <Route path="/employers/reports/top-compliant" element={<ProtectedLayout><TopCompliantReport /></ProtectedLayout>} />
      <Route path="/employers/reports/arrears-30-days" element={<ProtectedLayout><Arrears30DaysReport /></ProtectedLayout>} />
      <Route path="/employers/reports/arrears-60-days" element={<ProtectedLayout><Arrears60DaysReport /></ProtectedLayout>} />
      <Route path="/employers/reports/arrears-90-days" element={<ProtectedLayout><Arrears90DaysReport /></ProtectedLayout>} />
      <Route path="/employers/reports/arrears-over-90-days" element={<ProtectedLayout><ArrearsOver90DaysReport /></ProtectedLayout>} />
      <Route path="/employers/reports/under-litigation" element={<ProtectedLayout><UnderLitigationReport /></ProtectedLayout>} />
      <Route path="/employers/reports/with-payment-plans" element={<ProtectedLayout><WithPaymentPlansReport /></ProtectedLayout>} />
      <Route path="/employers/reports/defaulted-plans" element={<ProtectedLayout><DefaultedPlansReport /></ProtectedLayout>} />
      <Route path="/employers/reports/ceased-employers" element={<ProtectedLayout><CeasedEmployersReport /></ProtectedLayout>} />
      <Route path="/employers/reports/out-of-federation" element={<ProtectedLayout><OutOfFederationReport /></ProtectedLayout>} />
      <Route path="/employers/reports/deceased-employers" element={<ProtectedLayout><DeceasedEmployersReport /></ProtectedLayout>} />
      <Route path="/employers/reports/overseas-submissions" element={<ProtectedLayout><OverseasSubmissionsReport /></ProtectedLayout>} />
      <Route path="/employers/reports/nil-returns-3-months" element={<ProtectedLayout><NILReturns3MonthsReport /></ProtectedLayout>} />
      <Route path="/employers/reports/nil-returns-over-3-months" element={<ProtectedLayout><NILReturnsOver3MonthsReport /></ProtectedLayout>} />

      {/* C3 Reports */}
      <Route path="/c3/reports/monthly-collections" element={<ProtectedLayout><MonthlyCollectionsReport /></ProtectedLayout>} />
      <Route path="/c3/reports/arrears" element={<ProtectedLayout><ArrearsReport /></ProtectedLayout>} />
      <Route path="/c3/reports/top-contributors" element={<ProtectedLayout><TopContributorsReport /></ProtectedLayout>} />

      {/* Finance Reports */}
      <Route path="/finance/reports/contributions-vs-benefits" element={<ProtectedLayout><ContributionsVsBenefitsReport /></ProtectedLayout>} />
      <Route path="/finance/reports/cash-flow" element={<ProtectedLayout><CashFlowReport /></ProtectedLayout>} />
      <Route path="/finance/reports/investment-portfolio" element={<ProtectedLayout><InvestmentPortfolioReport /></ProtectedLayout>} />
      
      {/* Report Routes - Benefits */}
      <Route path="/benefits/reports/payments-by-type" element={<ProtectedLayout><PaymentsByTypeReport /></ProtectedLayout>} />
      <Route path="/benefits/reports/claims-volume" element={<ProtectedLayout><ClaimsVolumeReport /></ProtectedLayout>} />
      <Route path="/benefits/reports/overpayments" element={<ProtectedLayout><OverpaymentsReport /></ProtectedLayout>} />
      
      {/* Report Routes - Compliance */}
      <Route path="/compliance/reports/employer-status" element={<ProtectedLayout><EmployerStatusReport /></ProtectedLayout>} />
      
      {/* Report Routes - Audit */}
      <Route path="/audit/reports/engagement-summary" element={<ProtectedLayout><EngagementSummaryReport /></ProtectedLayout>} />
      <Route path="/audit/reports/communication-compliance" element={<ProtectedLayout><CommunicationComplianceReport /></ProtectedLayout>} />
      <Route path="/audit/reports/plan-slippage" element={<ProtectedLayout><PlanSlippageReport /></ProtectedLayout>} />
      <Route path="/audit/reports/overdue-actions" element={<ProtectedLayout><OverdueActionsReport /></ProtectedLayout>} />
      <Route path="/audit/reports/carry-forward-aging" element={<ProtectedLayout><CarryForwardAgingReport /></ProtectedLayout>} />
      
      {/* Report Routes - Admin */}
      <Route path="/admin/reports/account-roles" element={<ProtectedLayout><AccountRolesReport /></ProtectedLayout>} />
      <Route path="/admin/reports/permission-changes" element={<ProtectedLayout><PermissionChangesReport /></ProtectedLayout>} />
      <Route path="/admin/reports/configuration-audit" element={<ProtectedLayout><ConfigurationAuditReport /></ProtectedLayout>} />
      
      {/* Fee Configuration */}
      <Route path="/admin/fee-configuration" element={<ProtectedLayout><FeeConfiguration /></ProtectedLayout>} />

      {/* Enterprise Admin Routes - consolidated above in System Administration Routes */}
      
      {/* Profile Routes */}
      <Route path="/profile/change-password" element={<ProtectedLayout><ProfileChangePassword /></ProtectedLayout>} />
      <Route path="/profile/notifications" element={<ProtectedLayout><NotificationPreferences /></ProtectedLayout>} />
      <Route path="/profile/sessions" element={<ProtectedLayout><ActiveSessions /></ProtectedLayout>} />
      
      {/* Notification Center */}
      <Route path="/notifications/center" element={<ProtectedLayout><NotificationCenter /></ProtectedLayout>} />

      {/* Medical Module */}
      <Route path="/medical/applications" element={<ProtectedLayout><DoctorApplicationsList /></ProtectedLayout>} />
      <Route path="/medical/applications/new" element={<ProtectedLayout><NewManualApplication /></ProtectedLayout>} />
      <Route path="/medical/applications/:id" element={<ProtectedLayout><DoctorApplicationDetail /></ProtectedLayout>} />
      <Route path="/medical/registry" element={<ProtectedLayout><DoctorRegistry /></ProtectedLayout>} />
      <Route path="/medical/claims" element={<ProtectedLayout><ClaimsByDoctors /></ProtectedLayout>} />

      {/* Sample Application Module */}
      <Route path="/sample-applications" element={<ProtectedLayout><SampleApplicationList /></ProtectedLayout>} />
      <Route path="/sample-applications/new" element={<ProtectedLayout><SampleApplicationForm /></ProtectedLayout>} />
      <Route path="/sample-applications/:id" element={<ProtectedLayout><SampleApplicationView /></ProtectedLayout>} />
      <Route path="/sample-applications/:id/edit" element={<ProtectedLayout><SampleApplicationForm /></ProtectedLayout>} />

      {/* Applications for Review */}
      <Route path="/workflow/applications-review" element={<ProtectedLayout><ApplicationsReview /></ProtectedLayout>} />

      {/* Meetings Module */}
      <Route path="/meetings/manage" element={<ProtectedLayout><ManageMeetingsPage /></ProtectedLayout>} />
      <Route path="/meetings/start/:meetingId" element={<ProtectedLayout><StartMeetingPage /></ProtectedLayout>} />


      {/* Workflow Instances */}
      <Route path="/admin/workflow-instances" element={<ProtectedLayout><WorkflowInstanceList /></ProtectedLayout>} />
      <Route path="/admin/workflow-instances/:id" element={<ProtectedLayout><WorkflowInstanceDetail /></ProtectedLayout>} />

      {/* System Monitoring & Logs */}
      <Route path="/system-logs/technical" element={<ProtectedLayout><TechnicalLogs /></ProtectedLayout>} />
      <Route path="/system-logs/errors" element={<ProtectedLayout><ErrorLogs /></ProtectedLayout>} />
      <Route path="/system-logs/business" element={<ProtectedLayout><BusinessEvents /></ProtectedLayout>} />
      <Route path="/system-logs/audit" element={<ProtectedLayout><AuditTrail /></ProtectedLayout>} />
      <Route path="/system-logs/security" element={<ProtectedLayout><SecurityLogs /></ProtectedLayout>} />
      <Route path="/system-logs/integration" element={<ProtectedLayout><IntegrationLogs /></ProtectedLayout>} />
      <Route path="/system-logs/performance" element={<ProtectedLayout><PerformanceMonitor /></ProtectedLayout>} />
      <Route path="/system-logs/workflows" element={<ProtectedLayout><SystemWorkflowLogs /></ProtectedLayout>} />
      <Route path="/system-logs/login-security" element={<ProtectedLayout><LoginSecurityLogs /></ProtectedLayout>} />

      {/* Data Access Control */}
      <Route path="/admin/data-access/scope-rules" element={<ProtectedLayout><DataScopeRules /></ProtectedLayout>} />
      <Route path="/admin/data-access/field-security" element={<ProtectedLayout><FieldSecurity /></ProtectedLayout>} />
      <Route path="/admin/data-access/role-policies" element={<ProtectedLayout><RoleDataPolicies /></ProtectedLayout>} />
      <Route path="/admin/data-access/user-overrides" element={<ProtectedLayout><UserDataOverrides /></ProtectedLayout>} />
      <Route path="/admin/data-access/test-console" element={<ProtectedLayout><PolicyTestConsole /></ProtectedLayout>} />

      {/* System Cleanup & Refactoring */}
      <Route path="/admin/system-cleanup" element={<ProtectedLayout><SystemCleanupDashboard /></ProtectedLayout>} />
      <Route path="/admin/system-cleanup/modules-inventory" element={<ProtectedLayout><ActiveModulesInventory /></ProtectedLayout>} />
      <Route path="/admin/system-cleanup/dependency-scan" element={<ProtectedLayout><DependencyScan /></ProtectedLayout>} />
      <Route path="/admin/system-cleanup/cleanup-review" element={<ProtectedLayout><CleanupReview /></ProtectedLayout>} />
      <Route path="/admin/system-cleanup/rollback" element={<ProtectedLayout><RollbackScreen /></ProtectedLayout>} />

      {/* Online Applications Module */}
      <Route path="/admin/api-configuration" element={<ProtectedLayout><ApiConfiguration /></ProtectedLayout>} />
      <Route path="/online-applications/insured-person" element={<ProtectedLayout><InsuredPersonApplications /></ProtectedLayout>} />
      <Route path="/online-applications/insured-person/:referenceNumber" element={<ProtectedLayout><ApplicationDetailPage /></ProtectedLayout>} />
      <Route path="/online-applications/employer" element={<ProtectedLayout><EmployerApplications /></ProtectedLayout>} />
      <Route path="/online-applications/employer/:applicationId" element={<ProtectedLayout><EmployerApplicationDetailPage /></ProtectedLayout>} />
      <Route path="/online-applications/doctor" element={<ProtectedLayout><DoctorApplications /></ProtectedLayout>} />
      <Route path="/online-applications/doctor/:applicationId" element={<ProtectedLayout><DoctorApplicationDetailPage /></ProtectedLayout>} />

      {/* QA Framework */}
      <Route path="/admin/qa" element={<ProtectedLayout><QADashboard /></ProtectedLayout>} />
      <Route path="/admin/qa/knowledge" element={<ProtectedLayout><KnowledgeRepository /></ProtectedLayout>} />
      <Route path="/admin/qa/change-requests" element={<ProtectedLayout><QAChangeRequests /></ProtectedLayout>} />
      {/* IP Registration Module - Primary route */}
      <Route path="/ip-registration" element={<ProtectedLayout><IPRegistrationList /></ProtectedLayout>} />
      <Route path="/ip-registration/new" element={<ProtectedLayout><IPRegistrationForm /></ProtectedLayout>} />
      <Route path="/ip-registration/edit/:uniqueUuid" element={<ProtectedLayout><IPRegistrationForm /></ProtectedLayout>} />
      <Route path="/ip-registration/view/:uniqueUuid" element={<ProtectedLayout><IPRegistrationForm /></ProtectedLayout>} />
      <Route path="/ip-registration/external" element={<ProtectedLayout><ExternalApplicationsScreen /></ProtectedLayout>} />

      {/* Employer Registration Module */}
      <Route path="/employer-registration" element={<ProtectedLayout><EmployerRegistrationList /></ProtectedLayout>} />
      <Route path="/employer-registration/new" element={<ProtectedLayout><EmployerRegistrationForm /></ProtectedLayout>} />
      <Route path="/employer-registration/edit/:regno" element={<ProtectedLayout><EmployerRegistrationForm /></ProtectedLayout>} />
      <Route path="/employer-registration/view/:regno" element={<ProtectedLayout><EmployerRegistrationForm /></ProtectedLayout>} />




      {/* DB Diagram */}
      <Route path="/db-diagram" element={<ProtectedLayout><Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}><DbDiagramPage /></Suspense></ProtectedLayout>} />
      <Route path="/db-diagram/:moduleCode" element={<ProtectedLayout><Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}><DbDiagramPage /></Suspense></ProtectedLayout>} />

      {/* Maintenance / Lockdown */}
      <Route path="/maintenance" element={<Maintenance />} />

      {/* Unauthorized */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const ProtectedLegalRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useLegalAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/legal/auth" replace />;
  }
  
  return <>{children}</>;
};
