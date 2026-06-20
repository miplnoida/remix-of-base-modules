import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderOpen, Eye, Loader2, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listAllLgDocumentLinks } from "@/services/legal/lgRegistryService";
import { useLgReference } from "@/hooks/legal/useLgCases";
import { formatDateForDisplay } from "@/lib/format-config";

const ALL = "__all__";

const EvidenceManagement = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState(ALL);

  const { data: categories = [] } = useLgReference("LG_DOCUMENT_CATEGORY");
  const { data: docs = [], isLoading } = useQuery({
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
          <div className="flex flex-col md:flex-row gap-3">
            <Input placeholder="Search title or ref no..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="md:w-56"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {categories.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title / Ref</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
                ) : docs.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No documents found</TableCell></TableRow>
                ) : docs.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-medium">{d.title || '(untitled)'}</div>
                      {d.document_ref_no && <div className="text-xs text-muted-foreground font-mono">{d.document_ref_no}</div>}
                    </TableCell>
                    <TableCell>
                      <button className="text-primary hover:underline" onClick={() => navigate(`/legal/lg/cases/${d.lg_case_id}`)}>
                        {d.lg_case?.lg_case_no ?? '—'}
                      </button>
                    </TableCell>
                    <TableCell><Badge variant="outline">{catLabel(d.document_category_code)}</Badge></TableCell>
                    <TableCell className="text-sm">{d.document_source}</TableCell>
                    <TableCell>{formatDateForDisplay(d.uploaded_at)}</TableCell>
                    <TableCell className="space-x-1">
                      {d.court_filed && <Badge variant="secondary">Filed</Badge>}
                      {d.confidential && <Badge variant="destructive">Confidential</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/legal/lg/cases/${d.lg_case_id}`)}><Eye className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">To link a new document, open the case and use the Documents tab.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EvidenceManagement;
