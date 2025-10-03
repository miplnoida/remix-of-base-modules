
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useLegalAuth } from '@/contexts/LegalAuthContext';
import React, { Suspense, lazy } from 'react';

// Page imports
import Index from '@/pages/dashboard/Index';
import NotFound from '@/pages/NotFound';
import ViewInsuredPerson from '@/pages/insuredPersons/ViewInsuredPerson';
import EditInsuredPerson from '@/pages/insuredPersons/EditInsuredPerson';

// Employer Management
import EmployerRegistration from '@/pages/employersManagement/EmployerRegistration';
import EmployerApproval from '@/pages/employersManagement/EmployerApproval';
import EmployerDirectory from '@/pages/employersManagement/EmployerDirectory';
import ContributionEntry from '@/pages/employersManagement/ContributionEntry';
import ComplianceMonitoring from '@/pages/compliance/ComplianceMonitoring';
import ContributionTracking from '@/pages/employersManagement/ContributionTracking';

// Insured Persons - New consolidated page
import IPManagement from '@/pages/insuredPersons/IPManagement';
import PersonIPManagement from '@/pages/insuredPersons/PersonIPManagement';

// Quick Actions Pages
import WagesHistory from '@/pages/insuredPersons/WagesHistory';
import ClaimHistory from '@/pages/insuredPersons/ClaimHistory';
import BenefitEligibility from '@/pages/insuredPersons/BenefitEligibility';
import PendingReviews from '@/pages/insuredPersons/PendingReviews';

// Benefits
import AllBenefitsTabs from '@/pages/benefits/AllBenefitsTabs';
import OnlineBenefitApplications from '@/pages/benefits/OnlineBenefitApplications';
import MaternityBenefits from '@/pages/benefits/MaternityBenefits';
import UnemploymentBenefits from '@/pages/benefits/UnemploymentBenefits';
import WorkInjuryBenefits from '@/pages/benefits/WorkInjuryBenefits';
import DeathBenefits from '@/pages/benefits/DeathBenefits';
import EducationalBenefits from '@/pages/benefits/EducationalBenefits';

// Compliance & Audit
import ComplianceDashboard from '@/pages/compliance/ComplianceDashboard';
import EmployerComplianceManagement from '@/pages/compliance/EmployerComplianceManagement';
import ComplianceReports from '@/pages/compliance/ComplianceReports';
import LegalProceedings from '@/pages/compliance/LegalProceedings';
import AuditManagement from '@/pages/compliance/AuditManagement';
import PenaltyManagement from '@/pages/compliance/PenaltyManagement';

// Legal Module
const LegalAuth = lazy(() => import('@/pages/legal/LegalAuth'));
const LegalCaseList = lazy(() => import('@/pages/legal/LegalCaseList'));
const LegalIntakeWizard = lazy(() => import('@/pages/legal/LegalIntakeWizard'));
const LegalCaseView = lazy(() => import('@/pages/legal/LegalCaseView'));
const LegalHearingCalendar = lazy(() => import('@/pages/legal/LegalHearingCalendar'));
const LegalOrderRegistry = lazy(() => import('@/pages/legal/LegalOrderRegistry'));
import { CaseList } from '@/pages/legal/CaseList';
import { IntakeWizard } from '@/pages/legal/IntakeWizard';
import { CaseView } from '@/pages/legal/CaseView';

// Audit Module
import AuditPlans from '@/pages/audit/AuditPlans';
import AuditPlansNew from '@/pages/audit/AuditPlansNew';
import PlanApproval from '@/pages/audit/PlanApproval';
import ActivityCalendar from '@/pages/audit/ActivityCalendar';
import ActivityWorkbench from '@/pages/audit/ActivityWorkbench';
import FollowUpTracker from '@/pages/audit/FollowUpTracker';
import PlanCloseout from '@/pages/audit/PlanCloseout';
import AuditReports from '@/pages/audit/AuditReports';
import AuditConfig from '@/pages/audit/AuditConfig';
import AuditorProfiles from '@/pages/audit/AuditorProfiles';
import WorkloadCapacity from '@/pages/audit/WorkloadCapacity';
import LeaveAndVacationManagement from '@/pages/audit/LeaveManagement';
import HolidayManagement from '@/pages/audit/HolidayManagement';
import EvidenceManagement from '@/pages/audit/EvidenceManagement';
import WorkingPapers from '@/pages/audit/WorkingPapers';
import FindingsManagement from '@/pages/audit/FindingsManagement';
import ManagementResponses from '@/pages/audit/ManagementResponses';
import ActionTracking from '@/pages/audit/ActionTracking';
import LetterGeneration from '@/pages/audit/LetterGeneration';
import CommunicationCenter from '@/pages/audit/CommunicationCenter';
import ReportBuilder from '@/pages/audit/ReportBuilder';
import DepartmentMaster from '@/pages/audit/DepartmentMaster';
import FunctionMaster from '@/pages/audit/FunctionMaster';
import DepartmentView from '@/pages/audit/DepartmentView';

// Reports
import ReportsHub from '@/pages/reports/ReportsHub';
import EmployerStatement from '@/pages/reports/EmployerStatement';

// System Administration
import WebUsers from '@/pages/users/WebUsers';
import AuditLog from '@/pages/systemAdmin/AuditLog';

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


import C3Reports from '@/pages/c3Management/C3Reports';
import C3Verification from '@/pages/c3Management/C3Verification';
import ElectronicC3Config from '@/pages/c3Management/ElectronicC3Config';
import ViewC3Record from '@/pages/c3Management/ViewC3Record';
import EditC3Record from '@/pages/c3Management/EditC3Record';
import { ViewEmployer } from '@/pages/employersManagement/ViewEmployer';
import { EditEmployer } from '@/pages/employersManagement/EditEmployer';

// Test pages
import TestDataEntry from '@/pages/test/TestDataEntry';

// Legal Module pages
import NewLegalModule from '@/pages/legal/NewLegalModule';
import CaseIntake from '@/pages/legal/CaseIntake';
import CaseTracking from '@/pages/legal/CaseTracking';
import CaseDetailView from '@/pages/legal/CaseDetailView';
import CaseEditView from '@/pages/legal/CaseEditView';

import MiscellaneousPayments from '@/pages/cashier/MiscellaneousPayments';
import C3Payments from '@/pages/cashier/C3Payments';
import EFTEntry from '@/pages/cashier/EFTEntry';
import CashDetails from '@/pages/cashier/CashDetails';
import FundsTransfer from '@/pages/cashier/FundsTransfer';
import Receipt from '@/pages/cashier/Receipt';
import CheckManagement from '@/pages/cashier/CheckManagement';
import PaymentAnalytics from '@/pages/cashier/PaymentAnalytics';
import BatchManagement from '@/pages/cashier/BatchManagement';
import CashierReports from '@/pages/cashier/CashierReports';
import CreateInvoice from '@/pages/cashier/CreateInvoice';
import SearchPayInvoices from '@/pages/cashier/SearchPayInvoices';
import BatchClosing from '@/pages/cashier/BatchClosing';
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

// LegalFinal Module pages
import { LegalFinalDashboard } from '@/pages/legalFinal/LegalFinalDashboard';
import { NewCaseForm } from '@/pages/legalFinal/NewCaseForm';
import { CaseManagement } from '@/pages/legalFinal/CaseManagement';
import { LegalReports as LegalFinalReports } from '@/pages/legalFinal/LegalReports';
import { CaseStatusUpdateForm } from '@/pages/legalFinal/CaseStatusUpdateForm';
import { DocumentUploadForm } from '@/pages/legalFinal/DocumentUploadForm';
import { HearingJudgmentForm } from '@/pages/legalFinal/HearingJudgmentForm';
import { EnforcementForm } from '@/pages/legalFinal/EnforcementForm';
import { HearingSchedule } from '@/pages/legalFinal/HearingSchedule';
import { EnforcementManagement } from '@/pages/legalFinal/EnforcementManagement';

// Notification Pages
import NotificationDashboard from '@/pages/notifications/NotificationDashboard';
import TemplateManagement from '@/pages/notifications/TemplateManagement';
import ActionMapping from '@/pages/notifications/ActionMapping';
import DeliveryManagement from '@/pages/notifications/DeliveryManagement';
import UserPreferences from '@/pages/notifications/UserPreferences';
import NotificationCenter from '@/pages/notifications/NotificationCenter';
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

// Authentication
import DummyLoginPage from '@/pages/auth/DummyLoginPage';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/demo-login" element={<DummyLoginPage />} />
      
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

      {/* Self-Employed Management Routes */}
      <Route path="/self-employed/manage" element={<ProtectedLayout><ManageSelfEmployed /></ProtectedLayout>} />
      <Route path="/self-employed/add" element={<ProtectedLayout><AddSelfEmployed /></ProtectedLayout>} />
      <Route path="/self-employed/reports" element={<ProtectedLayout><SelfEmployedReports /></ProtectedLayout>} />

      {/* Compliance & Audit Routes */}
      <Route path="/compliance/dashboard" element={<ProtectedLayout><ComplianceDashboard /></ProtectedLayout>} />
      <Route path="/compliance/monitoring" element={<ProtectedLayout><ComplianceMonitoring /></ProtectedLayout>} />
      <Route path="/compliance/employer" element={<ProtectedLayout><EmployerComplianceManagement /></ProtectedLayout>} />
      <Route path="/compliance/reports" element={<ProtectedLayout><ComplianceReports /></ProtectedLayout>} />
      <Route path="/compliance/audits" element={<ProtectedLayout><AuditManagement /></ProtectedLayout>} />
      <Route path="/compliance/penalties" element={<ProtectedLayout><PenaltyManagement /></ProtectedLayout>} />

      {/* Audit Module Routes */}
      <Route path="/audit/auditors" element={<ProtectedLayout><AuditorProfiles /></ProtectedLayout>} />
      <Route path="/audit/workload" element={<ProtectedLayout><WorkloadCapacity /></ProtectedLayout>} />
      <Route path="/audit/leave" element={<ProtectedLayout><LeaveAndVacationManagement /></ProtectedLayout>} />
      <Route path="/audit/holidays" element={<ProtectedLayout><HolidayManagement /></ProtectedLayout>} />
      <Route path="/audit/plans" element={<ProtectedLayout><AuditPlansNew /></ProtectedLayout>} />
      <Route path="/audit/plans-old" element={<ProtectedLayout><AuditPlans /></ProtectedLayout>} />
      <Route path="/audit/approvals" element={<ProtectedLayout><PlanApproval /></ProtectedLayout>} />
      <Route path="/audit/calendar" element={<ProtectedLayout><ActivityCalendar /></ProtectedLayout>} />
      <Route path="/audit/workbench" element={<ProtectedLayout><ActivityWorkbench /></ProtectedLayout>} />
      <Route path="/audit/evidence" element={<ProtectedLayout><EvidenceManagement /></ProtectedLayout>} />
      <Route path="/audit/working-papers" element={<ProtectedLayout><WorkingPapers /></ProtectedLayout>} />
      <Route path="/audit/findings" element={<ProtectedLayout><FindingsManagement /></ProtectedLayout>} />
      <Route path="/audit/responses" element={<ProtectedLayout><ManagementResponses /></ProtectedLayout>} />
      <Route path="/audit/actions" element={<ProtectedLayout><ActionTracking /></ProtectedLayout>} />
      <Route path="/audit/followups" element={<ProtectedLayout><FollowUpTracker /></ProtectedLayout>} />
      <Route path="/audit/closeout" element={<ProtectedLayout><PlanCloseout /></ProtectedLayout>} />
      <Route path="/audit/reports" element={<ProtectedLayout><AuditReports /></ProtectedLayout>} />
      <Route path="/audit/letters" element={<ProtectedLayout><LetterGeneration /></ProtectedLayout>} />
      <Route path="/audit/report-builder" element={<ProtectedLayout><ReportBuilder /></ProtectedLayout>} />
      <Route path="/audit/communication-center" element={<ProtectedLayout><CommunicationCenter /></ProtectedLayout>} />
      <Route path="/audit/config" element={<ProtectedLayout><AuditConfig /></ProtectedLayout>} />
      <Route path="/audit/departments" element={<ProtectedLayout><DepartmentMaster /></ProtectedLayout>} />
      <Route path="/audit/functions" element={<ProtectedLayout><FunctionMaster /></ProtectedLayout>} />
      <Route path="/audit/department-view/:id" element={<ProtectedLayout><DepartmentView /></ProtectedLayout>} />

      {/* Registration Rules & Process Routes */}
      <Route path="/registration/insured-person-guide" element={<ProtectedLayout><InsuredPersonGuide /></ProtectedLayout>} />
      <Route path="/registration/employer-rules" element={<ProtectedLayout><EmployerRules /></ProtectedLayout>} />
      <Route path="/registration/approval-workflow" element={<ProtectedLayout><ApprovalWorkflow /></ProtectedLayout>} />
      <Route path="/registration/documentation" element={<ProtectedLayout><DocumentationRequirements /></ProtectedLayout>} />

      {/* User Profile & Permissions Routes */}
      <Route path="/profile" element={<ProtectedLayout><UserProfile /></ProtectedLayout>} />
      <Route path="/profile/change-password" element={<ProtectedLayout><ChangePassword /></ProtectedLayout>} />
      <Route path="/admin/roles" element={<ProtectedLayout><ManageRoles /></ProtectedLayout>} />
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

      {/* Benefits Routes */}
      <Route path="/benefits/all" element={<ProtectedLayout><AllBenefitsTabs /></ProtectedLayout>} />
      <Route path="/benefits/online-applications" element={<ProtectedLayout><OnlineBenefitApplications /></ProtectedLayout>} />
      <Route path="/benefits/maternity" element={<ProtectedLayout><MaternityBenefits /></ProtectedLayout>} />
      <Route path="/benefits/unemployment" element={<ProtectedLayout><UnemploymentBenefits /></ProtectedLayout>} />
      <Route path="/benefits/work-injury" element={<ProtectedLayout><WorkInjuryBenefits /></ProtectedLayout>} />
      <Route path="/benefits/death" element={<ProtectedLayout><DeathBenefits /></ProtectedLayout>} />
      <Route path="/benefits/educational" element={<ProtectedLayout><EducationalBenefits /></ProtectedLayout>} />

      {/* System Administration Routes */}
      <Route path="/admin/web-users" element={<ProtectedLayout><WebUsers /></ProtectedLayout>} />
      <Route path="/admin/audit-log" element={<ProtectedLayout><AuditLog /></ProtectedLayout>} />

      {/* Reports Routes */}
      <Route path="/reports/claims" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/cashier" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/employer" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/employer-statement" element={<ProtectedLayout><EmployerStatement /></ProtectedLayout>} />
      <Route path="/reports/persons" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/statistics" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/financial" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/custom" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />

      {/* Legal Module Routes - New SSB Legal */}
      <Route path="/legal/cases" element={<ProtectedLayout><CaseList /></ProtectedLayout>} />
      <Route path="/legal/cases/new" element={<ProtectedLayout><IntakeWizard /></ProtectedLayout>} />
      <Route path="/legal/cases/:id" element={<ProtectedLayout><CaseView /></ProtectedLayout>} />
      
      {/* Legal Module Routes - Old */}
      <Route path="/legal" element={<ProtectedLayout><NewLegalModule /></ProtectedLayout>} />
      <Route path="/legal/case-intake" element={<ProtectedLayout><CaseIntake /></ProtectedLayout>} />
      <Route path="/legal/case-tracking" element={<ProtectedLayout><CaseTracking /></ProtectedLayout>} />
      <Route path="/legal/case-detail/:id" element={<ProtectedLayout><CaseDetailView /></ProtectedLayout>} />
      <Route path="/legal/case-edit/:id" element={<ProtectedLayout><CaseEditView /></ProtectedLayout>} />
      <Route path="/legal/notices" element={<ProtectedLayout><NoticeGeneration /></ProtectedLayout>} />
      <Route path="/legal/appeals" element={<ProtectedLayout><AppealSubmission /></ProtectedLayout>} />
      <Route path="/legal/enforcement" element={<ProtectedLayout><EnforcementPenalty /></ProtectedLayout>} />
      <Route path="/legal/evidence" element={<ProtectedLayout><LegalEvidenceManagement /></ProtectedLayout>} />
      <Route path="/legal/reports" element={<ProtectedLayout><LegalReports /></ProtectedLayout>} />

      {/* LegalFinal Module Routes */}
      <Route path="/legal-final" element={<ProtectedLayout><LegalFinalDashboard /></ProtectedLayout>} />
      <Route path="/legal-final/new-case" element={<ProtectedLayout><NewCaseForm /></ProtectedLayout>} />
      <Route path="/legal-final/cases" element={<ProtectedLayout><CaseManagement /></ProtectedLayout>} />
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

      {/* Cashier & Payments Routes */}
      {/* Traditional Payment Processing */}
      <Route path="/cashier/misc-payments" element={<ProtectedLayout><MiscellaneousPayments /></ProtectedLayout>} />
      <Route path="/cashier/c3-payments" element={<ProtectedLayout><C3Payments /></ProtectedLayout>} />
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
      <Route path="/cashier/batch-management" element={<ProtectedLayout><BatchManagement /></ProtectedLayout>} />
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

      {/* Legal Module Routes - NEW */}
      <Route path="/legal/auth" element={<Suspense fallback={<div>Loading...</div>}><LegalAuth /></Suspense>} />
      <Route path="/legal/cases" element={<Suspense fallback={<div>Loading...</div>}><ProtectedLegalRoute><LegalCaseList /></ProtectedLegalRoute></Suspense>} />
      <Route path="/legal/cases/new" element={<Suspense fallback={<div>Loading...</div>}><ProtectedLegalRoute><LegalIntakeWizard /></ProtectedLegalRoute></Suspense>} />
      <Route path="/legal/cases/:id" element={<Suspense fallback={<div>Loading...</div>}><ProtectedLegalRoute><LegalCaseView /></ProtectedLegalRoute></Suspense>} />
      <Route path="/legal/hearings" element={<Suspense fallback={<div>Loading...</div>}><ProtectedLegalRoute><LegalHearingCalendar /></ProtectedLegalRoute></Suspense>} />
      <Route path="/legal/orders" element={<Suspense fallback={<div>Loading...</div>}><ProtectedLegalRoute><LegalOrderRegistry /></ProtectedLegalRoute></Suspense>} />

      {/* Test Routes */}
      <Route path="/test/data-entry" element={<ProtectedLayout><TestDataEntry /></ProtectedLayout>} />

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
