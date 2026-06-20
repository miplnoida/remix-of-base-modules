import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateLgParty } from "@/hooks/legal/useLgEntities";

const ROLES = ["CLAIMANT", "RESPONDENT", "WITNESS", "REPRESENTATIVE", "OTHER"];
const TYPES = ["EMPLOYER", "PERSON", "ORGANIZATION", "GOVERNMENT", "OTHER"];

interface Props { open: boolean; onOpenChange: (o: boolean) => void; lgCaseId: string; }

export function AddPartyDialog({ open, onOpenChange, lgCaseId }: Props) {
  const create = useCreateLgParty();
  const [form, setForm] = useState({ party_role: "RESPONDENT", party_type: "EMPLOYER", display_name: "", representative_name: "", notes: "" });

  useEffect(() => { if (open) setForm({ party_role: "RESPONDENT", party_type: "EMPLOYER", display_name: "", representative_name: "", notes: "" }); }, [open]);

  const submit = async () => {
    if (!form.display_name.trim()) { toast.error("Display name is required"); return; }
    try {
      await create.mutateAsync({ lg_case_id: lgCaseId, ...form, display_name: form.display_name.trim(), notes: form.notes || null, representative_name: form.representative_name || null });
      toast.success("Party added");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Party</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div><Label>Role</Label>
            <Select value={form.party_role} onValueChange={(v) => setForm((p) => ({ ...p, party_role: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Type</Label>
            <Select value={form.party_type} onValueChange={(v) => setForm((p) => ({ ...p, party_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Display Name *</Label>
            <Input value={form.display_name} onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))} />
          </div>
          <div className="col-span-2"><Label>Representative</Label>
            <Input value={form.representative_name} onChange={(e) => setForm((p) => ({ ...p, representative_name: e.target.value }))} />
          </div>
          <div className="col-span-2"><Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Add Party</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
