import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Building2, Mail, FileSignature, ShieldCheck, ExternalLink,
  Save, ArrowRight, Workflow, Stamp, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCoreDepartmentProfile, CORE_DEPT_PROFILE_KEY } from "@/hooks/comm/useCoreDepartmentProfile";
import { useCommunicationContext, COMM_CONTEXT_KEY } from "@/hooks/comm/useCommunicationContext";
import { useLetterheads, useEmailSignatures, useDisclaimers, usePrintFooters } from "@/hooks/comm/useCommAssets";
import { LegalLetterhead } from "@/components/legal/LegalLetterhead";

const sb = supabase as any;
const MODULE = "LEGAL";

export default function LegalAdminDepartmentProfile() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: dept, isLoading } = useCoreDepartmentProfile(MODULE);
  const { data: ctx } = useCommunicationContext(MODULE);
  const { data: letterheads = [] } = useLetterheads();
  const { data: signatures = [] } = useEmailSignatures();
  const { data: disclaimers = [] } = useDisclaimers();
  const { data: footers = [] } = usePrintFooters();

  const [form, setForm] = useState({
    department_name: "",
    department_code: "",
    description: "",
    department_size_mode: "MEDIUM" as "SMALL" | "MEDIUM" | "LARGE",
    auto_assign_mode: "MANAGER_ASSIGN" as "SELF_ASSIGN" | "ROUND_ROBIN" | "MANAGER_ASSIGN",
    approvals_mode: "STANDARD" as "LIGHT" | "STANDARD" | "STRICT",
    assistant_review_required: true,
    manager_role_required: true,
    default_letterhead_id: null as string | null,
    default_email_signature_id: null as string | null,
    default_disclaimer_id: null as string | null,
    default_print_footer_id: null as string | null,
    ai_prompt_prefix: "",
    show_on_pdfs: true,
    show_letterhead_on_reports: true,
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dept) return;
    setForm({
      department_name: dept.department_name || "",
      department_code: dept.department_code || "",
      description: dept.description || "",
      department_size_mode: (dept.department_size_mode as any) || "MEDIUM",
      auto_assign_mode: (dept.auto_assign_mode as any) || "MANAGER_ASSIGN",
      approvals_mode: (dept.approvals_mode as any) || "STANDARD",
      assistant_review_required: dept.assistant_review_required ?? true,
      manager_role_required: dept.manager_role_required ?? true,
      default_letterhead_id: dept.default_letterhead_id,
      default_email_signature_id: dept.default_email_signature_id,
      default_disclaimer_id: dept.default_disclaimer_id,
      default_print_footer_id: dept.default_print_footer_id,
      ai_prompt_prefix: dept.ai_prompt_prefix || "",
      show_on_pdfs: dept.show_on_pdfs ?? true,
      show_letterhead_on_reports: dept.show_letterhead_on_reports ?? true,
    });
    setDirty(false);
  }, [dept]);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const save = async () => {
    if (!dept) {
      toast.error("Department profile not initialised. Run database migrations first.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await sb
        .from("core_department_profile")
        .update({
          department_name: form.department_name || null,
          department_code: form.department_code || null,
          description: form.description || null,
          department_size_mode: form.department_size_mode,
          auto_assign_mode: form.auto_assign_mode,
          approvals_mode: form.approvals_mode,
          assistant_review_required: form.assistant_review_required,
          manager_role_required: form.manager_role_required,
          default_letterhead_id: form.default_letterhead_id || null,
          default_email_signature_id: form.default_email_signature_id || null,
          default_disclaimer_id: form.default_disclaimer_id || null,
          default_print_footer_id: form.default_print_footer_id || null,
          ai_prompt_prefix: form.ai_prompt_prefix || null,
          show_on_pdfs: form.show_on_pdfs,
          show_letterhead_on_reports: form.show_letterhead_on_reports,
          updated_at: new Date().toISOString(),
        })
        .eq("id", dept.id);
      if (error) throw error;
      toast.success("Department profile saved");
      qc.invalidateQueries({ queryKey: CORE_DEPT_PROFILE_KEY(MODULE) });
      qc.invalidateQueries({ queryKey: COMM_CONTEXT_KEY(MODULE) });
      setDirty(false);
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading department profile…
      </div>
    );
  }

  const usedBy = [
    { module: "Letter Templates", source: "communicationResolver", status: !!ctx?.letterhead.logo || !!ctx?.organization.primaryLogoUrl },
    { module: "Email Notifications", source: "comm_email_signature", status: !!ctx?.email.signatureHtml || !!ctx?.email.signatureText },
    { module: "Generated PDFs", source: "comm_letterhead + comm_print_footer", status: form.show_on_pdfs && (!!ctx?.letterhead.logo || !!ctx?.organization.primaryLogoUrl) },
    { module: "Reports", source: "comm_letterhead", status: form.show_letterhead_on_reports },
    { module: "Notices", source: "comm_disclaimer", status: !!ctx?.disclaimer.standard },
    { module: "AI Prompt Context", source: "ai_prompt_prefix", status: !!ctx?.ai.systemPrompt },
    { module: "DMS Metadata", source: "core_department_profile.dms_folder_root", status: !!dept?.dms_folder_root },
  ];

  return (
    <div className="space-y-4 p-4 lg:p-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Legal Department Profile</h1>
          <p className="text-sm text-muted-foreground">
            Lightweight configuration. Organization, addresses and branding now live in shared masters.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => nav("/admin/communication")}>
            <Stamp className="h-4 w-4 mr-2" /> Communication Assets
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => nav("/legal/policy")}>
            <Workflow className="h-4 w-4 mr-2" /> Workflow Policy
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      {/* Resolved identity summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <Field label="Organization" value={ctx?.organization.name} />
          <Field label="Department" value={ctx?.department.name} />
          <Field label="Primary Office" value={ctx?.location.name || ctx?.location.address} />
          <Field label="Country / TZ" value={[ctx?.organization.country, ctx?.organization.timeZone].filter(Boolean).join(" • ")} />
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription className="text-xs">
          Address, phone, email and logo come from <strong>Organization</strong> and <strong>Office Locations</strong> masters.
          Branding (letterhead, signature, disclaimer, footer) is selected from <strong>Communication Assets</strong> below.
          This page only stores per-department selections and workflow flags.
        </AlertDescription>
      </Alert>

      {/* Identity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Department Name</Label>
            <Input value={form.department_name} onChange={(e) => update("department_name", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Department Code</Label>
            <Input value={form.department_code} onChange={(e) => update("department_code", e.target.value.toUpperCase())} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => update("description", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Workflow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Workflow Mode</CardTitle>
          <CardDescription className="text-xs">Drives prepare/approve gating across legal actions.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ModeSelect label="Department Size" value={form.department_size_mode}
            onChange={(v) => update("department_size_mode", v as any)}
            options={[["SMALL","Small"],["MEDIUM","Medium"],["LARGE","Large"]]} />
          <ModeSelect label="Auto-assign" value={form.auto_assign_mode}
            onChange={(v) => update("auto_assign_mode", v as any)}
            options={[["SELF_ASSIGN","Self-assign"],["ROUND_ROBIN","Round-robin"],["MANAGER_ASSIGN","Manager assigns"]]} />
          <ModeSelect label="Approvals" value={form.approvals_mode}
            onChange={(v) => update("approvals_mode", v as any)}
            options={[["LIGHT","Light"],["STANDARD","Standard"],["STRICT","Strict"]]} />
          <ToggleRow label="Assistant review required"
            checked={!!form.assistant_review_required}
            onChange={(v) => update("assistant_review_required", v)} />
          <ToggleRow label="Manager role required"
            checked={!!form.manager_role_required}
            onChange={(v) => update("manager_role_required", v)} />
        </CardContent>
      </Card>

      {/* Communication asset selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileSignature className="h-4 w-4" /> Communication Assets</CardTitle>
          <CardDescription className="text-xs">
            Pick from centrally managed assets. Manage them in{" "}
            <button className="underline" onClick={() => nav("/admin/communication")}>Communication Assets admin</button>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AssetSelect label="Default Letterhead" value={form.default_letterhead_id}
            onChange={(v) => update("default_letterhead_id", v)}
            options={letterheads.map(l => ({ id: l.id, name: l.name }))} />
          <AssetSelect label="Default Email Signature" value={form.default_email_signature_id}
            onChange={(v) => update("default_email_signature_id", v)}
            options={signatures.map(l => ({ id: l.id, name: l.name }))} />
          <AssetSelect label="Default Disclaimer" value={form.default_disclaimer_id}
            onChange={(v) => update("default_disclaimer_id", v)}
            options={disclaimers.map(l => ({ id: l.id, name: l.name }))} />
          <AssetSelect label="Default Print Footer" value={form.default_print_footer_id}
            onChange={(v) => update("default_print_footer_id", v)}
            options={footers.map(l => ({ id: l.id, name: l.name }))} />
          <ToggleRow label="Show letterhead on generated PDFs"
            checked={!!form.show_on_pdfs}
            onChange={(v) => update("show_on_pdfs", v)} />
          <ToggleRow label="Show letterhead on reports"
            checked={!!form.show_letterhead_on_reports}
            onChange={(v) => update("show_letterhead_on_reports", v)} />
        </CardContent>
      </Card>

      {/* AI Prompt */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> AI Context</CardTitle>
          <CardDescription className="text-xs">Prepended to all AI prompts in this module.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea rows={3} value={form.ai_prompt_prefix}
            onChange={(e) => update("ai_prompt_prefix", e.target.value)}
            placeholder="e.g. Reference the Social Security Act and St. Kitts and Nevis statutes when drafting." />
        </CardContent>
      </Card>

      {/* Live Letterhead preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Letterhead Preview</CardTitle>
          <CardDescription className="text-xs">Resolved live from Organization + Primary Office + Default Letterhead.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-white border rounded-md p-4">
            <LegalLetterhead variant="full" />
          </div>
        </CardContent>
      </Card>

      {/* Used By */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Used By</CardTitle>
          <CardDescription className="text-xs">Live consumers of this department profile.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {usedBy.map((u, i) => (
            <div key={i} className="flex items-center justify-between py-2 text-sm">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span>{u.module}</span>
                <span className="text-xs text-muted-foreground">({u.source})</span>
              </div>
              <Badge variant={u.status ? "default" : "secondary"}>
                {u.status ? "Wired" : "Not configured"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur p-3 flex items-center justify-end gap-3 shadow-lg z-50">
          <span className="text-xs text-muted-foreground">You have unsaved changes</span>
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium truncate">{value || <span className="text-muted-foreground italic">—</span>}</div>
    </div>
  );
}

function ModeSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function AssetSelect({ label, value, onChange, options }: {
  label: string; value: string | null; onChange: (v: string | null) => void;
  options: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value ?? "__none__"} onValueChange={(v) => onChange(v === "__none__" ? null : v)}>
        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— None —</SelectItem>
          {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
