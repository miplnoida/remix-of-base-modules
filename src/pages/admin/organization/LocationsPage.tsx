import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Edit, MapPin, Loader2, Search, Star, Globe2, Building2, AlertTriangle } from "lucide-react";
import { StandardModal } from "@/components/common/StandardModal";
import { useOfficeLocations, useOfficeLocationMutation, type OfficeLocation } from "@/hooks/comm/useOrgManagement";
import { useCountryOptions } from "@/hooks/comm/useOrgMasters";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

// OM-9.6: business-friendly location type vocabulary.
const TYPES = ["HEAD_OFFICE", "BRANCH", "SERVICE_CENTER", "BACK_OFFICE", "WAREHOUSE", "OTHER"] as const;
const TYPE_LABEL: Record<string, string> = {
  HEAD_OFFICE: "Head Office",
  BRANCH: "Branch",
  SERVICE_CENTER: "Service Center",
  BACK_OFFICE: "Back Office",
  WAREHOUSE: "Warehouse",
  OTHER: "Other",
};

// Map legacy free-text values to canonical codes for display.
function canonicalType(t?: string | null): string {
  if (!t) return "OTHER";
  const up = t.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (up in TYPE_LABEL) return up;
  if (up === "HEADOFFICE") return "HEAD_OFFICE";
  if (up === "SERVICECENTER" || up === "SERVICE_CENTRE") return "SERVICE_CENTER";
  if (up === "BACKOFFICE") return "BACK_OFFICE";
  return "OTHER";
}

const SERVICE_CATALOGUE: { code: string; label: string }[] = [
  { code: "EMPLOYER",     label: "Employer Services" },
  { code: "INSURED",      label: "Insured Person Services" },
  { code: "CLAIMS",       label: "Claims Services" },
  { code: "CONTRIBUTION", label: "Contribution Services" },
  { code: "CASHIER",      label: "Cashier / Payments" },
  { code: "DOCUMENT",     label: "Document Submission" },
  { code: "ENQUIRY",      label: "General Enquiry" },
];

type EditRow = Partial<OfficeLocation> & {
  is_service_center?: boolean | null;
  public_facing?: boolean | null;
  services_offered?: string[] | null;
};

function LocationsInner() {
  const { data: locations = [], isLoading } = useOfficeLocations();
  const { data: countries = [] } = useCountryOptions();
  const mut = useOfficeLocationMutation();
  const [editing, setEditing] = useState<EditRow | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<string>("ALL");
  const [stepTab, setStepTab] = useState<string>("basic");

  const open = (row?: OfficeLocation) => {
    setErrors({});
    setWarnings([]);
    setStepTab("basic");
    setEditing(
      row
        ? { ...row, location_type: canonicalType(row.location_type) }
        : {
            is_active: true,
            location_type: "BRANCH",
            country: "KN",
            is_primary: false,
            is_service_center: false,
            public_facing: false,
            services_offered: [],
          },
    );
  };

  // Auto-apply Service Center rules when the type changes.
  useEffect(() => {
    if (!editing) return;
    if (editing.location_type === "SERVICE_CENTER" &&
        (!editing.is_service_center || !editing.public_facing)) {
      setEditing((e) => e && { ...e, is_service_center: true, public_facing: true });
    }
  }, [editing?.location_type]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!editing) return;
    const e: Record<string, string> = {};
    const w: string[] = [];
    if (!editing.branch_name?.trim()) e.branch_name = "Location name is required.";
    if (!editing.country?.trim()) e.country = "Country is required.";
    if (!editing.location_type) e.location_type = "Location type is required.";
    if (editing.email && !/^\S+@\S+\.\S+$/.test(editing.email)) e.email = "Enter a valid email address.";

    // Friendly warnings — do not block save
    if ((editing.public_facing || editing.is_service_center) && !editing.phone && !editing.email) {
      w.push("Public-facing locations should have a phone or email.");
    }
    if ((editing.public_facing || editing.is_service_center) && !editing.office_hours) {
      w.push("Public-facing locations should list office hours.");
    }
    if (editing.is_primary) {
      const other = locations.find(
        (l) => l.is_primary && l.is_active !== false && l.id !== editing.id,
      );
      if (other) w.push(`Another active primary location already exists ("${other.branch_name}").`);
    }
    if (editing.is_service_center && editing.location_type &&
        !["SERVICE_CENTER", "BRANCH", "HEAD_OFFICE"].includes(editing.location_type)) {
      w.push("Service Center flag is unusual for this location type.");
    }

    setErrors(e);
    setWarnings(w);
    if (Object.keys(e).length) {
      setStepTab("basic");
      return;
    }
    // Persist canonical fields only (compatible with existing table + new OM-9.6 columns).
    const payload: any = {
      ...editing,
      location_type: canonicalType(editing.location_type),
      services_offered: editing.services_offered ?? [],
    };
    mut.mutate(payload, { onSuccess: () => setEditing(null) });
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      ALL: locations.length,
      HEAD_OFFICE: 0, BRANCH: 0, SERVICE_CENTER: 0, OTHER: 0, INACTIVE: 0,
    };
    for (const l of locations) {
      if (l.is_active === false) c.INACTIVE++;
      const t = canonicalType(l.location_type);
      if (t === "HEAD_OFFICE" || t === "BRANCH" || t === "SERVICE_CENTER") c[t]++;
      else c.OTHER++;
    }
    return c;
  }, [locations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return locations.filter((l) => {
      const t = canonicalType(l.location_type);
      if (tab === "INACTIVE" && l.is_active !== false) return false;
      if (tab !== "ALL" && tab !== "INACTIVE") {
        if (tab === "OTHER") {
          if (["HEAD_OFFICE", "BRANCH", "SERVICE_CENTER"].includes(t)) return false;
        } else if (t !== tab) return false;
      }
      if (tab !== "INACTIVE" && l.is_active === false) return false;
      if (!q) return true;
      return [l.branch_name, l.parish_city, l.city, l.island_or_region, l.country, l.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [locations, query, tab]);

  const TABS: { key: string; label: string; count: number }[] = [
    { key: "ALL",            label: "All",             count: counts.ALL },
    { key: "HEAD_OFFICE",    label: "Head Office",     count: counts.HEAD_OFFICE },
    { key: "BRANCH",         label: "Branches",        count: counts.BRANCH },
    { key: "SERVICE_CENTER", label: "Service Centers", count: counts.SERVICE_CENTER },
    { key: "OTHER",          label: "Other",           count: counts.OTHER },
    { key: "INACTIVE",       label: "Inactive",        count: counts.INACTIVE },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Locations / Branches</h1>
            <p className="text-sm text-muted-foreground">
              Centrally managed offices, branches, and service centers. Consumed by department profiles, letters, notifications, and business modules.
            </p>
          </div>
        </div>
        <Button onClick={() => open()}><Plus className="h-4 w-4 mr-2" /> Add Location</Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, city, region, country…"
            className="pl-9"
          />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label} <span className="ml-1.5 text-xs text-muted-foreground">{t.count}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table sticky>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const t = canonicalType(l.location_type);
                  const anyL = l as any;
                  const isSc = !!anyL.is_service_center || t === "SERVICE_CENTER";
                  const isPub = !!anyL.public_facing || t === "SERVICE_CENTER";
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {l.branch_name}
                          {l.is_primary && <Star className="h-3.5 w-3.5 text-primary fill-primary" />}
                        </div>
                        {l.address && (
                          <div className="text-xs text-muted-foreground font-normal truncate max-w-[240px]">{l.address}</div>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="outline">{TYPE_LABEL[t]}</Badge></TableCell>
                      <TableCell>{l.island_or_region ?? "—"}</TableCell>
                      <TableCell>{l.parish_city ?? l.city ?? "—"}</TableCell>
                      <TableCell>{l.country ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.phone && <div>{l.phone}</div>}
                        {l.email && <div className="truncate max-w-[180px]">{l.email}</div>}
                        {!l.phone && !l.email && "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {l.is_primary && <Badge>Primary</Badge>}
                          {isSc && <Badge variant="secondary" className="gap-1"><Building2 className="h-3 w-3" /> Service Center</Badge>}
                          {isPub && !isSc && <Badge variant="secondary" className="gap-1"><Globe2 className="h-3 w-3" /> Public</Badge>}
                          {!l.is_primary && !isSc && !isPub && "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {l.is_active !== false
                          ? <Badge variant="secondary">Active</Badge>
                          : <Badge variant="outline">Inactive</Badge>}
                      </TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => open(l)}><Edit className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  );
                })}
                {!filtered.length && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground p-8">
                      {locations.length ? "No locations match your filters." : "No locations yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StandardModal
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.id ? "Edit Location" : "Add Location"}
        mode={editing?.id ? "edit" : "create"}
        size="3xl"
        onSave={save}
        onCancel={() => setEditing(null)}
        isSaving={mut.isPending}
        saveLabel="Save Location"
      >
        {editing && (
          <div className="space-y-4">
            {(Object.keys(errors).length > 0 || warnings.length > 0) && (
              <div className="space-y-2">
                {Object.keys(errors).length > 0 && (
                  <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>Please fix the highlighted fields before saving.</div>
                  </div>
                )}
                {warnings.length > 0 && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                    <div className="font-medium mb-1 text-amber-700 dark:text-amber-400">Please review</div>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      {warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <Tabs value={stepTab} onValueChange={setStepTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="flags">Service & Flags</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="pt-4 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Location Name *" error={errors.branch_name} className="md:col-span-2">
                    <Input
                      value={editing.branch_name ?? ""}
                      onChange={(e) => setEditing({ ...editing, branch_name: e.target.value })}
                      placeholder="Head Office - Basseterre"
                    />
                  </Field>
                  <Field label="Location Type *" error={errors.location_type}>
                    <select
                      className="w-full border rounded-md h-10 px-3 bg-background text-sm"
                      value={editing.location_type ?? "BRANCH"}
                      onChange={(e) => setEditing({ ...editing, location_type: e.target.value })}
                    >
                      {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Service Center = a public-facing location for citizens, employers, or claimants.
                    </p>
                  </Field>
                  <Field label="Status">
                    <div className="flex items-center gap-3 h-10">
                      <Switch
                        checked={editing.is_active !== false}
                        onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                      />
                      <span className="text-sm">{editing.is_active !== false ? "Active" : "Inactive"}</span>
                    </div>
                  </Field>
                </div>
              </TabsContent>

              <TabsContent value="address" className="pt-4 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Country *" error={errors.country}>
                    <select
                      className="w-full border rounded-md h-10 px-3 bg-background text-sm"
                      value={editing.country ?? ""}
                      onChange={(e) => setEditing({ ...editing, country: e.target.value })}
                    >
                      <option value="">— Select country —</option>
                      {countries.map((c) => (
                        <option key={c.code} value={c.code}>{c.code} — {c.description}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Island / Region">
                    <Input
                      value={editing.island_or_region ?? ""}
                      onChange={(e) => setEditing({ ...editing, island_or_region: e.target.value })}
                      placeholder="Saint Kitts"
                    />
                  </Field>
                  <Field label="Parish / City">
                    <Input
                      value={editing.parish_city ?? ""}
                      onChange={(e) => setEditing({ ...editing, parish_city: e.target.value })}
                      placeholder="Basseterre"
                    />
                  </Field>
                  <Field label="Street Address" className="md:col-span-2">
                    <Input
                      value={editing.address ?? ""}
                      onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                    />
                  </Field>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="pt-4 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Phone">
                    <Input
                      value={editing.phone ?? ""}
                      onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                      placeholder="(869) 465-2535"
                    />
                  </Field>
                  <Field label="Fax">
                    <Input
                      value={editing.fax ?? ""}
                      onChange={(e) => setEditing({ ...editing, fax: e.target.value })}
                    />
                  </Field>
                  <Field label="Email" error={errors.email}>
                    <Input
                      type="email"
                      value={editing.email ?? ""}
                      onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                      placeholder="office@socialsecurity.kn"
                    />
                  </Field>
                  <Field label="Office Hours">
                    <Input
                      value={editing.office_hours ?? ""}
                      onChange={(e) => setEditing({ ...editing, office_hours: e.target.value })}
                      placeholder="Mon–Fri 8:00–16:00"
                    />
                  </Field>
                  <Field label="Manager User Code" className="md:col-span-2">
                    <Input
                      value={editing.manager_user_code ?? ""}
                      onChange={(e) => setEditing({ ...editing, manager_user_code: e.target.value })}
                    />
                  </Field>
                </div>
              </TabsContent>

              <TabsContent value="flags" className="pt-4 space-y-3">
                <FlagRow
                  title="Primary location"
                  hint="Used as the organisation's default office."
                  checked={!!editing.is_primary}
                  onChange={(v) => setEditing({ ...editing, is_primary: v })}
                />
                <FlagRow
                  title="Service Center"
                  hint="Public-facing location where citizens, employers or claimants can receive services."
                  checked={!!editing.is_service_center}
                  onChange={(v) => setEditing({
                    ...editing,
                    is_service_center: v,
                    public_facing: v ? true : editing.public_facing,
                  })}
                />
                <FlagRow
                  title="Public Facing"
                  hint="Accepts public visitors. Contact details and office hours are recommended."
                  checked={!!editing.public_facing}
                  onChange={(v) => setEditing({ ...editing, public_facing: v })}
                />

                {(editing.is_service_center || editing.public_facing) && (
                  <div className="rounded-md border p-3">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Services Offered
                    </Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {SERVICE_CATALOGUE.map((s) => {
                        const selected = editing.services_offered ?? [];
                        const on = selected.includes(s.code);
                        return (
                          <label key={s.code} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => {
                                const next = on
                                  ? selected.filter((x) => x !== s.code)
                                  : [...selected, s.code];
                                setEditing({ ...editing, services_offered: next });
                              }}
                            />
                            {s.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </StandardModal>
    </div>
  );
}

export default function LocationsPage() {
  return (
    <PermissionWrapper moduleName="org_locations">
      <LocationsInner />
    </PermissionWrapper>
  );
}

function Field({
  label, error, children, className,
}: { label: string; error?: string; children: any; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function FlagRow({
  title, hint, checked, onChange,
}: { title: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-md border">
      <div className="pr-4">
        <Label>{title}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
