import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listAllLgDocumentLinks } from "@/services/legal/lgRegistryService";
import { useLgReference } from "@/hooks/legal/useLgCases";
import { formatDateForDisplay } from "@/lib/format-config";
import { LgDataGrid, buildLgRowActions, type LgColumnDef } from "@/components/legal/grid";

const ALL = "__all__";

const EvidenceManagement = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState(ALL);

  const { data: categories = [] } = useLgReference("LG_DOCUMENT_CATEGORY");
  const { data: docs = [], isLoading, refetch } = useQuery({
    queryKey: ["lg_documents_all", cat, search],
    queryFn: () => listAllLgDocumentLinks({
      category: cat === ALL ? undefined : cat,
      search: search || undefined,
    }),
  });

  const catLabel = (c: string) => categories.find(x => x.code === c)?.label ?? c;

  const stats = useMemo(() => ({
    total: docs.length,
    courtFiled: docs.filter(d => d.court_filed).length,
    confidential: docs.filter(d => d.confidential).length,
  }), [docs]);

  const columns: LgColumnDef<any>[] = useMemo(() => [
    { 
      accessorKey: "title", 
      header: "Title / Ref", 
      meta: { label: "Title / Ref", pinLeft: true },
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div>
            <div className="font-medium">{d.title || '(untitled)'}</div>
            {d.document_ref_no && <div className="text-xs text-muted-foreground font-mono">{d.document_ref_no}</div>}
          </div>
        );
      }
    },
    { 
      accessorKey: "lg_case.lg_case_no", 
      header: "Case", 
      meta: { label: "Case" },
      cell: ({ row }) => {
        const d = row.original;
        return (
          <button className="text-primary hover:underline" onClick={() => navigate(`/legal/lg/cases/${d.lg_case_id}`)}>
            {d.lg_case?.lg_case_no ?? '—'}
          </button>
        );
      }
    },
    { 
      accessorKey: "document_category_code", 
      header: "Category", 
      meta: { label: "Category" },
      cell: ({ getValue }) => <Badge variant="outline">{catLabel(getValue() as string)}</Badge>
    },
    { accessorKey: "document_source", header: "Source", meta: { label: "Source" } },
    { 
      accessorKey: "uploaded_at", 
      header: "Uploaded", 
      meta: { label: "Uploaded" },
      cell: ({ getValue }) => formatDateForDisplay(getValue() as string)
    },
    { 
      id: "flags", 
      header: "Flags", 
      meta: { label: "Flags" },
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="space-x-1">
            {d.court_filed && <Badge variant="secondary">Filed</Badge>}
            {d.confidential && <Badge variant="destructive">Confidential</Badge>}
          </div>
        );
      }
    },
  ], [categories, navigate]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Legal Evidence & Documents"
        subtitle="Documents linked to legal cases (read-only registry)"
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/lg/dashboard" },
          { label: "Evidence", href: "/legal/evidence" },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><div className="text-sm text-muted-foreground">Total Documents</div><div className="text-2xl font-bold">{stats.total}</div></div><FolderOpen className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Court Filed</div><div className="text-2xl font-bold">{stats.courtFiled}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><div className="text-sm text-muted-foreground">Confidential</div><div className="text-2xl font-bold text-amber-600">{stats.confidential}</div></div><ShieldAlert className="h-5 w-5 text-amber-600" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Document Registry</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <LgDataGrid
            id="lg.evidence"
            columns={columns}
            data={docs}
            isLoading={isLoading}
            searchPlaceholder="Search title or ref no..."
            toolbarFilters={[
              {
                key: "category",
                label: "Category",
                value: cat,
                onChange: setCat,
                options: [
                  { value: ALL, label: "All categories" },
                  ...categories.map(c => ({ value: c.code, label: c.label }))
                ]
              }
            ]}
            rowActions={buildLgRowActions({
              onView: (r) => navigate(`/legal/lg/cases/${r.lg_case_id}`),
            })}
            onRefresh={() => refetch()}
            exportFilename="legal-evidence-registry"
          />
          <p className="text-xs text-muted-foreground">To link a new document, open the case and use the Documents tab.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EvidenceManagement;
