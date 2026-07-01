/**
 * Brand Assets → Letterheads
 * Structured letterhead records only. Not the template designer.
 * Each row is a page-layout definition (page size / orientation / margins) that
 * references reusable Media Library assets by asset_code (logo / seal / header
 * / footer / watermark). Templates and PDF generation resolve these letterheads
 * to lay out official letters, notices, certificates, statements and receipts.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Loader2, Search, Ruler, Plus, Pencil, Copy, Archive, Eye } from "lucide-react";
import { toast } from "sonner";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { WhereUsedButton } from "@/components/comm/WhereUsedDialog";

const sb = supabase as any;

interface LetterheadRow {
  id: string;
  code: string | null;
  name: string;
  category: string | null;
  subcategory: string | null;
  module_code: string | null;
  document_type: string | null;
  is_active: boolean;
  design_config: any;
}

function useLetterheads() {
  return useQuery({
    queryKey: ["comm_letterhead", "structured-list"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("comm_letterhead")
        .select("id,code,name,category,subcategory,module_code,document_type,is_active,design_config")
        .order("module_code", { ascending: true, nullsFirst: false })
        .order("code");
      if (error) throw error;
      return (data ?? []) as LetterheadRow[];
    },
    staleTime: 60_000,
  });
}

function AssetChip({ label, code }: { label: string; code?: string | null }) {
  if (!code) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] mr-1 mb-1">
      <span className="text-muted-foreground">{label}:</span>
      <code className="font-mono">{code}</code>
    </span>
  );
}

function Inner() {
  const { data: rows = [], isLoading } = useLetterheads();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.code, r.name, r.module_code, r.category, r.subcategory, r.document_type]
        .filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [rows, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, LetterheadRow[]>();
    filtered.forEach((r) => {
      const k = r.module_code ?? "ORG";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-start gap-3">
        <Ruler className="h-6 w-6 text-primary mt-1" />
        <div>
          <h1 className="text-2xl font-bold">Letterheads</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Manage official letterhead layouts — page size, orientation, margins and the
            header / footer / logo / seal / watermark used when generating letters, notices,
            certificates, statements and PDFs. Binaries live in the{" "}
            <Link to="/admin/org/assets/media" className="underline text-primary">Media Library</Link>{" "}
            and are referenced here by <code className="font-mono">asset_code</code>. Assign a
            letterhead to a module or event in{" "}
            <Link to="/admin/org/configuration-center?domain=branding" className="underline text-primary">
              Configuration Center → Branding
            </Link>. Message body content is authored in{" "}
            <Link to="/admin/org/library/templates" className="underline text-primary">
              Communication Library → Templates
            </Link>.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input placeholder="Search letterheads…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="flex justify-center p-12"><Loader2 className="animate-spin" /></CardContent></Card>
      ) : grouped.length === 0 ? (
        <Card><CardContent className="p-8 text-sm text-muted-foreground text-center">No letterheads found.</CardContent></Card>
      ) : grouped.map(([moduleCode, list]) => (
        <Card key={moduleCode}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Module: {moduleCode}</h2>
                <Badge variant="secondary" className="text-xs">{list.length}</Badge>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code / Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Doc Type</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Margins</TableHead>
                  <TableHead>Asset References</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => {
                  const dc = r.design_config ?? {};
                  const m = dc.margins ?? {};
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-mono text-xs">{r.code ?? "—"}</div>
                        <div className="text-sm">{r.name}</div>
                        {dc.is_default && <Badge variant="default" className="mt-1 text-[10px]">Default</Badge>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.category ?? "—"}
                        {r.subcategory && <div className="text-muted-foreground">{r.subcategory}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{r.document_type ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {(dc.page_size ?? "A4")} · {(dc.orientation ?? "portrait")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        T {m.top ?? "—"} · B {m.bottom ?? "—"}<br />
                        L {m.left ?? "—"} · R {m.right ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <AssetChip label="header" code={dc.header_asset_code} />
                        <AssetChip label="footer" code={dc.footer_asset_code} />
                        <AssetChip label="logo" code={dc.logo_asset_code} />
                        <AssetChip label="seal" code={dc.seal_asset_code} />
                        <AssetChip label="watermark" code={dc.watermark_asset_code} />
                      </TableCell>
                      <TableCell>
                        {r.is_active
                          ? <Badge variant="default">Active</Badge>
                          : <Badge variant="outline">Inactive</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function LetterheadsPage() {
  return <PermissionWrapper moduleName="org_letterheads"><Inner /></PermissionWrapper>;
}
