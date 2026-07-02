import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { EnterpriseWorkbench } from "@/components/enterprise-workbench";
import { LegalReferralsErrorBoundary } from "@/components/legal/lg/LegalReferralsErrorBoundary";
import { RequestInfoDialog } from "@/components/legal/lg/RequestInfoDialog";
import {
  AcceptReferralDialog,
  RejectReferralDialog,
  CloseReferralDialog,
  EscalateReferralDialog,
  ReassignReferralDialog,
  CreateIntakeDialog,
  CreateCaseFromReferralDialog,
  AssignOfficerReferralDialog,
} from "@/components/legal/lg/referral-actions/ReferralLifecycleDialogs";
import { createLegalReferralsAdapter } from "@/workbenches/legal-referrals/LegalReferralsWorkbenchAdapter";
import type { ReferralWorkbenchRow } from "@/workbenches/legal-referrals/useLegalReferralsWorkbenchData";
import { useLegalEnterpriseLabels } from "@/hooks/legal/useLegalEnterpriseLabels";
import { EnterpriseContextDebugPanel } from "@/components/legal/EnterpriseContextDebugPanel";

type DialogKind =
  | "request_info"
  | "accept"
  | "reject"
  | "close"
  | "escalate"
  | "reassign"
  | "create_intake"
  | "create_case"
  | "assign_officer"
  | null;

function Inner() {
  const navigate = useNavigate();
  const labels = useLegalEnterpriseLabels();

  const [dialog, setDialog] = useState<DialogKind>(null);
  const [activeRow, setActiveRow] = useState<ReferralWorkbenchRow | null>(null);

  const open = (kind: DialogKind) => (row: ReferralWorkbenchRow) => {
    setActiveRow(row);
    setDialog(kind);
  };
  const close = () => { setDialog(null); setActiveRow(null); };

  const adapter = useMemo(
    () =>
      createLegalReferralsAdapter({
        moduleName: labels.moduleName,
        departmentName: labels.departmentName,
        onRequestInfo: open("request_info"),
        onAccept: open("accept"),
        onReject: open("reject"),
        onClose: open("close"),
        onEscalate: open("escalate"),
        onReassign: open("reassign"),
        onCreateIntake: open("create_intake"),
        onCreateCase: open("create_case"),
        onAssignOfficer: open("assign_officer"),
        onView: (r) => {
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

      {dialog === "request_info" && activeRow && (
        <RequestInfoDialog
          legalReferralId={activeRow.id}
          referralNo={activeRow.referral_no}
          sourceModule={activeRow.source_module as "BENEFITS" | "COMPLIANCE"}
          open
          onOpenChange={(o) => !o && close()}
        />
      )}
      {dialog === "accept" && <AcceptReferralDialog row={activeRow} onOpenChange={(o) => !o && close()} />}
      {dialog === "reject" && <RejectReferralDialog row={activeRow} onOpenChange={(o) => !o && close()} />}
      {dialog === "close" && <CloseReferralDialog row={activeRow} onOpenChange={(o) => !o && close()} />}
      {dialog === "escalate" && <EscalateReferralDialog row={activeRow} onOpenChange={(o) => !o && close()} />}
      {dialog === "reassign" && <ReassignReferralDialog row={activeRow} onOpenChange={(o) => !o && close()} />}
      {dialog === "create_intake" && <CreateIntakeDialog row={activeRow} onOpenChange={(o) => !o && close()} />}
      {dialog === "create_case" && <CreateCaseFromReferralDialog row={activeRow} onOpenChange={(o) => !o && close()} />}
      {dialog === "assign_officer" && <AssignOfficerReferralDialog row={activeRow} onOpenChange={(o) => !o && close()} />}
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
