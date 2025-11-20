import { Routes, Route } from 'react-router-dom';
import LegalRecommendationQueue from './LegalRecommendationQueue';
import LegalReferralWizard from './LegalReferralWizard';
import ComplianceSettings from './ComplianceSettings';
import LegalEscalationPolicy from './LegalEscalationPolicy';

const ComplianceRoutes = () => {
  return (
    <Routes>
      <Route path="/legal-recommendation-queue" element={<LegalRecommendationQueue />} />
      <Route path="/legal-referral/new" element={<LegalReferralWizard />} />
      <Route path="/settings" element={<ComplianceSettings />} />
      <Route path="/legal-escalation-policy" element={<LegalEscalationPolicy />} />
    </Routes>
  );
};

export default ComplianceRoutes;
