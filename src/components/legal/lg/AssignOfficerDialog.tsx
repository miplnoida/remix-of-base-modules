import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserCode } from "@/hooks/useUserCode";
import { useAssignLegalOfficer } from "@/hooks/legal/useLgEntities";
import { logLgActivity } from "@/services/legal/lgAuditService";
import {
  triggerLegalAssignmentNoticeAfterAssign,
  LEGAL_ASSIGNMENT_AUTOMATION_KEY,
  type AssignmentNoticeTriggerResult,
} from "@/modules/legal/communication/legalAssignmentWorkflow";
import { useAutomationSetting } from "@/pages/admin/communicationHub/services/moduleAutomationSettingsService";
import { BlockersList } from "@/pages/admin/communicationHub/safety/BlockersList";
import { explainBlocker } from "@/pages/admin/communicationHub/safety/plainLanguageBlockers";

const LEGAL_ROLE_NAMES = ["LEGAL_OFFICER", "SENIOR_LEGAL_OFFICER", "LEGAL_MANAGER"];

function useLegalOfficers() {
  return useQuery({
    queryKey: ["legal_officers"],
    queryFn: async () => {
      const sb = supabase as any;
      const { data: roleRows, error: roleError } = await sb
        .from("user_roles")
        .select("user_id, role")
        .in("role", LEGAL_ROLE_NAMES);
      if (roleError) throw roleError;

      const userIds = Array.from(new Set((roleRows ?? []).map((r: any) => r.user_id).filter(Boolean)));
      const profileMap = new Map<string, any>();
      if (userIds.length) {
        const { data: profiles, error: profileError } = await sb
          .from("profiles")
          .select("id, user_code, full_name")
          .in("id", userIds);
        if (profileError) throw profileError;
        for (const profile of profiles ?? []) profileMap.set(profile.id, profile);
      }

      const seen = new Set<string>();
      return (roleRows ?? [])
        .map((r: any) => ({
          user_id: r.user_id as string,
          user_code: profileMap.get(r.user_id)?.user_code as string | undefined,
          full_name: profileMap.get(r.user_id)?.full_name as string | undefined,
          role: r.role as string,
        }))
        .filter((u: any) => {
          if (!u.user_id || seen.has(u.user_id)) return false;
          seen.add(u.user_id);
          return true;
        });
    },
    staleTime: 5 * 60_000,
  });
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lgCaseId: string;
  caseReference?: string | null;
  priority?: string | null;
  currentOfficerId?: string | null;
}

export function AssignOfficerDialog({ open, onOpenChange, lgCaseId, caseReference, priority, currentOfficerId }: Props) {
  const { userCode } = useUserCode();
  const officers = useLegalOfficers();
  const assign = useAssignLegalOfficer();
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [commRunning, setCommRunning] = useState(false);
  const [commResult, setCommResult] = useState<AssignmentNoticeTriggerResult | null>(null);
  const automationSetting = useAutomationSetting("LEGAL", LEGAL_ASSIGNMENT_AUTOMATION_KEY);
  const automationMode = automationSetting.data?.setting_value ?? "prepare_only";

  useEffect(() => {
    if (open) {
      setUserId(currentOfficerId ?? "");
      setReason("");
      setCommResult(null);
    }
  }, [open, currentOfficerId]);

  const submit = async () => {
    if (!userId) {
      toast.error("Select a legal officer");
      return;
    }
    try {
      await assign.mutateAsync({
        lg_case_id: lgCaseId,
        assigned_to_user_id: userId,
        reason: reason || null,
        assigned_by: userCode ?? null,
      });
      const officer = officers.data?.find((o) => o.user_id === userId);
      await logLgActivity({
        lg_case_id: lgCaseId,
        activity_type: "OFFICER_ASSIGNED",
        description: officer?.full_name || officer?.user_code || userId,
        performed_by: userCode ?? null,
      });
      toast.success("Assignment saved");

      // EPIC L7A — trigger Communication Hub prepare/send.
      setCommRunning(true);
      try {
        const res = await triggerLegalAssignmentNoticeAfterAssign({
          caseId: lgCaseId,
          caseReference: caseReference ?? null,
          assignedUserId: userId,
          actorUserCode: userCode ?? null,
          previousAssignedUserId: currentOfficerId ?? null,
          priority: priority ?? null,
          reason: reason || null,
        });
        setCommResult(res);
        if (res.duplicate) {
          toast.info(`Communication Hub: ${res.note}`);
        } else if (res.sent) {
          toast.success(`Communication Hub: internal notice sent${res.requestNo ? ` (${res.requestNo})` : ""}`);
        } else if (res.prepared) {
          toast.success("Communication Hub: internal notice prepared");
        } else if (res.blocked) {
          const isDup = res.blockers.includes("duplicate_send_blocked");
          const msg = isDup
            ? `Duplicate assignment notice suppressed — this exact assignment event was already prepared/sent.`
            : `Communication Hub: blocked — ${res.blockers.join(", ") || res.note}`;
          toast.warning(msg);
        } else {
          toast.info(res.note || "Communication Hub: no action");
        }
      } catch (e: any) {
        toast.error(`Communication Hub error: ${e?.message ?? "unknown"}`);
      } finally {
        setCommRunning(false);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  const busy = assign.isPending || commRunning;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" /> Assign Legal Officer</DialogTitle>
          <DialogDescription>
            Routing this case to a legal officer. Automation mode: <span className="font-medium">{automationMode}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Legal Officer *</Label>
            <select className="w-full border rounded h-9 px-2 bg-background" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Select…</option>
              {officers.data?.map((o) => (
                <option key={o.user_id} value={o.user_id}>{o.full_name || o.user_code || o.user_id.slice(0, 8)} ({o.role})</option>
              ))}
            </select>
            {officers.data && officers.data.length === 0 && <p className="text-xs text-muted-foreground mt-1">No users with a Legal role found.</p>}
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          {commResult && (
            <div className="text-xs rounded border p-2 bg-muted/40 space-y-0.5">
              <div>Communication Hub: {commResult.sent ? "sent" : commResult.prepared ? "prepared" : commResult.duplicate ? "duplicate suppressed" : "blocked"}</div>
              <div className="text-muted-foreground">To: {commResult.recipientEmail}{commResult.recipientFallbackReason ? " (fallback)" : ""}</div>
              {commResult.blockers.length > 0 && <div className="text-destructive">Blockers: {commResult.blockers.join(", ")}</div>}
              {commResult.requestNo && <div className="font-mono">Req: {commResult.requestNo}</div>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>{commResult ? "Close" : "Cancel"}</Button>
          <Button onClick={submit} disabled={busy || !userId || !!commResult}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
