import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { legalReferralCollaborationService } from "@/services/legal/legalReferralCollaborationService";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  legalReferralId: string;
  referralNo: string;
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

export function RequestInfoDialog({ legalReferralId, referralNo, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userCode = user?.email ?? user?.name ?? "LEGAL_USER";

  const [reason, setReason] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [custom, setCustom] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const requestedItems = [
        ...items.map((label) => ({ key: label.toLowerCase().replace(/\s+/g, "_"), label })),
        ...(custom.trim() ? custom.split("\n").filter(Boolean).map((label) => ({ key: label.trim().toLowerCase().replace(/\s+/g, "_"), label: label.trim() })) : []),
      ];
      return createInfoRequest({
        legal_referral_id: legalReferralId,
        requested_by: userCode,
        request_reason: reason.trim(),
        requested_items: requestedItems,
        due_date: dueDate || null,
      });
    },
    onSuccess: () => {
      toast.success(`Information request sent to source module for ${referralNo}`);
      qc.invalidateQueries({ queryKey: ["legal-referral", legalReferralId] });
      qc.invalidateQueries({ queryKey: ["legal-referral-info-requests"] });
      qc.invalidateQueries({ queryKey: ["legal-referrals"] });
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
            Referral <Badge variant="outline">{referralNo}</Badge> — the source module will receive a task, in-app notification and email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Reason / details *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Explain what is missing or unclear..." />
          </div>

          <div>
            <Label>Items requested</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {SUGGESTED_ITEMS.map((it) => (
                <label key={it} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={items.includes(it)}
                    onCheckedChange={(c) => setItems((prev) => c ? [...prev, it] : prev.filter((x) => x !== it))}
                  />
                  <span>{it}</span>
                </label>
              ))}
            </div>
            <Textarea className="mt-2" value={custom} onChange={(e) => setCustom(e.target.value)} rows={2} placeholder="Additional items, one per line" />
          </div>

          <div>
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
