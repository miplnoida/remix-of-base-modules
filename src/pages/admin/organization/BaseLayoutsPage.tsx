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
  body_placeholder_html: string | null;
  signature_slot: string | null;
  footer_slot: string | null;
  disclaimer_slot: string | null;
  header_html: string | null;
  footer_html: string | null;
  email_max_width: number | null;
  email_font_family: string | null;
  email_background_hex: string | null;
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
        .select("id, code, name, description, layout_kind, is_base_layout, is_active, body_placeholder_html, signature_slot, footer_slot, disclaimer_slot, header_html, footer_html, email_max_width, email_font_family, email_background_hex")
        .order("layout_kind")
        .order("is_base_layout", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as LayoutRow[];
    },
    staleTime: 30_000,
  });
}

function SlotEditorDialog({ row, open, onOpenChange, onSaved }: {
  row: LayoutRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [body, setBody] = useState(row?.body_placeholder_html ?? "{{BODY}}");
  const [sig, setSig] = useState(row?.signature_slot ?? "");
  const [foot, setFoot] = useState(row?.footer_slot ?? "");
  const [disc, setDisc] = useState(row?.disclaimer_slot ?? "");
  const [isActive, setIsActive] = useState(row?.is_active ?? true);

  // Reset when row changes
  useMemo(() => {
    setName(row?.name ?? "");
    setDescription(row?.description ?? "");
    setBody(row?.body_placeholder_html ?? "{{BODY}}");
    setSig(row?.signature_slot ?? "");
    setFoot(row?.footer_slot ?? "");
    setDisc(row?.disclaimer_slot ?? "");
    setIsActive(row?.is_active ?? true);
  }, [row?.id]);

  const save = async () => {
    if (!row) return;
    if (!body.includes("{{BODY}}")) {
      toast.error("Body placeholder must include {{BODY}} token");
      return;
    }
    const { error } = await sb
      .from("core_template_layout")
      .update({
        name,
        description,
        body_placeholder_html: body,
        signature_slot: sig,
        footer_slot: foot,
        disclaimer_slot: disc,
        is_active: isActive,
      })
      .eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Layout saved");
    onSaved();
    onOpenChange(false);
  };

  if (!row) return null;
  const preview = composeChannelBodyFromLayout({
    layout: { body_placeholder_html: body, signature_slot: sig, footer_slot: foot, disclaimer_slot: disc },
    bodyContent: "«Business content goes here»",
    signature: "«Signature»",
    footer: "«Footer»",
    disclaimer: "«Disclaimer»",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row.name} <Badge variant="outline" className="ml-2">{row.layout_kind}</Badge></DialogTitle>
          <DialogDescription className="font-mono text-xs">{row.code}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>Body placeholder <span className="text-xs text-muted-foreground">(must include {"{{BODY}}"})</span></Label>
              <Textarea rows={4} className="font-mono text-xs" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div>
              <Label>Signature slot <span className="text-xs text-muted-foreground">({"{{SIGNATURE_BLOCK}}"})</span></Label>
              <Textarea rows={2} className="font-mono text-xs" value={sig ?? ""} onChange={(e) => setSig(e.target.value)} />
            </div>
            <div>
              <Label>Footer slot <span className="text-xs text-muted-foreground">({"{{FOOTER_BLOCK}}"})</span></Label>
              <Textarea rows={2} className="font-mono text-xs" value={foot ?? ""} onChange={(e) => setFoot(e.target.value)} />
            </div>
            <div>
              <Label>Disclaimer slot <span className="text-xs text-muted-foreground">({"{{DISCLAIMER_BLOCK}}"})</span></Label>
              <Textarea rows={2} className="font-mono text-xs" value={disc ?? ""} onChange={(e) => setDisc(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Active</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Preview (resolved with sample content)</Label>
            <div className="border rounded p-3 bg-muted/30 text-sm whitespace-pre-wrap font-mono text-xs min-h-[300px]">
              {preview}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
          <TableHead>Slots</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[60px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const slotCount = [r.body_placeholder_html, r.signature_slot, r.footer_slot, r.disclaimer_slot].filter(Boolean).length;
          return (
            <TableRow key={r.id} className="cursor-pointer" onClick={() => onOpen(r)}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground font-mono">{r.code}</TableCell>
              <TableCell className="text-xs">{slotCount}/4</TableCell>
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
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useLayouts();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Kind>("EMAIL");
  const [editing, setEditing] = useState<LayoutRow | null>(null);
  const [openEmail, setOpenEmail] = useState(false);
  const [openSlot, setOpenSlot] = useState(false);

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

  const openRow = (r: LayoutRow) => {
    setEditing(r);
    if (r.layout_kind === "EMAIL") setOpenEmail(true);
    else setOpenSlot(true);
  };

  const onSaved = () => qc.invalidateQueries({ queryKey: ["base_layouts_all"] });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutIcon className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Base Layouts</h1>
            <p className="text-sm text-muted-foreground">
              Reusable shells (header, body region, signature, footer, disclaimer) per channel. Business templates inherit these — they never re-author shell HTML.
            </p>
          </div>
        </div>
        <div className="relative max-w-sm w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, code…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
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

      <EmailLayoutDesignerDialog open={openEmail} onOpenChange={setOpenEmail} initial={editing as any} />
      <SlotEditorDialog row={editing} open={openSlot} onOpenChange={setOpenSlot} onSaved={onSaved} />
    </div>
  );
}

export default function BaseLayoutsPage() {
  return <PermissionWrapper moduleName="notification_templates"><Inner /></PermissionWrapper>;
}
