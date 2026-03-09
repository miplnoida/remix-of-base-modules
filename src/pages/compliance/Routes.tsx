import { Routes, Route } from 'react-router-dom';

// Dashboards
import ManagerDashboard from './dashboards/ManagerDashboard';
import InspectorDashboard from './dashboards/InspectorDashboard';
import LegalDashboard from './dashboards/LegalDashboard';

// Cases
import CaseManagement from './cases/CaseManagement';
import CaseQueue from './cases/CaseQueue';

// Risk
import RiskProfiles from './risk/RiskProfiles';

// Inspections
import InspectionManagement from './inspections/InspectionManagement';

// Arrangements
import BreachMonitoring from './arrangements/BreachMonitoring';

// Legal
import LegalQueue from './legal/LegalQueue';
import LegalProceedingsPage from './legal/LegalProceedingsPage';
import WaiversOverrides from './legal/WaiversOverrides';

// Automation
import JobConfiguration from './automation/JobConfiguration';
import JobHistory from './automation/JobHistory';

// Settings
import RuleEngine from './settings/RuleEngine';
import ViolationTypes from './settings/ViolationTypes';
import NumberTemplates from './settings/NumberTemplates';
import RiskScoringConfig from './settings/RiskScoringConfig';
import RiskRulePolicy from './settings/RiskRulePolicy';

// Existing pages
import LegalRecommendationQueue from './LegalRecommendationQueue';
import LegalReferralWizard from './LegalReferralWizard';
import ComplianceSettings from './ComplianceSettings';
import LegalEscalationPolicy from './LegalEscalationPolicy';
import WeeklyPlanBuilder from './audit-planning/WeeklyPlanBuilder';
import MyPlans from './audit-planning/MyPlans';
import FieldExecution from './audit-planning/FieldExecution';
import PendingReview from './audit-planning/PendingReview';
import WeeklyReports from './audit-planning/WeeklyReports';
import ViolationDetails from './ViolationDetails';
import AuditDetails from './AuditDetails';
import CaseAnalytics from './reports/CaseAnalytics';
import InspectorPerformance from './reports/InspectorPerformance';
import C3Compliance from './reports/C3Compliance';
import ArrearsReports from './reports/ArrearsReports';
import AuditReports from './reports/AuditReports';
import ArrangementReports from './reports/ArrangementReports';
import LegalEscalationReports from './reports/LegalEscalationReports';
import TrendReports from './reports/TrendReports';

const ComplianceRoutes = () => {
  return (
    <Routes>
      {/* Dashboards */}
      <Route path="/dashboard/manager" element={<ManagerDashboard />} />
      <Route path="/dashboard/inspector" element={<InspectorDashboard />} />
      <Route path="/dashboard/legal" element={<LegalDashboard />} />

      {/* Cases */}
      <Route path="/cases" element={<CaseManagement />} />
      <Route path="/cases/queue" element={<CaseQueue />} />

      {/* Risk Profiles */}
      <Route path="/risk-profiles" element={<RiskProfiles />} />

      {/* Inspections */}
      <Route path="/inspections" element={<InspectionManagement />} />
      <Route path="/inspections/field-execution" element={<FieldExecution />} />

      {/* Arrangements */}
      <Route path="/arrangements/breaches" element={<BreachMonitoring />} />

      {/* Legal */}
      <Route path="/legal/queue" element={<LegalQueue />} />
      <Route path="/legal/proceedings" element={<LegalProceedingsPage />} />
      <Route path="/waivers" element={<WaiversOverrides />} />

      {/* Automation */}
      <Route path="/automation/jobs" element={<JobConfiguration />} />
      <Route path="/automation/history" element={<JobHistory />} />

      {/* Settings — New */}
      <Route path="/settings/rule-engine" element={<RuleEngine />} />
      <Route path="/settings/violation-types" element={<ViolationTypes />} />
      <Route path="/settings/number-templates" element={<NumberTemplates />} />
      <Route path="/settings/risk-config" element={<RiskScoringConfig />} />
      <Route path="/settings/legal-escalation-policy" element={<LegalEscalationPolicy />} />
      <Route path="/settings/risk-policy" element={<RiskRulePolicy />} />

      {/* Existing routes */}
      <Route path="/violations/:id" element={<ViolationDetails />} />
      <Route path="/audits/:id" element={<AuditDetails />} />
      <Route path="/legal-recommendation-queue" element={<LegalRecommendationQueue />} />
      <Route path="/legal-referral/new" element={<LegalReferralWizard />} />
      <Route path="/settings" element={<ComplianceSettings />} />
      <Route path="/legal-escalation-policy" element={<LegalEscalationPolicy />} />
      <Route path="/audit-planning/weekly-plan-builder" element={<WeeklyPlanBuilder />} />
      <Route path="/audit-planning/my-plans" element={<MyPlans />} />
      <Route path="/audit-planning/field-execution" element={<FieldExecution />} />
      <Route path="/audit-planning/pending-review" element={<PendingReview />} />
      <Route path="/audit-planning/weekly-reports" element={<WeeklyReports />} />
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
