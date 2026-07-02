import { useMemo, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Upload, Eye, Gavel, Lock, AlertTriangle, CheckCircle2, Trash2, History, ShieldAlert, FileText, Wand2, Star } from "lucide-react";
import { setLgDocumentEvidence } from "@/services/legal/lgDocumentLinkService";
import { toast } from "sonner";
import { LgDataGrid, LgStatusBadge, type LgColumnDef, type LgRowAction, type LgToolbarFilter } from "@/components/legal/grid";
import { useLgDocumentLinks, useDeleteLgDocumentLink } from "@/hooks/legal/useLgTemplates";
import { useLgStageDocumentRules, summariseCompleteness } from "@/hooks/legal/useLgStageDocumentRules";
import { useDmsDocumentTypes } from "@/hooks/legal/useDmsDocumentTypes";
import { useLegalDocPermissions } from "@/hooks/legal/useLegalDocPermissions";
import { useUserCode } from "@/hooks/useUserCode";
import { LinkDocumentDialog } from "./LinkDocumentDialog";
import { UploadCaseDocumentDialog } from "./UploadCaseDocumentDialog";
import { DocumentVersionHistoryDialog } from "./DocumentVersionHistoryDialog";
import { AvailableLettersPanel } from "./AvailableLettersPanel";
import { coreDmsService } from "@/services/core/coreDmsService";
import SourceDocumentsPanel from "./SourceDocumentsPanel";
import { contextFromLgCase } from "@/services/legal/lgSourceDocumentService";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  lgCaseId: string;
  currentStageCode: string | null;
  caseTypeCode: string | null;
  canEdit: boolean;
}

const ALL = "__all__";

export default function LegalCaseDocumentsTab({ lgCaseId, currentStageCode, caseTypeCode, canEdit }: Props) {
  const qc = useQueryClient();
  const { userId, userCode } = useUserCode();
  const docs = useLgDocumentLinks(lgCaseId);
  const rules = useLgStageDocumentRules(currentStageCode, caseTypeCode);
  const { data: docTypes = [] } = useDmsDocumentTypes("LEGAL");
  const del = useDeleteLgDocumentLink(lgCaseId);
  const { perms } = useLegalDocPermissions();

  const canUpload = canEdit && perms.LEGAL_DOCUMENT_UPLOAD;
  const canLink = canEdit && perms.LEGAL_DOCUMENT_LINK;
  const canUnlink = canEdit && perms.LEGAL_DOCUMENT_UNLINK;
  const canMarkCourt = canEdit && perms.LEGAL_DOCUMENT_MARK_COURT_FILED;
  const canViewConfidential = perms.LEGAL_DOCUMENT_CONFIDENTIAL_VIEW;

  const [linkOpen, setLinkOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [sourceDocsOpen, setSourceDocsOpen] = useState(false);
  const [versionsFor, setVersionsFor] = useState<{ dmsId: string; title: string | null } | null>(null);

  // Load lg_case row for source-context lookups (employer/claim/compliance refs).
  const caseRow = useQuery({
    queryKey: ["lg_case_source_ctx", lgCaseId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("lg_case")
        .select("compliance_case_id, compliance_referral_id, payment_arrangement_id, employer_id, person_id, claim_id, source_module, source_record_id")
        .eq("id", lgCaseId)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  const alreadyLinkedSourceKeys = useMemo(() => {
    const set = new Set<string>();
    for (const d of (docs.data ?? []) as any[]) {
      if (d.document_source === "SOURCE_MODULE" && d.source_entity_type && d.source_entity_id) {
        // Best-effort match against SourceDocument.key shape (`<table>:<id>` unknown here,
        // so we also key by entity composite for partial dedup).
        set.add(`${d.source_entity_type}:${d.source_entity_id}:${d.document_ref_no ?? ""}`);
      }
    }
    return set;
  }, [docs.data]);
  void alreadyLinkedSourceKeys;

  const [fCategory, setFCategory] = useState(ALL);
  const [fType, setFType] = useState(ALL);
  const [fStage, setFStage] = useState(ALL);
  const [fCourt, setFCourt] = useState(ALL);
  const [fConf, setFConf] = useState(ALL);
  const [fSource, setFSource] = useState(ALL);

  const filtered = useMemo(() => {
    const list = docs.data ?? [];
    return list.filter((d: any) => {
      // Hide confidential rows from users without the permission.
      if (d.confidential && !canViewConfidential) return false;
      if (fCategory !== ALL && d.document_category_code !== fCategory) return false;
      if (fType !== ALL && d.document_type_code !== fType) return false;
      if (fStage !== ALL && d.linked_stage_code !== fStage) return false;
      if (fCourt !== ALL && Boolean(d.court_filed) !== (fCourt === "true")) return false;
      if (fConf !== ALL && Boolean(d.confidential) !== (fConf === "true")) return false;
      if (fSource !== ALL && d.document_source !== fSource) return false;
      return true;
    });
  }, [docs.data, fCategory, fType, fStage, fCourt, fConf, fSource, canViewConfidential]);

  const hiddenConfidentialCount = useMemo(
    () => (docs.data ?? []).filter((d: any) => d.confidential && !canViewConfidential).length,
    [docs.data, canViewConfidential],
  );

  const completeness = useMemo(
    () => summariseCompleteness(rules.data, docs.data),
    [rules.data, docs.data],
  );
  const missing = completeness.filter(c => !c.satisfied);

  const linkedEntityLabel = (row: any): string => {
    if (row.hearing_id) return "Hearing";
    if (row.order_id) return "Order";
    if (row.notice_id) return "Notice";
    if (row.settlement_id) return "Settlement";
    if (row.fee_charge_id) return "Fee Charge";
    return "—";
  };

  const openDoc = async (row: any) => {
    try {
      if (row.confidential && !canViewConfidential) {
        toast.error("Confidential document — you don't have permission to view this.");
        return;
      }
      if (!row.dms_document_id && !row.dms_url) {
        toast.message("No DMS link on this row (reference-only).");
        return;
      }
      // Always route through document-proxy so the raw DMS URL never
      // reaches the browser and confidentiality is enforced server-side.
      const blobUrl = await coreDmsService.streamByLink(row.id, "stream", row.file_name);
      window.open(blobUrl, "_blank");
    } catch (e: any) { toast.error(e?.message || "Could not open"); }
  };

  const downloadDoc = async (row: any) => {
    try {
      if (row.confidential && !canViewConfidential) {
        toast.error("Confidential — view permission required.");
        return;
      }
      if (!row.dms_document_id && !row.dms_url) {
        toast.message("No DMS link on this row.");
        return;
      }
      const blobUrl = await coreDmsService.streamByLink(row.id, "download", row.file_name);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = row.file_name || row.title || "document";
      a.click();
    } catch (e: any) { toast.error(e?.message || "Could not download"); }
  };

  const toggleCourtFiled = async (row: any) => {
    if (!canMarkCourt) { toast.error("You don't have permission to mark documents as court-filed."); return; }
    try {
      await coreDmsService.markCourtFiled(row.id, !row.court_filed);
      toast.success(row.court_filed ? "Unmarked as court-filed" : "Marked as court-filed");
      qc.invalidateQueries({ queryKey: ["lg_document_link", lgCaseId] });
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  };

  const toggleConfidential = async (row: any) => {
    try {
      await coreDmsService.setConfidential(row.id, !row.confidential);
      toast.success("Confidentiality updated");
      qc.invalidateQueries({ queryKey: ["lg_document_link", lgCaseId] });
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  };

  const toggleEvidence = async (row: any) => {
    if (!canEdit) { toast.error("Case is not editable in its current state."); return; }
    try {
      await setLgDocumentEvidence(row.id, !row.marked_as_evidence, userCode ?? null);
      toast.success(row.marked_as_evidence ? "Unmarked as evidence" : "Marked as evidence");
      qc.invalidateQueries({ queryKey: ["lg_document_link", lgCaseId] });
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  };

  const unlinkDoc = async (row: any) => {
    if (!canUnlink) { toast.error("You don't have permission to unlink documents."); return; }
    if (!confirm("Unlink this document from the case? The file stays in the Central DMS.")) return;
    try {
      await coreDmsService.unlink(row.id, userCode ?? "SYSTEM");
      toast.success("Document unlinked");
      qc.invalidateQueries({ queryKey: ["lg_document_link", lgCaseId] });
    } catch (e: any) {
      // Fallback to plain delete if unlink RPC fails
      try {
        await del.mutateAsync(row.id);
        toast.success("Document unlinked");
      } catch (err: any) { toast.error(err?.message || "Failed"); }
    }
  };

  const columns: LgColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: "title", header: "Title", meta: { label: "Title", pinLeft: true },
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.title || row.original.document_ref_no || row.original.file_name || "—"}</div>
          <div className="text-xs text-muted-foreground">{row.original.document_ref_no || row.original.file_name || ""}</div>
        </div>
      ),
    },
    { accessorKey: "document_type_code", header: "Type", meta: { label: "Type" }, cell: ({ getValue }) => (getValue() as string) || "—" },
    { accessorKey: "document_source", header: "Source", meta: { label: "Source" },
      cell: ({ getValue }) => <Badge variant="outline">{String(getValue() || "—")}</Badge>,
    },
    { accessorKey: "linked_stage_code", header: "Stage", meta: { label: "Stage" }, cell: ({ getValue }) => (getValue() as string) || "—" },
    {
      id: "linked_entity", header: "Linked Entity", meta: { label: "Linked Entity" },
      cell: ({ row }) => {
        const label = linkedEntityLabel(row.original);
        return label === "—" ? "—" : <Badge variant="secondary">{label}</Badge>;
      },
    },
    { accessorKey: "confidential", header: "Confidential", meta: { label: "Confidential" },
      cell: ({ row }) => row.original.confidential ? <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> Yes</Badge> : <span className="text-muted-foreground text-xs">No</span>,
    },
    { accessorKey: "court_filed", header: "Court Filed", meta: { label: "Court Filed" },
      cell: ({ row }) => row.original.court_filed ? <Badge variant="outline" className="gap-1"><Gavel className="h-3 w-3" /> Yes</Badge> : <span className="text-muted-foreground text-xs">No</span>,
    },
    { accessorKey: "version_no", header: "v", meta: { label: "Version", align: "right" } },
    { accessorKey: "upload_status", header: "DMS",
      cell: ({ row }) => {
        const r = row.original;
        if (r.dms_document_id) return <LgStatusBadge status="ACTIVE" />;
        if (r.upload_status === "FAILED") return <Badge variant="destructive">Failed</Badge>;
        if (r.upload_status === "IN_PROGRESS") return <Badge variant="secondary">Uploading</Badge>;
        return <Badge variant="outline">Ref-only</Badge>;
      },
      meta: { label: "DMS" },
    },
    { id: "actor", header: "By", meta: { label: "Uploaded/Linked By" },
      cell: ({ row }) => row.original.uploaded_by || row.original.linked_by || "—" },
    { accessorKey: "uploaded_at", header: "Date", meta: { label: "Date" },
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return v ? new Date(v).toLocaleDateString() : "—";
      },
    },
  ], [canViewConfidential]);

  const rowActions: LgRowAction<any>[] = useMemo(() => [
    { key: "view", label: "View", icon: <Eye className="h-3.5 w-3.5" />, onClick: openDoc },
    { key: "download", label: "Download", icon: <FileText className="h-3.5 w-3.5" />, onClick: downloadDoc },
    { key: "versions", label: "Version History", icon: <History className="h-3.5 w-3.5" />,
      onClick: (r: any) => r.dms_document_id
        ? setVersionsFor({ dmsId: r.dms_document_id, title: r.title })
        : toast.message("No DMS document — no versions to show."),
    },
    { key: "evidence", label: "Toggle evidence", icon: <Star className="h-3.5 w-3.5" />,
      onClick: toggleEvidence, disabled: () => !canEdit },
    { key: "court", label: "Toggle court-filed",
      icon: <Gavel className="h-3.5 w-3.5" />, onClick: toggleCourtFiled, disabled: () => !canMarkCourt },
    { key: "conf", label: "Toggle confidential",
      icon: <Lock className="h-3.5 w-3.5" />, onClick: toggleConfidential, disabled: () => !canEdit },
    { key: "unlink", label: "Unlink", icon: <Trash2 className="h-3.5 w-3.5" />, variant: "destructive",
      onClick: unlinkDoc, disabled: () => !canUnlink },
  ], [canEdit, canViewConfidential, canMarkCourt, canUnlink]);

  const toolbarFilters: LgToolbarFilter[] = useMemo(() => {
    const optAll = (label: string) => ({ value: ALL, label: `All ${label}` });
    return [
      { key: "category", label: "Category", value: fCategory, onChange: setFCategory,
        options: [optAll("Categories"), ...["PLEADING","EVIDENCE","ORDER","NOTICE","CORRESPONDENCE","INTERNAL","OTHER"].map(v => ({ value: v, label: v }))] },
      { key: "type", label: "Type", value: fType, onChange: setFType,
        options: [optAll("Types"), ...docTypes.map(t => ({ value: t.type_code, label: t.type_code }))] },
      { key: "source", label: "Source", value: fSource, onChange: setFSource,
        options: [optAll("Sources"), ...["UPLOADED","LINKED_EXISTING","GENERATED","SOURCE_MODULE","COMPLIANCE","BENEFITS","CLAIMS","EMPLOYER_SERVICES","COURT","EMAIL","DMS","DMS_EXISTING","EXTERNAL"].map(v => ({ value: v, label: v }))] },
      { key: "stage", label: "Stage", value: fStage, onChange: setFStage,
        options: [optAll("Stages"), ...Array.from(new Set((docs.data ?? []).map((d: any) => d.linked_stage_code).filter(Boolean)))
          .map((v: any) => ({ value: v as string, label: v as string }))] },
      { key: "court", label: "Court", value: fCourt, onChange: setFCourt,
        options: [optAll("Court status"), { value: "true", label: "Court-filed" }, { value: "false", label: "Not filed" }] },
      { key: "conf", label: "Confidentiality", value: fConf, onChange: setFConf,
        options: [optAll("Confidentiality"), { value: "true", label: "Confidential" }, { value: "false", label: "Open" }] },
    ];
  }, [docTypes, docs.data, fCategory, fType, fStage, fCourt, fConf, fSource]);

  const requestUpload = () => {
    if (!canEdit) { toast.error("Case is not editable in its current state."); return; }
    if (!canUpload) { toast.error("You don't have permission to upload documents."); return; }
    setUploadOpen(true);
  };
  const requestLink = () => {
    if (!canEdit) { toast.error("Case is not editable in its current state."); return; }
    if (!canLink) { toast.error("You don't have permission to link documents."); return; }
    setLinkOpen(true);
  };
  const requestGenerate = () => {
    if (!canEdit) { toast.error("Case is not editable in its current state."); return; }
    setGenerateOpen(true);
  };

  return (
    <div className="space-y-4">
      {completeness.length > 0 && (
        <Alert variant={missing.length ? "destructive" : "default"}>
          {missing.length ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <AlertTitle>
            {missing.length
              ? `Stage ${currentStageCode}: ${missing.length} required document(s) missing`
              : `Stage ${currentStageCode}: all required documents present`}
          </AlertTitle>
          <AlertDescription>
            <ul className="text-xs mt-1 space-y-0.5">
              {completeness.map((c, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  {c.satisfied
                    ? <CheckCircle2 className="h-3 w-3 text-green-600" />
                    : <AlertTriangle className="h-3 w-3 text-destructive" />}
                  <span className="font-mono">{c.rule.document_type_code || c.rule.document_category_code}</span>
                  <span className="text-muted-foreground">
                    · {c.matched}/{Math.max(1, c.rule.min_count)} {c.rule.is_required ? "(required)" : "(optional)"}
                  </span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {hiddenConfidentialCount > 0 && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Confidential documents hidden</AlertTitle>
          <AlertDescription>
            {hiddenConfidentialCount} document{hiddenConfidentialCount === 1 ? " is" : "s are"} marked confidential
            and require the <span className="font-mono">LEGAL_DOCUMENT_CONFIDENTIAL_VIEW</span> permission to view.
          </AlertDescription>
        </Alert>
      )}

      {(() => {
        const list = (docs.data ?? []) as any[];
        const visible = list.filter(d => !(d.confidential && !canViewConfidential));
        const counts = {
          uploaded: visible.filter(d => d.document_source === "UPLOADED").length,
          generated: visible.filter(d => d.document_source === "GENERATED").length,
          source: visible.filter(d => d.document_source === "SOURCE_MODULE" || ["COMPLIANCE","BENEFITS","CLAIMS","EMPLOYER_SERVICES","INSURED_PERSON_SERVICES","MEETINGS"].includes(d.document_source)).length,
          court: visible.filter(d => d.court_filed).length,
        };
        const Pill = ({ label, value, filterValue }: { label: string; value: number; filterValue?: string }) => (
          <button
            type="button"
            onClick={() => filterValue && setFSource(filterValue)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-muted/30 hover:bg-muted text-xs"
          >
            <span className="font-medium">{label}</span>
            <Badge variant="secondary">{value}</Badge>
          </button>
        );
        return (
          <div className="flex flex-wrap gap-2">
            <Pill label="Legal Uploaded" value={counts.uploaded} filterValue="UPLOADED" />
            <Pill label="Generated Legal" value={counts.generated} filterValue="GENERATED" />
            <Pill label="Source Department" value={counts.source} filterValue="SOURCE_MODULE" />
            <Pill label="Court Filed" value={counts.court} />
            <button
              type="button"
              onClick={() => setFSource(ALL)}
              className="px-3 py-1.5 rounded-md border text-xs hover:bg-muted"
            >
              Clear source filter
            </button>
          </div>
        );
      })()}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-3 flex-wrap">
            <div>
              <CardTitle>Case Documents</CardTitle>
              <CardDescription>
                Files live in the <strong>Central DMS</strong>. This case stores the link, classification, and audit context —
                no Legal-only file storage is used.
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={requestUpload} disabled={!canUpload}
                title={!canUpload ? "Requires LEGAL_DOCUMENT_UPLOAD" : undefined}>
                <Upload className="h-4 w-4 mr-1" /> Upload New Document
              </Button>
              <Button size="sm" variant="outline" onClick={requestLink} disabled={!canLink}
                title={!canLink ? "Requires LEGAL_DOCUMENT_LINK" : undefined}>
                <Plus className="h-4 w-4 mr-1" /> Link Existing DMS Document
              </Button>
              <Button size="sm" variant="secondary" onClick={requestGenerate} disabled={!canEdit}>
                <Wand2 className="h-4 w-4 mr-1" /> Generate From Template
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSourceDocsOpen(true)}>
                <FileText className="h-4 w-4 mr-1" /> View Source Documents
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LgDataGrid
            id="lg-case-documents"
            columns={columns}
            data={filtered}
            isLoading={docs.isLoading}
            rowActions={rowActions}
            toolbarFilters={toolbarFilters}
            searchPlaceholder="Search documents…"
          />
        </CardContent>
      </Card>

      <LinkDocumentDialog open={linkOpen} onOpenChange={setLinkOpen} lgCaseId={lgCaseId} currentStageCode={currentStageCode} />
      <UploadCaseDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} lgCaseId={lgCaseId} currentStageCode={currentStageCode} />
      <DocumentVersionHistoryDialog
        open={!!versionsFor}
        onOpenChange={(o) => { if (!o) setVersionsFor(null); }}
        dmsDocumentId={versionsFor?.dmsId ?? null}
        title={versionsFor?.title ?? null}
      />

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5" /> Generate From Template</DialogTitle>
            <DialogDescription>
              Generate a legal letter, notice, or order from a template. The generated document is automatically uploaded to
              the Central DMS and linked back to this case.
            </DialogDescription>
          </DialogHeader>
          <AvailableLettersPanel
            caseId={lgCaseId}
            caseTypeCode={caseTypeCode}
            currentStage={currentStageCode}
            canGenerate={canEdit}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={sourceDocsOpen} onOpenChange={setSourceDocsOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Source Department Documents
            </DialogTitle>
            <DialogDescription>
              Documents that originated in Compliance / Benefits / Claims / Employer Services for this case.
              Select rows and link them — files are not duplicated.
            </DialogDescription>
          </DialogHeader>
          {caseRow.data && (
            <SourceDocumentsPanel
              context={contextFromLgCase(caseRow.data)}
              selectable={canLink}
              onLink={async (selected) => {
                const { linkSourceDocumentsToCase } = await import("@/services/legal/lgSourceDocumentService");
                const n = await linkSourceDocumentsToCase({
                  lg_case_id: lgCaseId,
                  documents: selected,
                  linked_stage_code: currentStageCode,
                  linked_by: userCode ?? null,
                  is_legally_relevant: true,
                });
                toast.success(`${n} source document(s) linked to case`);
                qc.invalidateQueries({ queryKey: ["lg_document_link", lgCaseId] });
                setSourceDocsOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
