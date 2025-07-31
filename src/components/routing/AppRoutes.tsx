
import { Routes, Route } from 'react-router-dom';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';

// Page imports
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import ViewInsuredPerson from '@/pages/ViewInsuredPerson';
import EditInsuredPerson from '@/pages/EditInsuredPerson';

// Employer Management
import EmployerRegistration from '@/pages/EmployerRegistration';
import EmployerApproval from '@/pages/EmployerApproval';
import EmployerDirectory from '@/pages/EmployerDirectory';
import ContributionEntry from '@/pages/ContributionEntry';
import ComplianceMonitoring from '@/pages/ComplianceMonitoring';
import ContributionTracking from '@/pages/ContributionTracking';

// Insured Persons - New consolidated page
import IPManagement from '@/pages/IPManagement';
import PersonIPManagement from '@/pages/PersonIPManagement';

// Quick Actions Pages
import WagesHistory from '@/pages/WagesHistory';
import ClaimHistory from '@/pages/ClaimHistory';
import BenefitEligibility from '@/pages/BenefitEligibility';
import PendingReviews from '@/pages/PendingReviews';

// Benefits
import AllBenefitsTabs from '@/pages/AllBenefitsTabs';
import OnlineBenefitApplications from '@/pages/OnlineBenefitApplications';
import MaternityBenefits from '@/pages/MaternityBenefits';
import UnemploymentBenefits from '@/pages/UnemploymentBenefits';
import WorkInjuryBenefits from '@/pages/WorkInjuryBenefits';
import DeathBenefits from '@/pages/DeathBenefits';
import EducationalBenefits from '@/pages/EducationalBenefits';

// Compliance & Audit
import ComplianceDashboard from '@/pages/ComplianceDashboard';
import EmployerComplianceManagement from '@/pages/EmployerComplianceManagement';
import ComplianceReports from '@/pages/ComplianceReports';
import LegalProceedings from '@/pages/LegalProceedings';
import AuditManagement from '@/pages/AuditManagement';
import PenaltyManagement from '@/pages/PenaltyManagement';

// Reports
import ReportsHub from '@/pages/ReportsHub';
import EmployerStatement from '@/pages/EmployerStatement';

// System Administration
import WebUsers from '@/pages/WebUsers';
import AuditLog from '@/pages/AuditLog';

import ManageEmployers from '@/pages/ManageEmployers';
import EmployersDashboard from '@/pages/EmployersDashboard';

// New pages for missing routes
import AddEmployer from '@/pages/AddEmployer';
import EmployersReports from '@/pages/EmployersReports';
import ViewEmployer from '@/pages/ViewEmployer';
import EditEmployer from '@/pages/EditEmployer';
import ManageSelfEmployed from '@/pages/ManageSelfEmployed';
import AddSelfEmployed from '@/pages/AddSelfEmployed';
import SelfEmployedReports from '@/pages/SelfEmployedReports';
import InsuredPersonGuide from '@/pages/InsuredPersonGuide';
import EmployerRules from '@/pages/EmployerRules';
import ApprovalWorkflow from '@/pages/ApprovalWorkflow';
import DocumentationRequirements from '@/pages/DocumentationRequirements';
import UserProfile from '@/pages/UserProfile';
import ChangePassword from '@/pages/ChangePassword';
import ManageRoles from '@/pages/ManageRoles';
import SystemSettings from '@/pages/SystemSettings';
import SecuritySettings from '@/pages/SecuritySettings';
import PersonRegistration from '@/pages/PersonRegistration';
import RegisterPersonTabs from '@/pages/RegisterPersonTabs';
import PendingVerificationPage from '@/pages/PendingVerificationPage';

// C3 Management
import C3Dashboard from '@/pages/C3Dashboard';
import C3Management from '@/pages/C3Management';
import C3InputForm from '@/pages/C3InputForm';
import C3Reports from '@/pages/C3Reports';
import C3Verification from '@/pages/C3Verification';
import ViewC3Record from '@/pages/ViewC3Record';
import EditC3Record from '@/pages/EditC3Record';

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
      <Route path="/c3-management/reports" element={<ProtectedLayout><C3Reports /></ProtectedLayout>} />
      <Route path="/c3-management/verification" element={<ProtectedLayout><C3Verification /></ProtectedLayout>} />
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

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
