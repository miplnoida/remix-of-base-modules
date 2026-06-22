import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useUserCode } from "@/hooks/useUserCode";
import { coreDmsService } from "@/services/core/coreDmsService";
import { useDmsDocumentTypes } from "@/hooks/legal/useDmsDocumentTypes";

const CATEGORIES = ["PLEADING", "EVIDENCE", "ORDER", "NOTICE", "CORRESPONDENCE", "INTERNAL", "OTHER"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lgCaseId: string;
  currentStageCode?: string | null;
}

export function UploadCaseDocumentDialog({ open, onOpenChange, lgCaseId, currentStageCode }: Props) {
  const { userCode } = useUserCode();
  const qc = useQueryClient();
  const { data: docTypes = [] } = useDmsDocumentTypes("LEGAL");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    document_type_code: "",
    document_category_code: "EVIDENCE",
    title: "",
    notes: "",
    linked_stage_code: currentStageCode ?? "",
    court_filed: false,
    filed_date: "",
    confidential: false,
  });

  useEffect(() => {
    if (open) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setForm({
        document_type_code: "",
        document_category_code: "EVIDENCE",
        title: "",
        notes: "",
        linked_stage_code: currentStageCode ?? "",
        court_filed: false,
        filed_date: "",
        confidential: false,
      });
    }
  }, [open, currentStageCode]);

  // Auto-fill category when type changes
  useEffect(() => {
    const t = docTypes.find(d => d.type_code === form.document_type_code);
    if (t?.category_code) setForm(p => ({ ...p, document_category_code: t.category_code as string }));
    if (t?.requires_confidential) setForm(p => ({ ...p, confidential: true }));
  }, [form.document_type_code, docTypes]);

  const submit = async () => {
    if (!file) { toast.error("Pick a file to upload"); return; }
    if (!form.document_category_code) { toast.error("Select a category"); return; }
    setBusy(true);
    try {
      const res = await coreDmsService.uploadFile({
        file,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        user_code: userCode ?? "SYSTEM",
        category_id: "LEGAL",
        link: {
          module_code: "LEGAL",
          lg_case_id: lgCaseId,
          document_category_code: form.document_category_code,
          document_type_code: form.document_type_code || null,
          linked_stage_code: form.linked_stage_code || null,
          title: form.title || file.name,
          notes: form.notes || null,
          court_filed: form.court_filed,
          filed_date: form.court_filed ? form.filed_date || new Date().toISOString().slice(0, 10) : null,
          confidential: form.confidential,
        },
      });
      if (!res?.success) throw new Error(res?.message || "Upload failed");
      toast.success("Uploaded to DMS and linked to case");
      qc.invalidateQueries({ queryKey: ["lg_document_link", lgCaseId] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Upload Document to DMS</DialogTitle>
          <DialogDescription>The file is stored in the Central DMS. Only the link is kept on the case.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label>File</Label>
            <Input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && <p className="text-xs text-muted-foreground mt-1">{file.name} · {(file.size / 1024).toFixed(1)} KB</p>}
          </div>
          <div>
            <Label>Document Type</Label>
            <Select value={form.document_type_code} onValueChange={(v) => setForm(p => ({ ...p, document_type_code: v }))}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {docTypes.map(t => <SelectItem key={t.id} value={t.type_code}>{t.type_code} — {t.type_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.document_category_code} onValueChange={(v) => setForm(p => ({ ...p, document_category_code: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder={file?.name || ""} />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div>
            <Label>Linked Stage</Label>
            <Input value={form.linked_stage_code} onChange={(e) => setForm(p => ({ ...p, linked_stage_code: e.target.value }))} placeholder="e.g. COURT_FILING" />
          </div>
          <div className="flex items-center justify-between border rounded p-2">
            <Label className="text-sm">Confidential</Label>
            <Switch checked={form.confidential} onCheckedChange={(c) => setForm(p => ({ ...p, confidential: c }))} />
          </div>
          <div className="flex items-center justify-between border rounded p-2">
            <Label className="text-sm">Court Filed</Label>
            <Switch checked={form.court_filed} onCheckedChange={(c) => setForm(p => ({ ...p, court_filed: c }))} />
          </div>
          <div>
            <Label>Filed Date</Label>
            <Input type="date" disabled={!form.court_filed} value={form.filed_date} onChange={(e) => setForm(p => ({ ...p, filed_date: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
