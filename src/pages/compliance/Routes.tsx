import { Routes, Route } from 'react-router-dom';
import LegalRecommendationQueue from './LegalRecommendationQueue';
import LegalReferralWizard from './LegalReferralWizard';
import ComplianceSettings from './ComplianceSettings';
import LegalEscalationPolicy from './LegalEscalationPolicy';
import RiskRulePolicy from './settings/RiskRulePolicy';
import InspectorPlans from './InspectorPlans';
import FieldOperations from './FieldOperations';
import WeeklyPlanBuilder from './audit-planning/WeeklyPlanBuilder';
import MyPlans from './audit-planning/MyPlans';
import FieldExecution from './audit-planning/FieldExecution';
import PendingReview from './audit-planning/PendingReview';
import WeeklyReports from './audit-planning/WeeklyReports';
import ViolationDetails from './ViolationDetails';
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
      <Route path="/violations/:id" element={<ViolationDetails />} />
      <Route path="/legal-recommendation-queue" element={<LegalRecommendationQueue />} />
      <Route path="/legal-referral/new" element={<LegalReferralWizard />} />
      <Route path="/settings" element={<ComplianceSettings />} />
      <Route path="/legal-escalation-policy" element={<LegalEscalationPolicy />} />
      <Route path="/settings/risk-policy" element={<RiskRulePolicy />} />
      <Route path="/inspector-plans" element={<MyPlans />} />
      <Route path="/field-operations" element={<FieldOperations />} />
      <Route path="/audit-planning/weekly-plan-builder" element={<WeeklyPlanBuilder />} />
      <Route path="/audit-planning/my-plans" element={<MyPlans />} />
      <Route path="/audit-planning/field-execution" element={<FieldExecution />} />
      <Route path="/audit-planning/pending-review" element={<PendingReview />} />
      <Route path="/audit-planning/weekly-reports" element={<WeeklyReports />} />
      <Route path="/reports/case-analytics" element={<CaseAnalytics />} />
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
