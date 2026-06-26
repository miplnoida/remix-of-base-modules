import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EnterpriseWorkbench } from "@/components/enterprise-workbench";
import { LegalReferralsErrorBoundary } from "@/components/legal/lg/LegalReferralsErrorBoundary";
import { RequestInfoDialog } from "@/components/legal/lg/RequestInfoDialog";
import { createLegalReferralsAdapter } from "@/workbenches/legal-referrals/LegalReferralsWorkbenchAdapter";
import type { ReferralWorkbenchRow } from "@/workbenches/legal-referrals/useLegalReferralsWorkbenchData";

function Inner() {
  const navigate = useNavigate();
  const [requestFor, setRequestFor] = useState<ReferralWorkbenchRow | null>(null);

  const notYet = (label: string) =>
    toast.info(`${label} flow opens from the referral detail page.`);

  const adapter = useMemo(
    () =>
      createLegalReferralsAdapter({
        onRequestInfo: (r) => setRequestFor(r),
        onAssign: () => notYet("Assign"),
        onReassign: () => notYet("Reassign"),
        onTransferWorkbasket: () => notYet("Transfer Workbasket"),
        onEscalate: () => notYet("Escalate"),
        onView: (r) => {
          const anyR = r as any;
          if (anyR.legal_case_id) return navigate(`/legal/cases/${anyR.legal_case_id}`);
          if (anyR.lg_intake_id) return navigate(`/legal/intake/${anyR.lg_intake_id}`);
          navigate(`/legal/referrals-workbench/${r.id}`);
        },
      }),
    [navigate]
  );

  return (
    <>
      <EnterpriseWorkbench adapter={adapter} />
      {requestFor && (
        <RequestInfoDialog
          legalReferralId={requestFor.id}
          referralNo={requestFor.referral_no}
          sourceModule={requestFor.source_module as "BENEFITS" | "COMPLIANCE"}
          open={!!requestFor}
          onOpenChange={(o) => !o && setRequestFor(null)}
        />
      )}
    </>
  );
}

export default function LegalReferralsWorkbench() {
  return (
    <LegalReferralsErrorBoundary>
      <Inner />
    </LegalReferralsErrorBoundary>
  );
}
