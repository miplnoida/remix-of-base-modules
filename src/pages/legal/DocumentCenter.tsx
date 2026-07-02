import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, Upload, Download, Eye, ShieldAlert, Gavel, Lock, Star, Link2, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  LgDataGrid, LgStatusBadge, buildLgRowActions,
  type LgColumnDef, type LgRowAction, type LgToolbarFilter,
} from "@/components/legal/grid";
import {
  searchLgDocumentLinks,
  deleteLgDocumentLink,
  setLgDocumentEvidence,
  setLgDocumentConfidentialityLevel,
  type LgDocumentLink,
  type LgDocumentSearchFilters,
  type LgConfidentialityLevel,
} from "@/services/legal/lgDocumentLinkService";
import { UploadCaseDocumentDialog } from "@/components/legal/lg/UploadCaseDocumentDialog";
import { LinkDocumentDialog } from "@/components/legal/lg/LinkDocumentDialog";
import { coreDmsService } from "@/services/core/coreDmsService";
import { useUserCode } from "@/hooks/useUserCode";
import { useLegalDocPermissions } from "@/hooks/legal/useLegalDocPermissions";

const ALL = "__all__";
const CATEGORIES = ["PLEADING", "EVIDENCE", "ORDER", "NOTICE", "CORRESPONDENCE", "INTERNAL", "OTHER"];
const SOURCES = ["UPLOADED", "LINKED_EXISTING", "GENERATED", "SOURCE_MODULE", "DMS", "EXTERNAL"];
const CONFIDENTIALITY: LgConfidentialityLevel[] = ["PUBLIC", "INTERNAL", "RESTRICTED", "SECRET"];

interface CaseOption { id: string; lg_case_no: string | null; case_type_code: string | null; }

export default function DocumentCenter() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const { perms } = useLegalDocPermissions();

  const canViewConfidential = perms.LEGAL_DOCUMENT_CONFIDENTIAL_VIEW;
  const canUnlink = perms.LEGAL_DOCUMENT_UNLINK;

  const [caseFilter, setCaseFilter] = useState<string>(ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [sourceFilter, setSourceFilter] = useState<string>(ALL);
  const [confidentialityFilter, setConfidentialityFilter] = useState<string>(ALL);
  const [evidenceOnly, setEvidenceOnly] = useState<string>(ALL);
  const [courtOnly, setCourtOnly] = useState<string>(ALL);
  const [searchText, setSearchText] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [uploadCaseId, setUploadCaseId] = useState<string>("");
  const [previewDoc, setPreviewDoc] = useState<LgDocumentLink | null>(null);

  const filters: LgDocumentSearchFilters = useMemo(() => ({
    caseId: caseFilter !== ALL ? caseFilter : undefined,
    categoryCode: categoryFilter !== ALL ? categoryFilter : undefined,
    source: sourceFilter !== ALL ? sourceFilter : undefined,
    confidentialityLevel: confidentialityFilter !== ALL ? (confidentialityFilter as LgConfidentialityLevel) : undefined,
    markedAsEvidence: evidenceOnly === ALL ? undefined : evidenceOnly === "true",
    courtFiled: courtOnly === ALL ? undefined : courtOnly === "true",
    searchText: searchText.trim() || undefined,
    limit: 1000,
  }), [caseFilter, categoryFilter, sourceFilter, confidentialityFilter, evidenceOnly, courtOnly, searchText]);

  const {
    data: documents = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["legal-document-center", filters],
    queryFn: () => searchLgDocumentLinks(filters),
    staleTime: 30_000,
  });

  const { data: caseOptions = [] } = useQuery<CaseOption[]>({
    queryKey: ["legal-document-center-cases"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lg_case")
        .select("id, lg_case_no, case_type_code, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as CaseOption[];
    },
    staleTime: 60_000,
  });

  const visibleDocs = useMemo(
    () => documents.filter((d) => !(d.confidential && !canViewConfidential)),
    [documents, canViewConfidential],
  );

  const hiddenConfidentialCount = documents.length - visibleDocs.length;

  const summary = useMemo(() => ({
    total: visibleDocs.length,
    evidence: visibleDocs.filter((d) => d.marked_as_evidence).length,
    courtFiled: visibleDocs.filter((d) => d.court_filed).length,
    confidential: visibleDocs.filter((d) => d.confidential).length,
  }), [visibleDocs]);

  const evidenceMut = useMutation({
    mutationFn: (v: { id: string; marked: boolean }) => setLgDocumentEvidence(v.id, v.marked, userCode),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["legal-document-center"] }); toast.success("Evidence flag updated"); },
    onError: (e: any) => toast.error(e?.message || "Failed to update evidence"),
  });

  const confMut = useMutation({
    mutationFn: (v: { id: string; level: LgConfidentialityLevel }) =>
      setLgDocumentConfidentialityLevel(v.id, v.level, userCode),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["legal-document-center"] }); toast.success("Confidentiality updated"); },
    onError: (e: any) => toast.error(e?.message || "Failed to update confidentiality"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteLgDocumentLink(id, userCode),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["legal-document-center"] }); toast.success("Document unlinked"); },
    onError: (e: any) => toast.error(e?.message || "Failed to unlink"),
  });

  const openDoc = async (row: LgDocumentLink) => {
    if (row.confidential && !canViewConfidential) {
      toast.error("Confidential document — permission required.");
      return;
    }
    try {
      const url = await coreDmsService.streamByLink(row.id, "stream", (row as any).file_name);
      window.open(url, "_blank");
    } catch (e: any) { toast.error(e?.message || "Cannot preview"); }
  };

  const downloadDoc = async (row: LgDocumentLink) => {
    if (row.confidential && !canViewConfidential) {
      toast.error("Confidential document — permission required.");
      return;
    }
    try {
      const url = await coreDmsService.streamByLink(row.id, "download", (row as any).file_name);
      const a = document.createElement("a");
      a.href = url;
      a.download = (row as any).file_name || row.title || "document";
      a.click();
    } catch (e: any) { toast.error(e?.message || "Cannot download"); }
  };

  const caseLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of caseOptions) {
      map.set(c.id, c.lg_case_no ?? c.id.slice(0, 8));
    }
    return map;
  }, [caseOptions]);

  const linkedEntityLabel = (r: LgDocumentLink): string => {
    if (r.hearing_id) return "Hearing";
    if (r.order_id) return "Order";
    if (r.notice_id) return "Notice";
    if (r.settlement_id) return "Settlement";
    if (r.fee_charge_id) return "Fee Charge";
    if (r.referral_id) return "Referral";
    if (r.intake_id) return "Intake";
    return "—";
  };

  const columns: LgColumnDef<LgDocumentLink>[] = useMemo(() => [
    {
      accessorKey: "title", header: "Title", meta: { label: "Title", pinLeft: true, width: 260 },
      cell: ({ row }) => {
        const r = row.original as any;
        return (
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="font-medium truncate">{r.title || r.document_ref_no || r.file_name || "—"}</div>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {r.marked_as_evidence && <Badge variant="default" className="text-[10px] gap-1"><Star className="h-3 w-3" /> Evidence</Badge>}
                {r.confidential && <Badge variant="destructive" className="text-[10px] gap-1"><Lock className="h-3 w-3" /> {r.confidentiality_level || "RESTRICTED"}</Badge>}
                {r.court_filed && <Badge variant="outline" className="text-[10px] gap-1"><Gavel className="h-3 w-3" /> Court</Badge>}
              </div>
            </div>
          </div>
        );
      },
    },
    { accessorKey: "document_category_code", header: "Category", meta: { label: "Category", width: 130 } },
    { accessorKey: "document_type_code", header: "Type", meta: { label: "Type", width: 130 },
      cell: ({ getValue }) => (getValue() as string) || "—" },
    { accessorKey: "document_source", header: "Source", meta: { label: "Source", width: 140 },
      cell: ({ getValue }) => <Badge variant="outline">{String(getValue() || "—")}</Badge> },
    { id: "case", header: "Case", meta: { label: "Case", width: 130 },
      cell: ({ row }) => caseLabelById.get(row.original.lg_case_id) ?? row.original.lg_case_id.slice(0, 8) },
    { id: "linked_entity", header: "Linked", meta: { label: "Linked Entity", width: 120 },
      cell: ({ row }) => {
        const l = linkedEntityLabel(row.original);
        return l === "—" ? "—" : <Badge variant="secondary">{l}</Badge>;
      } },
    { accessorKey: "confidentiality_level", header: "Sensitivity", meta: { label: "Sensitivity", width: 130 },
      cell: ({ getValue }) => {
        const v = String(getValue() || "INTERNAL");
        return <LgStatusBadge status={v} label={v} size="sm" />;
      } },
    { accessorKey: "version_no", header: "v", meta: { label: "Version", width: 60, align: "right" } },
    { accessorKey: "uploaded_at", header: "Uploaded", meta: { label: "Uploaded", width: 120 },
      cell: ({ getValue }) => {
        try { return format(new Date(getValue() as string), "MMM d, yyyy"); } catch { return "—"; }
      } },
    { id: "actor", header: "By", meta: { label: "By", width: 110 },
      cell: ({ row }) => row.original.uploaded_by || row.original.linked_by || "—" },
  ], [caseLabelById]);

  const rowActions: LgRowAction<LgDocumentLink>[] = useMemo(() => [
    ...buildLgRowActions<LgDocumentLink>({ onView: openDoc }),
    { key: "download", label: "Download", icon: <Download className="h-3.5 w-3.5" />, onClick: downloadDoc },
    { key: "evidence", label: (r) => r.marked_as_evidence ? "Unmark evidence" : "Mark as evidence",
      icon: <Star className="h-3.5 w-3.5" />,
      onClick: (r) => evidenceMut.mutate({ id: r.id, marked: !r.marked_as_evidence }) },
    { key: "restrict", label: "Mark restricted", icon: <ShieldAlert className="h-3.5 w-3.5" />,
      onClick: (r) => confMut.mutate({ id: r.id, level: "RESTRICTED" }),
      disabled: (r) => r.confidentiality_level === "RESTRICTED" || r.confidentiality_level === "SECRET" },
    { key: "unlink", label: "Unlink", icon: <Trash2 className="h-3.5 w-3.5" />, variant: "destructive",
      onClick: (r) => { if (confirm("Unlink this document from the case?")) deleteMut.mutate(r.id); },
      disabled: () => !canUnlink },
  ], [canUnlink, evidenceMut, confMut, deleteMut]);

  const toolbarFilters: LgToolbarFilter[] = useMemo(() => {
    const optAll = (label: string) => ({ value: ALL, label: `All ${label}` });
    return [
      { key: "case", label: "Case", value: caseFilter, onChange: setCaseFilter,
        options: [optAll("Cases"), ...caseOptions.map((c) => ({
          value: c.id, label: `${c.lg_case_no ?? c.id.slice(0, 8)}${c.case_type_code ? ` · ${c.case_type_code}` : ""}`,
        }))] },
      { key: "category", label: "Category", value: categoryFilter, onChange: setCategoryFilter,
        options: [optAll("Categories"), ...CATEGORIES.map((v) => ({ value: v, label: v }))] },
      { key: "source", label: "Source", value: sourceFilter, onChange: setSourceFilter,
        options: [optAll("Sources"), ...SOURCES.map((v) => ({ value: v, label: v }))] },
      { key: "confidentiality", label: "Sensitivity", value: confidentialityFilter, onChange: setConfidentialityFilter,
        options: [optAll("Sensitivity"), ...CONFIDENTIALITY.map((v) => ({ value: v, label: v }))] },
      { key: "evidence", label: "Evidence", value: evidenceOnly, onChange: setEvidenceOnly,
        options: [optAll("Evidence"), { value: "true", label: "Evidence only" }, { value: "false", label: "Not evidence" }] },
      { key: "court", label: "Court", value: courtOnly, onChange: setCourtOnly,
        options: [optAll("Court status"), { value: "true", label: "Court-filed" }, { value: "false", label: "Not filed" }] },
    ];
  }, [caseFilter, categoryFilter, sourceFilter, confidentialityFilter, evidenceOnly, courtOnly, caseOptions]);

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Legal Document Center</h1>
          <p className="text-muted-foreground">
            Every document linked to any legal case, referral, intake, hearing or order.
            Files live in the Central DMS; this workspace stores classification, evidence, and audit.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setUploadOpen(true)} disabled={!perms.LEGAL_DOCUMENT_UPLOAD}>
            <Upload className="h-4 w-4 mr-2" /> Upload Document
          </Button>
          <Button variant="outline" onClick={() => setLinkOpen(true)} disabled={!perms.LEGAL_DOCUMENT_LINK}>
            <Link2 className="h-4 w-4 mr-2" /> Link DMS Document
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardDescription>Total Documents</CardDescription><CardTitle className="text-2xl">{summary.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Marked as Evidence</CardDescription><CardTitle className="text-2xl">{summary.evidence}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Court Filed</CardDescription><CardTitle className="text-2xl">{summary.courtFiled}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Confidential</CardDescription><CardTitle className="text-2xl">{summary.confidential}</CardTitle></CardHeader></Card>
      </div>

      {hiddenConfidentialCount > 0 && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Confidential documents hidden</AlertTitle>
          <AlertDescription>
            {hiddenConfidentialCount} document{hiddenConfidentialCount === 1 ? " is" : "s are"} confidential and
            require the <span className="font-mono">LEGAL_DOCUMENT_CONFIDENTIAL_VIEW</span> permission.
          </AlertDescription>
        </Alert>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Failed to load documents</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{(error as any)?.message || "Unknown error"}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Legal Documents</CardTitle>
          <CardDescription>Search across every case, referral, intake, hearing and order.</CardDescription>
        </CardHeader>
        <CardContent>
          <LgDataGrid
            id="lg.document-center"
            columns={columns}
            data={visibleDocs}
            isLoading={isLoading}
            rowActions={rowActions}
            toolbarFilters={toolbarFilters}
            searchPlaceholder="Search title, ref no, file name, notes…"
            defaultSort={[{ id: "uploaded_at", desc: true }]}
            emptyMessage="No documents match the current filters."
            exportFilename="legal-documents"
          />
        </CardContent>
      </Card>

      {/* Preview / details */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewDoc?.title || "Document"}</DialogTitle>
            <DialogDescription>Metadata and enterprise context</DialogDescription>
          </DialogHeader>
          {previewDoc && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Case:</span> {caseLabelById.get(previewDoc.lg_case_id) ?? previewDoc.lg_case_id}</div>
              <div><span className="text-muted-foreground">Category:</span> {previewDoc.document_category_code} · <span className="text-muted-foreground">Type:</span> {previewDoc.document_type_code || "—"}</div>
              <div><span className="text-muted-foreground">Source:</span> {previewDoc.document_source}</div>
              <div><span className="text-muted-foreground">Sensitivity:</span> {previewDoc.confidentiality_level}</div>
              <div><span className="text-muted-foreground">Version:</span> v{previewDoc.version_no}</div>
              <div><span className="text-muted-foreground">Uploaded:</span> {format(new Date(previewDoc.uploaded_at), "PPP")} by {previewDoc.uploaded_by || "—"}</div>
              {previewDoc.enterprise_metadata && (
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(previewDoc.enterprise_metadata, null, 2)}
                </pre>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => openDoc(previewDoc)}><Eye className="h-4 w-4 mr-1" />Preview</Button>
                <Button size="sm" variant="outline" onClick={() => downloadDoc(previewDoc)}><Download className="h-4 w-4 mr-1" />Download</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload / link — reuse case-scoped dialogs, requiring a case selection */}
      {uploadOpen && (
        <CasePickerDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          caseOptions={caseOptions}
          title="Choose case for upload"
          onPick={(id) => { setUploadCaseId(id); setUploadOpen(false); setTimeout(() => setInnerUpload(true), 50); }}
        />
      )}
      {innerUpload && uploadCaseId && (
        <UploadCaseDocumentDialog
          open={innerUpload}
          onOpenChange={(o) => { setInnerUpload(o); if (!o) setUploadCaseId(""); }}
          lgCaseId={uploadCaseId}
          currentStageCode={null}
        />
      )}
      {linkOpen && (
        <CasePickerDialog
          open={linkOpen}
          onOpenChange={setLinkOpen}
          caseOptions={caseOptions}
          title="Choose case for DMS link"
          onPick={(id) => { setUploadCaseId(id); setLinkOpen(false); setTimeout(() => setInnerLink(true), 50); }}
        />
      )}
      {innerLink && uploadCaseId && (
        <LinkDocumentDialog
          open={innerLink}
          onOpenChange={(o) => { setInnerLink(o); if (!o) setUploadCaseId(""); }}
          lgCaseId={uploadCaseId}
          currentStageCode={null}
        />
      )}
    </div>
  );

  // helpers close over local state below via useState hooks (declared at top of component)
  // — put them here to keep JSX clean.
}

// -- lightweight helpers ---------------------------------------------------

function useLocalState<T>(initial: T) { return useState<T>(initial); }

// State for the two chained dialogs — declared at module bottom to keep top of
// the component readable. Bound via closures above; created here so hook order
// stays stable across renders.
let __innerUpload = false;
let __innerLink = false;

function setInnerUpload(v: boolean) { __innerUpload = v; window.dispatchEvent(new Event("lg-doc-center-refresh")); }
function setInnerLink(v: boolean) { __innerLink = v; window.dispatchEvent(new Event("lg-doc-center-refresh")); }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const innerUpload = __innerUpload;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const innerLink = __innerLink;

function CasePickerDialog({
  open, onOpenChange, caseOptions, title, onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caseOptions: CaseOption[];
  title: string;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = caseOptions.filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (c.lg_case_no || "").toLowerCase().includes(s) || c.id.toLowerCase().includes(s);
  }).slice(0, 200);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Documents are always anchored to a legal case.</DialogDescription>
        </DialogHeader>
        <input
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="Search case number…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <div className="max-h-80 overflow-y-auto divide-y">
          {filtered.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">No cases match.</div>}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted flex justify-between items-center"
              onClick={() => onPick(c.id)}
            >
              <span className="font-mono text-sm">{c.lg_case_no ?? c.id.slice(0, 8)}</span>
              {c.case_type_code && <span className="text-xs text-muted-foreground">{c.case_type_code}</span>}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
