import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserCode } from "@/hooks/useUserCode";
import { useLinkArrangement } from "@/hooks/legal/useLgFinancials";
import { logLgActivity } from "@/services/legal/lgAuditService";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; lgCaseId: string; employerId?: string | null; }

function useEmployerArrangements(employerId?: string | null) {
  return useQuery({
    queryKey: ["employer_arrangements", employerId],
    enabled: !!employerId,
    queryFn: async () => {
      const sb = supabase as any;
      const { data } = await sb
        .from("ce_payment_arrangements")
        .select("id, arrangement_number, status, total_debt, total_paid, start_date")
        .eq("employer_id", employerId)
        .order("start_date", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });
}

export function LinkArrangementDialog({ open, onOpenChange, lgCaseId, employerId }: Props) {
  const { userCode } = useUserCode();
  const link = useLinkArrangement();
  const employerArr = useEmployerArrangements(employerId);
  const [arrangementId, setArrangementId] = useState("");
  const [linkType, setLinkType] = useState("PRIMARY");
  const [reason, setReason] = useState("");
  const [monitor, setMonitor] = useState(true);

  useEffect(() => { if (open) { setArrangementId(""); setLinkType("PRIMARY"); setReason(""); setMonitor(true); } }, [open]);

  const submit = async () => {
    if (!arrangementId) { toast.error("Select an arrangement or paste its ID"); return; }
    try {
      const l = await link.mutateAsync({
        lg_case_id: lgCaseId,
        payment_arrangement_id: arrangementId,
        link_type: linkType,
        link_reason: reason || null,
        default_monitoring_required: monitor,
        linked_by: userCode ?? null,
      });
      await logLgActivity({ lg_case_id: lgCaseId, activity_type: "PAYMENT_ARRANGEMENT_LINKED", description: `${linkType} · ${arrangementId.slice(0, 8)}`, performed_by: userCode ?? null, payload: { link_id: l.id } });
      toast.success("Payment arrangement linked");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Link Payment Arrangement</DialogTitle>
          <DialogDescription>References a Compliance payment arrangement; the financial source of truth remains in Compliance.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {employerId && employerArr.data && employerArr.data.length > 0 && (
            <div>
              <Label>Employer Arrangements</Label>
              <select className="w-full border rounded h-9 px-2 bg-background" value={arrangementId} onChange={(e) => setArrangementId(e.target.value)}>
                <option value="">Select…</option>
                {employerArr.data.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.arrangement_number} · {a.status} · debt {Number(a.total_debt ?? 0).toFixed(2)}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <Label>Arrangement ID (or paste)</Label>
            <Input value={arrangementId} onChange={(e) => setArrangementId(e.target.value)} placeholder="UUID" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1"><Label>Link Type</Label>
              <select className="w-full border rounded h-9 px-2 bg-background" value={linkType} onChange={(e) => setLinkType(e.target.value)}>
                <option value="PRIMARY">PRIMARY</option>
                <option value="SECONDARY">SECONDARY</option>
                <option value="REFERENCE">REFERENCE</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6"><Label className="text-sm">Monitor default</Label><Switch checked={monitor} onCheckedChange={setMonitor} /></div>
          </div>
          <div><Label>Reason</Label><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={link.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={link.isPending}>{link.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
