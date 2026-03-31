
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { InspectorLogin } from '@/pages/inspector/InspectorLogin';
import { InspectorLayout } from '@/components/inspector/InspectorLayout';
import { InspectorDashboard } from '@/pages/inspector/InspectorDashboard';
import { InspectorWeeklyPlan } from '@/pages/inspector/InspectorWeeklyPlan';
import { InspectorActivities } from '@/pages/inspector/InspectorActivities';
import { InspectorViolations } from '@/pages/inspector/InspectorViolations';
import { InspectorReports } from '@/pages/inspector/InspectorReports';
import { RecordViolationForm } from '@/pages/inspector/RecordViolationForm';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useLegalAuth } from '@/contexts/LegalAuthContext';
import React, { Suspense, lazy } from 'react';

// DB Diagram
const DbDiagramPage = lazy(() => import('@/pages/db-diagram/DbDiagramPage'));

// Page imports
import Index from '@/pages/dashboard/Index';
import NotFound from '@/pages/NotFound';
import Unauthorized from '@/pages/Unauthorized';
import ViewInsuredPerson from '@/pages/insuredPersons/ViewInsuredPerson';
import EditInsuredPerson from '@/pages/insuredPersons/EditInsuredPerson';

// CRD Module
import CardManagement from '@/pages/crd/CardManagement';
import CRDPrintedSpoiledCardsReport from '@/pages/crd/reports/PrintedSpoiledCardsReport';

// Compliance Module
import ViolationsManagement from '@/pages/compliance/violations/ViolationsManagement';
import ViolationDetails from '@/pages/compliance/violations/ViolationDetails';
import InspectorPlans from '@/pages/compliance/audit-planning/InspectorPlans';
import PaymentArrangements from '@/pages/compliance/arrangements/PaymentArrangements';
import FieldOperations from '@/pages/compliance/inspections/FieldOperations';
import NoticesManagement from '@/pages/compliance/legal/NoticesManagement';
import EmployerStatements from '@/pages/compliance/employers/EmployerStatements';
import ComplianceSettings from '@/pages/compliance/settings/ComplianceSettings';
import ComplianceDashboard from '@/pages/compliance/dashboards/ComplianceDashboard';
import ComplianceReports from '@/pages/compliance/reports/ComplianceReports';
import CaseAnalytics from '@/pages/compliance/reports/CaseAnalytics';
import InspectorPerformance from '@/pages/compliance/reports/InspectorPerformance';
import C3Compliance from '@/pages/compliance/reports/C3Compliance';
import ArrearsReports from '@/pages/compliance/reports/ArrearsReports';
import ComplianceAuditReports from '@/pages/compliance/reports/AuditReports';
import ArrangementReports from '@/pages/compliance/reports/ArrangementReports';
import LegalEscalationReports from '@/pages/compliance/reports/LegalEscalationReports';
import RiskSamplingSettings from '@/pages/compliance/sampling/RiskSamplingSettings';
import SamplingDashboard from '@/pages/compliance/sampling/SamplingDashboard';
import MonthlyAuditCandidates from '@/pages/compliance/sampling/MonthlyAuditCandidates';
import MyUpcomingAudits from '@/pages/compliance/sampling/MyUpcomingAudits';
import EmployerRiskProfile from '@/pages/compliance/sampling/EmployerRiskProfile';
import LegalEscalationPolicy from '@/pages/compliance/settings/LegalEscalationPolicy';
import LegalRecommendationQueue from '@/pages/compliance/legal/LegalRecommendationQueue';
import RiskRulePolicy from '@/pages/compliance/settings/RiskRulePolicy';

// New Compliance & Enforcement pages
import ComplianceManagerDashboard from '@/pages/compliance/dashboards/ManagerDashboard';
import ComplianceInspectorDashboard from '@/pages/compliance/dashboards/InspectorDashboard';
import ComplianceLegalDashboard from '@/pages/compliance/dashboards/LegalDashboard';
import ComplianceCaseManagement from '@/pages/compliance/cases/CaseManagement';
import ComplianceCaseQueue from '@/pages/compliance/cases/CaseQueue';
import ComplianceRiskProfiles from '@/pages/compliance/risk/RiskProfiles';
import ComplianceInspectionManagement from '@/pages/compliance/inspections/InspectionManagement';
import ComplianceBreachMonitoring from '@/pages/compliance/arrangements/BreachMonitoring';
import ComplianceLegalQueue from '@/pages/compliance/legal/LegalQueue';
import ComplianceLegalProceedings from '@/pages/compliance/legal/LegalProceedingsPage';
import ComplianceWaivers from '@/pages/compliance/legal/WaiversOverrides';
import ComplianceJobConfiguration from '@/pages/compliance/automation/JobConfiguration';
import ComplianceJobHistory from '@/pages/compliance/automation/JobHistory';
import ComplianceRuleEngine from '@/pages/compliance/settings/RuleEngine';
import ComplianceViolationTypes from '@/pages/compliance/settings/ViolationTypes';
import ComplianceNumberTemplates from '@/pages/compliance/settings/NumberTemplates';
import ComplianceRiskScoringConfig from '@/pages/compliance/settings/RiskScoringConfig';
import ComplianceTemplates from '@/pages/compliance/settings/ComplianceTemplates';
import WeeklyPlanBuilder from '@/pages/compliance/audit-planning/WeeklyPlanBuilder';
import MyPlans from '@/pages/compliance/audit-planning/MyPlans';
import AllWeeklyReports from '@/pages/compliance/audit-planning/AllWeeklyReports';
import FieldExecution from '@/pages/compliance/audit-planning/FieldExecution';
import WeeklyReports from '@/pages/compliance/audit-planning/WeeklyReports';
import CompliancePendingReview from '@/pages/compliance/audit-planning/PendingReview';
import { WeeklyPlanReview } from '@/pages/compliance/audit-planning/WeeklyPlanReview';
import WeeklyReportSubmission from '@/pages/compliance/violations/WeeklyReportSubmission';
import ManualViolationEntry from '@/pages/compliance/violations/ManualViolationEntry';
import EmployerFindings from '@/pages/compliance/employers/EmployerFindings';
import EmployerVisitWorkspace from '@/pages/compliance/employers/EmployerVisitWorkspace';
import EmployerStatementDetail from '@/pages/compliance/employers/EmployerStatementDetail';
import LevySchemesList from '@/pages/c3/settings/levy/LevySchemesList';
import LevySchemeDetail from '@/pages/c3/settings/levy/LevySchemeDetail';
import LevySimulator from '@/pages/c3/settings/levy/LevySimulator';
import SSSchemesList from '@/pages/c3/settings/ss/SSSchemesList';
import SSSchemeDetail from '@/pages/c3/settings/ss/SSSchemeDetail';
import SSSimulator from '@/pages/c3/settings/ss/SSSimulator';
import SeveranceSchemesList from '@/pages/c3/settings/severance/SeveranceSchemesList';
import SeveranceSchemeDetail from '@/pages/c3/settings/severance/SeveranceSchemeDetail';
import SeveranceSimulator from '@/pages/c3/settings/severance/SeveranceSimulator';
import InjurySchemesList from '@/pages/c3/settings/injury/InjurySchemesList';
import InjurySchemeDetail from '@/pages/c3/settings/injury/InjurySchemeDetail';
import InjurySimulator from '@/pages/c3/settings/injury/InjurySimulator';
import C3FormatsList from '@/pages/c3/settings/c3file/C3FormatsList';
import C3FormatDetail from '@/pages/c3/settings/c3file/C3FormatDetail';

// CyberSource & Reconciliation
import CyberSourceSettings from '@/pages/c3Management/CyberSourceSettings';
import ReconciliationPage from '@/pages/c3Management/ReconciliationPage';

// C3 Details Screens
import C3ContributionList from '@/pages/c3Management/c3Details/C3ContributionList';
import NwDirectorList from '@/pages/c3Management/c3Details/NwDirectorList';
import SelfEmployedContributionList from '@/pages/c3Management/c3Details/SelfEmployedContributionList';
import OfflinePaymentPage from '@/pages/c3Management/c3Details/OfflinePaymentPage';

import EmployerRegistration from '@/pages/employersManagement/EmployerRegistration';
import EmployerApproval from '@/pages/employersManagement/EmployerApproval';
import EmployerDirectory from '@/pages/employersManagement/EmployerDirectory';
import ContributionEntry from '@/pages/employersManagement/ContributionEntry';
import ComplianceMonitoring from '@/pages/compliance/dashboards/ComplianceMonitoring';
import ContributionTracking from '@/pages/employersManagement/ContributionTracking';

// Insured Persons - New consolidated page
import IPManagement from '@/pages/insuredPersons/IPManagement';
import PersonIPManagement from '@/pages/insuredPersons/PersonIPManagement';

// Quick Actions Pages
import WagesHistory from '@/pages/insuredPersons/WagesHistory';
import ClaimHistory from '@/pages/insuredPersons/ClaimHistory';
import BenefitEligibility from '@/pages/insuredPersons/BenefitEligibility';
import PendingReviews from '@/pages/insuredPersons/PendingReviews';

// Service Request Pages
import ServiceRequestNew from '@/pages/person/ServiceRequestNew';
import ServiceRequestList from '@/pages/person/ServiceRequestList';
import ServiceRequestDetail from '@/pages/person/ServiceRequestDetail';
import PendingVerification from '@/pages/person/PendingVerification';
import InsuredPersonProfile from '@/pages/person/InsuredPersonProfile';

// Insured Persons Reports
import IPEntryVerificationReport from '@/pages/person/reports/IPEntryVerificationReport';
import Age62WithoutClaimReport from '@/pages/person/reports/Age62WithoutClaimReport';
import OnlineRenewalUpdateReport from '@/pages/person/reports/OnlineRenewalUpdateReport';
import RegistrationPaymentsReport from '@/pages/person/reports/RegistrationPaymentsReport';
import ContributionStatementPaymentReport from '@/pages/person/reports/ContributionStatementPaymentReport';
import PensionLettersPaymentReport from '@/pages/person/reports/PensionLettersPaymentReport';
import NonNationalWorkersSSNReport from '@/pages/person/reports/NonNationalWorkersSSNReport';
import NewRegistrantsByOfficerReport from '@/pages/person/reports/NewRegistrantsByOfficerReport';
import EmployerRegistrationByOfficerReport from '@/pages/person/reports/EmployerRegistrationByOfficerReport';
import LifeCertificatesReport from '@/pages/person/reports/LifeCertificatesReport';
import SelfEmployedByOfficerReport from '@/pages/person/reports/SelfEmployedByOfficerReport';
import ClaimsEnteredByOfficerReport from '@/pages/person/reports/ClaimsEnteredByOfficerReport';
import SelfEmployedWithoutLicenseReport from '@/pages/person/reports/SelfEmployedWithoutLicenseReport';
import ClaimsToBenefitsReport from '@/pages/person/reports/ClaimsToBenefitsReport';
import CRMActivityReport from '@/pages/person/reports/CRMActivityReport';
import C3EntryVerificationReport from '@/pages/person/reports/C3EntryVerificationReport';
import PendingC3Report from '@/pages/person/reports/PendingC3Report';
import MissingSSNReport from '@/pages/person/reports/MissingSSNReport';
import C3LineItemChangesReport from '@/pages/person/reports/C3LineItemChangesReport';
import ElectronicC3UploadsReport from '@/pages/person/reports/ElectronicC3UploadsReport';
import EmployerNotificationsReport from '@/pages/person/reports/EmployerNotificationsReport';
import HighWageMultiEmployerReport from '@/pages/person/reports/HighWageMultiEmployerReport';
import ScanningActivityReport from '@/pages/person/reports/ScanningActivityReport';
import OutstandingDiscrepanciesReport from '@/pages/person/reports/OutstandingDiscrepanciesReport';
import LongTermClaimsReport from '@/pages/person/reports/LongTermClaimsReport';
import AuditSampleReport from '@/pages/person/reports/AuditSampleReport';
import RefundsToCRUReport from '@/pages/person/reports/RefundsToCRUReport';
import AuditSampleIPReport from '@/pages/person/reports/AuditSampleIPReport';

// Finance Settings Pages
import FeeConfigurationDetail from '@/pages/finance/settings/FeeConfigurationDetail';
import FeeConfigurationList from '@/pages/finance/settings/FeeConfigurationList';
import ServiceTypeManagement from '@/pages/finance/settings/ServiceTypeManagement';
import PaymentArrangementsPage from '@/pages/finance/PaymentArrangements';
import ArrangementDetail from '@/pages/finance/ArrangementDetail';
import VerificationSettings from '@/pages/finance/settings/VerificationSettings';
import MultiCurrencySettings from '@/pages/finance/settings/MultiCurrencySettings';

// Benefits
import AllBenefitsTabs from '@/pages/benefits/AllBenefitsTabs';
import OnlineBenefitApplications from '@/pages/benefits/OnlineBenefitApplications';
import MaternityBenefits from '@/pages/benefits/MaternityBenefits';
import UnemploymentBenefits from '@/pages/benefits/UnemploymentBenefits';
import WorkInjuryBenefits from '@/pages/benefits/WorkInjuryBenefits';
import DeathBenefits from '@/pages/benefits/DeathBenefits';
import EducationalBenefits from '@/pages/benefits/EducationalBenefits';

// Compliance & Audit (ComplianceDashboard already imported above)
import EmployerComplianceManagement from '@/pages/compliance/employers/EmployerComplianceManagement';
import LegalProceedings from '@/pages/compliance/legal/LegalProceedings';
import AuditManagement from '@/pages/compliance/audit-planning/AuditManagement';
import PenaltyManagement from '@/pages/compliance/cases/PenaltyManagement';

// Legal Module
const LegalAuth = lazy(() => import('@/pages/legal/LegalAuth'));
const LegalHearingCalendar = lazy(() => import('@/pages/legal/LegalHearingCalendar'));
const LegalOrderRegistry = lazy(() => import('@/pages/legal/LegalOrderRegistry'));
const LegalDocumentCenter = lazy(() => import('@/pages/legal/DocumentCenter'));
import SSBCaseListPage from '@/pages/legal/SSBCaseList';
import SSBCaseIntake from '@/pages/legal/SSBCaseIntake';
import SSBCaseViewPage from '@/pages/legal/SSBCaseView';
import SSBLegalReports from '@/pages/legal/SSBLegalReports';
import SSBLegalDashboard from '@/pages/legal/SSBLegalDashboard';

// Audit Module — Simplified Department Function Audit
import AuditDashboard from '@/pages/audit/AuditDashboard';
import AuditPlansNew from '@/pages/audit/AuditPlansNew';
const AuditPlanDetail = lazy(() => import('@/pages/audit/AuditPlanDetail'));
import AuditReports from '@/pages/audit/AuditReports';
import DepartmentMaster from '@/pages/audit/DepartmentMaster';
import FunctionMaster from '@/pages/audit/FunctionMaster';
import DepartmentView from '@/pages/audit/DepartmentView';
import RiskAssessment from '@/pages/audit/RiskAssessment';
import RiskMatrix from '@/pages/audit/RiskMatrix';
import AuditEngagements from '@/pages/audit/AuditEngagements';
import EngagementDetail from '@/pages/audit/EngagementDetail';
import { AuditFeatureGate } from '@/components/audit/AuditFeatureGate';
import PlanApproval from '@/pages/audit/PlanApproval';
import AuditConfig from '@/pages/audit/AuditConfig';
const RiskSettings = lazy(() => import('@/pages/audit/RiskSettings'));
const AuditSettings = lazy(() => import('@/pages/audit/AuditSettings'));
const AuditQueries = lazy(() => import('@/pages/audit/AuditQueries'));
const AuditorProfiles = lazy(() => import('@/pages/audit/AuditorProfiles'));
const HolidayCalendar = lazy(() => import('@/pages/audit/HolidayCalendar'));
const AuditorLeaveManagement = lazy(() => import('@/pages/audit/AuditorLeaveManagement'));

// Reports
import ReportsHub from '@/pages/reports/ReportsHub';
import EmployerStatement from '@/pages/reports/EmployerStatement';

// System Administration
import WebUsers from '@/pages/users/WebUsers';
import AuditLog from '@/pages/systemAdmin/AuditLog';
import CentralScheduler from '@/pages/admin/CentralScheduler';
import UserManagement from '@/pages/systemAdmin/UserManagement';
import BackupRecovery from '@/pages/systemAdmin/BackupRecovery';
import SystemLogs from '@/pages/systemAdmin/SystemLogs';
import EmployeeList from '@/pages/systemAdmin/EmployeeList';
import OrgUnitList from '@/pages/systemAdmin/OrgUnitList';
import PositionList from '@/pages/systemAdmin/PositionList';
import RoleList from '@/pages/systemAdmin/RoleList';
// System Administration Routes - Approval Matrix modules added
import DelegationList from '@/pages/systemAdmin/DelegationList';
import ApprovalMatrixPayment from '@/pages/systemAdmin/ApprovalMatrixPayment';
import ApprovalMatrixFeeWaiver from '@/pages/systemAdmin/ApprovalMatrixFeeWaiver';
import ApprovalMatrixJournal from '@/pages/systemAdmin/ApprovalMatrixJournal';
import ApprovalMatrixRefund from '@/pages/systemAdmin/ApprovalMatrixRefund';
import ApprovalMatrixWriteOff from '@/pages/systemAdmin/ApprovalMatrixWriteOff';
import WorkflowSchemeList from '@/pages/systemAdmin/WorkflowSchemeList';
import NotificationLog from '@/pages/systemAdmin/NotificationLog';
import NotificationTemplates from '@/pages/systemAdmin/NotificationTemplates';
import NotificationChannelSettings from '@/pages/systemAdmin/NotificationChannelSettings';
import WorkflowManagement from '@/pages/workflow/WorkflowManagement';

// Enterprise Admin Module
import UserManagementAdmin from '@/pages/admin/UserManagementAdmin';
import RolePermissionManagement from '@/pages/admin/RolePermissionManagement';
import AuditLogViewer from '@/pages/admin/AuditLogViewer';
import NotificationManagement from '@/pages/admin/NotificationManagement';
import OfficeManagement from '@/pages/admin/OfficeManagement';
import DepartmentManagement from '@/pages/admin/DepartmentManagement';
import ModuleManagement from '@/pages/admin/ModuleManagement';
import DesignationManagement from '@/pages/admin/DesignationManagement';
import DesignationHierarchy from '@/pages/admin/DesignationHierarchy';
import RoleHierarchy from '@/pages/admin/RoleHierarchy';
import UserNotificationPreferences from '@/pages/admin/UserNotificationPreferences';
import DataMigration from '@/pages/admin/DataMigration';
import UpdateUserPassword from '@/pages/admin/users/UpdateUserPassword';
import ModuleButtonBindings from '@/pages/admin/ModuleButtonBindings';
import ApiKeysManagement from '@/pages/admin/ApiKeysManagement';
import PublicApiManagement from '@/pages/admin/PublicApiManagement';
import DocumentConfigurationPage from '@/pages/admin/DocumentConfigurationPage';
import ExternalApiManagement from '@/pages/admin/ExternalApiManagement';
import ExternalApiDocs from '@/pages/external/ExternalApiDocs';
import PublicApiDocs from '@/pages/public/PublicApiDocs';

import WorkflowList from '@/pages/admin/workflows/WorkflowList';
import WorkflowForm from '@/pages/admin/workflows/WorkflowForm';
import WorkflowTriggers from '@/pages/admin/workflows/WorkflowTriggers';
import WorkflowLogs from '@/pages/admin/workflows/WorkflowLogs';
import WorkflowAnalytics from '@/pages/admin/workflows/WorkflowAnalytics';
import WorkflowSecuritySettings from '@/pages/admin/workflows/WorkflowSecuritySettings';
import SecuredWorkflowApprovals from '@/pages/admin/workflows/SecuredWorkflowApprovals';
import WorkflowInstanceList from '@/pages/admin/workflows/WorkflowInstanceList';
import WorkflowInstanceDetail from '@/pages/admin/workflows/WorkflowInstanceDetail';
import MyWorkflowTasks from '@/pages/workflow/MyWorkflowTasks';
import ApplicationsReview from '@/pages/workflow/ApplicationsReview';

// Sample Application
import SampleApplicationList from '@/pages/sample-application/SampleApplicationList';
import SampleApplicationForm from '@/pages/sample-application/SampleApplicationForm';
import SampleApplicationView from '@/pages/sample-application/SampleApplicationView';

// Data Access Control
import DataScopeRules from '@/pages/admin/data-access/DataScopeRules';
import FieldSecurity from '@/pages/admin/data-access/FieldSecurity';
import RoleDataPolicies from '@/pages/admin/data-access/RoleDataPolicies';
import UserDataOverrides from '@/pages/admin/data-access/UserDataOverrides';
import PolicyTestConsole from '@/pages/admin/data-access/PolicyTestConsole';

// System Cleanup
import SystemCleanupDashboard from '@/pages/admin/system-cleanup/SystemCleanupDashboard';
import ActiveModulesInventory from '@/pages/admin/system-cleanup/ActiveModulesInventory';
import DependencyScan from '@/pages/admin/system-cleanup/DependencyScan';
import CleanupReview from '@/pages/admin/system-cleanup/CleanupReview';
import RollbackScreen from '@/pages/admin/system-cleanup/RollbackScreen';

// Online Applications Module
import ApiConfiguration from '@/pages/admin/settings/ApiConfiguration';
import GlobalSettings from '@/pages/systemAdmin/GlobalSettings';
import C3CalculationConfigPage from '@/pages/admin/C3CalculationConfigPage';
import C3PeriodConfigPage from '@/pages/admin/C3PeriodConfigPage';
import C3ConfigurationPage from '@/pages/admin/C3ConfigurationPage';
import InsuredPersonApplications from '@/pages/online-applications/InsuredPersonApplications';
import ApplicationDetailPage from '@/pages/online-applications/ApplicationDetailPage';
import EmployerApplications from '@/pages/online-applications/EmployerApplications';
import EmployerApplicationDetailPage from '@/pages/online-applications/EmployerApplicationDetailPage';
import DoctorApplications from '@/pages/online-applications/DoctorApplications';

// QA Framework
import QADashboard from '@/pages/admin/qa/QADashboard';
import KnowledgeRepository from '@/pages/admin/qa/KnowledgeRepository';
import QAChangeRequests from '@/pages/admin/qa/QAChangeRequests';
import DoctorApplicationDetailPage from '@/pages/online-applications/DoctorApplicationDetailPage';

// IP Registration Module
import IPRegistrationList from '@/pages/ip-registration/IPRegistrationList';
import IPRegistrationForm from '@/pages/ip-registration/IPRegistrationForm';
import ExternalApplicationsScreen from '@/pages/ip-registration/ExternalApplicationsScreen';

// Employer Registration Module
import EmployerRegistrationList from '@/pages/employer-registration/EmployerRegistrationList';
import EmployerRegistrationForm from '@/pages/employer-registration/EmployerRegistrationForm';

// Enterprise Admin - User Management (Separate Screens)
import UserList from '@/pages/admin/users/UserList';
import UserCreate from '@/pages/admin/users/UserCreate';
import UserView from '@/pages/admin/users/UserView';
import UserEdit from '@/pages/admin/users/UserEdit';
import UserRoles from '@/pages/admin/users/UserRoles';

// Enterprise Admin - Role Management
import AdminRoleList from '@/pages/admin/roles/RoleList';

// Enterprise Admin - Security Settings
import PasswordPolicySettings from '@/pages/admin/security/PasswordPolicySettings';
import MFASettings from '@/pages/admin/security/MFASettings';
import SecurityPolicySettingsPage from '@/pages/admin/security/SecurityPolicySettings';
import IPAccessRulesManagement from '@/pages/admin/security/IPAccessRulesManagement';
import Maintenance from '@/pages/Maintenance';

// Profile Pages
import ProfileChangePassword from '@/pages/profile/ChangePassword';
import NotificationPreferences from '@/pages/profile/NotificationPreferences';
import ActiveSessions from '@/pages/profile/ActiveSessions';
import MyProfile from '@/pages/profile/MyProfile';

// Notification Pages
import NotificationCenter from '@/pages/notifications/NotificationCenter';
import ProviderSettings from '@/pages/admin/notifications/ProviderSettings';
import EmailCampaigns from '@/pages/admin/EmailCampaigns';
import EmailLogs from '@/pages/admin/EmailLogs';

// System Monitoring & Logs
import TechnicalLogs from '@/pages/system-logs/TechnicalLogs';
import ErrorLogs from '@/pages/system-logs/ErrorLogs';
import BusinessEvents from '@/pages/system-logs/BusinessEvents';
import AuditTrail from '@/pages/system-logs/AuditTrail';
import SecurityLogs from '@/pages/system-logs/SecurityLogs';
import LoginSecurityLogs from '@/pages/system-logs/LoginSecurityLogs';
import IntegrationLogs from '@/pages/system-logs/IntegrationLogs';
import PerformanceMonitor from '@/pages/system-logs/PerformanceMonitor';
import SystemWorkflowLogs from '@/pages/system-logs/WorkflowLogs';
import AdminNotificationLogs from '@/pages/admin/NotificationLogs';
import AdminNotificationTemplates from '@/pages/admin/NotificationTemplates';
import EmailTemplateManager from '@/pages/admin/notifications/EmailTemplateManager';

import SicknessBenefit from '@/pages/nbenefit/short-term/SicknessBenefit';
import MaternityBenefit from '@/pages/nbenefit/short-term/MaternityBenefit';
import EmploymentInjuryBenefit from '@/pages/nbenefit/short-term/EmploymentInjuryBenefit';
import FuneralGrantBenefit from '@/pages/nbenefit/short-term/FuneralGrantBenefit';
import AgeBenefit from '@/pages/nbenefit/long-term/AgeBenefit';
import ClaimApprovalEnhanced from '@/pages/nbenefit/ClaimApprovalEnhanced';
import BenefitRulesList from '@/pages/nbenefit/config/BenefitRulesList';
import BenefitRuleEditor from '@/pages/nbenefit/config/BenefitRuleEditor';
import MedicalRulesConfig from '@/pages/nbenefit/config/MedicalRulesConfig';
import BeneficiaryRegistry from '@/pages/nbenefit/long-term/BeneficiaryRegistry';
import BeneficiaryDetail from '@/pages/nbenefit/long-term/BeneficiaryDetail';
import LifeCertificateManagement from '@/pages/nbenefit/long-term/LifeCertificateManagement';
import CreatePayRun from '@/pages/finance/accounts-payable/CreatePayRun';
import PayRunList from '@/pages/finance/accounts-payable/PayRunList';
import GeneratePayments from '@/pages/finance/accounts-payable/GeneratePayments';
import PaymentInquiry from '@/pages/finance/accounts-payable/PaymentInquiry';
import BenefitFinanceMapping from '@/pages/finance/settings/BenefitFinanceMapping';
import LifeCertificateConfig from '@/pages/nbenefit/config/LifeCertificateConfig';

// Meetings Module
import ManageMeetingsPage from '@/pages/meetings/ManageMeetingsPage';
import StartMeetingPage from '@/pages/meetings/StartMeetingPage';

// Accounts Payable Module
import APPendingPayables from '@/pages/finance/accounts-payable/PendingPayables';
import APCreateBatch from '@/pages/finance/accounts-payable/CreateAPBatch';
import APBatchList from '@/pages/finance/accounts-payable/APBatchList';
import APBatchDetail from '@/pages/finance/accounts-payable/APBatchDetail';
import APAccountsVerification from '@/pages/finance/accounts-payable/AccountsVerification';
import APBenefitsVerification from '@/pages/finance/accounts-payable/BenefitsVerification';
import APCheckPrinting from '@/pages/finance/accounts-payable/CheckPrinting';
import APDirectDepositGeneration from '@/pages/finance/accounts-payable/DirectDepositGeneration';
import APPostingHistory from '@/pages/finance/accounts-payable/APPostingHistory';
import APCorrections from '@/pages/finance/accounts-payable/APCorrections';
import APReports from '@/pages/finance/accounts-payable/APReports';
import APVerificationExceptions from '@/pages/finance/accounts-payable/APVerificationExceptions';
import InvalidityBenefit from '@/pages/nbenefit/long-term/InvalidityBenefit';
import CorrespondenceDashboard from '@/pages/correspondence/CorrespondenceDashboard';
import IncomingCommunications from '@/pages/correspondence/IncomingCommunications';
import OutgoingCommunications from '@/pages/correspondence/OutgoingCommunications';
import SearchHistory from '@/pages/correspondence/SearchHistory';
import Archive from '@/pages/correspondence/Archive';
import ModuleTemplates from '@/pages/templates/ModuleTemplates';
import AssistanceBenefit from '@/pages/nbenefit/long-term/AssistanceBenefit';
import SurvivorsBenefit from '@/pages/nbenefit/long-term/SurvivorsBenefit';
import AssistancePension from '@/pages/nbenefit/non-contributory/AssistancePension';
import InvalidityAssistance from '@/pages/nbenefit/non-contributory/InvalidityAssistance';
import RegistrySearch from '@/pages/nbenefit/shared/RegistrySearch';
import CommonEligibilityRules from '@/pages/nbenefit/shared/CommonEligibilityRules';
import CalculationEngines from '@/pages/nbenefit/shared/CalculationEngines';
import DocumentTemplates from '@/pages/nbenefit/shared/DocumentTemplates';
import BenefitWorkflows from '@/pages/nbenefit/shared/BenefitWorkflows';
import BenefitApplicationFormPage from '@/pages/nbenefit/BenefitApplicationFormPage';

// Medical Module
import DoctorApplicationsList from '@/pages/medical/DoctorApplicationsList';
import DoctorApplicationDetail from '@/pages/medical/DoctorApplicationDetail';
import NewManualApplication from '@/pages/medical/NewManualApplication';
import DoctorRegistry from '@/pages/medical/DoctorRegistry';
import ClaimsByDoctors from '@/pages/medical/ClaimsByDoctors';

import ManageEmployers from '@/pages/employersManagement/ManageEmployers';
import EmployersDashboard from '@/pages/employersManagement/EmployersDashboard';

// New pages for missing routes
import AddEmployer from '@/pages/employersManagement/AddEmployer';
import EmployersReports from '@/pages/reports/EmployersReports';


import ManageSelfEmployed from '@/pages/selfEmployed/ManageSelfEmployed';
import AddSelfEmployed from '@/pages/selfEmployed/AddSelfEmployed';
import SelfEmployedReports from '@/pages/selfEmployed/SelfEmployedReports';
import InsuredPersonGuide from '@/pages/insuredPersons/InsuredPersonGuide';
import EmployerRules from '@/pages/employersManagement/EmployerRules';
import ApprovalWorkflow from '@/pages/registration/ApprovalWorkflow';
import DocumentationRequirements from '@/pages/registration/DocumentationRequirements';
import UserProfile from '@/pages/users/UserProfile';
import ChangePassword from '@/pages/users/ChangePassword';
import ManageRoles from '@/pages/users/ManageRoles';
import SystemSettings from '@/pages/systemAdmin/SystemSettings';
import SecuritySettings from '@/pages/systemAdmin/SecuritySettings';
import PersonRegistration from '@/pages/insuredPersons/PersonRegistration';
import RegisterPersonTabs from '@/pages/insuredPersons/RegisterPersonTabs';
import PendingVerificationPage from '@/pages/insuredPersons/PendingVerificationPage';

// C3 Management
import C3Dashboard from '@/pages/c3Management/C3Dashboard';
import C3Management from '@/pages/c3Management/C3Management';
import C3InputForm from '@/pages/c3Management/C3InputForm';
import C3Simulation from '@/pages/c3Management/C3Simulation';


import C3Reports from '@/pages/c3Management/C3Reports';
import C3Verification from '@/pages/c3Management/C3Verification';
import ElectronicC3Config from '@/pages/c3Management/ElectronicC3Config';
import ViewC3Record from '@/pages/c3Management/ViewC3Record';
import EditC3Record from '@/pages/c3Management/EditC3Record';

// C3 Wizard Admin - Employer Management
import WizEmployerList from '@/pages/c3Management/employers/WizEmployerList';
import WizEmployerDetailsEdit from '@/pages/c3Management/employers/WizEmployerDetailsEdit';
import WizCompanyUsers from '@/pages/c3Management/employers/WizCompanyUsers';
import WizEmployeeList from '@/pages/c3Management/employers/WizEmployeeList';

// C3 Wizard Admin - Self-Employed Management
import WizSelfEmployedList from '@/pages/c3Management/selfEmployed/WizSelfEmployedList';
import WizSelfEmployedDetailsEdit from '@/pages/c3Management/selfEmployed/WizSelfEmployedDetailsEdit';
import WizSelfEmployedUserEdit from '@/pages/c3Management/selfEmployed/WizSelfEmployedUserEdit';

// C3 Wizard Admin - Manage Users Module
import WizEmployerUsers from '@/pages/c3Management/manageUsers/WizEmployerUsers';
import WizSelfEmployedUsers from '@/pages/c3Management/manageUsers/WizSelfEmployedUsers';
import WizRolePermission from '@/pages/c3Management/manageUsers/WizRolePermission';
import WizRoleMaster from '@/pages/c3Management/manageUsers/WizRoleMaster';

// C3 Wizard Admin - Payment Details
import WizPaymentDetails from '@/pages/c3Management/payments/WizPaymentDetails';

// C3 Wizard Admin - Reports
import WizEmployerHistory from '@/pages/c3Management/reports/WizEmployerHistory';
import WizSelfEmployedHistory from '@/pages/c3Management/reports/WizSelfEmployedHistory';
import WizPaymentsHistory from '@/pages/c3Management/reports/WizPaymentsHistory';
import WizReconciliationHistory from '@/pages/c3Management/reports/WizReconciliationHistory';
import WizUsersHistory from '@/pages/c3Management/reports/WizUsersHistory';
import { ViewEmployer } from '@/pages/employersManagement/ViewEmployer';
import { EditEmployer } from '@/pages/employersManagement/EditEmployer';

// Test pages
import TestDataEntry from '@/pages/test/TestDataEntry';

// Legal Module pages
import NewLegalModule from '@/pages/legal/NewLegalModule';
import CaseIntake from '@/pages/legal/CaseIntake';
import IntakeDetail from '@/pages/legal/IntakeDetail';
import CaseTracking from '@/pages/legal/CaseTracking';
import CaseDetailView from '@/pages/legal/CaseDetailView';
import CaseEditView from '@/pages/legal/CaseEditView';
import LegalDashboard from '@/pages/legal/LegalDashboard';
import LegalWorkbench from '@/pages/legal/LegalWorkbench';
import DelinquentCases from '@/pages/legal/DelinquentCases';
import CourtOrdersManagement from '@/pages/legal/CourtOrdersManagement';
import EnforcementActions from '@/pages/legal/EnforcementActions';
import LegalPaymentPlans from '@/pages/legal/LegalPaymentPlans';
import CasesByStageReport from '@/pages/legal/reports/CasesByStageReport';
import RecoveryAnalysis from '@/pages/legal/reports/RecoveryAnalysis';
import AgingReceivables from '@/pages/legal/reports/AgingReceivables';
import CourtCostsFees from '@/pages/legal/reports/CourtCostsFees';
import PerformanceMetrics from '@/pages/legal/reports/PerformanceMetrics';
import PendingHearings from '@/pages/legal/reports/PendingHearings';
import CourtsJudges from '@/pages/legal/settings/CourtsJudges';
import HearingTypes from '@/pages/legal/settings/HearingTypes';
import CaseStatuses from '@/pages/legal/settings/CaseStatuses';
import LegalRoles from '@/pages/legal/settings/LegalRoles';
import FeeMappings from '@/pages/legal/settings/FeeMappings';
import TerritorySettings from '@/pages/legal/settings/TerritorySettings';

import MiscellaneousPayments from '@/pages/cashier/MiscellaneousPayments';
import C3Payments from '@/pages/cashier/C3Payments';
import EFTEntry from '@/pages/cashier/EFTEntry';
import CashDetails from '@/pages/cashier/CashDetails';
import FundsTransfer from '@/pages/cashier/FundsTransfer';
import Receipt from '@/pages/cashier/Receipt';
import CheckManagement from '@/pages/cashier/CheckManagement';
import PaymentAnalytics from '@/pages/cashier/PaymentAnalytics';
import CashierReports from '@/pages/cashier/CashierReports';
import CreateInvoice from '@/pages/cashier/CreateInvoice';
import SearchPayInvoices from '@/pages/cashier/SearchPayInvoices';
import BatchClosing from '@/pages/cashier/BatchClosing';
import CashierBatchManagement from '@/pages/cashier/BatchManagement';
import PaymentModuleConfig from '@/pages/cashier/PaymentModuleConfig';
import HeadCashierOfficeAssignment from '@/pages/cashier/HeadCashierOfficeAssignment';
import CardMachineManagement from '@/pages/cashier/CardMachineManagement';
import DailyInvoiceReport from '@/pages/cashier/DailyInvoiceReport';
import ChartAccountsMapping from '@/pages/cashier/ChartAccountsMapping';
import PaymentTypesMapping from '@/pages/cashier/PaymentTypesMapping';
import SageSynchronization from '@/pages/cashier/SageSynchronization';
import CurrentAccountsSetup from '@/pages/cashier/CurrentAccountsSetup';
import BankReconciliationAccounts from '@/pages/cashier/BankReconciliationAccounts';
import GLPostingSummary from '@/pages/cashier/GLPostingSummary';
import ContributionReceipts from '@/pages/cashier/ContributionReceipts';
import RentReceipts from '@/pages/cashier/RentReceipts';
import LoanReceipts from '@/pages/cashier/LoanReceipts';
import ServiceReceipts from '@/pages/cashier/ServiceReceipts';
import NoticeGeneration from '@/pages/legal/NoticeGeneration';
import AppealSubmission from '@/pages/legal/AppealSubmission';
import EnforcementPenalty from '@/pages/legal/EnforcementPenalty';
import { default as LegalEvidenceManagement } from '@/pages/legal/EvidenceManagement';
import LegalReports from '@/pages/legal/LegalReports';
import LegalReportsAnalytics from '@/pages/legal/ReportsAnalytics';
import LegalAdminConfig from '@/pages/legal/AdminConfig';
import CaseWorkflow from '@/pages/legal/settings/CaseWorkflow';

// LegalFinal Module pages
import { LegalFinalDashboard } from '@/pages/legalFinal/LegalFinalDashboard';
import { NewCaseForm } from '@/pages/legalFinal/NewCaseForm';
import { CaseManagement as LegalCaseManagement } from '@/pages/legalFinal/CaseManagement';
import { LegalReports as LegalFinalReports } from '@/pages/legalFinal/LegalReports';
import { CaseStatusUpdateForm } from '@/pages/legalFinal/CaseStatusUpdateForm';
import { DocumentUploadForm } from '@/pages/legalFinal/DocumentUploadForm';
import { HearingJudgmentForm } from '@/pages/legalFinal/HearingJudgmentForm';
import { EnforcementForm } from '@/pages/legalFinal/EnforcementForm';
import { HearingSchedule } from '@/pages/legalFinal/HearingSchedule';
import { EnforcementManagement } from '@/pages/legalFinal/EnforcementManagement';

// BeMA Compliance Pages (lazy loaded)

// Notification Pages
import NotificationDashboard from '@/pages/notifications/NotificationDashboard';
import TemplateManagement from '@/pages/notifications/TemplateManagement';
import ActionMapping from '@/pages/notifications/ActionMapping';
import DeliveryManagement from '@/pages/notifications/DeliveryManagement';
import UserPreferences from '@/pages/notifications/UserPreferences';
// NotificationCenter already imported above
import ReportsAnalytics from '@/pages/notifications/ReportsAnalytics';
import Administration from '@/pages/notifications/Administration';

// NewBenefit Pages
import { ContributorDashboard } from '@/pages/newBenefit/ContributorDashboard';
import { ApplyForBenefits } from '@/pages/newBenefit/ApplyForBenefits';
import { BenefitApplicationForm } from '@/pages/newBenefit/BenefitApplicationForm';
import { NewReferralForm } from '@/pages/newBenefit/NewReferralForm';
import { NewVerificationRequest } from '@/pages/newBenefit/NewVerificationRequest';
import { EmploymentVerificationDetail } from '@/pages/newBenefit/EmploymentVerificationDetail';
import { MyClaims } from '@/pages/newBenefit/MyClaims';
import { ContributorReports } from '@/pages/newBenefit/ContributorReports';
import { ContributorInbox } from '@/pages/newBenefit/ContributorInbox';
import { WorklistsHome } from '@/pages/newBenefit/WorklistsHome';
import { Claim360View } from '@/pages/newBenefit/Claim360View';
import { IntakeConsole } from '@/pages/newBenefit/IntakeConsole';
import { MedicalBoardHub } from '@/pages/newBenefit/MedicalBoardHub';
import { EmployerHub } from '@/pages/newBenefit/EmployerHub';
import { PensionAdministration } from '@/pages/newBenefit/PensionAdministration';
import { PaymentsModule } from '@/pages/newBenefit/PaymentsModule';
import LettersCommunications from '@/pages/newBenefit/LettersCommunications';
import AdminConfig from '@/pages/newBenefit/AdminConfig';
import AuditorView from '@/pages/newBenefit/AuditorView';

// SSB Legal Module - already imported above
import CaseIntakeWizard from '@/pages/legal/CaseIntakeWizard';

// BeMA Compliance
const BemaDashboard = lazy(() => import("@/pages/bema/Dashboard"));
const BemaRegistrations = lazy(() => import("@/pages/bema/Registrations"));
const BemaC3Filing = lazy(() => import("@/pages/bema/C3Filing"));
const BemaArrears = lazy(() => import("@/pages/bema/Arrears"));
const BemaAudits = lazy(() => import("@/pages/bema/Audits"));
const BemaInspectorMobile = lazy(() => import("@/pages/bema/InspectorMobile"));
const BemaContributors = lazy(() => import("@/pages/bema/Contributors"));
const BemaWaivers = lazy(() => import("@/pages/bema/Waivers"));
const BemaReports = lazy(() => import("@/pages/bema/Reports"));
const BemaZones = lazy(() => import("@/pages/bema/Zones"));
const BemaWorkplan = lazy(() => import("@/pages/bema/WorkplanManagement"));
const BemaScoutingReview = lazy(() => import("@/pages/bema/ScoutingReview"));
const BemaAdminRules = lazy(() => import("@/pages/bema/AdminRules"));
const BemaTemplateManagement = lazy(() => import("@/pages/bema/TemplateManagement"));
const BemaRoleManagement = lazy(() => import("@/pages/bema/RoleManagement"));
const BemaSystemLogs = lazy(() => import("@/pages/bema/SystemLogs"));
const IATemplatesManagement = lazy(() => import("@/pages/audit/TemplatesManagement"));

// Authentication
import DummyLoginPage from '@/pages/auth/DummyLoginPage';
import { ForgotPassword } from '@/pages/auth/ForgotPassword';
import { ResetPassword } from '@/pages/auth/ResetPassword';
import { ChangePassword as ChangePasswordPage } from '@/pages/auth/ChangePassword';
import MFAVerify from '@/pages/auth/MFAVerify';
import BootstrapAdmin from '@/pages/setup/BootstrapAdmin';

// Foundation Components Demo
import FoundationComponentsDemo from '@/pages/FoundationComponentsDemo';
import FeeConfiguration from '@/pages/admin/FeeConfiguration';
import IPCardConfiguration from '@/pages/admin/IPCardConfiguration';

// Report Pages
import InsuredPersonsSummaryReport from '@/pages/reports/insured-persons/InsuredPersonsSummaryReport';
import CoverageByAgeReport from '@/pages/reports/insured-persons/CoverageByAgeReport';
import ContributionHistoryReport from '@/pages/reports/insured-persons/ContributionHistoryReport';
import RegisteredSummaryReport from '@/pages/reports/employers/RegisteredSummaryReport';
import ActiveInactiveReport from '@/pages/reports/employers/ActiveInactiveReport';
import ContributionComplianceReport from '@/pages/reports/employers/ContributionComplianceReport';
import NonPaying3MonthsReport from '@/pages/reports/employers/NonPaying3MonthsReport';
import NonPaying6MonthsReport from '@/pages/reports/employers/NonPaying6MonthsReport';
import NonPaying9MonthsReport from '@/pages/reports/employers/NonPaying9MonthsReport';
import TopMissingC3Report from '@/pages/reports/employers/TopMissingC3Report';
import MissingC3PerZoneReport from '@/pages/reports/employers/MissingC3PerZoneReport';
import C3WithoutPaymentReport from '@/pages/reports/employers/C3WithoutPaymentReport';
import NoPaymentPerZoneReport from '@/pages/reports/employers/NoPaymentPerZoneReport';
import EmployeeTurnoverReport from '@/pages/reports/employers/EmployeeTurnoverReport';
import ByEmployeeCountReport from '@/pages/reports/employers/ByEmployeeCountReport';
import ByMonthlyContributionsReport from '@/pages/reports/employers/ByMonthlyContributionsReport';
import ByArrearsReport from '@/pages/reports/employers/ByArrearsReport';
import ByWaiversReport from '@/pages/reports/employers/ByWaiversReport';
import WaiversPerZoneReport from '@/pages/reports/employers/WaiversPerZoneReport';
import EmployeesPerZoneReport from '@/pages/reports/employers/EmployeesPerZoneReport';
import ContributionsPerZoneReport from '@/pages/reports/employers/ContributionsPerZoneReport';
import QueriesPerZoneReport from '@/pages/reports/employers/QueriesPerZoneReport';
import MostQueriesReport from '@/pages/reports/employers/MostQueriesReport';
import ByLitigationCountReport from '@/pages/reports/employers/ByLitigationCountReport';
import ArrearsPerZoneReport from '@/pages/reports/employers/ArrearsPerZoneReport';
import ArrearsOver50kReport from '@/pages/reports/employers/ArrearsOver50kReport';
import ArrearsOver100kReport from '@/pages/reports/employers/ArrearsOver100kReport';
import ArrearsOver200kReport from '@/pages/reports/employers/ArrearsOver200kReport';
import ArrearsOver300kReport from '@/pages/reports/employers/ArrearsOver300kReport';
import ArrearsOver400kReport from '@/pages/reports/employers/ArrearsOver400kReport';
import Arrears50kByZoneReport from '@/pages/reports/employers/Arrears50kByZoneReport';
import TopCompliantReport from '@/pages/reports/employers/TopCompliantReport';
import Arrears30DaysReport from '@/pages/reports/employers/Arrears30DaysReport';
import Arrears60DaysReport from '@/pages/reports/employers/Arrears60DaysReport';
import Arrears90DaysReport from '@/pages/reports/employers/Arrears90DaysReport';
import ArrearsOver90DaysReport from '@/pages/reports/employers/ArrearsOver90DaysReport';
import UnderLitigationReport from '@/pages/reports/employers/UnderLitigationReport';
import WithPaymentPlansReport from '@/pages/reports/employers/WithPaymentPlansReport';
import DefaultedPlansReport from '@/pages/reports/employers/DefaultedPlansReport';
import CeasedEmployersReport from '@/pages/reports/employers/CeasedEmployersReport';
import OutOfFederationReport from '@/pages/reports/employers/OutOfFederationReport';
import DeceasedEmployersReport from '@/pages/reports/employers/DeceasedEmployersReport';
import OverseasSubmissionsReport from '@/pages/reports/employers/OverseasSubmissionsReport';
import NILReturns3MonthsReport from '@/pages/reports/employers/NILReturns3MonthsReport';
import NILReturnsOver3MonthsReport from '@/pages/reports/employers/NILReturnsOver3MonthsReport';
import MonthlyCollectionsReport from '@/pages/reports/c3/MonthlyCollectionsReport';
import ArrearsReport from '@/pages/reports/c3/ArrearsReport';
import TopContributorsReport from '@/pages/reports/c3/TopContributorsReport';
import ContributionsVsBenefitsReport from '@/pages/reports/finance/ContributionsVsBenefitsReport';
import CashFlowReport from '@/pages/reports/finance/CashFlowReport';
import InvestmentPortfolioReport from '@/pages/reports/finance/InvestmentPortfolioReport';
import PaymentsByTypeReport from '@/pages/reports/benefits/PaymentsByTypeReport';
import ClaimsVolumeReport from '@/pages/reports/benefits/ClaimsVolumeReport';
import OverpaymentsReport from '@/pages/reports/benefits/OverpaymentsReport';
import EmployerStatusReport from '@/pages/reports/compliance/EmployerStatusReport';
import EngagementSummaryReport from '@/pages/reports/audit/EngagementSummaryReport';
import CommunicationComplianceReport from '@/pages/reports/audit/CommunicationComplianceReport';
import PlanSlippageReport from '@/pages/reports/audit/PlanSlippageReport';
import OverdueActionsReport from '@/pages/reports/audit/OverdueActionsReport';
import CarryForwardAgingReport from '@/pages/reports/audit/CarryForwardAgingReport';
import AccountRolesReport from '@/pages/reports/admin/AccountRolesReport';
import PermissionChangesReport from '@/pages/reports/admin/PermissionChangesReport';
import ConfigurationAuditReport from '@/pages/reports/admin/ConfigurationAuditReport';

// Finance Module
import FinanceDashboard from '@/pages/finance/FinanceDashboard';
import BatchManagement from '@/pages/finance/BatchManagement';
import PaymentEntry from '@/pages/finance/PaymentEntry';
import ReceiptSearch from '@/pages/finance/ReceiptSearch';
import InvoiceManagement from '@/pages/finance/InvoiceManagement';
import GLExport from '@/pages/finance/GLExport';
import DailyReports from '@/pages/finance/DailyReports';
import ReversalsAndPenalties from '@/pages/finance/ReversalsAndPenalties';
import AdminConfiguration from '@/pages/finance/AdminConfiguration';
import { default as FinanceUserManagement } from '@/pages/finance/UserManagement';
import IncomeCategoryManagement from '@/pages/admin/IncomeCategoryManagement';
import SepContribRateManagement from '@/pages/admin/SepContribRateManagement';
import IncomeCodeManagement from '@/pages/admin/IncomeCodeManagement';

// Master Data CRUD Pages
import ActivityManagement from '@/pages/admin/master-data/ActivityManagement';
import BankCodeManagement from '@/pages/admin/master-data/BankCodeManagement';
import BatchStatusManagement from '@/pages/admin/master-data/BatchStatusManagement';
import PayPeriodManagement from '@/pages/admin/master-data/PayPeriodManagement';
import C3StatusManagement from '@/pages/admin/master-data/C3StatusManagement';
import CountryManagement from '@/pages/admin/master-data/CountryManagement';
import DependentRelationManagement from '@/pages/admin/master-data/DependentRelationManagement';
import DistrictManagement from '@/pages/admin/master-data/DistrictManagement';
import EyeColorManagement from '@/pages/admin/master-data/EyeColorManagement';
import IndustryManagement from '@/pages/admin/master-data/IndustryManagement';
import InspectorMDManagement from '@/pages/admin/master-data/InspectorManagement';
import InvoiceStatusMDManagement from '@/pages/admin/master-data/InvoiceStatusManagement';
import InvoiceTypesMDManagement from '@/pages/admin/master-data/InvoiceTypesManagement';
import LegalStatusManagement from '@/pages/admin/master-data/LegalStatusManagement';
import MaritalStatusManagement from '@/pages/admin/master-data/MaritalStatusManagement';
import MerchantManagement from '@/pages/admin/master-data/MerchantManagement';
import MethodOfPaymentManagement from '@/pages/admin/master-data/MethodOfPaymentManagement';
import OccupationManagement from '@/pages/admin/master-data/OccupationManagement';
import PayerTypeManagement from '@/pages/admin/master-data/PayerTypeManagement';
import PaymentSourcesManagement from '@/pages/admin/master-data/PaymentSourcesManagement';
import PaymentTypeMDManagement from '@/pages/admin/master-data/PaymentTypeManagement';
import PenaltyMDManagement from '@/pages/admin/master-data/PenaltyManagement';
import PostalDistrictManagement from '@/pages/admin/master-data/PostalDistrictManagement';
import ReceiptStatusManagement from '@/pages/admin/master-data/ReceiptStatusManagement';
import RelationManagement from '@/pages/admin/master-data/RelationManagement';
import SectorManagement from '@/pages/admin/master-data/SectorManagement';
import SscRatesManagement from '@/pages/admin/master-data/SscRatesManagement';
import VcContribRateManagement from '@/pages/admin/master-data/VcContribRateManagement';
import VcEligibilityConfigManagement from '@/pages/admin/master-data/VcEligibilityConfigManagement';
import VerifyManagement from '@/pages/admin/master-data/VerifyManagement';
import VillagesManagement from '@/pages/admin/master-data/VillagesManagement';

// Contribution Payments Module
import PaymentDataEntry from '@/pages/cashier/PaymentDataEntry';
import PaymentHistoricalEntry from '@/pages/cashier/PaymentHistoricalEntry';
import PaymentHistoryManagement from '@/pages/cashier/PaymentHistoryManagement';
import TransferPayments from '@/pages/cashier/TransferPayments';
import PaymentHistoryReport from '@/pages/cashier/PaymentHistoryReport';
import VCPaymentUpdate from '@/pages/cashier/VCPaymentUpdate';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
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
      <Route path="/c3-management/settings/cybersource" element={<Navigate to="/admin/c3-configuration" replace />} />
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

      {/* Compliance & Audit Routes */}
      <Route path="/compliance/dashboard" element={<ProtectedLayout><ComplianceDashboard /></ProtectedLayout>} />
      <Route path="/compliance/violations" element={<ProtectedLayout><ViolationsManagement /></ProtectedLayout>} />
      <Route path="/compliance/violations/manual-entry" element={<ProtectedLayout><ManualViolationEntry /></ProtectedLayout>} />
      <Route path="/compliance/violations/:id" element={<ProtectedLayout><ViolationDetails /></ProtectedLayout>} />
      <Route path="/compliance/inspector-plans" element={<ProtectedLayout><MyPlans /></ProtectedLayout>} />
      <Route path="/compliance/notices" element={<ProtectedLayout><NoticesManagement /></ProtectedLayout>} />
      <Route path="/compliance/arrangements" element={<ProtectedLayout><PaymentArrangements /></ProtectedLayout>} />
      <Route path="/compliance/payment-arrangements" element={<ProtectedLayout><PaymentArrangements /></ProtectedLayout>} />
      <Route path="/compliance/employer-statements" element={<ProtectedLayout><EmployerStatements /></ProtectedLayout>} />
      <Route path="/compliance/employer-statement/:employerId" element={<ProtectedLayout><EmployerStatementDetail /></ProtectedLayout>} />
      <Route path="/compliance/reports" element={<ProtectedLayout><ComplianceReports /></ProtectedLayout>} />
      <Route path="/compliance/reports/violations-analytics" element={<ProtectedLayout><CaseAnalytics /></ProtectedLayout>} />
      <Route path="/compliance/reports/inspector-performance" element={<ProtectedLayout><InspectorPerformance /></ProtectedLayout>} />
      <Route path="/compliance/reports/c3-compliance" element={<ProtectedLayout><C3Compliance /></ProtectedLayout>} />
      <Route path="/compliance/reports/arrears" element={<ProtectedLayout><ArrearsReports /></ProtectedLayout>} />
      <Route path="/compliance/reports/audit" element={<ProtectedLayout><ComplianceAuditReports /></ProtectedLayout>} />
      <Route path="/compliance/reports/arrangements" element={<ProtectedLayout><ArrangementReports /></ProtectedLayout>} />
      <Route path="/compliance/reports/legal" element={<ProtectedLayout><LegalEscalationReports /></ProtectedLayout>} />
      <Route path="/compliance/reports/trends" element={<ProtectedLayout><CaseAnalytics /></ProtectedLayout>} />
      <Route path="/compliance/audit-planning/settings" element={<ProtectedLayout><RiskSamplingSettings /></ProtectedLayout>} />
      <Route path="/compliance/audit-planning/sampling-dashboard" element={<ProtectedLayout><SamplingDashboard /></ProtectedLayout>} />
      <Route path="/compliance/audit-planning/monthly-candidates" element={<ProtectedLayout><MonthlyAuditCandidates /></ProtectedLayout>} />
      <Route path="/compliance/audit-planning/weekly-plan-builder" element={<ProtectedLayout><WeeklyPlanBuilder /></ProtectedLayout>} />
      <Route path="/compliance/audit-planning/my-plans" element={<ProtectedLayout><MyPlans /></ProtectedLayout>} />
      <Route path="/compliance/audit-planning/pending-review" element={<ProtectedLayout><CompliancePendingReview /></ProtectedLayout>} />
      <Route path="/compliance/audit-planning/pending-review/:planId" element={<ProtectedLayout><WeeklyPlanReview /></ProtectedLayout>} />
      <Route path="/compliance/violations/weekly-reports" element={<ProtectedLayout><WeeklyReportSubmission /></ProtectedLayout>} />
      <Route path="/compliance/violations/manual-entry" element={<ProtectedLayout><ManualViolationEntry /></ProtectedLayout>} />
      <Route path="/compliance/employers/findings" element={<ProtectedLayout><EmployerFindings /></ProtectedLayout>} />
      <Route path="/compliance/employers/visit/:employerId" element={<ProtectedLayout><EmployerVisitWorkspace /></ProtectedLayout>} />
      <Route path="/compliance/audit-planning/field-execution" element={<ProtectedLayout><FieldExecution /></ProtectedLayout>} />
      <Route path="/compliance/audit-planning/weekly-reports" element={<ProtectedLayout><WeeklyReports /></ProtectedLayout>} />
      <Route path="/compliance/my-audits/upcoming" element={<ProtectedLayout><MyUpcomingAudits /></ProtectedLayout>} />
      <Route path="/compliance/employers/:employerId/risk-profile" element={<ProtectedLayout><EmployerRiskProfile /></ProtectedLayout>} />
      {/* Legal Escalation Policy consolidated to /compliance/settings/legal-escalation-policy */}
      <Route path="/compliance/legal-recommendation-queue" element={<ProtectedLayout><LegalRecommendationQueue /></ProtectedLayout>} />
      <Route path="/compliance/settings" element={<ProtectedLayout><ComplianceSettings /></ProtectedLayout>} />
      <Route path="/compliance/settings/risk-policy" element={<ProtectedLayout><RiskRulePolicy /></ProtectedLayout>} />
      <Route path="/compliance/monitoring" element={<ProtectedLayout><ComplianceMonitoring /></ProtectedLayout>} />
      <Route path="/compliance/employer" element={<ProtectedLayout><EmployerComplianceManagement /></ProtectedLayout>} />
      <Route path="/compliance/audits" element={<ProtectedLayout><AuditManagement /></ProtectedLayout>} />
      <Route path="/compliance/penalties" element={<ProtectedLayout><PenaltyManagement /></ProtectedLayout>} />

      {/* New Compliance & Enforcement Routes */}
      <Route path="/compliance/dashboard/manager" element={<ProtectedLayout><ComplianceManagerDashboard /></ProtectedLayout>} />
      <Route path="/compliance/dashboard/inspector" element={<ProtectedLayout><ComplianceInspectorDashboard /></ProtectedLayout>} />
      <Route path="/compliance/dashboard/legal" element={<ProtectedLayout><ComplianceLegalDashboard /></ProtectedLayout>} />
      <Route path="/compliance/cases" element={<ProtectedLayout><ComplianceCaseManagement /></ProtectedLayout>} />
      <Route path="/compliance/cases/queue" element={<ProtectedLayout><ComplianceCaseQueue /></ProtectedLayout>} />
      <Route path="/compliance/risk-profiles" element={<ProtectedLayout><ComplianceRiskProfiles /></ProtectedLayout>} />
      <Route path="/compliance/inspections" element={<ProtectedLayout><ComplianceInspectionManagement /></ProtectedLayout>} />
      <Route path="/compliance/arrangements/breaches" element={<ProtectedLayout><ComplianceBreachMonitoring /></ProtectedLayout>} />
      <Route path="/compliance/legal/queue" element={<ProtectedLayout><ComplianceLegalQueue /></ProtectedLayout>} />
      <Route path="/compliance/legal/proceedings" element={<ProtectedLayout><ComplianceLegalProceedings /></ProtectedLayout>} />
      <Route path="/compliance/waivers" element={<ProtectedLayout><ComplianceWaivers /></ProtectedLayout>} />
      <Route path="/compliance/automation/jobs" element={<ProtectedLayout><ComplianceJobConfiguration /></ProtectedLayout>} />
      <Route path="/compliance/automation/history" element={<ProtectedLayout><ComplianceJobHistory /></ProtectedLayout>} />
      <Route path="/compliance/settings/rule-engine" element={<ProtectedLayout><ComplianceRuleEngine /></ProtectedLayout>} />
      <Route path="/compliance/settings/violation-types" element={<ProtectedLayout><ComplianceViolationTypes /></ProtectedLayout>} />
      <Route path="/compliance/settings/number-templates" element={<ProtectedLayout><ComplianceNumberTemplates /></ProtectedLayout>} />
      <Route path="/compliance/settings/risk-config" element={<ProtectedLayout><ComplianceRiskScoringConfig /></ProtectedLayout>} />
      <Route path="/compliance/settings/legal-escalation-policy" element={<ProtectedLayout><LegalEscalationPolicy /></ProtectedLayout>} />
      <Route path="/compliance/settings/templates" element={<ProtectedLayout><ComplianceTemplates /></ProtectedLayout>} />

      {/* Audit Module Routes — Simplified Department Function Audit */}
      <Route path="/audit/dashboard" element={<ProtectedLayout><AuditDashboard /></ProtectedLayout>} />
      <Route path="/audit/departments" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_DEPARTMENT_MASTER"><DepartmentMaster /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/functions" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_FUNCTION_MASTER"><FunctionMaster /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/department-view/:id" element={<ProtectedLayout><DepartmentView /></ProtectedLayout>} />
      <Route path="/audit/risk-assessment" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_RISK_ASSESSMENT"><RiskAssessment /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/risk-matrix" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_RISK_MATRIX"><RiskMatrix /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/audit-plans" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_PLANS"><AuditPlansNew /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/audit-plans/:id" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><AuditPlanDetail /></Suspense></ProtectedLayout>} />
      <Route path="/audit/audits" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_ENGAGEMENTS"><AuditEngagements /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/audits/:id" element={<ProtectedLayout><EngagementDetail /></ProtectedLayout>} />
      <Route path="/audit/audit-reports" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_REPORTS"><AuditReports /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/plan-approval" element={<ProtectedLayout><PlanApproval /></ProtectedLayout>} />
      <Route path="/audit/config" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_SYSTEM_CONFIG"><AuditConfig /></AuditFeatureGate></ProtectedLayout>} />
      <Route path="/audit/risk-settings" element={<ProtectedLayout><Suspense fallback={<div />}><RiskSettings /></Suspense></ProtectedLayout>} />
      <Route path="/audit/queries" element={<ProtectedLayout><Suspense fallback={<div />}><AuditQueries /></Suspense></ProtectedLayout>} />
      <Route path="/audit/auditor-profiles" element={<ProtectedLayout><Suspense fallback={<div />}><AuditorProfiles /></Suspense></ProtectedLayout>} />
      <Route path="/audit/holidays" element={<ProtectedLayout><AuditFeatureGate featureFlag="FEATURE_AUDIT_HOLIDAY_MANAGEMENT"><Suspense fallback={<div />}><HolidayCalendar /></Suspense></AuditFeatureGate></ProtectedLayout>} />
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
      <Route path="/admin/web-users" element={<ProtectedLayout><WebUsers /></ProtectedLayout>} />
      <Route path="/admin/audit-log" element={<ProtectedLayout><AuditLogViewer /></ProtectedLayout>} />
      <Route path="/admin/audit-logs" element={<ProtectedLayout><AuditLogViewer /></ProtectedLayout>} />
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
      <Route path="/admin/notifications/email-templates" element={<ProtectedLayout><EmailTemplateManager /></ProtectedLayout>} />
      <Route path="/admin/notifications/channels" element={<ProtectedLayout><NotificationChannelSettings /></ProtectedLayout>} />
      <Route path="/admin/notifications/providers" element={<ProtectedLayout><ProviderSettings /></ProtectedLayout>} />
      <Route path="/admin/email-campaigns" element={<ProtectedLayout><EmailCampaigns /></ProtectedLayout>} />
      <Route path="/admin/email-logs" element={<ProtectedLayout><EmailLogs /></ProtectedLayout>} />
      <Route path="/admin/offices" element={<ProtectedLayout><OfficeManagement /></ProtectedLayout>} />
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
      <Route path="/admin/users/update-password" element={<ProtectedLayout><UpdateUserPassword /></ProtectedLayout>} />
      <Route path="/admin/module-button-bindings" element={<ProtectedLayout><ModuleButtonBindings /></ProtectedLayout>} />
      <Route path="/admin/api-keys" element={<ProtectedLayout><ApiKeysManagement /></ProtectedLayout>} />
      <Route path="/admin/public-api" element={<ProtectedLayout><PublicApiManagement /></ProtectedLayout>} />
      <Route path="/admin/external-apis" element={<ProtectedLayout><ExternalApiManagement /></ProtectedLayout>} />
      <Route path="/external/api-docs" element={<ProtectedLayout><ExternalApiDocs /></ProtectedLayout>} />
      <Route path="/admin/c3-calculation-config" element={<ProtectedLayout><C3CalculationConfigPage /></ProtectedLayout>} />
      <Route path="/admin/c3-period-config" element={<ProtectedLayout><C3PeriodConfigPage /></ProtectedLayout>} />
      <Route path="/admin/c3-configuration" element={<ProtectedLayout><C3ConfigurationPage /></ProtectedLayout>} />
      <Route path="/admin/global-settings" element={<ProtectedLayout><GlobalSettings /></ProtectedLayout>} />
      <Route path="/admin/document-configuration" element={<ProtectedLayout><DocumentConfigurationPage /></ProtectedLayout>} />
      <Route path="/admin/ip-card-configuration" element={<ProtectedLayout><IPCardConfiguration /></ProtectedLayout>} />
      
      {/* Workflow Engine Routes */}
      <Route path="/admin/workflows" element={<ProtectedLayout><WorkflowList /></ProtectedLayout>} />
      <Route path="/admin/workflows/new" element={<ProtectedLayout><WorkflowForm /></ProtectedLayout>} />
      <Route path="/admin/workflows/:id" element={<ProtectedLayout><WorkflowForm /></ProtectedLayout>} />
      <Route path="/admin/workflow-triggers" element={<ProtectedLayout><WorkflowTriggers /></ProtectedLayout>} />
      <Route path="/admin/workflow-logs" element={<ProtectedLayout><WorkflowLogs /></ProtectedLayout>} />
      <Route path="/admin/workflow-analytics" element={<ProtectedLayout><WorkflowAnalytics /></ProtectedLayout>} />
      <Route path="/admin/workflow-security" element={<ProtectedLayout><WorkflowSecuritySettings /></ProtectedLayout>} />
      <Route path="/admin/workflow-secured-approvals" element={<ProtectedLayout><SecuredWorkflowApprovals /></ProtectedLayout>} />
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

      {/* BeMA Compliance Routes - Additional */}
      <Route path="/bema/workplan" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaWorkplan /></Suspense></ProtectedLayout>} />
      <Route path="/bema/c3-filing" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaC3Filing /></Suspense></ProtectedLayout>} />
      <Route path="/bema/registrations" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaRegistrations /></Suspense></ProtectedLayout>} />
      <Route path="/bema/scouting" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaScoutingReview /></Suspense></ProtectedLayout>} />
      <Route path="/bema/admin/rules" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaAdminRules /></Suspense></ProtectedLayout>} />
      <Route path="/bema/admin/templates" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaTemplateManagement /></Suspense></ProtectedLayout>} />
      <Route path="/bema/admin/roles" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaRoleManagement /></Suspense></ProtectedLayout>} />
      <Route path="/bema/admin/logs" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaSystemLogs /></Suspense></ProtectedLayout>} />

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

      {/* NBenefit Module - Central Benefits Registry */}
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
      <Route path="/cashier/batch-management" element={<ProtectedLayout><CashierBatchManagement /></ProtectedLayout>} />
      <Route path="/cashier/payment-module-config" element={<ProtectedLayout><PaymentModuleConfig /></ProtectedLayout>} />
      <Route path="/cashier/card-machines" element={<ProtectedLayout><PaymentModuleConfig /></ProtectedLayout>} />
      <Route path="/cashier/head-cashier-office-assignment" element={<ProtectedLayout><HeadCashierOfficeAssignment /></ProtectedLayout>} />
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

      {/* BeMA Compliance */}
      <Route path="/bema/dashboard" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaDashboard /></Suspense></ProtectedLayout>} />
      <Route path="/bema/registrations" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaRegistrations /></Suspense></ProtectedLayout>} />
      <Route path="/bema/c3-filing" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaC3Filing /></Suspense></ProtectedLayout>} />
      <Route path="/bema/arrears" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaArrears /></Suspense></ProtectedLayout>} />
      <Route path="/bema/audits" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaAudits /></Suspense></ProtectedLayout>} />
      <Route path="/bema/inspector-mobile" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaInspectorMobile /></Suspense></ProtectedLayout>} />
      <Route path="/bema/contributors" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaContributors /></Suspense></ProtectedLayout>} />
      <Route path="/bema/waivers" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaWaivers /></Suspense></ProtectedLayout>} />
      <Route path="/bema/reports" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaReports /></Suspense></ProtectedLayout>} />
      <Route path="/bema/zones" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaZones /></Suspense></ProtectedLayout>} />
      <Route path="/bema/workplan" element={<ProtectedLayout><Suspense fallback={<div>Loading...</div>}><BemaWorkplan /></Suspense></ProtectedLayout>} />

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
