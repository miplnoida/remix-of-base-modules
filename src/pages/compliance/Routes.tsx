import { Routes, Route } from 'react-router-dom';

// Dashboards
import ManagerDashboard from './dashboards/ManagerDashboard';
import InspectorDashboard from './dashboards/InspectorDashboard';
import LegalDashboard from './dashboards/LegalDashboard';
import ComplianceMonitoring from './dashboards/ComplianceMonitoring';
import ComplianceDashboard from './dashboards/ComplianceDashboard';

// Violations
import ViolationsManagement from './violations/ViolationsManagement';
import ManualViolationEntry from './violations/ManualViolationEntry';
import ViolationDetails from './violations/ViolationDetails';
import WeeklyReportSubmission from './violations/WeeklyReportSubmission';

// Cases
import CaseManagement from './cases/CaseManagement';
import CaseQueue from './cases/CaseQueue';
import PenaltyManagement from './cases/PenaltyManagement';

// Risk
import RiskProfiles from './risk/RiskProfiles';

// Inspections
import InspectionManagement from './inspections/InspectionManagement';
import FieldOperations from './inspections/FieldOperations';

// Arrangements
import PaymentArrangements from './arrangements/PaymentArrangements';
import BreachMonitoring from './arrangements/BreachMonitoring';

// Legal
import LegalQueue from './legal/LegalQueue';
import LegalProceedingsPage from './legal/LegalProceedingsPage';
import WaiversOverrides from './legal/WaiversOverrides';
import NoticesManagement from './legal/NoticesManagement';
import LegalRecommendationQueue from './legal/LegalRecommendationQueue';
import LegalReferralWizard from './legal/LegalReferralWizard';

// Employers
import EmployerStatements from './employers/EmployerStatements';
import EmployerStatementDetail from './employers/EmployerStatementDetail';
import EmployerFindings from './employers/EmployerFindings';
import EmployerComplianceManagement from './employers/EmployerComplianceManagement';
import EmployerVisitWorkspace from './employers/EmployerVisitWorkspace';

// Audit Planning
import WeeklyPlanBuilder from './audit-planning/WeeklyPlanBuilder';
import MyPlans from './audit-planning/MyPlans';
import FieldExecution from './audit-planning/FieldExecution';
import PendingReview from './audit-planning/PendingReview';
import WeeklyReports from './audit-planning/WeeklyReports';
import AllWeeklyReports from './audit-planning/AllWeeklyReports';
import AuditDetails from './audit-planning/AuditDetails';
import AuditManagement from './audit-planning/AuditManagement';

// Sampling
import SamplingDashboard from './sampling/SamplingDashboard';
import EmployerRiskProfile from './sampling/EmployerRiskProfile';
import MonthlyAuditCandidates from './sampling/MonthlyAuditCandidates';
import MyUpcomingAudits from './sampling/MyUpcomingAudits';
import RiskSamplingSettings from './sampling/RiskSamplingSettings';

// Automation
import JobConfiguration from './automation/JobConfiguration';
import JobHistory from './automation/JobHistory';

// Reports
import CaseAnalytics from './reports/CaseAnalytics';
import InspectorPerformance from './reports/InspectorPerformance';
import C3Compliance from './reports/C3Compliance';
import ArrearsReports from './reports/ArrearsReports';
import AuditReports from './reports/AuditReports';
import ArrangementReports from './reports/ArrangementReports';
import LegalEscalationReports from './reports/LegalEscalationReports';
import TrendReports from './reports/TrendReports';

// Settings
import RuleEngine from './settings/RuleEngine';
import ViolationTypes from './settings/ViolationTypes';
import NumberTemplates from './settings/NumberTemplates';
import RiskScoringConfig from './settings/RiskScoringConfig';
import RiskRulePolicy from './settings/RiskRulePolicy';
import ComplianceSettings from './settings/ComplianceSettings';
import LegalEscalationPolicy from './settings/LegalEscalationPolicy';

const ComplianceRoutes = () => {
  return (
    <Routes>
      {/* Dashboards */}
      <Route path="/dashboard/manager" element={<ManagerDashboard />} />
      <Route path="/dashboard/inspector" element={<InspectorDashboard />} />
      <Route path="/dashboard/legal" element={<LegalDashboard />} />
      <Route path="/dashboard" element={<ComplianceDashboard />} />
      <Route path="/monitoring" element={<ComplianceMonitoring />} />

      {/* Violations */}
      <Route path="/violations" element={<ViolationsManagement />} />
      <Route path="/violations/manual-entry" element={<ManualViolationEntry />} />
      <Route path="/violations/:id" element={<ViolationDetails />} />
      <Route path="/violations/weekly-reports" element={<WeeklyReportSubmission />} />

      {/* Cases */}
      <Route path="/cases" element={<CaseManagement />} />
      <Route path="/cases/queue" element={<CaseQueue />} />
      <Route path="/cases/penalties" element={<PenaltyManagement />} />

      {/* Risk Profiles */}
      <Route path="/risk-profiles" element={<RiskProfiles />} />

      {/* Inspections */}
      <Route path="/inspections" element={<InspectionManagement />} />
      <Route path="/inspections/field-execution" element={<FieldExecution />} />
      <Route path="/inspections/field-operations" element={<FieldOperations />} />

      {/* Arrangements */}
      <Route path="/arrangements" element={<PaymentArrangements />} />
      <Route path="/arrangements/breaches" element={<BreachMonitoring />} />

      {/* Legal */}
      <Route path="/legal/queue" element={<LegalQueue />} />
      <Route path="/legal/proceedings" element={<LegalProceedingsPage />} />
      <Route path="/notices" element={<NoticesManagement />} />
      <Route path="/waivers" element={<WaiversOverrides />} />
      <Route path="/legal-recommendation-queue" element={<LegalRecommendationQueue />} />
      <Route path="/legal-referral/new" element={<LegalReferralWizard />} />

      {/* Employers */}
      <Route path="/employer-statements" element={<EmployerStatements />} />
      <Route path="/employer-statements/:id" element={<EmployerStatementDetail />} />
      <Route path="/employers/findings" element={<EmployerFindings />} />
      <Route path="/employers/management" element={<EmployerComplianceManagement />} />
      <Route path="/employers/visit/:id" element={<EmployerVisitWorkspace />} />

      {/* Audit Planning */}
      <Route path="/audit-planning/weekly-plan-builder" element={<WeeklyPlanBuilder />} />
      <Route path="/audit-planning/my-plans" element={<MyPlans />} />
      <Route path="/audit-planning/field-execution" element={<FieldExecution />} />
      <Route path="/audit-planning/pending-review" element={<PendingReview />} />
      <Route path="/audit-planning/weekly-reports" element={<WeeklyReports />} />
      <Route path="/audit-planning/all-reports" element={<AllWeeklyReports />} />
      <Route path="/audits/:id" element={<AuditDetails />} />
      <Route path="/audits/management" element={<AuditManagement />} />

      {/* Sampling */}
      <Route path="/sampling" element={<SamplingDashboard />} />
      <Route path="/sampling/employer-risk/:id" element={<EmployerRiskProfile />} />
      <Route path="/sampling/candidates" element={<MonthlyAuditCandidates />} />
      <Route path="/sampling/upcoming" element={<MyUpcomingAudits />} />
      <Route path="/sampling/settings" element={<RiskSamplingSettings />} />

      {/* Automation */}
      <Route path="/automation/jobs" element={<JobConfiguration />} />
      <Route path="/automation/history" element={<JobHistory />} />

      {/* Settings */}
      <Route path="/settings" element={<ComplianceSettings />} />
      <Route path="/settings/rule-engine" element={<RuleEngine />} />
      <Route path="/settings/violation-types" element={<ViolationTypes />} />
      <Route path="/settings/number-templates" element={<NumberTemplates />} />
      <Route path="/settings/risk-config" element={<RiskScoringConfig />} />
      <Route path="/settings/risk-policy" element={<RiskRulePolicy />} />
      <Route path="/settings/legal-escalation-policy" element={<LegalEscalationPolicy />} />

      {/* Reports */}
      <Route path="/reports/case-analytics" element={<CaseAnalytics />} />
      <Route path="/reports/violations-analytics" element={<CaseAnalytics />} />
      <Route path="/reports/inspector-performance" element={<InspectorPerformance />} />
      <Route path="/reports/c3-compliance" element={<C3Compliance />} />
      <Route path="/reports/arrears" element={<ArrearsReports />} />
      <Route path="/reports/audit" element={<AuditReports />} />
      <Route path="/reports/arrangements" element={<ArrangementReports />} />
      <Route path="/reports/legal" element={<LegalEscalationReports />} />
      <Route path="/reports/trends" element={<TrendReports />} />
    </Routes>
  );
};

export default ComplianceRoutes;
