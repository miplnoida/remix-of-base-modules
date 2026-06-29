import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Eye, Loader2 } from "lucide-react";
import { useLegalDocumentTypes, useLegalPublishedTemplates } from "@/hooks/legal/useLegalDocumentTypes";
import { LegalDocumentRenderer } from "@/components/legal/LegalDocumentRenderer";
import { coreTemplateDispatcherService } from "@/services/coreTemplateDispatcherService";
import { supabase } from "@/integrations/supabase/client";

interface IssueNoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onIssueNotice: (caseId: string, correspondence: any) => void;
}

const DELIVERY_CHANNELS = [
  { code: "EMAIL", label: "Email" },
  { code: "PRINT", label: "Print" },
  { code: "POST", label: "Registered Post" },
  { code: "COURIER", label: "Courier" },
  { code: "IN_PERSON", label: "In Person" },
];

export function IssueNoticeDialog({ open, onOpenChange, caseId, onIssueNotice }: IssueNoticeDialogProps) {
  const [docTypeCode, setDocTypeCode] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [recipients, setRecipients] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewBody, setPreviewBody] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: docTypes = [], isLoading: dtLoading } = useLegalDocumentTypes();
  const { data: templates = [], isLoading: tplLoading } = useLegalPublishedTemplates(docTypeCode || null);

  const selectedDocType = useMemo(() => docTypes.find((d) => d.code === docTypeCode), [docTypes, docTypeCode]);

  useEffect(() => { setTemplateId(""); setShowPreview(false); }, [docTypeCode]);

  useEffect(() => {
    if (!showPreview || !templateId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("core_template_version")
        .select("body_html, body_text, subject")
        .eq("template_id", templateId)
        .eq("is_active", true)
        .maybeSingle();
      setPreviewBody(data?.body_html ?? data?.body_text ?? "");
    })();
  }, [showPreview, templateId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!docTypeCode) e.docType = "Notice type is required";
    if (!subject.trim()) e.subject = "Subject is required";
    if (!recipients.trim()) e.recipients = "Recipients are required";
    if (channels.length === 0) e.channels = "At least one delivery method is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toggleChannel = (c: string) =>
    setChannels((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const handleIssue = async () => {
    if (!validate()) return;
    setIssuing(true);
    try {
      const usedChannel = channels[0] === "EMAIL" ? "EMAIL" : "PDF";
      let referenceNo: string | undefined;
      if (templateId) {
        const res = await coreTemplateDispatcherService.dispatch({
          template_id: templateId,
          channel_code: usedChannel,
          module_code: "LEGAL",
          doc_type_code: docTypeCode,
          prefix: "LG",
          entity_type: "LG_CASE",
          entity_id: caseId,
          recipient_address: recipients.split(",")[0]?.trim() || undefined,
          generated_by: "SYSTEM",
          tokens: { "case.caseId": caseId, "document.subject": subject },
          legal_link: { lg_case_id: caseId } as any,
        });
        referenceNo = res.reference_no;
      }
      onIssueNotice(caseId, {
        direction: "Outbound",
        type: selectedDocType?.name ?? docTypeCode,
        docTypeCode,
        templateId: templateId || null,
        referenceNo,
        subject: subject.trim(),
        recipients: recipients.trim(),
        channels,
      });
      toast.success(referenceNo ? `Notice issued (${referenceNo})` : "Notice issued");
      handleClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to issue notice");
    } finally {
      setIssuing(false);
    }
  };

  const handleClose = () => {
    setDocTypeCode(""); setTemplateId(""); setSubject(""); setRecipients("");
    setChannels([]); setErrors({}); setShowPreview(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Issue Notice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Notice / Document Type *</Label>
            <Select value={docTypeCode} onValueChange={setDocTypeCode} disabled={dtLoading}>
              <SelectTrigger className={errors.docType ? "border-destructive" : ""}>
                <SelectValue placeholder={dtLoading ? "Loading…" : "Select notice type"} />
              </SelectTrigger>
              <SelectContent>
                {docTypes.map((d) => (
                  <SelectItem key={d.id} value={d.code}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.docType && <p className="text-xs text-destructive mt-1">{errors.docType}</p>}
          </div>

          <div>
            <Label>Template (optional)</Label>
            <Select value={templateId} onValueChange={setTemplateId} disabled={!docTypeCode || tplLoading}>
              <SelectTrigger>
                <SelectValue placeholder={
                  !docTypeCode ? "Select notice type first"
                  : tplLoading ? "Loading…"
                  : templates.length === 0 ? "No published templates — issue without template"
                  : "Choose template…"
                } />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Templates resolve branding/letterhead/signature via Organization → Department → Module inheritance.
            </p>
          </div>

          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter notice subject"
              className={errors.subject ? "border-destructive" : ""} />
            {errors.subject && <p className="text-xs text-destructive mt-1">{errors.subject}</p>}
          </div>

          <div>
            <Label htmlFor="recipients">Recipients *</Label>
            <Textarea id="recipients" rows={2} value={recipients} onChange={(e) => setRecipients(e.target.value)}
              placeholder="Recipient name(s) or email(s) — comma separated"
              className={errors.recipients ? "border-destructive" : ""} />
            {errors.recipients && <p className="text-xs text-destructive mt-1">{errors.recipients}</p>}
          </div>

          <div>
            <Label className="mb-2 block">Delivery Method *</Label>
            <div className="grid grid-cols-2 gap-2">
              {DELIVERY_CHANNELS.map((c) => (
                <div key={c.code} className="flex items-center space-x-2">
                  <Checkbox id={`ch-${c.code}`} checked={channels.includes(c.code)} onCheckedChange={() => toggleChannel(c.code)} />
                  <label htmlFor={`ch-${c.code}`} className="text-sm cursor-pointer">{c.label}</label>
                </div>
              ))}
            </div>
            {errors.channels && <p className="text-xs text-destructive mt-1">{errors.channels}</p>}
          </div>

          {showPreview && templateId && (
            <LegalDocumentRenderer
              documentType={docTypeCode}
              templateId={templateId}
              bodyHtml={previewBody}
              title={subject || selectedDocType?.name}
              tokens={{ party: { name: recipients.split(",")[0]?.trim() } }}
              draft
            />
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {templateId && (
            <Button variant="outline" onClick={() => setShowPreview((v) => !v)}>
              <Eye className="h-4 w-4 mr-2" /> {showPreview ? "Hide" : "Preview"}
            </Button>
          )}
          <Button onClick={handleIssue} disabled={issuing}>
            {issuing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Issuing…</> : "Issue Notice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
