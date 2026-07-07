import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus,
  Edit,
  MapPin,
  Loader2,
  Search,
  Building2,
  Landmark,
  Store,
  Compass,
  Star,
  Phone,
  Mail,
  Clock,
  Globe2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useOfficeLocations, useOfficeLocationMutation, type OfficeLocation } from "@/hooks/comm/useOrgManagement";
import { useCountryOptions } from "@/hooks/comm/useOrgMasters";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { cn } from "@/lib/utils";

const TYPES = ["HEAD_OFFICE", "BRANCH", "SERVICE_CENTER", "OTHER"] as const;

const TYPE_META: Record<string, { label: string; icon: any; className: string }> = {
  HEAD_OFFICE: { label: "Head Office", icon: Landmark, className: "bg-primary/10 text-primary border-primary/20" },
  BRANCH: { label: "Branch", icon: Building2, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  SERVICE_CENTER: { label: "Service Center", icon: Store, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  OTHER: { label: "Other", icon: Compass, className: "bg-muted text-muted-foreground border-border" },
};

function TypePill({ type }: { type?: string | null }) {
  const meta = TYPE_META[type ?? "OTHER"] ?? TYPE_META.OTHER;
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium", meta.className)}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function LocationsInner() {
  const { data: locations = [], isLoading } = useOfficeLocations();
  const { data: countries = [] } = useCountryOptions();
  const mut = useOfficeLocationMutation();
  const [editing, setEditing] = useState<Partial<OfficeLocation> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const open = (row?: OfficeLocation) => {
    setErrors({});
    setEditing(row ?? { is_active: true, location_type: "BRANCH", country: "KN" });
  };

  const save = () => {
    if (!editing) return;
    const e: Record<string, string> = {};
    if (!editing.branch_name?.trim()) e.branch_name = "Required";
    if (!editing.country?.trim()) e.country = "Required";
    setErrors(e);
    if (Object.keys(e).length) return;
    mut.mutate(editing, { onSuccess: () => setEditing(null) });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return locations.filter((l) => {
      if (typeFilter !== "ALL" && (l.location_type ?? "") !== typeFilter) return false;
      if (!q) return true;
      return [l.branch_name, l.parish_city, l.city, l.island_or_region, l.country, l.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [locations, query, typeFilter]);

  const stats = useMemo(() => {
    const total = locations.length;
    const active = locations.filter((l) => l.is_active !== false).length;
    const primary = locations.find((l) => l.is_primary)?.branch_name ?? "—";
    const byType = locations.reduce<Record<string, number>>((acc, l) => {
      const t = l.location_type ?? "OTHER";
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});
    return { total, active, primary, byType };
  }, [locations]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/20">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Locations &amp; Branches</h1>
              <p className="text-sm text-muted-foreground max-w-2xl mt-1">
                Centrally managed offices reused by department profiles, letters, and notifications.
              </p>
            </div>
          </div>
          <Button size="lg" onClick={() => open()} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Add Location
          </Button>
        </div>

        {/* Stat chips */}
        <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatChip icon={Globe2} label="Total" value={String(stats.total)} />
          <StatChip icon={CheckCircle2} label="Active" value={String(stats.active)} tone="success" />
          <StatChip icon={Landmark} label="Head Offices" value={String(stats.byType.HEAD_OFFICE ?? 0)} />
          <StatChip icon={Star} label="Primary" value={stats.primary} truncate />
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3 md:p-4 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, city, region, country…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterTab active={typeFilter === "ALL"} onClick={() => setTypeFilter("ALL")}>
              All <span className="ml-1 text-xs opacity-70">{locations.length}</span>
            </FilterTab>
            {TYPES.map((t) => (
              <FilterTab key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
                {TYPE_META[t].label} <span className="ml-1 text-xs opacity-70">{stats.byType[t] ?? 0}</span>
              </FilterTab>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center p-16 text-muted-foreground">
              <Loader2 className="animate-spin h-5 w-5 mr-2" /> Loading locations…
            </div>
          ) : !filtered.length ? (
            <EmptyState hasAny={locations.length > 0} onAdd={() => open()} />
          ) : (
            <Table sticky>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[220px]">Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region / City</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16 text-right">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate flex items-center gap-2">
                            {l.branch_name}
                            {l.is_primary && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                <Star className="h-3 w-3 fill-primary" /> Primary
                              </span>
                            )}
                          </div>
                          {l.address && <div className="text-xs text-muted-foreground truncate max-w-[260px]">{l.address}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><TypePill type={l.location_type} /></TableCell>
                    <TableCell>
                      <div className="text-sm">{l.island_or_region ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{l.parish_city ?? l.city ?? "—"}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">{l.country ?? "—"}</Badge></TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        {l.phone && <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3 w-3" />{l.phone}</div>}
                        {l.email && <div className="flex items-center gap-1.5 text-muted-foreground truncate max-w-[200px]"><Mail className="h-3 w-3" />{l.email}</div>}
                        {!l.phone && !l.email && <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {l.is_active !== false ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => open(l)}
                        className="opacity-60 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {editing?.id ? "Edit Location" : "Add Location"}
            </DialogTitle>
            <DialogDescription>
              Configure the office details. Fields marked <span className="text-destructive">*</span> are required.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-5 pt-2">
              <Section title="Identity">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Name" required error={errors.branch_name} className="md:col-span-2">
                    <Input value={editing.branch_name ?? ""} onChange={(e) => setEditing({ ...editing, branch_name: e.target.value })} placeholder="Head Office - Basseterre" />
                  </Field>
                  <Field label="Type">
                    <select className="w-full border rounded-md h-10 px-3 bg-background text-sm" value={editing.location_type ?? "BRANCH"} onChange={(e) => setEditing({ ...editing, location_type: e.target.value })}>
                      {TYPES.map((t) => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
                    </select>
                  </Field>
                  <Field label="Country" required error={errors.country}>
                    <select className="w-full border rounded-md h-10 px-3 bg-background text-sm" value={editing.country ?? ""} onChange={(e) => setEditing({ ...editing, country: e.target.value })}>
                      <option value="">— Select country —</option>
                      {countries.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.description}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>

              <Section title="Address">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Island / Region"><Input value={editing.island_or_region ?? ""} onChange={(e) => setEditing({ ...editing, island_or_region: e.target.value })} placeholder="Saint Kitts" /></Field>
                  <Field label="Parish / City"><Input value={editing.parish_city ?? ""} onChange={(e) => setEditing({ ...editing, parish_city: e.target.value })} placeholder="Basseterre" /></Field>
                  <Field label="Street Address" className="md:col-span-2"><Input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} placeholder="Bay Road" /></Field>
                </div>
              </Section>

              <Section title="Contact">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Phone"><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="(869) 465-2535" /></Field>
                  <Field label="Fax"><Input value={editing.fax ?? ""} onChange={(e) => setEditing({ ...editing, fax: e.target.value })} /></Field>
                  <Field label="Email"><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} placeholder="office@socialsecurity.kn" /></Field>
                  <Field label="Office Hours"><Input value={editing.office_hours ?? ""} onChange={(e) => setEditing({ ...editing, office_hours: e.target.value })} placeholder="Mon–Fri 8:00–16:00" /></Field>
                  <Field label="Manager User Code" className="md:col-span-2"><Input value={editing.manager_user_code ?? ""} onChange={(e) => setEditing({ ...editing, manager_user_code: e.target.value })} /></Field>
                </div>
              </Section>

              <Section title="Flags">
                <div className="space-y-2">
                  <ToggleRow
                    checked={!!editing.is_primary}
                    onChange={(v) => setEditing({ ...editing, is_primary: v })}
                    icon={Star}
                    title="Primary location"
                    description="Used as the organization's default office in letters and notifications."
                  />
                  <ToggleRow
                    checked={editing.is_active !== false}
                    onChange={(v) => setEditing({ ...editing, is_active: v })}
                    icon={CheckCircle2}
                    title="Active"
                    description="Inactive locations are hidden from selectors."
                  />
                </div>
              </Section>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing?.id ? "Save Changes" : "Create Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function StatChip({ icon: Icon, label, value, tone, truncate }: { icon: any; label: string; value: string; tone?: "success"; truncate?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card/60 backdrop-blur px-3 py-2.5">
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", tone === "success" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-primary/10 text-primary")}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={cn("font-semibold text-sm", truncate && "truncate max-w-[160px]")}>{value}</div>
      </div>
    </div>
  );
}

function FilterTab({ active, children, onClick }: { active: boolean; children: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ hasAny, onAdd }: { hasAny: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
        {hasAny ? <Search className="h-6 w-6 text-muted-foreground" /> : <MapPin className="h-6 w-6 text-muted-foreground" />}
      </div>
      <h3 className="font-semibold">{hasAny ? "No matching locations" : "No locations yet"}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mt-1">
        {hasAny
          ? "Try adjusting your search or filter to find what you're looking for."
          : "Add your first office or branch to make it available across department profiles and communications."}
      </p>
      {!hasAny && (
        <Button className="mt-4" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Location
        </Button>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-2">{title}</div>
      <div className="rounded-lg border bg-muted/20 p-4">{children}</div>
    </div>
  );
}

function ToggleRow({ checked, onChange, icon: Icon, title, description }: { checked: boolean; onChange: (v: boolean) => void; icon: any; title: string; description: string }) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-md border bg-background hover:bg-muted/40 transition-colors cursor-pointer">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function Field({ label, error, children, className, required }: { label: string; error?: string; children: any; className?: string; required?: boolean }) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
