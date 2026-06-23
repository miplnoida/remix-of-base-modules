import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useUserCode } from "@/hooks/useUserCode";
import { useCreateLgDocumentLink } from "@/hooks/legal/useLgTemplates";
import { useDmsDocumentTypes } from "@/hooks/legal/useDmsDocumentTypes";
import { useLgCaseRelatedEntities } from "@/hooks/legal/useLgCaseRelatedEntities";

const CATEGORIES = ["PLEADING", "EVIDENCE", "ORDER", "NOTICE", "CORRESPONDENCE", "INTERNAL", "OTHER"];

const NONE = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lgCaseId: string;
  currentStageCode?: string | null;
}

export function LinkDocumentDialog({ open, onOpenChange, lgCaseId, currentStageCode }: Props) {
  const { userCode } = useUserCode();
  const create = useCreateLgDocumentLink();
  const { data: docTypes = [] } = useDmsDocumentTypes("LEGAL");
  const { data: related } = useLgCaseRelatedEntities(lgCaseId);

  const [form, setForm] = useState({
    document_category_code: "PLEADING",
    document_type_code: "",
    title: "",
    document_ref_no: "",
    dms_document_id: "",
    dms_url: "",
    file_name: "",
    notes: "",
    linked_stage_code: currentStageCode ?? "",
    hearing_id: NONE,
    order_id: NONE,
    notice_id: NONE,
    settlement_id: NONE,
    fee_charge_id: NONE,
    court_filed: false,
    filed_date: "",
    confidential: false,
  });

  useEffect(() => {
    if (open) {
      setForm({
        document_category_code: "PLEADING",
        document_type_code: "",
        title: "",
        document_ref_no: "",
        dms_document_id: "",
        dms_url: "",
        file_name: "",
        notes: "",
        linked_stage_code: currentStageCode ?? "",
        hearing_id: NONE,
        order_id: NONE,
        notice_id: NONE,
        settlement_id: NONE,
        fee_charge_id: NONE,
        court_filed: false,
        filed_date: "",
        confidential: false,
      });
    }
  }, [open, currentStageCode]);

  const submit = async () => {
    if (!form.document_type_code) {
      toast.error("Select a Legal document type");
      return;
    }
    if (!form.title.trim() && !form.document_ref_no.trim() && !form.dms_document_id.trim()) {
      toast.error("Title, reference number, or DMS document ID is required");
      return;
    }
    try {
      await create.mutateAsync({
        lg_case_id: lgCaseId,
        document_category_code: form.document_category_code,
        document_type_code: form.document_type_code || null,
        document_source: "LINKED_EXISTING",
        document_ref_id: null,
        document_ref_no: form.document_ref_no || null,
        title: form.title || form.file_name || form.document_ref_no || null,
        notes: form.notes || null,
        linked_stage_code: form.linked_stage_code || null,
        hearing_id: form.hearing_id === NONE ? null : form.hearing_id,
        order_id: form.order_id === NONE ? null : form.order_id,
        settlement_id: form.settlement_id === NONE ? null : form.settlement_id,
        notice_id: form.notice_id === NONE ? null : form.notice_id,
        fee_charge_id: form.fee_charge_id === NONE ? null : form.fee_charge_id,
        court_filed: form.court_filed,
        filed_date: form.court_filed ? form.filed_date || new Date().toISOString().slice(0, 10) : null,
        confidential: form.confidential,
        uploaded_by: userCode ?? null,
        linked_by: userCode ?? null,
        // DMS reference fields — link only, no upload
        ...(form.dms_document_id ? { dms_document_id: form.dms_document_id } as any : {}),
        ...(form.dms_url ? { dms_url: form.dms_url } as any : {}),
        ...(form.file_name ? { file_name: form.file_name } as any : {}),
      } as any);
      toast.success("Existing DMS document linked to case");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Link Existing DMS Document</DialogTitle>
          <DialogDescription>
            Reference a document that already lives in the Central DMS. No file is duplicated — only the link, classification,
            and audit metadata are stored on this case.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label>Document Type *</Label>
            <Select value={form.document_type_code} onValueChange={(v) => setForm((p) => ({ ...p, document_type_code: v }))}>
              <SelectTrigger><SelectValue placeholder="— Select a Legal document type —" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {docTypes.map((t) => (
                  <SelectItem key={t.id} value={t.type_code}>{t.type_code} — {t.type_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.document_category_code} onValueChange={(v) => setForm((p) => ({ ...p, document_category_code: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Linked Stage</Label>
            <Input value={form.linked_stage_code} onChange={(e) => setForm((p) => ({ ...p, linked_stage_code: e.target.value }))} placeholder="e.g. COURT_FILING" />
          </div>
          <div className="col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
          <div><Label>Reference Number</Label><Input value={form.document_ref_no} onChange={(e) => setForm((p) => ({ ...p, document_ref_no: e.target.value }))} /></div>
          <div><Label>File Name (optional)</Label><Input value={form.file_name} onChange={(e) => setForm((p) => ({ ...p, file_name: e.target.value }))} /></div>
          <div><Label>DMS Document ID</Label><Input value={form.dms_document_id} onChange={(e) => setForm((p) => ({ ...p, dms_document_id: e.target.value }))} placeholder="DMS UUID / external ref" /></div>
          <div><Label>DMS URL (optional)</Label><Input value={form.dms_url} onChange={(e) => setForm((p) => ({ ...p, dms_url: e.target.value }))} placeholder="https://…" /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>

          {/* Linked entities */}
          <RelatedEntitySelect label="Link to Hearing" value={form.hearing_id} onChange={(v) => setForm((p) => ({ ...p, hearing_id: v }))} options={related?.hearings ?? []} />
          <RelatedEntitySelect label="Link to Order" value={form.order_id} onChange={(v) => setForm((p) => ({ ...p, order_id: v }))} options={related?.orders ?? []} />
          <RelatedEntitySelect label="Link to Notice" value={form.notice_id} onChange={(v) => setForm((p) => ({ ...p, notice_id: v }))} options={related?.notices ?? []} />
          <RelatedEntitySelect label="Link to Settlement" value={form.settlement_id} onChange={(v) => setForm((p) => ({ ...p, settlement_id: v }))} options={related?.settlements ?? []} />
          <RelatedEntitySelect label="Link to Fee Charge" value={form.fee_charge_id} onChange={(v) => setForm((p) => ({ ...p, fee_charge_id: v }))} options={related?.feeCharges ?? []} />

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

function RelatedEntitySelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
        <SelectContent className="max-h-60">
          <SelectItem value={NONE}>— None —</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
