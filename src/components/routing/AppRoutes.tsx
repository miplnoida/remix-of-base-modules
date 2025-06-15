
import { Routes, Route } from 'react-router-dom';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';

// Page imports
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';

// Employer Management
import EmployerRegistration from '@/pages/EmployerRegistration';
import EmployerApproval from '@/pages/EmployerApproval';
import EmployerDirectory from '@/pages/EmployerDirectory';
import ContributionEntry from '@/pages/ContributionEntry';
import ComplianceMonitoring from '@/pages/ComplianceMonitoring';
import ContributionTracking from '@/pages/ContributionTracking';

// Insured Persons
import PersonRegistration from '@/pages/PersonRegistration';
import PersonApproval from '@/pages/PersonApproval';
import PersonDirectory from '@/pages/PersonDirectory';

// Benefits
import AllBenefitsTabs from '@/pages/AllBenefitsTabs';
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

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      
      {/* Dashboard */}
      <Route path="/" element={<ProtectedLayout><Index /></ProtectedLayout>} />
      
      {/* Employer Management Routes */}
      <Route path="/employer/register" element={<ProtectedLayout><EmployerRegistration /></ProtectedLayout>} />
      <Route path="/employer/approval" element={<ProtectedLayout><EmployerApproval /></ProtectedLayout>} />
      <Route path="/employer/directory" element={<ProtectedLayout><EmployerDirectory /></ProtectedLayout>} />
      <Route path="/employer/contribution-entry" element={<ProtectedLayout><ContributionEntry /></ProtectedLayout>} />
      <Route path="/employer/compliance" element={<ProtectedLayout><ComplianceMonitoring /></ProtectedLayout>} />
      <Route path="/employer/contributions" element={<ProtectedLayout><ContributionTracking /></ProtectedLayout>} />

      {/* Insured Persons Routes */}
      <Route path="/person/register" element={<ProtectedLayout><PersonRegistration /></ProtectedLayout>} />
      <Route path="/person/approval" element={<ProtectedLayout><PersonApproval /></ProtectedLayout>} />
      <Route path="/person/directory" element={<ProtectedLayout><PersonDirectory /></ProtectedLayout>} />

      {/* Benefits Routes */}
      <Route path="/benefits/all" element={<ProtectedLayout><AllBenefitsTabs /></ProtectedLayout>} />
      <Route path="/benefits/maternity" element={<ProtectedLayout><MaternityBenefits /></ProtectedLayout>} />
      <Route path="/benefits/unemployment" element={<ProtectedLayout><UnemploymentBenefits /></ProtectedLayout>} />
      <Route path="/benefits/work-injury" element={<ProtectedLayout><WorkInjuryBenefits /></ProtectedLayout>} />
      <Route path="/benefits/death" element={<ProtectedLayout><DeathBenefits /></ProtectedLayout>} />
      <Route path="/benefits/educational" element={<ProtectedLayout><EducationalBenefits /></ProtectedLayout>} />

      {/* Compliance & Audit Routes */}
      <Route path="/compliance/dashboard" element={<ProtectedLayout><ComplianceDashboard /></ProtectedLayout>} />
      <Route path="/compliance/employer" element={<ProtectedLayout><EmployerComplianceManagement /></ProtectedLayout>} />
      <Route path="/compliance/reports" element={<ProtectedLayout><ComplianceReports /></ProtectedLayout>} />
      <Route path="/compliance/legal" element={<ProtectedLayout><LegalProceedings /></ProtectedLayout>} />
      <Route path="/compliance/audits" element={<ProtectedLayout><AuditManagement /></ProtectedLayout>} />
      <Route path="/compliance/penalties" element={<ProtectedLayout><PenaltyManagement /></ProtectedLayout>} />

      {/* Reports Routes */}
      <Route path="/reports/claims" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/cashier" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/employer" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/persons" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/statistics" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/financial" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />
      <Route path="/reports/custom" element={<ProtectedLayout><ReportsHub /></ProtectedLayout>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
