
import { Routes, Route } from 'react-router-dom';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';

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
import NoticeGeneration from '@/pages/legal/NoticeGeneration';
import AppealSubmission from '@/pages/legal/AppealSubmission';
import EnforcementPenalty from '@/pages/legal/EnforcementPenalty';
import EvidenceManagement from '@/pages/legal/EvidenceManagement';
import LegalReports from '@/pages/legal/LegalReports';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      
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

      {/* Legal Module Routes */}
      <Route path="/legal" element={<ProtectedLayout><NewLegalModule /></ProtectedLayout>} />
      <Route path="/legal/case-intake" element={<ProtectedLayout><CaseIntake /></ProtectedLayout>} />
      <Route path="/legal/case-tracking" element={<ProtectedLayout><CaseTracking /></ProtectedLayout>} />
      <Route path="/legal/notices" element={<ProtectedLayout><NoticeGeneration /></ProtectedLayout>} />
      <Route path="/legal/appeals" element={<ProtectedLayout><AppealSubmission /></ProtectedLayout>} />
      <Route path="/legal/enforcement" element={<ProtectedLayout><EnforcementPenalty /></ProtectedLayout>} />
      <Route path="/legal/evidence" element={<ProtectedLayout><EvidenceManagement /></ProtectedLayout>} />
      <Route path="/legal/reports" element={<ProtectedLayout><LegalReports /></ProtectedLayout>} />

      {/* Test Routes */}
      <Route path="/test/data-entry" element={<ProtectedLayout><TestDataEntry /></ProtectedLayout>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
