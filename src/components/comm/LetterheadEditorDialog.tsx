import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, Save } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

const PLACEHOLDERS = [
  { token: "{organization_name}", label: "Organization Name" },
  { token: "{department_name}",   label: "Department" },
  { token: "{location_address}",  label: "Location Address" },
  { token: "{member_name}",       label: "Member Name" },
  { token: "{member_number}",     label: "Member No." },
  { token: "{employer_name}",     label: "Employer Name" },
  { token: "{employer_regno}",    label: "Employer Reg No." },
  { token: "{claim_number}",      label: "Claim No." },
  { token: "{contribution_period}", label: "Contribution Period" },
  { token: "{officer_name}",      label: "Officer Name" },
  { token: "{date}",              label: "Date" },
  { token: "{reference_number}",  label: "Reference No." },
];

const SAMPLE: Record<string, string> = {
  "{organization_name}": "Social Security Board",
  "{department_name}": "Benefits Department",
  "{location_address}": "Head Office, Basseterre, St. Kitts",
  "{member_name}": "Jane A. Doe",
  "{member_number}": "100245",
  "{employer_name}": "ACME Industries Ltd.",
  "{employer_regno}": "ER-002145",
  "{claim_number}": "CL-2026-001234",
  "{contribution_period}": "May 2026",
  "{officer_name}": "M. Williams",
  "{date}": new Date().toLocaleDateString(),
  "{reference_number}": "SSB/BEN/2026/0042",
};

function applyPlaceholders(s: string) {
  return Object.entries(SAMPLE).reduce((acc, [k, v]) => acc.split(k).join(v), s ?? "");
}

interface Row {
  id?: string;
  name?: string;
  version?: string | null;
  header_html?: string | null;
  footer_html?: string | null;
  logo_url?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  is_active?: boolean;
  description?: string | null;
}

export function LetterheadEditorDialog({
  open, onOpenChange, initial,
}: { open: boolean; onOpenChange: (v: boolean) => void; initial?: Row | null }) {
  const qc = useQueryClient();
  const [row, setRow] = useState<Row>({});
  const headerRef = useRef<HTMLTextAreaElement>(null);
  const footerRef = useRef<HTMLTextAreaElement>(null);
  const [activeField, setActiveField] = useState<"header" | "footer">("header");

  useEffect(() => {
    setRow(initial ?? { is_active: true, version: "v1" });
  }, [initial, open]);

  const set = (k: keyof Row, v: any) => setRow((r) => ({ ...r, [k]: v }));

  const insertToken = (token: string) => {
    const ref = activeField === "header" ? headerRef : footerRef;
    const ta = ref.current;
    if (!ta) {
      set(activeField === "header" ? "header_html" : "footer_html", `${(activeField === "header" ? row.header_html : row.footer_html) ?? ""}${token}`);
      return;
    }
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const next = ta.value.slice(0, start) + token + ta.value.slice(end);
    set(activeField === "header" ? "header_html" : "footer_html", next);
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + token.length; });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!row.name?.trim()) throw new Error("Name is required");
      if (row.id) {
        const { error } = await sb.from("comm_letterhead").update(row).eq("id", row.id);
        if (error) throw error;
      } else {
        // Central numbering: LH-{DEPARTMENT}-{SEQ}. Force auto-generate — allowOverride=false.
        const { generateAutoCode } = await import("@/hooks/useAutoCode");
        const payload: any = {
          ...row,
          code: await generateAutoCode({ entityKey: "LETTERHEAD", departmentCode: (row as any).department_code }),
        };
        const { error } = await sb.from("comm_letterhead").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comm_letterhead"] });
      toast.success("Letterhead saved");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const previewHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:system-ui,Arial,sans-serif;font-size:12px;color:#111;margin:0;padding:24px;background:#fff}
    .doc{max-width:720px;margin:auto;border:1px solid #ddd;padding:32px 40px;min-height:560px;display:flex;flex-direction:column}
    header,footer{border-color:#e5e7eb}
    header{border-bottom:1px solid #e5e7eb;padding-bottom:16px;margin-bottom:24px}
    footer{border-top:1px solid #e5e7eb;padding-top:12px;margin-top:auto;font-size:10px;color:#555}
    .body{flex:1;line-height:1.5}
  </style></head><body><div class="doc">
    <header>${applyPlaceholders(row.header_html ?? "")}</header>
    <div class="body"><p>Dear {member_name},</p><p>This is a sample body paragraph used only for previewing the letterhead layout. The actual document body is supplied by each module when generating real correspondence.</p><p>Sincerely,<br/>{officer_name}</p></div>
    <footer>${applyPlaceholders(row.footer_html ?? "")}</footer>
  </div></body></html>`.replace(/\{[a-z_]+\}/g, (m) => SAMPLE[m] ?? m);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader><DialogTitle>{row.id ? "Edit" : "New"} Letterhead</DialogTitle></DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Name</Label><Input value={row.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
              <div><Label>Version</Label><Input value={row.version ?? ""} onChange={(e) => set("version", e.target.value)} placeholder="v1" /></div>
              <div><Label>Effective from</Label><Input type="date" value={row.effective_from ?? ""} onChange={(e) => set("effective_from", e.target.value || null)} /></div>
              <div><Label>Effective to</Label><Input type="date" value={row.effective_to ?? ""} onChange={(e) => set("effective_to", e.target.value || null)} /></div>
            </div>

            <div>
              <Label>Description</Label>
              <Input value={row.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </div>

            <div className="flex items-center justify-between rounded-md border p-2">
              <Label>Active</Label>
              <Switch checked={row.is_active ?? true} onCheckedChange={(v) => set("is_active", v)} />
            </div>

            <div>
              <div className="text-xs font-medium mb-1.5">Placeholders (click to insert into {activeField})</div>
              <div className="flex flex-wrap gap-1">
                {PLACEHOLDERS.map((p) => (
                  <button key={p.token} type="button"
                    onClick={() => insertToken(p.token)}
                    className="text-xs px-2 py-0.5 rounded border bg-muted hover:bg-accent">
                    <Badge variant="outline" className="font-mono text-[10px] mr-1">{p.token}</Badge>{p.label}
                  </button>
                ))}
              </div>
            </div>

            <div onFocus={() => setActiveField("header")}>
              <Label>Header HTML</Label>
              <Textarea ref={headerRef} rows={5} value={row.header_html ?? ""} onChange={(e) => set("header_html", e.target.value)}
                placeholder='<div style="display:flex;justify-content:space-between"><h2>{organization_name}</h2><span>{department_name}</span></div>' />
            </div>

            <div onFocus={() => setActiveField("footer")}>
              <Label>Footer HTML</Label>
              <Textarea ref={footerRef} rows={4} value={row.footer_html ?? ""} onChange={(e) => set("footer_html", e.target.value)}
                placeholder='Ref: {reference_number} · {date}' />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Eye className="h-3.5 w-3.5" /> Live preview (sample data)</div>
            <iframe title="preview" className="w-full h-[640px] rounded-md border bg-white" srcDoc={previewHtml} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
