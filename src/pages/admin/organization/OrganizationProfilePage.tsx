import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Building, ShieldCheck, Eye } from "lucide-react";
import { useOrganizations, useOrganizationMutation } from "@/hooks/comm/useOrgManagement";
import { useCountryOptions, useCurrencyOptions, useLanguageOptions, useTimezoneOptions } from "@/hooks/comm/useOrgMasters";
import { useLetterheads, useEmailSignatures, useDisclaimers, usePrintFooters, useLetterheadById } from "@/hooks/comm/useCommAssets";
import { useOfficeLocations } from "@/hooks/comm/useOrgManagement";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { AssetPickerField } from "@/components/comm/AssetPickerField";
import { DefaultAssetPicker, type DefaultAssetOption } from "@/components/comm/DefaultAssetPicker";
import { BrandingPreviewTab } from "@/components/comm/BrandingPreviewTab";
import { LetterheadPreview } from "@/components/comm/LetterheadPreview";


function OrganizationProfileInner() {
  const { data: orgs = [], isLoading } = useOrganizations();
  const { data: countries = [] } = useCountryOptions();
  const { data: currencies = [] } = useCurrencyOptions();
  const { data: languages = [] } = useLanguageOptions();
  const { data: timezones = [] } = useTimezoneOptions();
  const { data: letterheads = [] } = useLetterheads();
  const { data: signatures = [] } = useEmailSignatures();
  const { data: disclaimers = [] } = useDisclaimers();
  const { data: footers = [] } = usePrintFooters();
  const { data: locations = [] } = useOfficeLocations();
  const mut = useOrganizationMutation();
  const [form, setForm] = useState<any>({});

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (orgs[0]) setForm(orgs[0]);
  }, [orgs]);

  const set = (k: string, v: any) => {
    setForm((f: any) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.org_code?.trim()) e.org_code = "Required";
    if (!form.legal_name?.trim()) e.legal_name = "Required";
    if (!form.country_code?.trim()) e.country_code = "Required";
    if (form.main_email && !/^\S+@\S+\.\S+$/.test(form.main_email)) e.main_email = "Invalid email";
    if (form.website && !/^https?:\/\//i.test(form.website)) e.website = "Must start with http:// or https://";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    mut.mutate(form);
  };

  if (isLoading) return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Building className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Organization Profile</h1>
          <p className="text-sm text-muted-foreground">Central identity for the institution. Used by every department, letter, email and report.</p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="contact">Contact &amp; Defaults</TabsTrigger>
          <TabsTrigger value="defaults">Comm Defaults</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="preview"><Eye className="h-3.5 w-3.5 mr-1" /> Branding Preview</TabsTrigger>
        </TabsList>


        <TabsContent value="general">
          <Card>
            <CardContent className="p-6 grid md:grid-cols-2 gap-4">
              <Field label="Org Code *" error={errors.org_code}><Input value={form.org_code ?? ""} onChange={(e) => set("org_code", e.target.value)} /></Field>
              <Field label="Short Name"><Input value={form.short_name ?? ""} onChange={(e) => set("short_name", e.target.value)} /></Field>
              <Field label="Legal Name *" error={errors.legal_name} className="md:col-span-2"><Input value={form.legal_name ?? ""} onChange={(e) => set("legal_name", e.target.value)} /></Field>
              <Field label="Registration No."><Input value={form.registration_no ?? ""} onChange={(e) => set("registration_no", e.target.value)} /></Field>
              <Field label="Status">
                <Select value={form.status ?? ""} onChange={(v) => set("status", v)} options={[
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Inactive" },
                ]} />
              </Field>
              <Field label="Description" className="md:col-span-2"><Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardContent className="p-6 grid md:grid-cols-2 gap-4">
              <Field label="Country *" error={errors.country_code}>
                <Select value={form.country_code ?? ""} onChange={(v) => set("country_code", v)}
                  options={countries.map((c) => ({ value: c.code, label: `${c.code} — ${c.description}` }))} />
              </Field>
              <Field label="Default Currency">
                <Select value={form.default_currency ?? ""} onChange={(v) => set("default_currency", v)}
                  options={currencies.map((c) => ({ value: c.code, label: c.label }))} />
              </Field>
              <Field label="Default Language">
                <Select value={form.default_language ?? ""} onChange={(v) => set("default_language", v)}
                  options={languages.map((l) => ({ value: l.code, label: l.label }))} />
              </Field>
              <Field label="Time Zone">
                <Select value={form.time_zone ?? ""} onChange={(v) => set("time_zone", v)}
                  options={timezones.map((t) => ({ value: t.code, label: t.label }))} />
              </Field>
              <Field label="Website" error={errors.website}><Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://..." /></Field>
              <Field label="Main Email" error={errors.main_email}><Input type="email" value={form.main_email ?? ""} onChange={(e) => set("main_email", e.target.value)} /></Field>
              <Field label="Main Phone"><Input value={form.main_phone ?? ""} onChange={(e) => set("main_phone", e.target.value)} /></Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaults">
          <Card>
            <CardContent className="p-6 grid md:grid-cols-2 gap-4">
              <p className="md:col-span-2 text-xs text-muted-foreground">
                Organization-wide fallbacks used by every department, letter and email unless overridden.
                Dropdowns are grouped by owning module. The chip beside a selection shows code, module and status; use
                <em> Preview</em> for a live render, <em>Master</em> to jump to the asset editor, and <em>Test Resolve</em>
                to run the same resolver the runtime uses.
              </p>

              <DefaultAssetPicker
                label="Default Letterhead"
                value={form.default_letterhead_id}
                onChange={(id) => set("default_letterhead_id", id)}
                options={toOptions(letterheads)}
                masterPath="/admin/org/assets/letterheads"
                renderPreview={(o) => <LetterheadPreviewFor id={o.id} />}
                onTestResolve={async (o) => ({ resolved: o.code ?? o.name, source: "organization_default" })}
              />
              <DefaultAssetPicker
                label="Default Email Signature"
                value={form.default_email_signature_id}
                onChange={(id) => set("default_email_signature_id", id)}
                options={toOptions(signatures, "scope_code")}
                masterPath="/admin/org/assets/signatures"
                onTestResolve={async (o) => ({ resolved: o.code ?? o.name, source: "organization_default" })}
              />
              <DefaultAssetPicker
                label="Default Disclaimer"
                value={form.default_disclaimer_id}
                onChange={(id) => set("default_disclaimer_id", id)}
                options={toOptions(disclaimers)}
                masterPath="/admin/org/assets/disclaimers"
                hint="Disclaimer body is sourced from the linked Text Block (single source of truth)."
                onTestResolve={async (o) => ({ resolved: o.name, source: "text_block" })}
              />
              <DefaultAssetPicker
                label="Default Print Footer"
                value={form.default_print_footer_id}
                onChange={(id) => set("default_print_footer_id", id)}
                options={toOptions(footers)}
                masterPath="/admin/org/assets/headers-footers"
                onTestResolve={async (o) => ({ resolved: o.code ?? o.name, source: "organization_default" })}
              />

              <Field label="Default Location">
                <Select value={form.default_location_id ?? ""} onChange={(v) => set("default_location_id", v || null)}
                  options={locations.filter((l: any) => l.is_active).map((l: any) => ({ value: l.id, label: l.branch_name }))} />
              </Field>
              <Field label="Default DMS Folder">
                <Input value={form.default_dms_folder_id ?? ""} onChange={(e) => set("default_dms_folder_id", e.target.value)} placeholder="Optional — leave blank to use module defaults" />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardContent className="p-6">
              <BrandingPreviewTab
                letterheadId={form.default_letterhead_id}
                signatureId={form.default_email_signature_id}
                disclaimerId={form.default_disclaimer_id}
                footerId={form.default_print_footer_id}
                orgName={form.short_name || form.legal_name}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardContent className="p-6 grid md:grid-cols-2 gap-4">
              <p className="md:col-span-2 text-xs text-muted-foreground">
                Pick any image from the Communication Assets Library, upload a new one, or paste an external URL. Each slot stays bound to a versioned, auditable asset record.
              </p>
              <AssetPickerField
                label="Primary Logo"
                category="logo"
                value={form.logo_asset_id}
                onChange={(id) => set("logo_asset_id", id)}
                hint="Used on letterheads, portals and AI-generated communications."
              />
              <AssetPickerField
                label="Small / Favicon Logo"
                category="logo_small"
                value={form.logo_small_asset_id}
                onChange={(id) => set("logo_small_asset_id", id)}
                hint="Used in email signatures and small UI surfaces."
              />
              <AssetPickerField
                label="Official Seal"
                category="seal"
                value={form.seal_asset_id}
                onChange={(id) => set("seal_asset_id", id)}
                hint="Applied to certificates and official notices."
              />
              <AssetPickerField
                label="Document Watermark"
                category="watermark"
                value={form.watermark_asset_id}
                onChange={(id) => set("watermark_asset_id", id)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 bg-background border-t pt-3 flex justify-end gap-2">
        <Button onClick={save} disabled={mut.isPending}>
          {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Organization Profile
        </Button>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Used By</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Department profiles, generated letters, email signatures, notifications, DMS metadata, and AI prompt context all resolve organization fields from this record via <code>communicationResolver</code>.
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrganizationProfilePage() {
  return (
    <PermissionWrapper moduleName="org_profile">
      <OrganizationProfileInner />
    </PermissionWrapper>
  );
}

function Field({ label, error, children, className }: { label: string; error?: string; children: any; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select className="w-full border rounded h-10 px-2 bg-background" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** Adapt any comm asset list to DefaultAssetPicker options. */
function toOptions(list: any[], moduleField: string = "module_code"): DefaultAssetOption[] {
  return (list ?? [])
    .filter((r) => r && r.id)
    .map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code ?? null,
      module_code: r[moduleField] ?? r.module_code ?? null,
      category: r.category ?? null,
      is_active: r.is_active !== false,
      is_default: r.is_default === true,
    }));
}

/** Inline live letterhead preview loader used inside DefaultAssetPicker dialog. */
function LetterheadPreviewFor({ id }: { id: string }) {
  const { data } = useLetterheadById(id);
  if (!data) return <div className="p-6 text-sm text-muted-foreground text-center">Loading…</div>;
  const d = (data as any).design_config ?? {};
  return (
    <LetterheadPreview
      design={{
        page_size: d.page_size ?? "A4",
        orientation: d.orientation ?? "portrait",
        margins: d.margins,
        header_asset_code: d.header_asset_code,
        footer_asset_code: d.footer_asset_code,
        logo_asset_code: d.logo_asset_code,
        seal_asset_code: d.seal_asset_code,
        watermark_asset_code: d.watermark_asset_code,
      }}
    />
  );
}
