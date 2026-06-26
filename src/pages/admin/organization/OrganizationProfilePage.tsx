import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Building, ShieldCheck } from "lucide-react";
import { useOrganizations, useOrganizationMutation } from "@/hooks/comm/useOrgManagement";

export default function OrganizationProfilePage() {
  const { data: orgs = [], isLoading } = useOrganizations();
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
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="defaults">Defaults</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardContent className="p-6 grid md:grid-cols-2 gap-4">
              <Field label="Org Code *" error={errors.org_code}><Input value={form.org_code ?? ""} onChange={(e) => set("org_code", e.target.value)} /></Field>
              <Field label="Short Name"><Input value={form.short_name ?? ""} onChange={(e) => set("short_name", e.target.value)} /></Field>
              <Field label="Legal Name *" error={errors.legal_name} className="md:col-span-2"><Input value={form.legal_name ?? ""} onChange={(e) => set("legal_name", e.target.value)} /></Field>
              <Field label="Registration No."><Input value={form.registration_no ?? ""} onChange={(e) => set("registration_no", e.target.value)} /></Field>
              <Field label="Status"><Input value={form.status ?? ""} onChange={(e) => set("status", e.target.value)} /></Field>
              <Field label="Description" className="md:col-span-2"><Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardContent className="p-6 grid md:grid-cols-2 gap-4">
              <Field label="Country Code *" error={errors.country_code}><Input value={form.country_code ?? ""} onChange={(e) => set("country_code", e.target.value)} placeholder="KN" /></Field>
              <Field label="Website"><Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} /></Field>
              <Field label="Main Email"><Input type="email" value={form.main_email ?? ""} onChange={(e) => set("main_email", e.target.value)} /></Field>
              <Field label="Main Phone"><Input value={form.main_phone ?? ""} onChange={(e) => set("main_phone", e.target.value)} /></Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardContent className="p-6 grid md:grid-cols-2 gap-4">
              <Field label="Primary Logo URL"><Input value={form.primary_logo_url ?? ""} onChange={(e) => set("primary_logo_url", e.target.value)} /></Field>
              <Field label="Secondary Logo URL"><Input value={form.secondary_logo_url ?? ""} onChange={(e) => set("secondary_logo_url", e.target.value)} /></Field>
              <Field label="Seal URL"><Input value={form.seal_url ?? ""} onChange={(e) => set("seal_url", e.target.value)} /></Field>
              <Field label="Logo Asset ID"><Input value={form.logo_asset_id ?? ""} onChange={(e) => set("logo_asset_id", e.target.value)} /></Field>
              <Field label="Seal Asset ID"><Input value={form.seal_asset_id ?? ""} onChange={(e) => set("seal_asset_id", e.target.value)} /></Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaults">
          <Card>
            <CardContent className="p-6 grid md:grid-cols-2 gap-4">
              <Field label="Default Currency"><Input value={form.default_currency ?? ""} onChange={(e) => set("default_currency", e.target.value)} placeholder="XCD" /></Field>
              <Field label="Default Language"><Input value={form.default_language ?? ""} onChange={(e) => set("default_language", e.target.value)} placeholder="en" /></Field>
              <Field label="Time Zone"><Input value={form.time_zone ?? ""} onChange={(e) => set("time_zone", e.target.value)} placeholder="America/St_Kitts" /></Field>
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

function Field({ label, error, children, className }: { label: string; error?: string; children: any; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
