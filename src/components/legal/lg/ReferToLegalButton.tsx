import { useNavigate } from "react-router-dom";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  /** "compliance" or "benefits" */
  module: "compliance" | "benefits";
  /** Optional prefill params */
  employerId?: string | null;
  ceCaseId?: string | null;
  claimId?: string | null;
  paymentArrangementId?: string | null;
  auditId?: string | null;
  inspectionId?: string | null;
  reasonCode?: string | null;
  matter?: string | null;

  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  className?: string;
  label?: string;
}

/**
 * Reusable launcher for the Compliance / Benefits → Legal Referral wizard.
 * Drops into any source screen (Case Detail, Employer 360, Ledger, Arrangement,
 * Inspection, Audit, Claim 360, Overpayment, Appeal, Fraud, …) and routes the
 * user to the wizard with the supplied entity already pre-selected.
 */
export default function ReferToLegalButton({
  module,
  employerId,
  ceCaseId,
  claimId,
  paymentArrangementId,
  auditId,
  inspectionId,
  reasonCode,
  matter,
  size = "sm",
  variant = "outline",
  className,
  label,
}: Props) {
  const navigate = useNavigate();

  function go() {
    const params = new URLSearchParams();
    if (employerId) params.set("employerId", employerId);
    if (paymentArrangementId) params.set("paymentArrangementId", paymentArrangementId);
    if (auditId) params.set("auditId", auditId);
    if (inspectionId) params.set("inspectionId", inspectionId);
    if (reasonCode) params.set("reasonCode", reasonCode);
    if (matter) params.set("matter", matter);

    if (module === "compliance") {
      const qs = params.toString();
      const path = ceCaseId
        ? `/compliance/cases/${ceCaseId}/legal-referral${qs ? `?${qs}` : ""}`
        : `/compliance/legal-referral${qs ? `?${qs}` : ""}`;
      navigate(path);
    } else {
      if (claimId) params.delete("claimId");
      const qs = params.toString();
      const path = claimId
        ? `/bn/claims/${claimId}/legal-referral${qs ? `?${qs}` : ""}`
        : `/bn/legal-referral${qs ? `?${qs}` : ""}`;
      navigate(path);
    }
  }

  return (
    <Button onClick={go} size={size} variant={variant} className={className}>
      <Scale className="h-4 w-4 mr-2" />
      {label ?? "Refer to Legal"}
    </Button>
  );
}
