import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { requestInfoAtomic, type SlaRequestType } from "@/services/legal/legalReferralSlaService";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  legalReferralId: string;
  referralNo: string;
  sourceModule?: "BENEFITS" | "COMPLIANCE";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUGGESTED_ITEMS = [
  "Updated arrears statement",
  "Latest payment ledger",
  "Employer contact log",
  "Notice delivery proof",
  "Inspection / audit findings",
  "Supporting evidence documents",
];

const REQUEST_TYPES: SlaRequestType[] = ["INFO_REQUEST", "DOCUMENT_REQUEST", "CLARIFICATION", "APPROVAL"];

export function RequestInfoDialog({ legalReferralId, referralNo, sourceModule = "BENEFITS", open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userCode = user?.email ?? "LEGAL_USER";

  const [reason, setReason] = useState("");
  const [requestType, setRequestType] = useState<SlaRequestType>("INFO_REQUEST");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [custom, setCustom] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const requested_items = [
        ...items.map((label) => ({ key: label.toLowerCase().replace(/\s+/g, "_"), label })),
        ...(custom.trim() ? custom.split("\n").filter(Boolean).map((label) => ({ key: label.trim().toLowerCase().replace(/\s+/g, "_"), label: label.trim() })) : []),
      ];
      return requestInfoAtomic({
        legal_referral_id: legalReferralId,
        requested_by: userCode,
        requested_to_module: sourceModule,
        request_reason: reason.trim(),
        requested_items,
        request_type: requestType,
        due_date_override: dueDate || null,
      });
    },
    onSuccess: (res) => {
      toast.success(`Info request ${res.request_no} sent (due ${res.due_date})`);
      qc.invalidateQueries({ queryKey: ["legal-referrals-workbench"] });
      qc.invalidateQueries({ queryKey: ["legal-referrals-info-open"] });
      qc.invalidateQueries({ queryKey: ["legal-referral", legalReferralId] });
      qc.invalidateQueries({ queryKey: ["legal-referral-info-requests"] });
      onOpenChange(false);
      setReason(""); setDueDate(""); setItems([]); setCustom("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to send info request"),
  });

  const canSubmit = reason.trim().length >= 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request more information</DialogTitle>
          <DialogDescription>
            Referral <Badge variant="outline">{referralNo}</Badge> — due date is SLA-driven; override only if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Request Type</Label>
              <Select value={requestType} onValueChange={(v) => setRequestType(v as SlaRequestType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REQUEST_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due date override (optional)</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Reason / details *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Explain what is missing or unclear..." />
          </div>

          <div>
            <Label>Items requested</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {SUGGESTED_ITEMS.map((it) => (
                <label key={it} className="flex items-start gap-2 text-sm">
                  <Checkbox checked={items.includes(it)} onCheckedChange={(c) => setItems((prev) => c ? [...prev, it] : prev.filter((x) => x !== it))} />
                  <span>{it}</span>
                </label>
              ))}
            </div>
            <Textarea className="mt-2" value={custom} onChange={(e) => setCustom(e.target.value)} rows={2} placeholder="Additional items, one per line" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!canSubmit || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Sending..." : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
