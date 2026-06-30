import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { EnterpriseWorkbench } from "@/components/enterprise-workbench";
import { LegalReferralsErrorBoundary } from "@/components/legal/lg/LegalReferralsErrorBoundary";
import { RequestInfoDialog } from "@/components/legal/lg/RequestInfoDialog";
import { createLegalReferralsAdapter } from "@/workbenches/legal-referrals/LegalReferralsWorkbenchAdapter";
import type { ReferralWorkbenchRow } from "@/workbenches/legal-referrals/useLegalReferralsWorkbenchData";
import { useLegalEnterpriseLabels } from "@/hooks/legal/useLegalEnterpriseLabels";
import { EnterpriseContextDebugPanel } from "@/components/legal/EnterpriseContextDebugPanel";

function Inner() {
  const navigate = useNavigate();
  const [requestFor, setRequestFor] = useState<ReferralWorkbenchRow | null>(null);
  const labels = useLegalEnterpriseLabels();

  const adapter = useMemo(
    () =>
      createLegalReferralsAdapter({
        moduleName: labels.moduleName,
        departmentName: labels.departmentName,
        onRequestInfo: (r) => setRequestFor(r),
        onView: (r) => {
          // Prefer the canonical open_url computed by the workspace service —
          // it already falls back through case → intake → source so that
          // referrals without an intake yet still navigate somewhere useful.
          const target = r.workspace?.navigation?.open_url;
          if (target) return navigate(target);
          const anyR = r as any;
          if (anyR.legal_case_id) return navigate(`/legal/cases/${anyR.legal_case_id}`);
          if (anyR.lg_intake_id) return navigate(`/legal/cases/intake/${anyR.lg_intake_id}`);
          navigate(`/legal/referrals-workbench`);
        },
      }),
    [navigate, labels.moduleName, labels.departmentName]
  );

  return (
    <>
      <EnterpriseWorkbench adapter={adapter} />
      <div className="px-6 -mt-2">
        <EnterpriseContextDebugPanel
          moduleCode="LEGAL"
          trace={labels.trace}
          labels={{
            moduleName: labels.moduleName,
            departmentName: labels.departmentName,
            organizationName: labels.organizationName,
            locationName: labels.locationName,
          }}
        />
      </div>
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
