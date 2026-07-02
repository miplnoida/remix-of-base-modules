import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUserCode } from "@/hooks/useUserCode";
import { useLegalCapability } from "@/hooks/legal/useLegalCapability";
import * as svc from "@/services/legal/referralLifecycleService";

/**
 * useReferralLifecycle
 * --------------------
 * React Query mutations for every action on the Department Referrals
 * Workbench. Each mutation:
 *   - checks the caller's Legal capability
 *   - delegates to referralLifecycleService (which validates the state machine
 *     and writes audit records)
 *   - invalidates workbench + detail caches
 *   - shows success/error toasts
 */
export function useReferralLifecycle() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const { capability } = useLegalCapability();
  const actor = userCode ?? "SYSTEM";

  const invalidate = (referralId?: string) => {
    qc.invalidateQueries({ queryKey: ["legal-matter-workspace-workbench"] });
    qc.invalidateQueries({ queryKey: ["legal-referrals-workbench"] });
    qc.invalidateQueries({ queryKey: ["legal-referrals-info-open"] });
    qc.invalidateQueries({ queryKey: ["legal-referral-info-requests"] });
    if (referralId) {
      qc.invalidateQueries({ queryKey: ["legal-referral", referralId] });
      qc.invalidateQueries({ queryKey: ["legal-referral-audit", referralId] });
    }
  };

  const guard = (allowed: boolean, action: string) => {
    if (!allowed) {
      const err = new Error(`You do not have permission to ${action}`);
      toast.error(err.message);
      throw err;
    }
  };

  const receive = useMutation({
    mutationFn: (id: string) => svc.receiveReferral(id, actor),
    onSuccess: (_d, id) => invalidate(id),
    onError: (e: any) => toast.error(e?.message ?? "Failed to receive referral"),
  });

  const accept = useMutation({
    mutationFn: (input: Omit<svc.AcceptReferralInput, "actor">) => {
      guard(capability.canAcceptReferral, "accept referrals");
      return svc.acceptReferral({ ...input, actor });
    },
    onSuccess: (r) => {
      invalidate(r.id);
      toast.success(
        r.status === "ACCEPTED"
          ? "Referral accepted — ready for case creation"
          : "Referral moved into Legal review"
      );
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to accept referral"),
  });

  const reject = useMutation({
    mutationFn: (input: Omit<svc.RejectReferralInput, "actor">) => {
      guard(capability.canAcceptReferral, "reject referrals");
      return svc.rejectReferral({ ...input, actor });
    },
    onSuccess: (r) => {
      invalidate(r.id);
      toast.success("Referral rejected and returned to source");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to reject referral"),
  });

  const close = useMutation({
    mutationFn: (input: Omit<svc.CloseReferralInput, "actor">) => {
      guard(capability.canApproveClosure, "close referrals");
      return svc.closeReferral({ ...input, actor });
    },
    onSuccess: (r) => {
      invalidate(r.id);
      toast.success("Referral closed");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to close referral"),
  });

  const escalate = useMutation({
    mutationFn: (input: Omit<svc.EscalateReferralInput, "actor">) => {
      guard(capability.canApproveEscalation || capability.canAcceptReferral, "escalate referrals");
      return svc.escalateReferral({ ...input, actor });
    },
    onSuccess: (_d, v) => {
      invalidate(v.legal_referral_id);
      toast.success("Referral escalated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to escalate referral"),
  });

  const reassign = useMutation({
    mutationFn: (input: Omit<svc.ReassignReferralInput, "actor">) => {
      guard(capability.canReassignCase, "reassign referrals");
      return svc.reassignReferral({ ...input, actor });
    },
    onSuccess: (_d, v) => {
      invalidate(v.legal_referral_id);
      toast.success("Referral reassigned");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to reassign referral"),
  });

  const createIntake = useMutation({
    mutationFn: (input: Omit<svc.CreateIntakeFromReferralInput, "actor">) => {
      guard(capability.canAcceptReferral, "create intake");
      return svc.createIntakeFromReferral({ ...input, actor });
    },
    onSuccess: (res, v) => {
      invalidate(v.legal_referral_id);
      toast.success(`Legal Intake ${res.intake_no || ""} created`.trim());
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create intake"),
  });

  const createCase = useMutation({
    mutationFn: (input: Omit<svc.CreateCaseFromReferralInput, "actor">) => {
      guard(capability.canAcceptReferral, "create legal case");
      return svc.createCaseFromReferral({ ...input, actor });
    },
    onSuccess: (res, v) => {
      invalidate(v.legal_referral_id);
      toast.success(`Legal Case ${res.lg_case_no || ""} created`.trim());
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create case"),
  });

  const assignOfficer = useMutation({
    mutationFn: (input: Omit<svc.AssignOfficerToReferralInput, "actor">) => {
      guard(capability.canAssignCase || capability.canReassignCase, "assign officer");
      return svc.assignOfficerToReferral({ ...input, actor });
    },
    onSuccess: (res, v) => {
      invalidate(v.legal_referral_id);
      toast.success(
        res.assigned_user_code
          ? `Assigned to ${res.assigned_user_code}`
          : `Queued to ${res.workbasket_code ?? "team workbasket"}`
      );
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to assign officer"),
  });

  return {
    receive,
    accept,
    reject,
    close,
    escalate,
    reassign,
    createIntake,
    createCase,
    assignOfficer,
    capability,
  };
}
