import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";
import { useSsbImplementationConfig } from "@/hooks/ssb/useSsbImplementationConfig";
import { createNewVersion } from "@/services/ssb/ssbPolicyLifecycleService";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, GitBranch } from "lucide-react";

const db: any = supabase;

const ADDRESS_COMPONENTS = [
  { value: "street_address", label: "Street address" },
  { value: "village",        label: "Village" },
  { value: "parish",         label: "Parish" },
  { value: "island",         label: "Island" },
  { value: "postal_code",    label: "Postal code" },
  { value: "po_box",         label: "PO Box" },
  { value: "country",        label: "Country" },
];

const config: SectionConfig = {
  sectionKey: "address",
  assetKey: "ssb.address",
  table: "ssb_address_policy",
  title: "Address & Geography Policy",
  description:
    "Country binding, parish/village toggles and address components. Field lists and admin-hierarchy levels are managed as relational rows in the child tables below (no JSON).",
  scopeColumns: ["profile_id", "country_code"],
  fields: [
    { name: "country_code", label: "Country Code", type: "text", required: true, helpText: "ISO-2, e.g. KN", placeholder: "KN" },
    { name: "use_parish",   label: "Use parish level",  type: "boolean" },
    { name: "use_village",  label: "Use village level", type: "boolean" },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    country_code: "KN",
    use_parish: true,
    use_village: true,
  }),
};

// -------------------------------------------------------------------
// Child-row editor for the active/latest editable policy
// -------------------------------------------------------------------

function AddressChildEditor({ profileId }: { profileId: string }) {
  const qc = useQueryClient();

  // Pick target row: prefer DRAFT/SCHEDULED (editable); else ACTIVE (will clone).
  const { data: target, isLoading } = useQuery({
    queryKey: ["ssb-address-target", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await db
        .from("ssb_address_policy").select("*")
        .eq("profile_id", profileId)
        .order("updated_at", { ascending: false });
      const rows = (data ?? []) as any[];
      const draft = rows.find((r) => r.status === "DRAFT" || r.status === "SCHEDULED");
      const active = rows.find((r) => r.status === "ACTIVE" && r.is_current);
      return draft ?? active ?? null;
    },
  });

  const { data: fields = [] } = useQuery({
    queryKey: ["ssb-address-fields", target?.id],
    enabled: !!target?.id,
    queryFn: async () => {
      const { data } = await db
        .from("ssb_address_policy_field").select("*")
        .eq("policy_id", target.id)
        .order("field_kind").order("display_order");
      return (data ?? []) as any[];
    },
  });

  const { data: levels = [] } = useQuery({
    queryKey: ["ssb-admin-levels", target?.country_code],
    enabled: !!target?.country_code,
    queryFn: async () => {
      const { data } = await db
        .from("ssp_admin_level").select("*")
        .eq("country_code", target.country_code)
        .eq("is_active", true)
        .order("level_no");
      return (data ?? []) as any[];
    },
  });

  const { data: selectedLevels = [] } = useQuery({
    queryKey: ["ssb-address-levels", target?.id],
    enabled: !!target?.id,
    queryFn: async () => {
      const { data } = await db
        .from("ssb_address_policy_admin_level").select("*")
        .eq("policy_id", target.id)
        .order("display_order");
      return (data ?? []) as any[];
    },
  });

  const mandatorySet = useMemo(
    () => new Set(fields.filter((f) => f.field_kind === "mandatory").map((f) => f.field_code)),
    [fields],
  );
  const optionalSet = useMemo(
    () => new Set(fields.filter((f) => f.field_kind === "optional").map((f) => f.field_code)),
    [fields],
  );
  const levelSet = useMemo(
    () => new Set(selectedLevels.map((l) => l.admin_level_code)),
    [selectedLevels],
  );

  const [localMand, setLocalMand] = useState<Set<string> | null>(null);
  const [localOpt,  setLocalOpt]  = useState<Set<string> | null>(null);
  const [localLvl,  setLocalLvl]  = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);

  const mand = localMand ?? mandatorySet;
  const opt  = localOpt  ?? optionalSet;
  const lvl  = localLvl  ?? levelSet;

  const toggle = (set: Set<string>, code: string, other: Set<string>): Set<string> => {
    const next = new Set(set);
    if (next.has(code)) next.delete(code);
    else { next.add(code); other.delete(code); }
    return next;
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["ssb-address-target"] });
    qc.invalidateQueries({ queryKey: ["ssb-address-fields"] });
    qc.invalidateQueries({ queryKey: ["ssb-address-levels"] });
    qc.invalidateQueries({ queryKey: ["ssb-policy", "ssb_address_policy"] });
    qc.invalidateQueries({ queryKey: ["ssb-health"] });
    qc.invalidateQueries({ queryKey: ["cg"] });
  };

  const save = async () => {
    if (!target) return;
    setSaving(true);
    try {
      let policyId = target.id;
      // If we're editing an ACTIVE row, clone it as a new DRAFT first.
      if (target.status === "ACTIVE") {
        const draft = await createNewVersion({ table: "ssb_address_policy", fromPolicyId: target.id });
        policyId = draft.id;
      }

      // Replace child rows for policyId
      await db.from("ssb_address_policy_field").delete().eq("policy_id", policyId);
      const fieldRows: any[] = [];
      Array.from(mand).forEach((code, i) => fieldRows.push({ policy_id: policyId, field_code: code, field_kind: "mandatory", display_order: i }));
      Array.from(opt).forEach((code, i)  => fieldRows.push({ policy_id: policyId, field_code: code, field_kind: "optional",  display_order: 100 + i }));
      if (fieldRows.length) {
        const { error } = await db.from("ssb_address_policy_field").insert(fieldRows);
        if (error) throw error;
      }

      await db.from("ssb_address_policy_admin_level").delete().eq("policy_id", policyId);
      const levelRows = levels
        .filter((l) => lvl.has(l.code))
        .map((l, i) => ({ policy_id: policyId, admin_level_code: l.code, display_order: i, is_required: true }));
      if (levelRows.length) {
        const { error } = await db.from("ssb_address_policy_admin_level").insert(levelRows);
        if (error) throw error;
      }

      toast.success(target.status === "ACTIVE" ? "Saved to new DRAFT version" : "Saved");
      setLocalMand(null); setLocalOpt(null); setLocalLvl(null);
      invalidate();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!target) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address components & admin hierarchy</CardTitle>
          <CardDescription>Create an address policy row above to configure fields.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base">Address components & admin hierarchy</CardTitle>
            <CardDescription>
              Relational configuration for policy v{target.version_no}{" "}
              <Badge variant="outline" className="ml-1 text-[10px]">{target.status}</Badge>
              {target.status === "ACTIVE" && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-700">
                  <GitBranch className="h-3 w-3" /> saving will clone as a new DRAFT
                </span>
              )}
            </CardDescription>
          </div>
          <Button size="sm" onClick={save} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save child rows"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="text-xs font-medium mb-2">Mandatory fields</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ADDRESS_COMPONENTS.map((c) => (
              <label key={c.value} className="flex items-center gap-2 text-xs border rounded-md px-2 py-1 cursor-pointer">
                <Checkbox
                  checked={mand.has(c.value)}
                  onCheckedChange={() => { setLocalMand(toggle(mand, c.value, new Set(opt))); setLocalOpt(new Set([...opt].filter((v) => v !== c.value))); }}
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium mb-2">Optional fields</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ADDRESS_COMPONENTS.map((c) => (
              <label key={c.value} className="flex items-center gap-2 text-xs border rounded-md px-2 py-1 cursor-pointer">
                <Checkbox
                  checked={opt.has(c.value)}
                  onCheckedChange={() => { setLocalOpt(toggle(opt, c.value, new Set(mand))); setLocalMand(new Set([...mand].filter((v) => v !== c.value))); }}
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium mb-2">Admin hierarchy (from Geography master)</div>
          {levels.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              No admin levels defined for {target.country_code} in the shared Geography domain.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {levels.map((l) => (
                <label key={l.code} className="flex items-center gap-2 text-xs border rounded-md px-2 py-1 cursor-pointer">
                  <Checkbox
                    checked={lvl.has(l.code)}
                    onCheckedChange={() => {
                      const next = new Set(lvl);
                      if (next.has(l.code)) next.delete(l.code); else next.add(l.code);
                      setLocalLvl(next);
                    }}
                  />
                  <span>{l.name}</span>
                  <span className="text-muted-foreground">({l.code})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AddressPolicyForm() {
  const { data: profile } = useSsbImplementationConfig();
  return (
    <div className="space-y-4">
      <SsbPolicySectionShell config={config} />
      {profile?.id && <AddressChildEditor profileId={profile.id} />}
    </div>
  );
}
