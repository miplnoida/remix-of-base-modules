import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { FileText, Eye, Loader2 } from "lucide-react";
import { useLegalDocumentTypes, useLegalPublishedTemplates } from "@/hooks/legal/useLegalDocumentTypes";
import { LegalDocumentRenderer } from "@/components/legal/LegalDocumentRenderer";
import { coreTemplateDispatcherService } from "@/services/coreTemplateDispatcherService";
import { supabase } from "@/integrations/supabase/client";

interface GenerateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseNumber: string;
  onDocumentGenerated: () => void;
}

/**
 * DB-driven Legal document generator.
 * - Document types load from core_template_category (module_code=LEGAL)
 * - Templates load from core_template (status=ACTIVE/PUBLISHED, module_code=LEGAL)
 * - Preview uses LegalDocumentRenderer with full EnterpriseContext resolution
 * - Save persists via coreTemplateDispatcherService → core_generated_document
 *   and (for Legal) auto-creates a lg_document_link entry.
 */
export function GenerateTemplateDialog({
  open,
  onOpenChange,
  caseId,
  caseNumber,
  onDocumentGenerated,
}: GenerateTemplateDialogProps) {
  const [docTypeCode, setDocTypeCode] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [previewBody, setPreviewBody] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: docTypes = [], isLoading: dtLoading } = useLegalDocumentTypes();
  const { data: templates = [], isLoading: tplLoading } = useLegalPublishedTemplates(docTypeCode || null);

  const selectedTemplate = useMemo(
    () => templates.find((t: any) => t.id === templateId),
    [templates, templateId],
  );

  useEffect(() => { setTemplateId(""); setShowPreview(false); }, [docTypeCode]);

  // Load template active version body when previewing
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

  const handleGenerate = async () => {
    if (!templateId) { toast.error("Please select a template"); return; }
    setIsGenerating(true);
    try {
      const res = await coreTemplateDispatcherService.dispatch({
        template_id: templateId,
        channel_code: "PDF",
        module_code: "LEGAL",
        doc_type_code: docTypeCode || "LEGAL_DOC",
        prefix: "LG",
        entity_type: "LG_CASE",
        entity_id: caseId,
        generated_by: "SYSTEM",
        tokens: {
          "case.caseNo": caseNumber,
          "case.caseId": caseId,
        },
        legal_link: { lg_case_id: caseId } as any,
      });
      toast.success(`Generated ${res.reference_no}`);
      onDocumentGenerated();
      handleClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setDocTypeCode(""); setTemplateId(""); setShowPreview(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Document from Template</DialogTitle>
          <p className="text-sm text-muted-foreground">Case: {caseNumber}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Document Type *</Label>
            <Select value={docTypeCode} onValueChange={setDocTypeCode} disabled={dtLoading}>
              <SelectTrigger>
                <SelectValue placeholder={dtLoading ? "Loading…" : "Choose document type…"} />
              </SelectTrigger>
              <SelectContent>
                {docTypes.map((d) => (
                  <SelectItem key={d.id} value={d.code}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Template *</Label>
            <Select value={templateId} onValueChange={setTemplateId} disabled={!docTypeCode || tplLoading}>
              <SelectTrigger>
                <SelectValue placeholder={
                  !docTypeCode ? "Select document type first" :
                  tplLoading ? "Loading…" :
                  templates.length === 0 ? "No published templates for this type" :
                  "Choose template…"
                } />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} <span className="text-xs text-muted-foreground">({t.code})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate && (
            <Card className="p-3 bg-muted/40 flex items-start gap-2 text-sm">
              <FileText className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <div className="font-medium">{(selectedTemplate as any).name}</div>
                <div className="text-xs text-muted-foreground">
                  {(selectedTemplate as any).template_type} · status {(selectedTemplate as any).status}
                </div>
              </div>
            </Card>
          )}

          {showPreview && templateId && (
            <LegalDocumentRenderer
              documentType={docTypeCode}
              templateId={templateId}
              bodyHtml={previewBody}
              title={selectedTemplate?.name as string}
              tokens={{ case: { caseNo: caseNumber } }}
              draft
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button variant="outline" disabled={!templateId} onClick={() => setShowPreview((v) => !v)}>
            <Eye className="h-4 w-4 mr-2" /> {showPreview ? "Hide" : "Preview"}
          </Button>
          <Button onClick={handleGenerate} disabled={!templateId || isGenerating}>
            {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
