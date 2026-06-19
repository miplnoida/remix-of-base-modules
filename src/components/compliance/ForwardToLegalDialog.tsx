import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Scale } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { forwardComplianceCaseToLegal } from "@/services/legal/complianceForwardingService";
import { useUserCode } from "@/hooks/useUserCode";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ceCaseId: string;
  ceCaseNumber: string;
  outstandingAmount?: number | null;
  paymentArrangementId?: string | null;
}

export function ForwardToLegalDialog({
  open,
  onOpenChange,
  ceCaseId,
  ceCaseNumber,
  outstandingAmount,
  paymentArrangementId,
}: Props) {
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const { userCode } = useUserCode();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const submit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a referral reason");
      return;
    }
    setSubmitting(true);
    try {
      const result = await forwardComplianceCaseToLegal({
        ce_case_id: ceCaseId,
        referral_reason: reason.trim(),
        priority_code: priority,
        payment_arrangement_id: paymentArrangementId ?? null,
        user_code: userCode ?? null,
      });
      toast.success(`Forwarded to Legal — ${result.lg_case_no}`, {
        description: `${result.documents_linked} document(s) linked`,
        action: {
          label: "Open",
          onClick: () => navigate(`/legal/cases/${result.lg_case_id}`),
        },
      });
      qc.invalidateQueries({ queryKey: ["ce_case_detail", ceCaseId] });
      qc.invalidateQueries({ queryKey: ["lg_case"] });
      onOpenChange(false);
      setReason("");
    } catch (e: any) {
      toast.error("Failed to forward to Legal", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" /> Forward to Legal
          </DialogTitle>
          <DialogDescription>
            Create a Legal case linked to compliance case <strong>{ceCaseNumber}</strong>. No
            compliance data is duplicated — Legal references the source records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {outstandingAmount != null && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              Debt snapshot at referral:{" "}
              <strong>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "XCD",
                }).format(outstandingAmount)}
              </strong>
            </div>
          )}

          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Referral Reason *</Label>
            <Textarea
              rows={5}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this case is being referred to Legal (non-payment, refusal to engage, fraud indicators, etc.)"
              maxLength={2000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Scale className="h-4 w-4 mr-1" />
            )}
            Forward to Legal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
