import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as svc from "@/services/legal/lgIntakeQualificationService";
import { loadIntakeWorkbench } from "@/services/legal/lgIntakeWorkbenchService";

export function useIntakeWorkbench() {
  return useQuery({ queryKey: ["lg_intake_workbench"], queryFn: loadIntakeWorkbench, staleTime: 30_000 });
}

export function useIntake(id: string | undefined) {
  return useQuery({
    queryKey: ["lg_intake", id],
    queryFn: () => svc.getIntakeQ(id!),
    enabled: !!id,
  });
}

export function useIntakeChecklist(id: string | undefined) {
  return useQuery({
    queryKey: ["lg_intake_checklist", id],
    queryFn: async () => {
      const [template, responses] = await Promise.all([
        svc.listChecklistTemplate(),
        svc.listChecklistResponses(id!),
      ]);
      const respByItem = new Map(responses.map((r) => [r.template_item_id, r]));
      return template.map((t) => ({ template: t, response: respByItem.get(t.id) ?? null }));
    },
    enabled: !!id,
  });
}

export function useIntakeInfoRequests(id: string | undefined) {
  return useQuery({
    queryKey: ["lg_intake_info_requests", id],
    queryFn: () => svc.listInfoRequests(id!),
    enabled: !!id,
  });
}

export function useIntakeAudit(id: string | undefined) {
  return useQuery({
    queryKey: ["lg_intake_audit", id],
    queryFn: () => svc.listAudit(id!),
    enabled: !!id,
  });
}

export function useIntakeMutations(id: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => {
    if (id) {
      qc.invalidateQueries({ queryKey: ["lg_intake", id] });
      qc.invalidateQueries({ queryKey: ["lg_intake_checklist", id] });
      qc.invalidateQueries({ queryKey: ["lg_intake_info_requests", id] });
      qc.invalidateQueries({ queryKey: ["lg_intake_audit", id] });
    }
    qc.invalidateQueries({ queryKey: ["lg_intake_workbench"] });
  };

  return {
    updateIntake: useMutation({
      mutationFn: (args: { patch: Partial<svc.IntakeRow>; actor?: string }) =>
        svc.updateIntakeQ(id!, args.patch, args.actor),
      onSuccess: invalidate,
    }),
    assignOfficer: useMutation({
      mutationFn: (args: { officerId: string; actor?: string }) =>
        svc.assignIntakeOfficer(id!, args.officerId, args.actor),
      onSuccess: invalidate,
    }),
    checklistUpsert: useMutation({
      mutationFn: (args: { templateItemId: string; patch: Partial<svc.ChecklistResponse>; actor?: string }) =>
        svc.upsertChecklistResponse(id!, args.templateItemId, args.patch, args.actor),
      onSuccess: invalidate,
    }),
    createInfoRequest: useMutation({
      mutationFn: (args: Parameters<typeof svc.createInfoRequest>[0] & { actor?: string }) =>
        svc.createInfoRequest(args, args.actor),
      onSuccess: invalidate,
    }),
    respondInfoRequest: useMutation({
      mutationFn: (args: { requestId: string; responseText: string; actor?: string }) =>
        svc.respondInfoRequest(args.requestId, args.responseText, args.actor),
      onSuccess: invalidate,
    }),
    officerDecision: useMutation({
      mutationFn: (args: { decision: "ACCEPT" | "REJECT" | "RETURN" | "ESCALATE"; reason?: string; actor?: string }) =>
        svc.officerDecision(id!, args.decision, args.reason, args.actor),
      onSuccess: invalidate,
    }),
    submitForSupervisor: useMutation({
      mutationFn: (args: { actor?: string }) => svc.submitForSupervisor(id!, args.actor),
      onSuccess: invalidate,
    }),
    supervisorDecision: useMutation({
      mutationFn: (args: { decision: "APPROVED" | "REJECTED" | "RETURNED"; remarks?: string; actor?: string }) =>
        svc.supervisorDecision(id!, args.decision, args.remarks, args.actor),
      onSuccess: invalidate,
    }),
    createCase: useMutation({
      mutationFn: (args: { actor: string }) => svc.createCaseFromIntake(id!, args.actor),
      onSuccess: invalidate,
    }),
  };
}
