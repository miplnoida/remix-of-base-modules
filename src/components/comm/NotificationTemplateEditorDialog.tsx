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
  { token: "{organization_name}", label: "Organization" },
  { token: "{member_name}",       label: "Member Name" },
  { token: "{member_number}",     label: "Member No." },
  { token: "{employer_name}",     label: "Employer" },
  { token: "{employer_regno}",    label: "Employer Reg No." },
  { token: "{claim_number}",      label: "Claim No." },
  { token: "{reference_number}",  label: "Reference" },
  { token: "{amount}",            label: "Amount" },
  { token: "{period}",            label: "Period" },
  { token: "{due_date}",          label: "Due Date" },
  { token: "{otp_code}",          label: "OTP Code" },
  { token: "{portal_url}",        label: "Portal URL" },
];

const SAMPLE: Record<string, string> = {
  "{organization_name}": "Social Security Board",
  "{member_name}": "Jane A. Doe",
  "{member_number}": "100245",
  "{employer_name}": "ACME Industries Ltd.",
  "{employer_regno}": "ER-002145",
  "{claim_number}": "CL-2026-001234",
  "{reference_number}": "SSB/CN/2026/0042",
  "{amount}": "$ 1,250.00",
  "{period}": "May 2026",
  "{due_date}": new Date(Date.now() + 7 * 86400000).toLocaleDateString(),
  "{otp_code}": "482917",
  "{portal_url}": "https://portal.ssb.example",
};

function applyPlaceholders(s: string) {
  return Object.entries(SAMPLE).reduce((acc, [k, v]) => acc.split(k).join(v), s ?? "");
}

interface Row {
  id?: string;
  name?: string;
  template_code?: string | null;
  channel?: string;
  subject?: string | null;
  body?: string | null;
  category?: string | null;
  description?: string | null;
  is_enabled?: boolean;
}

const CHANNELS = ["email", "sms", "whatsapp", "in_app", "push"];

export function NotificationTemplateEditorDialog({
  open, onOpenChange, initial,
}: { open: boolean; onOpenChange: (v: boolean) => void; initial?: Row | null }) {
  const qc = useQueryClient();
  const [row, setRow] = useState<Row>({});
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const [activeField, setActiveField] = useState<"subject" | "body">("body");

  useEffect(() => {
    setRow(initial ?? { is_enabled: true, channel: "email" });
  }, [initial, open]);

  const set = (k: keyof Row, v: any) => setRow((r) => ({ ...r, [k]: v }));

  const insertToken = (token: string) => {
    if (activeField === "subject") {
      const el = subjectRef.current;
      const cur = row.subject ?? "";
      if (!el) { set("subject", cur + token); return; }
      const s = el.selectionStart ?? cur.length;
      const e = el.selectionEnd ?? cur.length;
      const next = cur.slice(0, s) + token + cur.slice(e);
      set("subject", next);
      requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = s + token.length; });
    } else {
      const el = bodyRef.current;
      const cur = row.body ?? "";
      if (!el) { set("body", cur + token); return; }
      const s = el.selectionStart ?? cur.length;
      const e = el.selectionEnd ?? cur.length;
      const next = cur.slice(0, s) + token + cur.slice(e);
      set("body", next);
      requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = s + token.length; });
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!row.name?.trim()) throw new Error("Name is required");
      if (!row.channel) throw new Error("Channel is required");
      if (row.id) {
        const { error } = await sb.from("notification_templates").update(row).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("notification_templates").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification_templates"] });
      toast.success("Template saved");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const isEmail = row.channel === "email";
  const isShort = row.channel === "sms" || row.channel === "push";

  const previewHtml = isEmail
    ? `<!doctype html><html><body style="font-family:system-ui,Arial,sans-serif;font-size:13px;color:#111;background:#fff;margin:0;padding:24px"><div style="max-width:640px;margin:auto;border:1px solid #e5e7eb;padding:24px;border-radius:8px"><div style="font-weight:600;border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:12px">${applyPlaceholders(row.subject ?? "")}</div><div style="white-space:pre-wrap;line-height:1.5">${applyPlaceholders(row.body ?? "")}</div></div></body></html>`
    : `<!doctype html><html><body style="font-family:system-ui,Arial;background:#f3f4f6;margin:0;padding:24px;display:flex;justify-content:center"><div style="max-width:300px;background:#dcf8c6;border-radius:12px;padding:10px 14px;font-size:13px;white-space:pre-wrap">${applyPlaceholders(row.body ?? "")}</div></body></html>`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader><DialogTitle>{row.id ? "Edit" : "New"} Notification Template</DialogTitle></DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Name</Label><Input value={row.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
              <div><Label>Code</Label><Input value={row.template_code ?? ""} onChange={(e) => set("template_code", e.target.value)} placeholder="CLAIM_APPROVED_EMAIL" /></div>
              <div>
                <Label>Channel</Label>
                <select className="w-full border rounded h-10 px-2 bg-background" value={row.channel ?? ""} onChange={(e) => set("channel", e.target.value)}>
                  {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><Label>Category</Label><Input value={row.category ?? ""} onChange={(e) => set("category", e.target.value)} placeholder="claims | contributions | otp | compliance" /></div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-2">
              <Label>Enabled</Label>
              <Switch checked={row.is_enabled ?? true} onCheckedChange={(v) => set("is_enabled", v)} />
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

            {isEmail && (
              <div onFocus={() => setActiveField("subject")}>
                <Label>Subject</Label>
                <Input ref={subjectRef} value={row.subject ?? ""} onChange={(e) => set("subject", e.target.value)} />
              </div>
            )}

            <div onFocus={() => setActiveField("body")}>
              <Label>{isShort ? "Message" : "Body"}{isShort && <span className="text-muted-foreground ml-1 text-[11px]">(keep under 160 chars for SMS)</span>}</Label>
              <Textarea ref={bodyRef} rows={isEmail ? 10 : 5} value={row.body ?? ""} onChange={(e) => set("body", e.target.value)} />
              {isShort && <div className="text-[11px] text-muted-foreground text-right">{(row.body ?? "").length} chars</div>}
            </div>

            <div>
              <Label>Description</Label>
              <Input value={row.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Eye className="h-3.5 w-3.5" /> Live preview ({row.channel ?? "—"})</div>
            <iframe title="preview" className="w-full h-[600px] rounded-md border bg-white" srcDoc={previewHtml} />
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
