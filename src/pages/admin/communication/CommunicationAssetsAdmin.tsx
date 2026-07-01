import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Eye, Loader2, FileText, Mail, Shield, Printer } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

type AssetKind = "letterhead" | "signature" | "disclaimer" | "footer";

const KIND_CONFIG: Record<AssetKind, {
  table: string; label: string; icon: any; bodyField: string;
  bodyLabel: string; extraFields: { key: string; label: string; type?: "text" | "textarea"; }[];
}> = {
  letterhead: {
    table: "comm_letterhead", label: "Letterheads", icon: FileText,
    bodyField: "header_html", bodyLabel: "Header HTML",
    extraFields: [
      { key: "version", label: "Version" },
      { key: "logo_url", label: "Logo URL" },
      { key: "secondary_logo_url", label: "Secondary Logo URL" },
      { key: "footer_html", label: "Footer HTML", type: "textarea" },
      { key: "qr_code_url", label: "QR Code URL" },
    ],
  },
  signature: {
    table: "comm_email_signature", label: "Email Signatures", icon: Mail,
    bodyField: "html_signature", bodyLabel: "HTML Signature",
    extraFields: [
      { key: "officer_user_code", label: "Officer User Code" },
      { key: "plain_text_signature", label: "Plain-text Signature", type: "textarea" },
    ],
  },
  disclaimer: {
    table: "comm_disclaimer", label: "Disclaimers", icon: Shield,
    bodyField: "body", bodyLabel: "Disclaimer Body (optional override — leave blank to inherit from linked Text Block)",
    extraFields: [
      { key: "category", label: "Category" },
      { key: "language", label: "Language" },
      { key: "text_block_id", label: "Inherits from Text Block (core_text_block.id)" },
    ],
  },
  footer: {
    table: "comm_print_footer", label: "Print Footers", icon: Printer,
    bodyField: "footer_html", bodyLabel: "Footer HTML (optional override — leave blank to inherit from linked Text Block)",
    extraFields: [
      { key: "watermark_url", label: "Watermark URL" },
      { key: "page_footer", label: "Page Footer" },
      { key: "version", label: "Version" },
      { key: "text_block_id", label: "Inherits from Text Block (core_text_block.id)" },
    ],
  },
};

function useAssetList(kind: AssetKind) {
  const cfg = KIND_CONFIG[kind];
  return useQuery({
    queryKey: [cfg.table, "list"],
    queryFn: async () => {
      const { data, error } = await sb.from(cfg.table).select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Which department profile records currently reference each asset id */
function useUsageMap(kind: AssetKind) {
  const column = ({
    letterhead: "default_letterhead_id",
    signature: "default_email_signature_id",
    disclaimer: "default_disclaimer_id",
    footer: "default_print_footer_id",
  } as const)[kind];
  return useQuery({
    queryKey: ["comm_usage", kind],
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_department_profile")
        .select(`id, module_code, department_name, ${column}`)
        .not(column, "is", null);
      if (error) throw error;
      const map: Record<string, { module: string; name: string }[]> = {};
      (data ?? []).forEach((r: any) => {
        const id = r[column];
        if (!id) return;
        (map[id] ||= []).push({ module: r.module_code, name: r.department_name });
      });
      return map;
    },
  });
}

export default function CommunicationAssetsAdmin() {
  const params = useParams<{ kind?: string }>();
  const navigate = useNavigate();
  const urlKind = (params.kind && (params.kind as string) in KIND_CONFIG)
    ? (params.kind as AssetKind)
    : "letterhead";
  const [kind, setKind] = useState<AssetKind>(urlKind);

  // Keep tab state in sync with URL (deep-links from menu entries)
  useEffect(() => { setKind(urlKind); }, [urlKind]);

  const onTabChange = (v: string) => {
    const next = v as AssetKind;
    setKind(next);
    navigate(`/admin/communication/${next}`, { replace: true });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Communication Assets</h1>
        <p className="text-muted-foreground">
          Centralised letterheads, email signatures, disclaimers and print footers.
          Departments select from these assets in their profile — never store free text.
        </p>
      </div>

      <Tabs value={kind} onValueChange={onTabChange}>
        <TabsList>

          {(Object.keys(KIND_CONFIG) as AssetKind[]).map((k) => {
            const C = KIND_CONFIG[k].icon;
            return (
              <TabsTrigger key={k} value={k}>
                <C className="h-4 w-4 mr-2" />
                {KIND_CONFIG[k].label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {(Object.keys(KIND_CONFIG) as AssetKind[]).map((k) => (
          <TabsContent key={k} value={k}>
            <AssetList kind={k} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function AssetList({ kind }: { kind: AssetKind }) {
  const cfg = KIND_CONFIG[kind];
  const qc = useQueryClient();
  const { data: rows, isLoading } = useAssetList(kind);
  const { data: usage } = useUsageMap(kind);
  const [editing, setEditing] = useState<any | null>(null);
  const [previewing, setPreviewing] = useState<any | null>(null);

  const openNew = () => setEditing({
    name: "", is_active: true, [cfg.bodyField]: "",
    ...Object.fromEntries(cfg.extraFields.map((f) => [f.key, ""])),
  });

  const save = async () => {
    if (!editing?.name) { toast.error("Name is required"); return; }
    const payload = { ...editing };
    delete payload.id;
    const op = editing.id
      ? sb.from(cfg.table).update(payload).eq("id", editing.id)
      : sb.from(cfg.table).insert(payload);
    const { error } = await op;
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: [cfg.table, "list"] });
    qc.invalidateQueries({ queryKey: ["comm_context"] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{cfg.label}</CardTitle>
          <CardDescription>Used by departments through their profile selection.</CardDescription>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !rows?.length ? (
          <p className="text-muted-foreground text-sm">No {cfg.label.toLowerCase()} yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r: any) => {
              const used = usage?.[r.id] ?? [];
              return (
                <div key={r.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">
                      {r.name}{" "}
                      <Badge variant={r.is_active ? "default" : "secondary"}>
                        {r.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Used by:{" "}
                      {used.length
                        ? used.map((u) => `${u.module} · ${u.name}`).join(", ")
                        : <span className="italic">not referenced</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setPreviewing(r)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "New"} {cfg.label.slice(0, -1)}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Name *</Label>
                <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              {cfg.extraFields.map((f) =>
                f.type === "textarea" ? (
                  <div key={f.key}>
                    <Label>{f.label}</Label>
                    <Textarea rows={3} value={editing[f.key] ?? ""} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
                  </div>
                ) : (
                  <div key={f.key}>
                    <Label>{f.label}</Label>
                    <Input value={editing[f.key] ?? ""} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
                  </div>
                ),
              )}
              <div>
                <Label>{cfg.bodyLabel}</Label>
                <Textarea rows={6} value={editing[cfg.bodyField] ?? ""}
                  onChange={(e) => setEditing({ ...editing, [cfg.bodyField]: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Preview · {previewing?.name}</DialogTitle></DialogHeader>
          {previewing && (
            <div className="border rounded p-4 bg-white">
              {previewing[cfg.bodyField]?.includes("<")
                ? <div dangerouslySetInnerHTML={{ __html: previewing[cfg.bodyField] }} />
                : <pre className="whitespace-pre-wrap text-sm">{previewing[cfg.bodyField]}</pre>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
