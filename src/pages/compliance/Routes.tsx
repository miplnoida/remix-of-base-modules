import { Routes, Route } from 'react-router-dom';
import LegalRecommendationQueue from './LegalRecommendationQueue';
import LegalReferralWizard from './LegalReferralWizard';
import ComplianceSettings from './ComplianceSettings';
import LegalEscalationPolicy from './LegalEscalationPolicy';
import RiskRulePolicy from './settings/RiskRulePolicy';

const ComplianceRoutes = () => {
  return (
    <Routes>
      <Route path="/legal-recommendation-queue" element={<LegalRecommendationQueue />} />
      <Route path="/legal-referral/new" element={<LegalReferralWizard />} />
      <Route path="/settings" element={<ComplianceSettings />} />
      <Route path="/legal-escalation-policy" element={<LegalEscalationPolicy />} />
      <Route path="/settings/risk-policy" element={<RiskRulePolicy />} />
    </Routes>
  );
};

export default ComplianceRoutes;
