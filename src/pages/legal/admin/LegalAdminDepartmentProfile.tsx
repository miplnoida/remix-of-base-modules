import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

interface DepartmentProfileRow {
  id?: string;
  institution_name: string | null;
  department_name: string | null;
  country_code: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_region: string | null;
  postal_code: string | null;
  website: string | null;
}

const empty: DepartmentProfileRow = {
  institution_name: "St. Christopher and Nevis Social Security Board",
  department_name: "Legal Department",
  country_code: "SKN",
  email: null,
  phone: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state_region: null,
  postal_code: null,
  website: null,
};

export default function LegalAdminDepartmentProfile() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["lg_department_profile"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lg_department_profile").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return (data ?? null) as DepartmentProfileRow | null;
    },
  });

  const [form, setForm] = useState<DepartmentProfileRow>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({ ...empty, ...data });
  }, [data]);

  const set = (k: keyof DepartmentProfileRow, v: string) =>
    setForm((f) => ({ ...f, [k]: v === "" ? null : v }));

  const isComplete = !!(
    form.institution_name && form.department_name && form.country_code &&
    form.email && form.phone && form.address_line1 && form.city
  );

  async function save() {
    if (!form.institution_name || !form.department_name || !form.country_code) {
      toast.error("Institution, Department and Country are required");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, country_code: (form.country_code ?? "").toUpperCase() };
      const { error } = form.id
        ? await sb.from("lg_department_profile").update(payload).eq("id", form.id)
        : await sb.from("lg_department_profile").insert(payload);
      if (error) throw error;
      toast.success("Department profile saved", {
        description: `Identity for ${payload.department_name} (${payload.country_code}) updated.`,
      });
      qc.invalidateQueries({ queryKey: ["lg_department_profile"] });
      qc.invalidateQueries({ queryKey: ["legal_setup_validation"] });
    } catch (e: any) {
      toast.error("Save failed", { description: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Building2 className="h-6 w-6" /> Department Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Identity of the Legal Department used on letters, notices, complainant party
            records and templates.
          </p>
        </div>
        <Badge variant={isComplete ? "default" : "secondary"}>
          {isComplete ? "Complete" : "Incomplete"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Institution &amp; Department</CardTitle>
          <CardDescription>
            Shown as the issuing authority on every legal communication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Institution *</Label>
                  <Input value={form.institution_name ?? ""}
                    onChange={(e) => set("institution_name", e.target.value)} />
                </div>
                <div>
                  <Label>Department *</Label>
                  <Input value={form.department_name ?? ""}
                    onChange={(e) => set("department_name", e.target.value)} />
                </div>
                <div>
                  <Label>Country Code *</Label>
                  <Input value={form.country_code ?? ""} maxLength={3}
                    onChange={(e) => set("country_code", e.target.value.toUpperCase())} />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input value={form.website ?? ""}
                    onChange={(e) => set("website", e.target.value)} />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email ?? ""}
                    onChange={(e) => set("email", e.target.value)} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone ?? ""}
                    onChange={(e) => set("phone", e.target.value)} />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label>Address Line 1</Label>
                  <Input value={form.address_line1 ?? ""}
                    onChange={(e) => set("address_line1", e.target.value)} />
                </div>
                <div>
                  <Label>Address Line 2</Label>
                  <Input value={form.address_line2 ?? ""}
                    onChange={(e) => set("address_line2", e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input value={form.city ?? ""}
                      onChange={(e) => set("city", e.target.value)} />
                  </div>
                  <div>
                    <Label>State / Region</Label>
                    <Input value={form.state_region ?? ""}
                      onChange={(e) => set("state_region", e.target.value)} />
                  </div>
                  <div>
                    <Label>Postal Code</Label>
                    <Input value={form.postal_code ?? ""}
                      onChange={(e) => set("postal_code", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Department Profile
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
