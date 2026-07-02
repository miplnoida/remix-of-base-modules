import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Layout as LayoutIcon, Loader2, Search, Pencil, Plus, Mail, MessageSquare, Bell, Smartphone, FileText, ScrollText, Award, Receipt, BarChart3 } from "lucide-react";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { BaseLayoutEditorDialog, type BaseLayoutRow } from "@/components/comm/layout/BaseLayoutEditorDialog";

const sb = supabase as any;


type Kind =
  | "EMAIL" | "SMS" | "WHATSAPP" | "IN_APP" | "PUSH"
  | "LETTER" | "NOTICE" | "CERTIFICATE" | "STATEMENT" | "RECEIPT" | "REPORT";

interface LayoutRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  layout_kind: Kind;
  is_base_layout: boolean;
  is_active: boolean;
  logo_asset_id: string | null;
  header_asset_id: string | null;
  footer_asset_id: string | null;
  letterhead_id: string | null;
  email_signature_id: string | null;
  print_footer_id: string | null;
  disclaimer_text_block_code: string | null;
  theme_id: string | null;
  font_family_code: string | null;
  email_max_width: number | null;
  email_background_hex: string | null;
  email_font_family: string | null;
}

const KIND_META: Record<Kind, { label: string; icon: typeof Mail; desc: string }> = {
  EMAIL:       { label: "Email",       icon: Mail,         desc: "HTML email shells" },
  SMS:         { label: "SMS",         icon: MessageSquare,desc: "Plain-text SMS wrapper" },
  WHATSAPP:    { label: "WhatsApp",    icon: MessageSquare,desc: "WhatsApp channel wrapper" },
  IN_APP:      { label: "In-App",      icon: Smartphone,   desc: "In-app notification wrapper" },
  PUSH:        { label: "Push",        icon: Bell,         desc: "Push notification wrapper" },
  LETTER:      { label: "Letter",      icon: FileText,     desc: "Printed letter shell" },
  NOTICE:      { label: "Notice",      icon: ScrollText,   desc: "Formal notice shell" },
  CERTIFICATE: { label: "Certificate", icon: Award,        desc: "Certificate shell" },
  STATEMENT:   { label: "Statement",   icon: FileText,     desc: "Statement shell" },
  RECEIPT:     { label: "Receipt",     icon: Receipt,      desc: "Receipt shell" },
  REPORT:      { label: "Report",      icon: BarChart3,    desc: "Report shell" },
};
const KIND_ORDER: Kind[] = ["EMAIL","SMS","WHATSAPP","IN_APP","PUSH","LETTER","NOTICE","CERTIFICATE","STATEMENT","RECEIPT","REPORT"];

function useLayouts() {
  return useQuery({
    queryKey: ["base_layouts_all"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_template_layout")
        .select("id, code, name, description, layout_kind, is_base_layout, is_active, logo_asset_id, header_asset_id, footer_asset_id, letterhead_id, email_signature_id, print_footer_id, disclaimer_text_block_code, theme_id, font_family_code, email_max_width, email_background_hex, email_font_family")
        .order("layout_kind")
        .order("is_base_layout", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as LayoutRow[];
    },
    staleTime: 30_000,
  });
}

function LayoutTable({ rows, onOpen }: { rows: LayoutRow[]; onOpen: (r: LayoutRow) => void }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No layouts.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Slots configured</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[60px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const slotCount = [
            r.logo_asset_id, r.header_asset_id, r.footer_asset_id,
            r.letterhead_id, r.email_signature_id, r.print_footer_id,
            r.disclaimer_text_block_code, r.theme_id,
          ].filter(Boolean).length;
          return (
            <TableRow key={r.id} className="cursor-pointer" onClick={() => onOpen(r)}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground font-mono">{r.code}</TableCell>
              <TableCell className="text-xs">{slotCount} component{slotCount === 1 ? "" : "s"}</TableCell>
              <TableCell>{r.is_base_layout ? <Badge variant="secondary">System</Badge> : <Badge variant="outline">Custom</Badge>}</TableCell>
              <TableCell>{r.is_active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onOpen(r); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function Inner() {
  const { data: rows = [], isLoading } = useLayouts();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Kind>("EMAIL");
  const [editing, setEditing] = useState<LayoutRow | null>(null);
  const [openEditor, setOpenEditor] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => !needle || `${r.name} ${r.code} ${r.description ?? ""}`.toLowerCase().includes(needle));
  }, [rows, q]);

  const byKind = useMemo(() => {
    const map: Partial<Record<Kind, LayoutRow[]>> = {};
    for (const r of filtered) {
      (map[r.layout_kind] ??= []).push(r);
    }
    return map;
  }, [filtered]);

  const openRow = (r: LayoutRow) => { setEditing(r); setOpenEditor(true); };
  const openNew = () => { setEditing(null); setOpenEditor(true); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutIcon className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Base Layouts</h1>
            <p className="text-sm text-muted-foreground">
              Pick reusable components (logo, header, footer, signature, disclaimer, theme). Templates inherit these — you don't re-author HTML per template.
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, code…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New {tab.toLowerCase()} layout</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as Kind)}>
          <TabsList className="flex-wrap h-auto">
            {KIND_ORDER.map((k) => {
              const M = KIND_META[k];
              const count = byKind[k]?.length ?? 0;
              const Icon = M.icon;
              return (
                <TabsTrigger key={k} value={k} className="gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {M.label} <Badge variant="secondary" className="ml-1">{count}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
          {KIND_ORDER.map((k) => (
            <TabsContent key={k} value={k} className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{KIND_META[k].label} Base Layouts</CardTitle>
                  <CardDescription>{KIND_META[k].desc}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <LayoutTable rows={byKind[k] ?? []} onOpen={openRow} />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <BaseLayoutEditorDialog
        open={openEditor}
        onOpenChange={setOpenEditor}
        initial={editing as unknown as BaseLayoutRow | null}
        kind={editing?.layout_kind ?? tab}
      />
    </div>
  );
}


export default function BaseLayoutsPage() {
  return <PermissionWrapper moduleName="notification_templates"><Inner /></PermissionWrapper>;
}
