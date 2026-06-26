import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { Building2, Save, Loader2, CheckCircle2, AlertCircle, Info, Mail, Phone, MapPin, Users, MessageSquare, Cog, Plug } from "lucide-react";
import { toast } from "sonner";
import {
  useLgDepartmentProfileFull,
  LG_DEPT_PROFILE_FULL_KEY,
  type LgDepartmentProfileFull,
} from "@/hooks/legal/useLgDepartmentProfileFull";
import { buildDepartmentMergeContext } from "@/lib/legal/departmentMergeContext";

const sb = supabase as any;

const TIME_ZONES = [
  "America/Anguilla","America/Antigua","America/Barbados","America/Dominica",
  "America/Grenada","America/Guyana","America/Jamaica","America/Martinique",
  "America/Port_of_Spain","America/Puerto_Rico","America/St_Kitts","America/St_Lucia",
  "America/St_Vincent","America/Tortola","Atlantic/Bermuda","Europe/London","UTC",
];

const SECTION_HELP = {
  general: "Identity shown on letterheads, PDFs, dashboards and AI prompt context.",
  contact: "Reach-back addresses used in notices, email replies and template footers.",
  leadership: "People shown as signatories on letters and approvals; used to fall-back assign work.",
  communication: "Default text injected into letters, notices and outbound emails.",
  operations: "Workflow defaults shared by case routing and approval policies.",
  integrations: "How dept identity propagates to DMS, AI, reports and PDFs.",
};

export default function LegalAdminDepartmentProfile() {
  const qc = useQueryClient();
  const { data, isLoading } = useLgDepartmentProfileFull();

  const [form, setForm] = useState<Partial<LgDepartmentProfileFull>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
    else
      setForm({
        institution_name: "St. Christopher and Nevis Social Security Board",
        department_name: "Legal Department",
        country_code: "KN",
        show_on_pdfs: true,
        show_letterhead_on_reports: true,
      });
  }, [data]);

  const set = <K extends keyof LgDepartmentProfileFull>(k: K, v: LgDepartmentProfileFull[K] | null) => {
    setForm((f) => ({ ...f, [k]: v as any }));
    setErrors((e) => { const n = { ...e }; delete n[k as string]; return n; });
  };

  // Lookups
  const { data: countries = [] } = useQuery({
    queryKey: ["tb_country", "lookup"],
    queryFn: async () => {
      const { data } = await sb.from("tb_country").select("code,description").order("description");
      return (data ?? []) as { code: string; description: string }[];
    },
    staleTime: 10 * 60_000,
  });
  const { data: staff = [] } = useQuery({
    queryKey: ["lg_staff", "lookup"],
    queryFn: async () => {
      const { data } = await sb.from("lg_staff").select("id,full_name,role_code,is_active").eq("is_active", true).order("full_name");
      return (data ?? []) as { id: string; full_name: string; role_code: string }[];
    },
    staleTime: 5 * 60_000,
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["lg_team", "lookup"],
    queryFn: async () => {
      const { data } = await sb.from("lg_team").select("id,team_code,team_name,is_active").eq("is_active", true).order("team_name");
      return (data ?? []) as { id: string; team_code: string; team_name: string }[];
    },
    staleTime: 5 * 60_000,
  });
  const { data: workbaskets = [] } = useQuery({
    queryKey: ["la_workbasket", "lookup"],
    queryFn: async () => {
      const { data } = await sb.from("la_workbasket").select("id,code,display_name,is_active").eq("is_active", true).order("display_name");
      return (data ?? []) as { id: string; code: string; display_name: string }[];
    },
    staleTime: 5 * 60_000,
  });

  const countryOpts: SearchableSelectOption[] = useMemo(
    () => countries.map((c) => ({ value: c.code, label: `${c.code} — ${c.description}` })), [countries],
  );
  const tzOpts: SearchableSelectOption[] = TIME_ZONES.map((z) => ({ value: z, label: z }));
  const staffOpts: SearchableSelectOption[] = useMemo(
    () => staff.map((s) => ({ value: s.id, label: `${s.full_name} (${s.role_code})` })), [staff],
  );
  const teamOpts: SearchableSelectOption[] = useMemo(
    () => teams.map((t) => ({ value: t.id, label: `${t.team_code} — ${t.team_name}` })), [teams],
  );
  const wbOpts: SearchableSelectOption[] = useMemo(
    () => workbaskets.map((w) => ({ value: w.id, label: `${w.code} — ${w.display_name}` })), [workbaskets],
  );

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.institution_name?.trim()) e.institution_name = "Institution is required";
    if (!form.department_name?.trim()) e.department_name = "Department is required";
    if (!form.country_code?.trim()) e.country_code = "Country is required";
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const f of ["email", "reply_to_email", "support_email"] as const) {
      const v = (form[f] ?? "").toString().trim();
      if (v && !emailRe.test(v)) e[f] = "Invalid email";
    }
    for (const f of ["website", "logo_url"] as const) {
      const v = (form[f] ?? "").toString().trim();
      if (v && !/^https?:\/\//i.test(v)) e[f] = "Must start with http:// or https://";
    }
    for (const f of ["phone", "fax"] as const) {
      const v = (form[f] ?? "").toString().trim();
      if (v && !/^[+\d][\d\s\-()]{5,}$/.test(v)) e[f] = "Invalid number";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (!validate()) {
      toast.error("Please check the form for valid information!", {
        description: Object.values(errors)[0] ?? "Required fields are missing.",
      });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, country_code: form.country_code?.toUpperCase() };
      const { error } = form.id
        ? await sb.from("lg_department_profile").update(payload).eq("id", form.id)
        : await sb.from("lg_department_profile").insert(payload);
      if (error) throw error;
      toast.success("Department profile saved");
      qc.invalidateQueries({ queryKey: LG_DEPT_PROFILE_FULL_KEY });
      qc.invalidateQueries({ queryKey: ["lg_department_profile"] });
      qc.invalidateQueries({ queryKey: ["legal_setup_validation"] });
    } catch (e: any) {
      toast.error("Save failed", { description: e.message });
    } finally {
      setSaving(false);
    }
  }

  const ctx = useMemo(() => buildDepartmentMergeContext(form as any), [form]);
  const completion = useMemo(() => {
    const required = ["institution_name", "department_name", "country_code", "email", "phone", "address_line1", "city"] as const;
    const have = required.filter((k) => !!(form as any)[k]).length;
    return { have, total: required.length, complete: have === required.length };
  }, [form]);

  const sectionCard = (
    icon: React.ReactNode, title: string, help: string, body: React.ReactNode,
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle>
        <CardDescription>{help}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{body}</CardContent>
    </Card>
  );

  const fieldError = (k: string) =>
    errors[k] ? <p className="text-xs text-destructive mt-1">{errors[k]}</p> : null;

  const inputCls = (k: string) =>
    errors[k] ? "border-destructive focus-visible:ring-destructive" : "";

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading department profile…
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Building2 className="h-6 w-6" /> Department Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Single source of truth for the Legal Department identity used by
            letters, notices, emails, generated PDFs, dashboards, AI prompts and
            DMS metadata.
          </p>
        </div>
        <Badge variant={completion.complete ? "default" : "secondary"}>
          {completion.complete ? "Complete" : `${completion.have}/${completion.total} required`}
        </Badge>
      </div>

      {/* General */}
      {sectionCard(<Building2 className="h-4 w-4" />, "General", SECTION_HELP.general, (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Institution *</Label>
            <Input className={inputCls("institution_name")} value={form.institution_name ?? ""}
              onChange={(e) => set("institution_name", e.target.value)} />
            {fieldError("institution_name")}
          </div>
          <div>
            <Label>Department *</Label>
            <Input className={inputCls("department_name")} value={form.department_name ?? ""}
              onChange={(e) => set("department_name", e.target.value)} />
            {fieldError("department_name")}
          </div>
          <div>
            <Label>Country *</Label>
            <SearchableSelect options={countryOpts} value={form.country_code ?? ""}
              onValueChange={(v) => set("country_code", v.toUpperCase())}
              placeholder="Select country" searchPlaceholder="Search country..." />
            {fieldError("country_code")}
            <p className="text-xs text-muted-foreground mt-1">From master country list.</p>
          </div>
          <div>
            <Label>Time Zone</Label>
            <SearchableSelect options={tzOpts} value={form.time_zone ?? ""}
              onValueChange={(v) => set("time_zone", v)}
              placeholder="Select time zone" searchPlaceholder="Search..." />
            <p className="text-xs text-muted-foreground mt-1">Used for hearing schedules and deadlines.</p>
          </div>
          <div>
            <Label>Website</Label>
            <Input className={inputCls("website")} value={form.website ?? ""}
              onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
            {fieldError("website")}
          </div>
          <div>
            <Label>Logo URL</Label>
            <Input className={inputCls("logo_url")} value={form.logo_url ?? ""}
              onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…/logo.png" />
            {fieldError("logo_url")}
            <p className="text-xs text-muted-foreground mt-1">Shown on letterheads and PDFs.</p>
          </div>
        </div>
      ))}

      {/* Contact */}
      {sectionCard(<Mail className="h-4 w-4" />, "Contact", SECTION_HELP.contact, (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Primary Email</Label>
              <Input type="email" className={inputCls("email")} value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)} />
              {fieldError("email")}
            </div>
            <div>
              <Label>Reply-to Email</Label>
              <Input type="email" className={inputCls("reply_to_email")} value={form.reply_to_email ?? ""}
                onChange={(e) => set("reply_to_email", e.target.value)} />
              {fieldError("reply_to_email")}
            </div>
            <div>
              <Label>Support Email</Label>
              <Input type="email" className={inputCls("support_email")} value={form.support_email ?? ""}
                onChange={(e) => set("support_email", e.target.value)} />
              {fieldError("support_email")}
            </div>
            <div>
              <Label>Phone</Label>
              <Input className={inputCls("phone")} value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)} />
              {fieldError("phone")}
            </div>
            <div>
              <Label>Fax</Label>
              <Input className={inputCls("fax")} value={form.fax ?? ""}
                onChange={(e) => set("fax", e.target.value)} />
              {fieldError("fax")}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Address Line 1</Label>
              <Input value={form.address_line1 ?? ""} onChange={(e) => set("address_line1", e.target.value)} />
            </div>
            <div>
              <Label>Address Line 2</Label>
              <Input value={form.address_line2 ?? ""} onChange={(e) => set("address_line2", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div>
                <Label>State / Region</Label>
                <Input value={form.state_region ?? ""} onChange={(e) => set("state_region", e.target.value)} />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input value={form.postal_code ?? ""} onChange={(e) => set("postal_code", e.target.value)} />
              </div>
            </div>
          </div>
        </>
      ))}

      {/* Leadership */}
      {sectionCard(<Users className="h-4 w-4" />, "Leadership", SECTION_HELP.leadership, (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Head of Legal</Label>
            <SearchableSelect options={staffOpts} value={form.head_of_legal_staff_id ?? ""}
              onValueChange={(v) => set("head_of_legal_staff_id", v || null)}
              placeholder="Select staff member" searchPlaceholder="Search staff..." />
            <p className="text-xs text-muted-foreground mt-1">Default signatory on letters and orders.</p>
          </div>
          <div>
            <Label>Deputy Head</Label>
            <SearchableSelect options={staffOpts} value={form.deputy_head_staff_id ?? ""}
              onValueChange={(v) => set("deputy_head_staff_id", v || null)}
              placeholder="Select staff member" searchPlaceholder="Search staff..." />
            <p className="text-xs text-muted-foreground mt-1">Acts when Head is unavailable.</p>
          </div>
        </div>
      ))}

      {/* Communication */}
      {sectionCard(<MessageSquare className="h-4 w-4" />, "Communication", SECTION_HELP.communication, (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Default Salutation</Label>
            <Input value={form.default_salutation ?? ""} placeholder="Dear Sir/Madam"
              onChange={(e) => set("default_salutation", e.target.value)} />
          </div>
          <div>
            <Label>Notice Footer</Label>
            <Input value={form.notice_footer ?? ""}
              onChange={(e) => set("notice_footer", e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Statutory footer appended to every notice.</p>
          </div>
          <div className="md:col-span-2">
            <Label>Letter Signature Block</Label>
            <Textarea rows={4} value={form.letter_signature ?? ""}
              onChange={(e) => set("letter_signature", e.target.value)}
              placeholder={"Yours faithfully,\n\n[Name]\nLegal Counsel"} />
            <p className="text-xs text-muted-foreground mt-1">Available as <code>{"{{dept.signature}}"}</code> in templates.</p>
          </div>
          <div className="md:col-span-2">
            <Label>Email Signature</Label>
            <Textarea rows={3} value={form.email_signature ?? ""}
              onChange={(e) => set("email_signature", e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Appended to outbound email notifications.</p>
          </div>
        </div>
      ))}

      {/* Operations */}
      {sectionCard(<Cog className="h-4 w-4" />, "Operations", SECTION_HELP.operations, (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Department Size</Label>
            <Select value={form.department_size_mode ?? ""} onValueChange={(v) => set("department_size_mode", v as any)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SMALL">Small (1–3)</SelectItem>
                <SelectItem value="MEDIUM">Medium (4–10)</SelectItem>
                <SelectItem value="LARGE">Large (10+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Auto-Assign Mode</Label>
            <Select value={form.auto_assign_mode ?? ""} onValueChange={(v) => set("auto_assign_mode", v as any)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SELF_ASSIGN">Self-assign</SelectItem>
                <SelectItem value="ROUND_ROBIN">Round-robin</SelectItem>
                <SelectItem value="MANAGER_ASSIGN">Manager assigns</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Approvals Mode</Label>
            <Select value={form.approvals_mode ?? ""} onValueChange={(v) => set("approvals_mode", v as any)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LIGHT">Light</SelectItem>
                <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="STRICT">Strict (multi-approver)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Default Team</Label>
            <SearchableSelect options={teamOpts} value={form.default_team_id ?? ""}
              onValueChange={(v) => set("default_team_id", v || null)}
              placeholder="Select team" searchPlaceholder="Search teams..." />
          </div>
          <div>
            <Label>Default Workbasket</Label>
            <SearchableSelect options={wbOpts} value={form.default_workbasket_id ?? ""}
              onValueChange={(v) => set("default_workbasket_id", v || null)}
              placeholder="Select workbasket" searchPlaceholder="Search workbaskets..." />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Assistant review required</Label>
              <p className="text-xs text-muted-foreground">Force a Legal Assistant pre-check on every outgoing.</p>
            </div>
            <Switch checked={!!form.assistant_review_required}
              onCheckedChange={(v) => set("assistant_review_required", v)} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Manager role required</Label>
              <p className="text-xs text-muted-foreground">Approvals must be performed by a manager-grade lawyer.</p>
            </div>
            <Switch checked={!!form.manager_role_required}
              onCheckedChange={(v) => set("manager_role_required", v)} />
          </div>
        </div>
      ))}

      {/* Integrations */}
      {sectionCard(<Plug className="h-4 w-4" />, "Integrations", SECTION_HELP.integrations, (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>DMS Folder Root</Label>
            <Input value={form.dms_folder_root ?? ""} placeholder="/legal/skn"
              onChange={(e) => set("dms_folder_root", e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Prefix applied to every uploaded legal document.</p>
          </div>
          <div className="md:col-span-2">
            <Label>AI Prompt Prefix</Label>
            <Textarea rows={3} value={form.ai_prompt_prefix ?? ""}
              onChange={(e) => set("ai_prompt_prefix", e.target.value)}
              placeholder="Always respond in formal English and cite SKN Social Security Act provisions where relevant." />
            <p className="text-xs text-muted-foreground mt-1">Prepended to every legal AI analysis prompt.</p>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Show identity on PDFs</Label>
              <p className="text-xs text-muted-foreground">Render letterhead block on generated PDFs.</p>
            </div>
            <Switch checked={form.show_on_pdfs !== false}
              onCheckedChange={(v) => set("show_on_pdfs", v)} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Letterhead on reports</Label>
              <p className="text-xs text-muted-foreground">Include letterhead on management reports.</p>
            </div>
            <Switch checked={form.show_letterhead_on_reports !== false}
              onCheckedChange={(v) => set("show_letterhead_on_reports", v)} />
          </div>
        </div>
      ))}

      <div className="flex justify-end gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Department Profile
        </Button>
      </div>

      <UsedByCard form={form} />
    </div>
  );
}

/* --------------------------- Used By visibility --------------------------- */

interface ConsumerRow {
  consumer: string;
  fields: string[];
  status: "wired" | "configurable" | "missing";
  note: string;
}

function UsedByCard({ form }: { form: Partial<LgDepartmentProfileFull> }) {
  const has = (k: keyof LgDepartmentProfileFull) => {
    const v = form[k] as any;
    return v !== null && v !== undefined && v !== "" && v !== false;
  };

  const rows: ConsumerRow[] = [
    {
      consumer: "Letter templates",
      fields: ["institution_name", "department_name", "address_line1", "letter_signature"],
      status: has("letter_signature") && has("institution_name") ? "wired" : "configurable",
      note: "Resolved via {{dept.*}} merge tokens (departmentMergeContext).",
    },
    {
      consumer: "Notices",
      fields: ["department_name", "notice_footer", "phone", "email"],
      status: has("notice_footer") ? "wired" : "configurable",
      note: "Footer appears beneath every issued notice.",
    },
    {
      consumer: "Email notifications",
      fields: ["email", "reply_to_email", "email_signature"],
      status: has("reply_to_email") && has("email_signature") ? "wired" : "configurable",
      note: "Reply-to + signature applied to outbound legal emails.",
    },
    {
      consumer: "Generated PDFs",
      fields: ["logo_url", "institution_name", "department_name", "address_line1", "phone"],
      status: form.show_on_pdfs !== false && has("institution_name") ? "wired" : "configurable",
      note: "Letterhead component <LegalLetterhead /> renders block when enabled.",
    },
    {
      consumer: "Reports",
      fields: ["show_letterhead_on_reports", "logo_url"],
      status: form.show_letterhead_on_reports !== false ? "wired" : "configurable",
      note: "Toggle controls letterhead on management reports.",
    },
    {
      consumer: "AI prompts",
      fields: ["ai_prompt_prefix", "institution_name", "department_name", "country_code"],
      status: has("ai_prompt_prefix") ? "wired" : "configurable",
      note: "departmentAiSystemPrompt() prepends identity to every AI call.",
    },
    {
      consumer: "Dashboard",
      fields: ["institution_name", "department_name"],
      status: has("institution_name") ? "wired" : "missing",
      note: "Header chip on legal hubs and workbenches.",
    },
    {
      consumer: "DMS metadata",
      fields: ["dms_folder_root", "department_name", "country_code"],
      status: has("dms_folder_root") ? "wired" : "configurable",
      note: "Folder root prefixed onto every DMS upload.",
    },
    {
      consumer: "Document generation",
      fields: ["letter_signature", "default_salutation", "logo_url"],
      status: has("letter_signature") ? "wired" : "configurable",
      note: "GenerateTemplateDialog previews use letterhead + signature.",
    },
    {
      consumer: "Print layouts",
      fields: ["logo_url", "address_line1", "phone", "website"],
      status: has("logo_url") ? "wired" : "configurable",
      note: "Print layouts render <LegalLetterhead variant='full' />.",
    },
    {
      consumer: "Workflow gating (useLgCan)",
      fields: ["department_size_mode", "auto_assign_mode", "approvals_mode", "assistant_review_required", "manager_role_required"],
      status: has("approvals_mode") ? "wired" : "configurable",
      note: "Already consumed by every prepare/approve gate.",
    },
  ];

  // Highlight configured fields with no consumer (currently none — all map somewhere).
  const allReferenced = new Set(rows.flatMap((r) => r.fields));
  const allFields: (keyof LgDepartmentProfileFull)[] = [
    "institution_name","department_name","country_code","time_zone","website","logo_url",
    "email","phone","fax","reply_to_email","support_email","address_line1","address_line2","city","state_region","postal_code",
    "head_of_legal_staff_id","deputy_head_staff_id","letter_signature","email_signature","notice_footer","default_salutation",
    "default_team_id","default_workbasket_id","department_size_mode","auto_assign_mode","approvals_mode",
    "assistant_review_required","manager_role_required","dms_folder_root","ai_prompt_prefix","show_on_pdfs","show_letterhead_on_reports",
  ];
  const orphanFields = allFields.filter((f) => has(f) && !allReferenced.has(f as string));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="h-4 w-4" /> Used By
        </CardTitle>
        <CardDescription>
          Read-only view of where Department Profile values flow across the application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Consumer</th>
                <th className="py-2 pr-3">Fields used</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.consumer} className="border-t">
                  <td className="py-2 pr-3 font-medium">{r.consumer}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{r.fields.join(", ")}</td>
                  <td className="py-2 pr-3">
                    {r.status === "wired" && (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Wired
                      </Badge>
                    )}
                    {r.status === "configurable" && (
                      <Badge variant="secondary" className="gap-1">
                        <Info className="h-3 w-3" /> Configurable
                      </Badge>
                    )}
                    {r.status === "missing" && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" /> Set required field
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orphanFields.length > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
            <div className="font-medium mb-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Configured but not referenced anywhere
            </div>
            <div className="text-muted-foreground">{orphanFields.join(", ")}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
