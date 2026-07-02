import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useReferralLifecycle } from "@/hooks/legal/useReferralLifecycle";
import type { ReferralWorkbenchRow } from "@/workbenches/legal-referrals/useLegalReferralsWorkbenchData";

const sb = supabase as any;

interface BaseProps {
  row: ReferralWorkbenchRow | null;
  onOpenChange: (open: boolean) => void;
}

/* -------------------------------------------------------------------------- */
/*                           SIMPLE REASON DIALOGS                            */
/* -------------------------------------------------------------------------- */

function ReasonDialog({
  row,
  onOpenChange,
  title,
  description,
  submitLabel,
  minLen = 5,
  destructive,
  isPending,
  onSubmit,
}: BaseProps & {
  title: string;
  description?: string;
  submitLabel: string;
  minLen?: number;
  destructive?: boolean;
  isPending: boolean;
  onSubmit: (reason: string) => Promise<unknown> | void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (row) setReason(""); }, [row]);
  if (!row) return null;
  const ok = reason.trim().length >= minLen;
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Referral <Badge variant="outline">{row.referral_no}</Badge>
            {description ? ` — ${description}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label>Reason *</Label>
          <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">Minimum {minLen} characters. Written to audit log.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={!ok || isPending}
            onClick={async () => {
              try { await onSubmit(reason.trim()); onOpenChange(false); } catch { /* handled */ }
            }}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AcceptReferralDialog({ row, onOpenChange }: BaseProps) {
  const { accept } = useReferralLifecycle();
  const [finalize, setFinalize] = useState(false);
  useEffect(() => { setFinalize(false); }, [row]);
  if (!row) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept Referral</DialogTitle>
          <DialogDescription>
            Referral <Badge variant="outline">{row.referral_no}</Badge> currently in status{" "}
            <Badge variant="outline">{row.status.replace(/_/g, " ")}</Badge>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={finalize} onChange={(e) => setFinalize(e.target.checked)} />
            <span>Mark as fully <strong>Accepted</strong> (review complete, ready for case creation). Otherwise it moves to <em>Under Legal Review</em>.</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={accept.isPending}>Cancel</Button>
          <Button
            disabled={accept.isPending}
            onClick={async () => {
              try {
                await accept.mutateAsync({ legal_referral_id: row.id, finalizeReview: finalize });
                onOpenChange(false);
              } catch { /* handled */ }
            }}
          >
            {accept.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RejectReferralDialog(props: BaseProps) {
  const { reject } = useReferralLifecycle();
  return (
    <ReasonDialog
      {...props}
      title="Reject Referral"
      description="Sends the matter back to the source department."
      submitLabel="Reject"
      destructive
      minLen={5}
      isPending={reject.isPending}
      onSubmit={(reason) => reject.mutateAsync({ legal_referral_id: props.row!.id, reason })}
    />
  );
}

export function CloseReferralDialog(props: BaseProps) {
  const { close } = useReferralLifecycle();
  return (
    <ReasonDialog
      {...props}
      title="Close Referral"
      description="Terminal state — no further Legal action."
      submitLabel="Close"
      destructive
      minLen={3}
      isPending={close.isPending}
      onSubmit={(reason) => close.mutateAsync({ legal_referral_id: props.row!.id, reason })}
    />
  );
}

export function EscalateReferralDialog({ row, onOpenChange }: BaseProps) {
  const { escalate } = useReferralLifecycle();
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState<"HIGH" | "URGENT">("HIGH");
  useEffect(() => { if (row) { setReason(""); setPriority("HIGH"); } }, [row]);
  if (!row) return null;
  const ok = reason.trim().length >= 3;
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalate Referral</DialogTitle>
          <DialogDescription>
            Referral <Badge variant="outline">{row.referral_no}</Badge> — flags SLA breach and raises priority.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Raise priority to</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as "HIGH" | "URGENT")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reason *</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={escalate.isPending}>Cancel</Button>
          <Button
            disabled={!ok || escalate.isPending}
            onClick={async () => {
              try {
                await escalate.mutateAsync({
                  legal_referral_id: row.id,
                  reason: reason.trim(),
                  raisePriorityTo: priority,
                });
                onOpenChange(false);
              } catch { /* handled */ }
            }}
          >
            {escalate.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Escalate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                              REASSIGN DIALOG                               */
/* -------------------------------------------------------------------------- */

function useLegalTeamsAndBaskets() {
  return useQuery({
    queryKey: ["legal-teams-and-baskets"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [teamsRes, basketsRes] = await Promise.all([
        sb.from("lg_team").select("team_code, team_name").eq("is_active", true).order("team_code"),
        sb.from("core_workbasket").select("basket_code, basket_name").eq("is_active", true).order("basket_code"),
      ]);
      return {
        teams: (teamsRes.data ?? []) as Array<{ team_code: string; team_name: string }>,
        baskets: (basketsRes.data ?? []) as Array<{ basket_code: string; basket_name: string }>,
      };
    },
  });
}

export function ReassignReferralDialog({ row, onOpenChange }: BaseProps) {
  const { reassign } = useReferralLifecycle();
  const { data } = useLegalTeamsAndBaskets();
  const [team, setTeam] = useState<string>("");
  const [basket, setBasket] = useState<string>("");
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (row) {
      setTeam(row.assigned_team_code ?? "");
      setBasket(row.assigned_workbasket_code ?? "");
      setReason("");
    }
  }, [row]);
  if (!row) return null;
  const ok = (team || basket) && (team !== (row.assigned_team_code ?? "") || basket !== (row.assigned_workbasket_code ?? ""));
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign Team / Workbasket</DialogTitle>
          <DialogDescription>
            Referral <Badge variant="outline">{row.referral_no}</Badge>
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Team</Label>
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
              <SelectContent>
                {(data?.teams ?? []).map((t) => (
                  <SelectItem key={t.team_code} value={t.team_code}>{t.team_code} — {t.team_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Workbasket</Label>
            <Select value={basket} onValueChange={setBasket}>
              <SelectTrigger><SelectValue placeholder="Select workbasket" /></SelectTrigger>
              <SelectContent>
                {(data?.baskets ?? []).map((b) => (
                  <SelectItem key={b.basket_code} value={b.basket_code}>{b.basket_code} — {b.basket_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={reassign.isPending}>Cancel</Button>
          <Button
            disabled={!ok || reassign.isPending}
            onClick={async () => {
              try {
                await reassign.mutateAsync({
                  legal_referral_id: row.id,
                  team_code: team || null,
                  workbasket_code: basket || null,
                  reason,
                });
                onOpenChange(false);
              } catch { /* handled */ }
            }}
          >
            {reassign.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                         CREATE INTAKE / CREATE CASE                        */
/* -------------------------------------------------------------------------- */

export function CreateIntakeDialog({ row, onOpenChange }: BaseProps) {
  const { createIntake } = useReferralLifecycle();
  const [matterType, setMatterType] = useState("GENERAL");
  const [priority, setPriority] = useState("MEDIUM");
  useEffect(() => { if (row) { setMatterType("GENERAL"); setPriority(row.priority_code ?? "MEDIUM"); } }, [row]);
  if (!row) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Legal Intake</DialogTitle>
          <DialogDescription>
            From referral <Badge variant="outline">{row.referral_no}</Badge>
            {row.lg_intake_id && (
              <span className="block text-amber-600 mt-1">This referral is already linked to an intake — creating again is a no-op.</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Matter Type</Label>
            <Input value={matterType} onChange={(e) => setMatterType(e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createIntake.isPending}>Cancel</Button>
          <Button
            disabled={createIntake.isPending}
            onClick={async () => {
              try {
                await createIntake.mutateAsync({
                  legal_referral_id: row.id,
                  matter_type_code: matterType,
                  primary_entity_type: row.primary_entity_type ?? "OTHER",
                  priority_code: priority,
                });
                onOpenChange(false);
              } catch { /* handled */ }
            }}
          >
            {createIntake.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create Intake
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateCaseFromReferralDialog({ row, onOpenChange }: BaseProps) {
  const { createCase } = useReferralLifecycle();
  const [caseType, setCaseType] = useState("GENERIC");
  const [priority, setPriority] = useState("MEDIUM");
  useEffect(() => { if (row) { setCaseType("GENERIC"); setPriority(row.priority_code ?? "MEDIUM"); } }, [row]);
  if (!row) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Legal Case</DialogTitle>
          <DialogDescription>
            {row.lg_intake_id
              ? <>Promotes intake linked to <Badge variant="outline">{row.referral_no}</Badge> into a full Legal Case.</>
              : <span className="text-destructive">Create a Legal Intake first — cases can only be created from an intake.</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Case Type</Label>
            <Input value={caseType} onChange={(e) => setCaseType(e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createCase.isPending}>Cancel</Button>
          <Button
            disabled={!row.lg_intake_id || createCase.isPending}
            onClick={async () => {
              try {
                await createCase.mutateAsync({
                  legal_referral_id: row.id,
                  case_type_code: caseType,
                  priority_code: priority,
                });
                onOpenChange(false);
              } catch { /* handled */ }
            }}
          >
            {createCase.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create Case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                            ASSIGN OFFICER DIALOG                           */
/* -------------------------------------------------------------------------- */

const LEGAL_ROLE_NAMES = ["LEGAL_OFFICER", "SENIOR_LEGAL_OFFICER", "LEGAL_MANAGER"];

function useLegalOfficerList() {
  return useQuery({
    queryKey: ["legal_officers_lifecycle"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: roleRows } = await sb.from("user_roles").select("user_id, role").in("role", LEGAL_ROLE_NAMES);
      const ids = Array.from(new Set((roleRows ?? []).map((r: any) => r.user_id).filter(Boolean)));
      if (!ids.length) return [];
      const { data: profiles } = await sb.from("profiles").select("id, user_code, full_name").in("id", ids);
      const map = new Map<string, any>();
      for (const p of profiles ?? []) map.set(p.id, p);
      const seen = new Set<string>();
      return (roleRows ?? [])
        .map((r: any) => ({
          user_id: r.user_id as string,
          user_code: map.get(r.user_id)?.user_code,
          full_name: map.get(r.user_id)?.full_name,
          role: r.role as string,
        }))
        .filter((u: any) => u.user_id && !seen.has(u.user_id) && (seen.add(u.user_id), true));
    },
  });
}

export function AssignOfficerReferralDialog({ row, onOpenChange }: BaseProps) {
  const { assignOfficer } = useReferralLifecycle();
  const { data: officers = [] } = useLegalOfficerList();
  const [userId, setUserId] = useState("");
  useEffect(() => { if (row) setUserId(""); }, [row]);
  if (!row) return null;

  const needsCase = !row.legal_case_id;
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Officer</DialogTitle>
          <DialogDescription>
            Referral <Badge variant="outline">{row.referral_no}</Badge>
            {needsCase && (
              <span className="block text-destructive mt-1">Requires a Legal Case. Create the case first.</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label>Legal Officer *</Label>
          <Select value={userId} onValueChange={setUserId} disabled={needsCase}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {officers.map((o) => (
                <SelectItem key={o.user_id} value={o.user_id}>
                  {o.full_name || o.user_code || o.user_id.slice(0, 8)} ({o.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assignOfficer.isPending}>Cancel</Button>
          <Button
            disabled={needsCase || !userId || assignOfficer.isPending}
            onClick={async () => {
              try {
                await assignOfficer.mutateAsync({
                  legal_referral_id: row.id,
                  override_user_id: userId,
                  reason: "reassign",
                });
                onOpenChange(false);
              } catch { /* handled */ }
            }}
          >
            {assignOfficer.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
