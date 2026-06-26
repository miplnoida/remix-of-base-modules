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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, Save, Loader2, CheckCircle2, AlertCircle, Info, Mail, MapPin,
  Users, MessageSquare, Cog, Plug, ShieldCheck, Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  useLgDepartmentProfileFull, LG_DEPT_PROFILE_FULL_KEY,
  type LgDepartmentProfileFull,
} from "@/hooks/legal/useLgDepartmentProfileFull";
import { LegalLetterhead } from "@/components/legal/LegalLetterhead";

const sb = supabase as any;

const TIME_ZONES = [
  "America/St_Kitts","America/Antigua","America/Barbados","America/Dominica",
  "America/Grenada","America/Jamaica","America/Port_of_Spain","America/Puerto_Rico",
  "America/St_Lucia","America/St_Vincent","America/Tortola","Atlantic/Bermuda",
  "Europe/London","UTC",
];

const SKN_DEFAULTS: Partial<LgDepartmentProfileFull> = {
  institution_name: "St. Christopher and Nevis Social Security Board",
  department_name: "Legal Department",
  department_code: "LEGAL",
  short_name: "SSB Legal",
  status: "ACTIVE",
  description:
    "Provides legal advisory, enforcement, prosecutions, contract review and recovery services for the Social Security Board of St. Kitts and Nevis.",
  country_code: "KN",
  jurisdiction: "Federation of St. Kitts and Nevis",
  time_zone: "America/St_Kitts",
  currency: "XCD",
  language: "en",
  website: "https://socialsecurity.kn",
  email: "legal@socialsecurity.kn",
  reply_to_email: "legal@socialsecurity.kn",
  support_email: "info@socialsecurity.kn",
  phone: "+1-869-465-2535",
  fax: "+1-869-465-3501",
  office_hours: "Mon–Fri, 8:00 AM – 4:00 PM (AST)",
  address_line1: "Social Security Headquarters, Bay Road",
  address_line2: "P.O. Box 79",
  city: "Basseterre",
  parish: "Saint George Basseterre",
  state_region: "Saint Kitts",
  postal_code: "KN0101",
  default_salutation: "Dear Sir/Madam",
  notice_footer:
    "Issued by the Legal Department of the Social Security Board pursuant to the Social Security Act, Cap. 22.01.",
  letterhead_header: "Social Security Board — Legal Department",
  letterhead_footer:
    "Bay Road, Basseterre, St. Kitts • Tel: +1-869-465-2535 • legal@socialsecurity.kn",
  legal_disclaimer:
    "This communication and any attachments are confidential and intended solely for the addressee. Unauthorised disclosure or use is prohibited.",
  print_footer: "Confidential — Social Security Board, St. Kitts and Nevis",
  letter_signature:
    "Yours faithfully,\n\n_____________________\nLegal Counsel\nSocial Security Board",
  email_signature:
    "Legal Department\nSocial Security Board\nBay Road, Basseterre, St. Kitts\nlegal@socialsecurity.kn  •  +1-869-465-2535",
  dms_folder_root: "/legal/skn",
  notification_sender_email: "no-reply@socialsecurity.kn",
  ai_prompt_prefix:
    "You are assisting the Legal Department of the St. Christopher and Nevis Social Security Board. Respond in formal English, cite Social Security Act Cap. 22.01 provisions where relevant, and reflect SKN legal practice.",
  show_on_pdfs: true,
  show_letterhead_on_reports: true,
};

type TabKey = "general" | "contact" | "leadership" | "communication" | "integrations" | "usage";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "general", label: "General", icon: Building2 },
  { key: "contact", label: "Contact", icon: Mail },
  { key: "leadership", label: "Leadership & Work", icon: Users },
  { key: "communication", label: "Communication", icon: MessageSquare },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "usage", label: "Usage & Validation", icon: ShieldCheck },
];

export default function LegalAdminDepartmentProfile() {
  const qc = useQueryClient();
  const { data, isLoading } = useLgDepartmentProfileFull();

  const [form, setForm] = useState<Partial<LgDepartmentProfileFull>>({});
  const [baseline, setBaseline] = useState<Partial<LgDepartmentProfileFull>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>("general");

  useEffect(() => {
    const init = data ?? SKN_DEFAULTS;
    setForm(init);
    setBaseline(init);
  }, [data]);

  const set = <K extends keyof LgDepartmentProfileFull>(k: K, v: LgDepartmentProfileFull[K] | null) => {
    setForm((f) => ({ ...f, [k]: v as any }));
    setErrors((e) => { const n = { ...e }; delete n[k as string]; return n; });
  };

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

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
    () => countries.map((c) => ({ value: c.code, label: `${c.code} — ${c.description}` })), [countries]);
  const tzOpts: SearchableSelectOption[] = TIME_ZONES.map((z) => ({ value: z, label: z }));
  const staffOpts: SearchableSelectOption[] = useMemo(
    () => staff.map((s) => ({ value: s.id, label: `${s.full_name} (${s.role_code})` })), [staff]);
  const teamOpts: SearchableSelectOption[] = useMemo(
    () => teams.map((t) => ({ value: t.id, label: `${t.team_code} — ${t.team_name}` })), [teams]);
  const wbOpts: SearchableSelectOption[] = useMemo(
    () => workbaskets.map((w) => ({ value: w.id, label: `${w.code} — ${w.display_name}` })), [workbaskets]);

  const teamName = (id?: string | null) => teams.find((t) => t.id === id)?.team_name ?? "—";
  const wbName = (id?: string | null) => workbaskets.find((w) => w.id === id)?.display_name ?? "—";
  const staffName = (id?: string | null) => staff.find((s) => s.id === id)?.full_name ?? "—";

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const urlRe = /^https?:\/\//i;
  const phoneRe = /^[+\d][\d\s\-()]{5,}$/;

  function validateAll(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.institution_name?.trim()) e.institution_name = "Institution is required";
    if (!form.department_name?.trim()) e.department_name = "Department is required";
    if (!form.country_code?.trim()) e.country_code = "Country is required";
    for (const f of ["email", "reply_to_email", "support_email", "notification_sender_email"] as const) {
      const v = (form[f] ?? "").toString().trim();
      if (v && !emailRe.test(v)) e[f] = "Invalid email";
    }
    for (const f of ["website", "logo_url", "seal_url"] as const) {
      const v = (form[f] ?? "").toString().trim();
      if (v && !urlRe.test(v)) e[f] = "Must start with http:// or https://";
    }
    for (const f of ["phone", "fax"] as const) {
      const v = (form[f] ?? "").toString().trim();
      if (v && !phoneRe.test(v)) e[f] = "Invalid number";
    }
    return e;
  }

  async function save() {
    const e = validateAll();
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("Please check the form for valid information!", { description: Object.values(e)[0] });
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
      setBaseline(form);
      qc.invalidateQueries({ queryKey: LG_DEPT_PROFILE_FULL_KEY });
      qc.invalidateQueries({ queryKey: ["lg_department_profile"] });
      qc.invalidateQueries({ queryKey: ["legal_setup_validation"] });
    } catch (err: any) {
      toast.error("Save failed", { description: err.message });
    } finally {
      setSaving(false);
    }
  }

  const fieldError = (k: string) =>
    errors[k] ? <p className="text-xs text-destructive mt-1">{errors[k]}</p> : null;
  const inputCls = (k: string) =>
    errors[k] ? "border-destructive focus-visible:ring-destructive" : "";

  const required = ["institution_name", "department_name", "country_code", "email", "phone", "address_line1", "city"] as const;
  const missing = required.filter((k) => !(form as any)[k]);
  const lastSaved = form.updated_at ? new Date(form.updated_at).toLocaleString() : "Never";

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading department profile…
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-4 pb-24">
      {/* Header summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold truncate">
                  {form.department_name || "Legal Department"}
                  {form.department_code && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">[{form.department_code}]</span>
                  )}
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {form.institution_name || "—"}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                  <span><b>Manager:</b> {staffName(form.head_of_legal_staff_id)}</span>
                  <span><b>Team:</b> {teamName(form.default_team_id)}</span>
                  <span><b>Workbasket:</b> {wbName(form.default_workbasket_id)}</span>
                  <span><b>Last updated:</b> {lastSaved}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Badge variant={form.status === "ACTIVE" ? "default" : "secondary"}>
                  {form.status || "ACTIVE"}
                </Badge>
                {missing.length === 0
                  ? <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Complete</Badge>
                  : <Badge variant="secondary">{required.length - missing.length}/{required.length} required</Badge>}
                {dirty && <Badge variant="outline" className="border-amber-500 text-amber-700">Unsaved changes</Badge>}
              </div>
              <Button size="sm" onClick={save} disabled={saving || !dirty}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.key} value={t.key} className="gap-2">
                <Icon className="h-4 w-4" />{t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">General</CardTitle>
              <CardDescription>Identity shown on letterheads, PDFs, dashboards and AI prompts.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label>Institution <span className="text-destructive">*</span></Label>
                <Input className={inputCls("institution_name")} value={form.institution_name ?? ""}
                  onChange={(e) => set("institution_name", e.target.value)} />
                {fieldError("institution_name")}
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status ?? "ACTIVE"} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department Name <span className="text-destructive">*</span></Label>
                <Input className={inputCls("department_name")} value={form.department_name ?? ""}
                  onChange={(e) => set("department_name", e.target.value)} />
                {fieldError("department_name")}
              </div>
              <div>
                <Label>Department Code</Label>
                <Input value={form.department_code ?? ""} placeholder="LEGAL"
                  onChange={(e) => set("department_code", e.target.value.toUpperCase())} />
              </div>
              <div>
                <Label>Short Name</Label>
                <Input value={form.short_name ?? ""} placeholder="SSB Legal"
                  onChange={(e) => set("short_name", e.target.value)} />
              </div>
              <div className="md:col-span-3">
                <Label>Description</Label>
                <Textarea rows={2} value={form.description ?? ""}
                  onChange={(e) => set("description", e.target.value)} />
              </div>
              <div>
                <Label>Country <span className="text-destructive">*</span></Label>
                <SearchableSelect options={countryOpts} value={form.country_code ?? ""}
                  onValueChange={(v) => set("country_code", v.toUpperCase())}
                  placeholder="Select country" searchPlaceholder="Search..." />
                {fieldError("country_code")}
              </div>
              <div>
                <Label>Island / Jurisdiction</Label>
                <Input value={form.jurisdiction ?? ""} placeholder="Federation of St. Kitts and Nevis"
                  onChange={(e) => set("jurisdiction", e.target.value)} />
              </div>
              <div>
                <Label>Time Zone</Label>
                <SearchableSelect options={tzOpts} value={form.time_zone ?? ""}
                  onValueChange={(v) => set("time_zone", v)}
                  placeholder="Select time zone" searchPlaceholder="Search..." />
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={form.currency ?? ""} placeholder="XCD"
                  onChange={(e) => set("currency", e.target.value.toUpperCase())} />
              </div>
              <div>
                <Label>Language</Label>
                <Select value={form.language ?? ""} onValueChange={(v) => set("language", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Website</Label>
                <Input className={inputCls("website")} value={form.website ?? ""}
                  onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
                {fieldError("website")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTACT */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
              <CardDescription>Reach-back details used on notices, replies and footers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Primary Email</Label>
                  <Input type="email" className={inputCls("email")} value={form.email ?? ""}
                    onChange={(e) => set("email", e.target.value)} />
                  {fieldError("email")}
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
                <div>
                  <Label>Website</Label>
                  <Input className={inputCls("website")} value={form.website ?? ""}
                    onChange={(e) => set("website", e.target.value)} />
                  {fieldError("website")}
                </div>
                <div className="md:col-span-2">
                  <Label>Office Hours</Label>
                  <Input value={form.office_hours ?? ""} placeholder="Mon–Fri, 8:00 AM – 4:00 PM"
                    onChange={(e) => set("office_hours", e.target.value)} />
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
                  </div>
                  <div>
                    <Label>Parish / Island</Label>
                    <Input value={form.parish ?? ""} onChange={(e) => set("parish", e.target.value)} />
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEADERSHIP */}
        <TabsContent value="leadership">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leadership &amp; Work Management</CardTitle>
              <CardDescription>People and defaults that route work and approvals.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Department Manager</Label>
                <SearchableSelect options={staffOpts} value={form.head_of_legal_staff_id ?? ""}
                  onValueChange={(v) => set("head_of_legal_staff_id", v || null)}
                  placeholder="Select staff" searchPlaceholder="Search..." />
                <p className="text-xs text-muted-foreground mt-1">Default signatory on letters and orders.</p>
              </div>
              <div>
                <Label>Deputy Manager</Label>
                <SearchableSelect options={staffOpts} value={form.deputy_head_staff_id ?? ""}
                  onValueChange={(v) => set("deputy_head_staff_id", v || null)}
                  placeholder="Select staff" searchPlaceholder="Search..." />
              </div>
              <div>
                <Label>Default Legal Team</Label>
                <SearchableSelect options={teamOpts} value={form.default_team_id ?? ""}
                  onValueChange={(v) => set("default_team_id", v || null)}
                  placeholder="Select team" searchPlaceholder="Search..." />
              </div>
              <div>
                <Label>Default Workbasket</Label>
                <SearchableSelect options={wbOpts} value={form.default_workbasket_id ?? ""}
                  onValueChange={(v) => set("default_workbasket_id", v || null)}
                  placeholder="Select workbasket" searchPlaceholder="Search..." />
              </div>
              <div>
                <Label>Escalation Contact</Label>
                <SearchableSelect options={staffOpts} value={form.escalation_contact_staff_id ?? ""}
                  onValueChange={(v) => set("escalation_contact_staff_id", v || null)}
                  placeholder="Select staff" searchPlaceholder="Search..." />
              </div>
              <div>
                <Label>Notification Recipients</Label>
                <Input value={form.notification_recipients ?? ""}
                  placeholder="comma-separated emails"
                  onChange={(e) => set("notification_recipients", e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Cc'd on system notifications.</p>
              </div>

              <div className="md:col-span-2 border-t pt-4 mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <SelectItem value="STRICT">Strict</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label>Assistant review required</Label>
                    <p className="text-xs text-muted-foreground">Pre-check on every outgoing.</p>
                  </div>
                  <Switch checked={!!form.assistant_review_required}
                    onCheckedChange={(v) => set("assistant_review_required", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label>Manager role required</Label>
                    <p className="text-xs text-muted-foreground">Manager-grade approver only.</p>
                  </div>
                  <Switch checked={!!form.manager_role_required}
                    onCheckedChange={(v) => set("manager_role_required", v)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMMUNICATION */}
        <TabsContent value="communication">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Communication</CardTitle>
              <CardDescription>Default text and branding for letters, notices and emails.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Logo URL</Label>
                  <Input className={inputCls("logo_url")} value={form.logo_url ?? ""}
                    onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…/logo.png" />
                  {fieldError("logo_url")}
                </div>
                <div>
                  <Label>Seal URL</Label>
                  <Input className={inputCls("seal_url")} value={form.seal_url ?? ""}
                    onChange={(e) => set("seal_url", e.target.value)} placeholder="https://…/seal.png" />
                  {fieldError("seal_url")}
                </div>
                <div>
                  <Label>Default Salutation</Label>
                  <Input value={form.default_salutation ?? ""} placeholder="Dear Sir/Madam"
                    onChange={(e) => set("default_salutation", e.target.value)} />
                </div>
                <div>
                  <Label>Notice Footer</Label>
                  <Input value={form.notice_footer ?? ""}
                    onChange={(e) => set("notice_footer", e.target.value)} />
                </div>
                <div>
                  <Label>Letterhead Header</Label>
                  <Input value={form.letterhead_header ?? ""}
                    onChange={(e) => set("letterhead_header", e.target.value)} />
                </div>
                <div>
                  <Label>Letterhead Footer</Label>
                  <Input value={form.letterhead_footer ?? ""}
                    onChange={(e) => set("letterhead_footer", e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Letter Signature Block</Label>
                <Textarea rows={4} value={form.letter_signature ?? ""}
                  onChange={(e) => set("letter_signature", e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Available as <code>{"{{dept.signature}}"}</code> in templates.</p>
              </div>
              <div>
                <Label>Email Signature</Label>
                <Textarea rows={3} value={form.email_signature ?? ""}
                  onChange={(e) => set("email_signature", e.target.value)} />
              </div>
              <div>
                <Label>Legal Disclaimer</Label>
                <Textarea rows={2} value={form.legal_disclaimer ?? ""}
                  onChange={(e) => set("legal_disclaimer", e.target.value)} />
              </div>
              <div>
                <Label>Print Footer</Label>
                <Input value={form.print_footer ?? ""}
                  onChange={(e) => set("print_footer", e.target.value)} />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <Eye className="h-4 w-4" /> Preview
                </div>
                <div className="rounded-md border p-3 bg-muted/30">
                  <LegalLetterhead variant="full" />
                  {form.letter_signature && (
                    <pre className="text-xs whitespace-pre-wrap font-sans mt-3 text-muted-foreground">
                      {form.letter_signature}
                    </pre>
                  )}
                  {form.email_signature && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground mb-1">Email signature:</div>
                      <pre className="text-xs whitespace-pre-wrap font-sans">{form.email_signature}</pre>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INTEGRATIONS */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Integrations</CardTitle>
              <CardDescription>How department identity propagates to DMS, AI, email and PDFs.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>DMS Folder Root</Label>
                <Input value={form.dms_folder_root ?? ""} placeholder="/legal/skn"
                  onChange={(e) => set("dms_folder_root", e.target.value)} />
              </div>
              <div>
                <Label>Default Document Owner</Label>
                <SearchableSelect options={staffOpts} value={form.default_document_owner_staff_id ?? ""}
                  onValueChange={(v) => set("default_document_owner_staff_id", v || null)}
                  placeholder="Select staff" searchPlaceholder="Search..." />
              </div>
              <div>
                <Label>Notification Sender</Label>
                <Input className={inputCls("notification_sender_email")} value={form.notification_sender_email ?? ""}
                  onChange={(e) => set("notification_sender_email", e.target.value)}
                  placeholder="no-reply@socialsecurity.kn" />
                {fieldError("notification_sender_email")}
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

              <div className="md:col-span-2">
                <Label>AI Context / Prompt Prefix</Label>
                <Textarea rows={3} value={form.ai_prompt_prefix ?? ""}
                  onChange={(e) => set("ai_prompt_prefix", e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Prepended to every legal AI analysis prompt.</p>
              </div>
              <div className="md:col-span-2">
                <Label>Template Context Usage</Label>
                <Textarea rows={2}
                  value={typeof form.template_context_usage === "string"
                    ? form.template_context_usage
                    : form.template_context_usage ? JSON.stringify(form.template_context_usage, null, 2) : ""}
                  onChange={(e) => set("template_context_usage", e.target.value as any)}
                  placeholder='e.g. {"include_seal": true, "include_disclaimer": true}' />
                <p className="text-xs text-muted-foreground mt-1">Optional JSON that template renderers can read.</p>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* USAGE */}
        <TabsContent value="usage">
          <UsageTab form={form} missing={missing as unknown as string[]} />
        </TabsContent>
      </Tabs>

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur z-40">
          <div className="container mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              You have unsaved changes. Last saved: {lastSaved}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setForm(baseline)}>Discard</Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Usage & Validation ----------------------------- */

function UsageTab({ form, missing }: { form: Partial<LgDepartmentProfileFull>; missing: string[] }) {
  const has = (k: keyof LgDepartmentProfileFull) => {
    const v = form[k] as any;
    return v !== null && v !== undefined && v !== "" && v !== false;
  };

  const rows = [
    { consumer: "Letter templates",   fields: ["institution_name", "department_name", "letter_signature"], ok: has("letter_signature") && has("institution_name") },
    { consumer: "Notices",            fields: ["department_name", "notice_footer", "phone", "email"],       ok: has("notice_footer") },
    { consumer: "Email notifications",fields: ["reply_to_email", "email_signature", "notification_sender_email"], ok: has("reply_to_email") && has("email_signature") },
    { consumer: "Generated PDFs",     fields: ["logo_url", "institution_name", "address_line1"],            ok: form.show_on_pdfs !== false && has("institution_name") },
    { consumer: "Reports",            fields: ["show_letterhead_on_reports", "logo_url"],                   ok: form.show_letterhead_on_reports !== false },
    { consumer: "AI prompts",         fields: ["ai_prompt_prefix", "institution_name", "department_name"], ok: has("ai_prompt_prefix") },
    { consumer: "DMS metadata",       fields: ["dms_folder_root", "department_name"],                       ok: has("dms_folder_root") },
    { consumer: "Print layouts",      fields: ["logo_url", "print_footer", "address_line1"],                ok: has("logo_url") },
    { consumer: "Workflow gating",    fields: ["department_size_mode", "approvals_mode"],                   ok: has("approvals_mode") },
  ];

  const allFields: (keyof LgDepartmentProfileFull)[] = [
    "institution_name","department_name","department_code","short_name","status","description",
    "country_code","jurisdiction","time_zone","currency","language","website","logo_url","seal_url",
    "email","phone","fax","reply_to_email","support_email","office_hours",
    "address_line1","address_line2","city","parish","state_region","postal_code",
    "head_of_legal_staff_id","deputy_head_staff_id","escalation_contact_staff_id","notification_recipients",
    "letter_signature","email_signature","notice_footer","default_salutation",
    "letterhead_header","letterhead_footer","legal_disclaimer","print_footer",
    "default_team_id","default_workbasket_id","department_size_mode","auto_assign_mode","approvals_mode",
    "assistant_review_required","manager_role_required",
    "dms_folder_root","default_document_owner_staff_id","notification_sender_email",
    "ai_prompt_prefix","ai_context_settings","template_context_usage",
    "show_on_pdfs","show_letterhead_on_reports",
  ];
  const referenced = new Set(rows.flatMap((r) => r.fields));
  const orphans = allFields.filter((f) => has(f) && !referenced.has(f as string));
  const unconfigured = allFields.filter((f) => !has(f));

  return (
    <div className="space-y-4">
      {missing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" /> Missing Required Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {missing.map((m) => <Badge key={m} variant="destructive">{m}</Badge>)}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Info className="h-4 w-4" /> Used By</CardTitle>
          <CardDescription>Where Department Profile values flow across the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="py-2 pr-3">Consumer</th><th className="py-2 pr-3">Fields used</th><th className="py-2 pr-3">Status</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.consumer} className="border-t">
                    <td className="py-2 pr-3 font-medium">{r.consumer}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{r.fields.join(", ")}</td>
                    <td className="py-2 pr-3">
                      {r.ok
                        ? <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Wired</Badge>
                        : <Badge variant="secondary" className="gap-1"><Info className="h-3 w-3" /> Configurable</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Configured but not referenced</CardTitle>
            <CardDescription>Fields you set that no consumer reads yet.</CardDescription>
          </CardHeader>
          <CardContent>
            {orphans.length === 0
              ? <p className="text-xs text-muted-foreground">All configured fields are referenced by at least one consumer.</p>
              : <div className="flex flex-wrap gap-2">{orphans.map((f) => <Badge key={String(f)} variant="outline">{String(f)}</Badge>)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Unconfigured fields</CardTitle>
            <CardDescription>Available but not yet filled in.</CardDescription>
          </CardHeader>
          <CardContent>
            {unconfigured.length === 0
              ? <p className="text-xs text-muted-foreground">All fields are configured.</p>
              : <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">{unconfigured.map((f) => <Badge key={String(f)} variant="secondary">{String(f)}</Badge>)}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
