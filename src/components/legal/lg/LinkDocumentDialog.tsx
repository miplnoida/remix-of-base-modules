import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useUserCode } from "@/hooks/useUserCode";
import { useCreateLgDocumentLink } from "@/hooks/legal/useLgTemplates";
import { useDmsDocumentTypes } from "@/hooks/legal/useDmsDocumentTypes";

const CATEGORIES = ["PLEADING", "EVIDENCE", "ORDER", "NOTICE", "CORRESPONDENCE", "INTERNAL", "OTHER"];
const SOURCES = ["DMS", "UPLOAD", "EXTERNAL"];

interface Props { open: boolean; onOpenChange: (o: boolean) => void; lgCaseId: string; }

export function LinkDocumentDialog({ open, onOpenChange, lgCaseId }: Props) {
  const { userCode } = useUserCode();
  const create = useCreateLgDocumentLink();
  const { data: docTypes = [] } = useDmsDocumentTypes("LEGAL");
  const [form, setForm] = useState({
    document_category_code: "PLEADING",
    document_type_code: "",
    document_source: "DMS",
    title: "",
    document_ref_no: "",
    notes: "",
    court_filed: false,
    filed_date: "",
    confidential: false,
  });

  useEffect(() => {
    if (open) setForm({ document_category_code: "PLEADING", document_type_code: "", document_source: "DMS", title: "", document_ref_no: "", notes: "", court_filed: false, filed_date: "", confidential: false });
  }, [open]);

  const submit = async () => {
    if (!form.title.trim() && !form.document_ref_no.trim()) {
      toast.error("Title or reference number is required");
      return;
    }
    try {
      await create.mutateAsync({
        lg_case_id: lgCaseId,
        document_category_code: form.document_category_code,
        document_type_code: form.document_type_code || null,
        document_source: form.document_source,
        document_ref_id: null,
        document_ref_no: form.document_ref_no || null,
        title: form.title || null,
        notes: form.notes || null,
        linked_stage_code: null,
        hearing_id: null,
        order_id: null,
        settlement_id: null,
        notice_id: null,
        court_filed: form.court_filed,
        filed_date: form.court_filed ? form.filed_date || new Date().toISOString().slice(0, 10) : null,
        confidential: form.confidential,
        uploaded_by: userCode ?? null,
        linked_by: userCode ?? null,
      });
      toast.success("Document linked");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Link Document</DialogTitle>
          <DialogDescription>References the central Document module — no file upload here.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label>Category</Label>
            <Select value={form.document_category_code} onValueChange={(v) => setForm((p) => ({ ...p, document_category_code: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Source</Label>
            <Select value={form.document_source} onValueChange={(v) => setForm((p) => ({ ...p, document_source: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SOURCES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Document Type (optional)</Label>
            <Select value={form.document_type_code} onValueChange={(v) => setForm((p) => ({ ...p, document_type_code: v }))}>
              <SelectTrigger><SelectValue placeholder="— Select a Legal document type —" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {docTypes.map((t) => (
                  <SelectItem key={t.id} value={t.type_code}>{t.type_code} — {t.type_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
          <div className="col-span-2"><Label>Reference Number</Label><Input value={form.document_ref_no} onChange={(e) => setForm((p) => ({ ...p, document_ref_no: e.target.value }))} /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>
          <div className="flex items-center justify-between border rounded p-2">
            <Label className="text-sm">Court Filed</Label>
            <Switch checked={form.court_filed} onCheckedChange={(c) => setForm((p) => ({ ...p, court_filed: c }))} />
          </div>
          <div>
            <Label>Filed Date</Label>
            <Input type="date" disabled={!form.court_filed} value={form.filed_date} onChange={(e) => setForm((p) => ({ ...p, filed_date: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between border rounded p-2 col-span-2">
            <Label className="text-sm">Confidential</Label>
            <Switch checked={form.confidential} onCheckedChange={(c) => setForm((p) => ({ ...p, confidential: c }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Link Document</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
