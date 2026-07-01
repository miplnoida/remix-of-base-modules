/**
 * LegalReferralWizard (legacy route)
 * ----------------------------------
 * The original mock-driven wizard has been retired. This route now redirects
 * users to the real ComplianceLegalReferralWizard, which writes to
 * `ce_legal_referrals` / `core_legal_referral_item` and triggers the central
 * workflow via `forwardComplianceCaseToLegal`.
 *
 * Recommendation context (from LegalRecommendationQueue) is forwarded as
 * search params so the real wizard can seed the employer/reason selection.
 * If no context is present, we send the user to the launcher instead.
 */
import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

export default function LegalReferralWizard() {
  const location = useLocation();
  const recommendation = (location.state as any)?.recommendation;

  const params = new URLSearchParams();
  if (recommendation?.employerId) params.set("employerId", recommendation.employerId);
  if (recommendation?.id) params.set("recommendationId", recommendation.id);
  params.set("reasonCode", "OLD_ARREARS_RECOVERY");

  const target = recommendation?.employerId
    ? `/compliance/legal-referral?${params.toString()}`
    : `/compliance/legal-referral/launcher`;

  useEffect(() => {
    if (!recommendation?.employerId) {
      toast.info("Select a compliance case to forward to Legal.");
    }
  }, [recommendation]);

  return <Navigate to={target} replace />;
}
