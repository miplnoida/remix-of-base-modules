import { useMemo, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Upload, Eye, Gavel, Lock, AlertTriangle, CheckCircle2, Trash2, History, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { LgDataGrid, LgStatusBadge, type LgColumnDef, type LgRowAction, type LgToolbarFilter } from "@/components/legal/grid";
import { useLgDocumentLinks, useDeleteLgDocumentLink } from "@/hooks/legal/useLgTemplates";
import { useLgStageDocumentRules, summariseCompleteness } from "@/hooks/legal/useLgStageDocumentRules";
import { useDmsDocumentTypes } from "@/hooks/legal/useDmsDocumentTypes";
import { useUserCode } from "@/hooks/useUserCode";
import { LinkDocumentDialog } from "./LinkDocumentDialog";
import { UploadCaseDocumentDialog } from "./UploadCaseDocumentDialog";
import { DocumentVersionHistoryDialog } from "./DocumentVersionHistoryDialog";
import { coreDmsService } from "@/services/core/coreDmsService";

interface Props {
  lgCaseId: string;
  currentStageCode: string | null;
  caseTypeCode: string | null;
  canEdit: boolean;
}

const ALL = "__all__";

export default function LegalCaseDocumentsTab({ lgCaseId, currentStageCode, caseTypeCode, canEdit }: Props) {
  const qc = useQueryClient();
  const { userId } = useUserCode();
  const docs = useLgDocumentLinks(lgCaseId);
  const rules = useLgStageDocumentRules(currentStageCode, caseTypeCode);
  const { data: docTypes = [] } = useDmsDocumentTypes("LEGAL");
  const del = useDeleteLgDocumentLink(lgCaseId);

  const [canViewConfidential, setCanViewConfidential] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!userId) { setCanViewConfidential(false); return; }
    coreDmsService.canViewConfidential(userId)
      .then((ok) => { if (!cancelled) setCanViewConfidential(!!ok); })
      .catch(() => { if (!cancelled) setCanViewConfidential(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const [linkOpen, setLinkOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [versionsFor, setVersionsFor] = useState<{ dmsId: string; title: string | null } | null>(null);

  const [fCategory, setFCategory] = useState(ALL);
  const [fType, setFType] = useState(ALL);
  const [fStage, setFStage] = useState(ALL);
  const [fCourt, setFCourt] = useState(ALL);
  const [fConf, setFConf] = useState(ALL);

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
      return true;
    });
  }, [docs.data, fCategory, fType, fStage, fCourt, fConf, canViewConfidential]);

  const hiddenConfidentialCount = useMemo(
    () => (docs.data ?? []).filter((d: any) => d.confidential && !canViewConfidential).length,
    [docs.data, canViewConfidential],
  );

  const completeness = useMemo(
    () => summariseCompleteness(rules.data, docs.data),
    [rules.data, docs.data],
  );
  const missing = completeness.filter(c => !c.satisfied);

  const openDoc = async (row: any) => {
    try {
      if (row.confidential && !canViewConfidential) {
        toast.error("Confidential document — you don't have permission to view this.");
        return;
      }
      if (row.dms_url) { window.open(row.dms_url, "_blank"); return; }
      if (row.dms_document_id) {
        const url = await coreDmsService.getDownloadUrl(row.dms_document_id);
        window.open(url, "_blank"); return;
      }
      toast.message("No DMS link on this row (reference-only).");
    } catch (e: any) { toast.error(e?.message || "Could not open"); }
  };

  const toggleCourtFiled = async (row: any) => {
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
    { accessorKey: "document_category_code", header: "Category", meta: { label: "Category" } },
    { accessorKey: "document_type_code", header: "Type", meta: { label: "Type" }, cell: ({ getValue }) => (getValue() as string) || "—" },
    { accessorKey: "linked_stage_code", header: "Stage", meta: { label: "Stage" }, cell: ({ getValue }) => (getValue() as string) || "—" },
    { accessorKey: "document_source", header: "Source", meta: { label: "Source" },
      cell: ({ getValue }) => <Badge variant="outline">{String(getValue() || "—")}</Badge>,
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
    { accessorKey: "flags", header: "Flags",
      cell: ({ row }) => (
        <div className="flex gap-1 flex-wrap">
          {row.original.court_filed && <Badge variant="outline" className="gap-1"><Gavel className="h-3 w-3" /> Court-filed</Badge>}
          {row.original.confidential && <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> Conf.</Badge>}
        </div>
      ),
      meta: { label: "Flags" },
    },
    { accessorKey: "uploaded_at", header: "Uploaded", meta: { label: "Uploaded" },
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return v ? new Date(v).toLocaleDateString() : "—";
      },
    },
  ], []);

  const rowActions: LgRowAction<any>[] = useMemo(() => [
    { key: "view", label: "View", icon: <Eye className="h-3.5 w-3.5" />, onClick: openDoc },
    { key: "versions", label: "Versions", icon: <History className="h-3.5 w-3.5" />,
      onClick: (r: any) => r.dms_document_id
        ? setVersionsFor({ dmsId: r.dms_document_id, title: r.title })
        : toast.message("No DMS document — no versions to show."),
    },
    { key: "court", label: (r: any) => r.court_filed ? "Unmark court-filed" : "Mark court-filed",
      icon: <Gavel className="h-3.5 w-3.5" />, onClick: toggleCourtFiled, disabled: () => !canEdit },
    { key: "conf", label: (r: any) => r.confidential ? "Unmark confidential" : "Mark confidential",
      icon: <Lock className="h-3.5 w-3.5" />, onClick: toggleConfidential, disabled: () => !canEdit },
    { key: "del", label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, variant: "destructive",
      onClick: (r: any) => { if (confirm("Remove this document link?")) del.mutate(r.id); }, disabled: () => !canEdit },
  ] as any, [canEdit, canViewConfidential]);

  const toolbarFilters: LgToolbarFilter[] = useMemo(() => {
    const optAll = (label: string) => ({ value: ALL, label: `All ${label}` });
    return [
      { key: "category", label: "Category", value: fCategory, onChange: setFCategory,
        options: [optAll("Categories"), ...["PLEADING","EVIDENCE","ORDER","NOTICE","CORRESPONDENCE","INTERNAL","OTHER"].map(v => ({ value: v, label: v }))] },
      { key: "type", label: "Type", value: fType, onChange: setFType,
        options: [optAll("Types"), ...docTypes.map(t => ({ value: t.type_code, label: t.type_code }))] },
      { key: "stage", label: "Stage", value: fStage, onChange: setFStage,
        options: [optAll("Stages"), ...Array.from(new Set((docs.data ?? []).map((d: any) => d.linked_stage_code).filter(Boolean)))
          .map((v: any) => ({ value: v as string, label: v as string }))] },
      { key: "court", label: "Court", value: fCourt, onChange: setFCourt,
        options: [optAll("Court status"), { value: "true", label: "Court-filed" }, { value: "false", label: "Not filed" }] },
      { key: "conf", label: "Confidentiality", value: fConf, onChange: setFConf,
        options: [optAll("Confidentiality"), { value: "true", label: "Confidential" }, { value: "false", label: "Open" }] },
    ];
  }, [docTypes, docs.data, fCategory, fType, fStage, fCourt, fConf]);

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

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-3">
            <div>
              <CardTitle>Case Documents</CardTitle>
              <CardDescription>Files live in the Central DMS. This case stores the link, classification, and audit context.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)} disabled={!canEdit}>
                <Plus className="h-4 w-4 mr-1" /> Link Reference
              </Button>
              <Button size="sm" onClick={() => setUploadOpen(true)} disabled={!canEdit}>
                <Upload className="h-4 w-4 mr-1" /> Upload to DMS
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

      <LinkDocumentDialog open={linkOpen} onOpenChange={setLinkOpen} lgCaseId={lgCaseId} />
      <UploadCaseDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} lgCaseId={lgCaseId} currentStageCode={currentStageCode} />
      <DocumentVersionHistoryDialog
        open={!!versionsFor}
        onOpenChange={(o) => { if (!o) setVersionsFor(null); }}
        dmsDocumentId={versionsFor?.dmsId ?? null}
        title={versionsFor?.title ?? null}
      />
    </div>
  );
}
