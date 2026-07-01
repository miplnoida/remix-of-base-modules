/**
 * Organization Email Defaults — enterprise editor.
 *
 * Edits the 10 org-level email fields on `core_organization`:
 *   default_email_layout_id, default_email_signature_id,
 *   default_email_footer_id, default_email_disclaimer_id,
 *   default_email_sender_name, default_email_reply_to,
 *   default_email_language, default_email_header_asset_id,
 *   default_email_signature_id, default_email_footer_id.
 *
 * These are the top of the inheritance chain used by
 * `emailBrandingResolver` — every email that doesn't get a more specific
 * override falls back to these values.
 */
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, Save, Info } from "lucide-react";
import { toast } from "sonner";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { EmailBrandingInheritancePanel } from "@/components/comm/EmailBrandingInheritancePanel";

const sb = supabase as any;

const FIELDS = [
  { key: "default_email_layout_id",     label: "Base email layout",  source: "core_template_layout", filter: { layout_kind: "EMAIL" } },
  { key: "default_email_signature_id",  label: "Default signature",  source: "comm_email_signature" },
  { key: "default_email_footer_id",     label: "Default footer",     source: "comm_print_footer" },
  { key: "default_email_disclaimer_id", label: "Default disclaimer", source: "comm_disclaimer" },
] as const;

function useLookup(source: string, filter?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["lookup", source, filter],
    queryFn: async () => {
      let q = sb.from(source).select("id, code, name, is_active").eq("is_active", true);
      if (filter) for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
      const { data, error } = await q.order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; code: string; name: string }>;
    },
    staleTime: 60_000,
  });
}

function LookupSelect({
  source, filter, value, onChange,
}: { source: string; filter?: Record<string, unknown>; value: string | null; onChange: (v: string | null) => void }) {
  const { data = [], isLoading } = useLookup(source, filter);
  return (
    <Select value={value ?? "__none__"} onValueChange={(v) => onChange(v === "__none__" ? null : v)}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={isLoading ? "Loading…" : "— none —"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">— none —</SelectItem>
        {data.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.name} {r.code ? <span className="text-muted-foreground text-xs">({r.code})</span> : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Inner() {
  const qc = useQueryClient();
  const { data: org, isLoading } = useQuery({
    queryKey: ["core_organization", "email_defaults"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_organization")
        .select("id, legal_name, short_name, default_email_layout_id, default_email_signature_id, default_email_footer_id, default_email_disclaimer_id, default_email_sender_name, default_email_reply_to, default_email_language")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<any>({});
  useEffect(() => { if (org) setForm(org); }, [org]);

  const save = useMutation({
    mutationFn: async () => {
      const patch = {
        default_email_layout_id: form.default_email_layout_id ?? null,
        default_email_signature_id: form.default_email_signature_id ?? null,
        default_email_footer_id: form.default_email_footer_id ?? null,
        default_email_disclaimer_id: form.default_email_disclaimer_id ?? null,
        default_email_sender_name: form.default_email_sender_name || null,
        default_email_reply_to: form.default_email_reply_to || null,
        default_email_language: form.default_email_language || "en",
      };
      const { error } = await sb.from("core_organization").update(patch).eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Organization email defaults saved");
      qc.invalidateQueries({ queryKey: ["core_organization"] });
      qc.invalidateQueries({ queryKey: ["email_branding"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  if (isLoading || !org) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-primary" /> Organization Email Defaults
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Fallback branding used by every email unless overridden at Department, Module, Workflow, Event or Template level.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              <LookupSelect
                source={f.source}
                filter={f.filter as any}
                value={form[f.key] ?? null}
                onChange={(v) => set(f.key, v)}
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Sender name</Label>
              <Input value={form.default_email_sender_name ?? ""} onChange={(e) => set("default_email_sender_name", e.target.value)} placeholder="e.g. SSF Communications" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reply-to address</Label>
              <Input value={form.default_email_reply_to ?? ""} onChange={(e) => set("default_email_reply_to", e.target.value)} placeholder="noreply@..." />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Default language</Label>
            <Input value={form.default_email_language ?? "en"} onChange={(e) => set("default_email_language", e.target.value)} className="max-w-[120px]" />
          </div>

          <div className="pt-2 flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save defaults
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground flex items-start gap-1 pt-2 border-t">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            To override for a specific module, department or event, use <b className="mx-1">Configuration Center → Communication</b>.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <EmailBrandingInheritancePanel />
      </div>
    </div>
  );
}

export default function OrganizationEmailDefaultsPage() {
  return <PermissionWrapper moduleName="org_email_defaults"><Inner /></PermissionWrapper>;
}
