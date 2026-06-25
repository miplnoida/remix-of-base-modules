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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { respondInfoRequest, type InfoRequestRow } from "@/services/legal/legalReferralUnifiedService";

interface Props {
  infoRequest: InfoRequestRow & { referral?: { referral_no: string; source_module: string } };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RespondInfoRequestDialog({ infoRequest, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userCode = user?.email ?? user?.name ?? "SOURCE_USER";

  const [notes, setNotes] = useState("");
  const [completion, setCompletion] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((infoRequest.requested_items ?? []).map((i) => [i.key, false]))
  );
  const [files, setFiles] = useState<File[]>([]);

  const mut = useMutation({
    mutationFn: async () => {
      const document_links: any[] = [];
      for (const f of files) {
        const path = `legal-referrals/${infoRequest.legal_referral_id}/${infoRequest.id}/${Date.now()}-${f.name}`;
        const { error: upErr } = await supabase.storage.from("legal-referrals").upload(path, f, { upsert: false });
        if (upErr) throw upErr;
        document_links.push({
          storage_bucket: "legal-referrals",
          storage_path: path,
          file_name: f.name,
          mime_type: f.type,
          document_source: "NEW_UPLOAD",
        });
      }
      return respondInfoRequest({
        info_request_id: infoRequest.id,
        responded_by: userCode,
        response_notes: notes.trim(),
        completion_items: (infoRequest.requested_items ?? []).map((i) => ({ key: i.key, completed: !!completion[i.key] })),
        document_links,
      });
    },
    onSuccess: () => {
      toast.success("Response submitted to Legal");
      qc.invalidateQueries({ queryKey: ["source-tasks"] });
      qc.invalidateQueries({ queryKey: ["legal-referrals"] });
      onOpenChange(false);
      setNotes(""); setFiles([]);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to submit response"),
  });

  const canSubmit = notes.trim().length >= 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Respond to Legal info request</DialogTitle>
          <DialogDescription>
            Request <Badge variant="outline">{infoRequest.request_no}</Badge> — on referral{" "}
            <Badge variant="outline">{infoRequest.referral?.referral_no}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/40 rounded p-3 text-sm">
            <div className="font-medium">Reason from Legal:</div>
            <div className="whitespace-pre-wrap">{infoRequest.request_reason}</div>
            {infoRequest.due_date && (
              <div className="mt-2 text-xs text-muted-foreground">Due: {infoRequest.due_date}</div>
            )}
          </div>

          {(infoRequest.requested_items ?? []).length > 0 && (
            <div>
              <Label>Mark items completed</Label>
              <div className="space-y-1 mt-2">
                {infoRequest.requested_items.map((i) => (
                  <label key={i.key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!completion[i.key]}
                      onCheckedChange={(c) => setCompletion((p) => ({ ...p, [i.key]: !!c }))}
                    />
                    <span>{i.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Response notes *</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Describe what you are providing..." />
          </div>

          <div>
            <Label>Attach documents</Label>
            <Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            {files.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">{files.length} file(s) selected</div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!canSubmit || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Submitting..." : "Submit Response"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
