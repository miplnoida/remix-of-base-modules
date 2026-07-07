import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserCheck, Plus, Pencil, ArrowRightLeft, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { OfficerStatusChangeWizard } from "@/components/compliance/staff/OfficerStatusChangeWizard";

type OfficerStatus = "ACTIVE" | "ON_LEAVE" | "TRANSFERRED" | "SUSPENDED" | "RESIGNED" | "INACTIVE";

const STATUS_BADGE_COLORS: Record<string, string> = {
  ACTIVE: "bg-primary/10 text-primary border-primary/20",
  ON_LEAVE: "bg-accent/30 text-accent-foreground border-accent/20",
  TRANSFERRED: "bg-secondary/10 text-secondary border-secondary/20",
  SUSPENDED: "bg-destructive/10 text-destructive border-destructive/20",
  RESIGNED: "bg-destructive/10 text-destructive border-destructive/20",
  INACTIVE: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active", ON_LEAVE: "On Leave", TRANSFERRED: "Transferred",
  SUSPENDED: "Suspended", RESIGNED: "Resigned", INACTIVE: "Inactive",
};

interface OfficerRow {
  id: string;
  profile_id: string | null;
  display_name: string;
  email: string | null;
  inspector_code: string | null;
  legacy_inspector_code: string | null;
  legacy_inspector_name: string | null;
  supervisor_id: string | null;
  primary_zone_id: string | null;
  max_caseload: number | null;
  can_handle_review: boolean;
  can_handle_legal: boolean;
  office_code: string | null;
  status: OfficerStatus;
  is_active: boolean;
  supervisor_name?: string;
  zone_name?: string;
}

interface ProfileOption { id: string; full_name: string | null; email: string | null; }
interface ZoneOption { id: string; zone_name: string; zone_code: string; }
interface LegacyInspector { code: string; insp_name: string | null; }

const EXCLUDED_LEGACY_CODES = ["00", "OSC", "UNK"];

export default function OfficerManagement() {
  const [officers, setOfficers] = useState<OfficerRow[]>([]);
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([]);
  const [zoneOptions, setZoneOptions] = useState<ZoneOption[]>([]);
  const [legacyInspectors, setLegacyInspectors] = useState<LegacyInspector[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OfficerRow | null>(null);
  const [form, setForm] = useState({
    profile_id: "", inspector_code: "", legacy_inspector_code: "",
    max_caseload: "50", supervisor_id: "", primary_zone_id: "",
    office_code: "", can_handle_review: false, can_handle_legal: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Status change wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardOfficer, setWizardOfficer] = useState<OfficerRow | null>(null);

  // New Officer (creates profile + inspector)
  const [newOpen, setNewOpen] = useState(false);
  const [newSaving, setNewSaving] = useState(false);
  const [newErrors, setNewErrors] = useState<Record<string, string>>({});
  const [newForm, setNewForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    inspector_code: "", max_caseload: "50",
    primary_zone_id: "", office_code: "",
    can_handle_review: false, can_handle_legal: false,
  });
  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string } | null>(null);


  const fetchOfficers = useCallback(async () => {
    setLoading(true);
    const [{ data: inspData }, { data: profiles }, { data: zones }, { data: legacyData }] = await Promise.all([
      supabase.from("ce_inspectors").select("*"),
      supabase.from("profiles").select("id, full_name, email"),
      supabase.from("ce_zones").select("id, zone_name, zone_code").eq("is_active", true),
      supabase.from("tb_inspector").select("code, insp_name").order("code"),
    ]);
    setProfileOptions(profiles || []);
    setZoneOptions(zones || []);
    setLegacyInspectors((legacyData || []).filter(l => !EXCLUDED_LEGACY_CODES.includes(l.code)));

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
    const zoneMap = Object.fromEntries((zones || []).map(z => [z.id, z]));
    const legacyMap = Object.fromEntries((legacyData || []).map(l => [l.code, l.insp_name]));

    const allOfficers: OfficerRow[] = (inspData || []).map((o: any) => {
      const profile = o.profile_id ? profileMap[o.profile_id] : null;
      return {
        ...o,
        status: o.status || "ACTIVE",
        display_name: profile?.full_name || o.inspector_code || o.legacy_inspector_code || o.id.slice(0, 12),
        email: profile?.email || null,
        zone_name: o.primary_zone_id ? zoneMap[o.primary_zone_id]?.zone_name : null,
        legacy_inspector_name: o.legacy_inspector_code ? legacyMap[o.legacy_inspector_code] || null : null,
      };
    });

    const officerMap = Object.fromEntries(allOfficers.map(o => [o.id, o]));
    allOfficers.forEach(o => {
      o.supervisor_name = o.supervisor_id ? officerMap[o.supervisor_id]?.display_name || "—" : "—";
    });

    setOfficers(allOfficers);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOfficers(); }, [fetchOfficers]);

  const linkedProfileIds = new Set(officers.filter(o => o.profile_id && o.id !== editing?.id).map(o => o.profile_id));
  const availableProfiles = profileOptions.filter(p => !linkedProfileIds.has(p.id));
  const usedLegacyCodes = new Set(officers.filter(o => o.legacy_inspector_code && o.id !== editing?.id).map(o => o.legacy_inspector_code));
  const availableLegacyCodes = legacyInspectors.filter(l => !usedLegacyCodes.has(l.code));

  const openCreate = () => {
    setEditing(null);
    setForm({ profile_id: "", inspector_code: "", legacy_inspector_code: "", max_caseload: "50", supervisor_id: "", primary_zone_id: "", office_code: "", can_handle_review: false, can_handle_legal: false });
    setErrors({}); setDialogOpen(true);
  };

  const openEdit = (o: OfficerRow) => {
    setEditing(o);
    setForm({
      profile_id: o.profile_id || "",
      inspector_code: o.inspector_code || "",
      legacy_inspector_code: o.legacy_inspector_code || "",
      max_caseload: o.max_caseload?.toString() || "50",
      supervisor_id: o.supervisor_id || "",
      primary_zone_id: o.primary_zone_id || "",
      office_code: o.office_code || "",
      can_handle_review: o.can_handle_review,
      can_handle_legal: o.can_handle_legal,
    });
    setErrors({}); setDialogOpen(true);
  };

  const openStatusChange = (o: OfficerRow) => {
    setWizardOfficer(o);
    setWizardOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.profile_id) e.profile_id = "Profile link is required";
    if (form.inspector_code?.trim()) {
      const dup = officers.find(o => o.inspector_code === form.inspector_code.trim() && o.id !== editing?.id);
      if (dup) e.inspector_code = "Inspector code already exists";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload: any = {
      profile_id: form.profile_id,
      inspector_code: form.inspector_code?.trim() || null,
      legacy_inspector_code: form.legacy_inspector_code || null,
      max_caseload: parseInt(form.max_caseload) || 50,
      supervisor_id: form.supervisor_id || null,
      primary_zone_id: form.primary_zone_id || null,
      office_code: form.office_code?.trim() || null,
      can_handle_review: form.can_handle_review,
      can_handle_legal: form.can_handle_legal,
    };
    if (editing) {
      const { error } = await supabase.from("ce_inspectors").update(payload).eq("id", editing.id);
      if (error) { toast.error("Update failed: " + error.message); setSaving(false); return; }
      toast.success("Officer updated");
    } else {
      const { error } = await supabase.from("ce_inspectors").insert(payload);
      if (error) { toast.error("Create failed: " + error.message); setSaving(false); return; }
      toast.success("Officer created");
    }
    setSaving(false); setDialogOpen(false); fetchOfficers();
  };

  const supervisorOptions = officers.filter(o => o.status === "ACTIVE" && o.id !== editing?.id);

  const openNewOfficer = () => {
    setNewErrors({});
    setNewForm({
      first_name: "", last_name: "", email: "", phone: "",
      inspector_code: "", max_caseload: "50",
      primary_zone_id: "", office_code: "",
      can_handle_review: false, can_handle_legal: false,
    });
    setNewOpen(true);
  };

  const handleCreateNewOfficer = async () => {
    const e: Record<string, string> = {};
    if (!newForm.first_name.trim()) e.first_name = "First name is required";
    if (!newForm.last_name.trim()) e.last_name = "Last name is required";
    if (!newForm.email.trim()) e.email = "Email is required (used for login)";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newForm.email.trim())) e.email = "Invalid email";
    if (newForm.inspector_code?.trim()) {
      const dup = officers.find(o => o.inspector_code === newForm.inspector_code.trim());
      if (dup) e.inspector_code = "Inspector code already exists";
    }
    if (newForm.email?.trim()) {
      const dupEmail = profileOptions.find(p => (p.email || "").toLowerCase() === newForm.email.trim().toLowerCase());
      if (dupEmail) e.email = "A profile with this email already exists";
    }
    setNewErrors(e);
    if (Object.keys(e).length > 0) return;

    setNewSaving(true);

    // Generate a strong temporary password (admin will share with the officer;
    // force_password_change=true requires them to reset on first login).
    const tempPassword = `Tmp!${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}Aa1`;

    // Create auth user + profile via privileged edge function.
    // Client-side profile insert violates the auth.users FK, so we MUST go through
    // create-user (service role) to provision the auth account first.
    const { data: cuData, error: cuError } = await supabase.functions.invoke("create-user", {
      body: {
        email: newForm.email.trim(),
        password: tempPassword,
        first_name: newForm.first_name.trim(),
        last_name: newForm.last_name.trim(),
        phone: newForm.phone?.trim() || undefined,
        office_code: newForm.office_code?.trim() || undefined,
      },
    });

    if (cuError || (cuData as any)?.error) {
      const msg = (cuData as any)?.error || cuError?.message || "Unknown error";
      toast.error("Officer create failed: " + msg);
      setNewSaving(false);
      return;
    }

    const newUserId = (cuData as any)?.user?.id;
    if (!newUserId) {
      toast.error("Officer create failed: no user id returned");
      setNewSaving(false);
      return;
    }

    const { error: iErr } = await supabase.from("ce_inspectors").insert({
      profile_id: newUserId,
      inspector_code: newForm.inspector_code?.trim() || null,
      max_caseload: parseInt(newForm.max_caseload) || 50,
      primary_zone_id: newForm.primary_zone_id || null,
      office_code: newForm.office_code?.trim() || null,
      can_handle_review: newForm.can_handle_review,
      can_handle_legal: newForm.can_handle_legal,
      status: "ACTIVE",
      is_active: true,
    } as any);
    if (iErr) {
      toast.error(
        "Auth user created but linking to compliance failed: " + iErr.message +
        `. Please retry with "Link Officer" using ${newForm.email.trim()}.`
      );
      setNewSaving(false);
      return;
    }

    setNewSaving(false);
    setNewOpen(false);
    setNewCredentials({ email: newForm.email.trim(), password: tempPassword });
    fetchOfficers();
  };


  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Officers / Inspectors</h1>
          <p className="text-muted-foreground">Compliance officers linked to system profiles</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openNewOfficer} className="gap-2"><UserPlus className="h-4 w-4" /> New Officer</Button>
          <Button variant="outline" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Link Officer</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><UserCheck className="h-5 w-5" /> Officers ({officers.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : officers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No officers linked yet</p>
              <p className="text-sm mt-1">Click "New Officer" to create one, or "Link Officer" to connect an existing system user.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Inspector Code</TableHead>
                  <TableHead>Legacy Inspector</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Caseload</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {officers.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.display_name}</TableCell>
                    <TableCell className="font-mono text-sm">{o.inspector_code || "—"}</TableCell>
                    <TableCell>
                      {o.legacy_inspector_code ? (
                        <span className="text-sm">
                          <span className="font-mono">{o.legacy_inspector_code}</span>
                          {o.legacy_inspector_name && <span className="text-muted-foreground ml-1">— {o.legacy_inspector_name}</span>}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{o.zone_name || "—"}</TableCell>
                    <TableCell>{o.supervisor_name}</TableCell>
                    <TableCell>{o.max_caseload || "—"}</TableCell>
                    <TableCell className="space-x-1">
                      {o.can_handle_review && <Badge variant="secondary" className="text-xs">REV</Badge>}
                      {o.can_handle_legal && <Badge variant="secondary" className="text-xs">LEG</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-medium ${STATUS_BADGE_COLORS[o.status] || "bg-muted text-muted-foreground"}`}>
                        {STATUS_LABELS[o.status] || o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(o)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openStatusChange(o)} title="Change Status"><ArrowRightLeft className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Officer" : "Link Officer to Compliance"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>System Profile *</Label>
              <Select value={form.profile_id} onValueChange={v => { setForm(f => ({ ...f, profile_id: v })); setErrors(e => ({ ...e, profile_id: "" })); }}>
                <SelectTrigger className={errors.profile_id ? "border-destructive" : ""}><SelectValue placeholder="Select a user profile" /></SelectTrigger>
                <SelectContent>
                  {(editing ? profileOptions : availableProfiles).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || p.id.slice(0, 12)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.profile_id && <p className="text-xs text-destructive mt-1">{errors.profile_id}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Inspector Code</Label>
                <Input value={form.inspector_code} onChange={e => { setForm(f => ({ ...f, inspector_code: e.target.value })); setErrors(er => ({ ...er, inspector_code: "" })); }} maxLength={20} className={errors.inspector_code ? "border-destructive" : ""} />
                {errors.inspector_code && <p className="text-xs text-destructive mt-1">{errors.inspector_code}</p>}
              </div>
              <div>
                <Label>Legacy Inspector</Label>
                <Select value={form.legacy_inspector_code || "none"} onValueChange={v => setForm(f => ({ ...f, legacy_inspector_code: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {availableLegacyCodes.map(l => (
                      <SelectItem key={l.code} value={l.code}>{l.code} — {l.insp_name || "Unknown"}</SelectItem>
                    ))}
                    {editing?.legacy_inspector_code && !availableLegacyCodes.find(l => l.code === editing.legacy_inspector_code) && (
                      <SelectItem value={editing.legacy_inspector_code}>
                        {editing.legacy_inspector_code} — {editing.legacy_inspector_name || "Unknown"} (current)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Zone</Label>
                <Select value={form.primary_zone_id || "none"} onValueChange={v => setForm(f => ({ ...f, primary_zone_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {zoneOptions.map(z => <SelectItem key={z.id} value={z.id}>{z.zone_name} ({z.zone_code})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Office Code</Label>
                <Input value={form.office_code} onChange={e => setForm(f => ({ ...f, office_code: e.target.value }))} maxLength={10} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Supervisor</Label>
                <Select value={form.supervisor_id || "none"} onValueChange={v => setForm(f => ({ ...f, supervisor_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {supervisorOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Caseload</Label>
                <Input type="number" value={form.max_caseload} onChange={e => setForm(f => ({ ...f, max_caseload: e.target.value }))} min={1} max={9999} />
              </div>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.can_handle_review} onChange={e => setForm(f => ({ ...f, can_handle_review: e.target.checked }))} id="off-review" />
                <Label htmlFor="off-review">Can Handle Review</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.can_handle_legal} onChange={e => setForm(f => ({ ...f, can_handle_legal: e.target.checked }))} id="off-legal" />
                <Label htmlFor="off-legal">Can Handle Legal</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Update" : "Link"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Wizard */}
      {wizardOfficer && (
        <OfficerStatusChangeWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          officer={wizardOfficer}
          officers={officers}
          zones={zoneOptions}
          onComplete={fetchOfficers}
        />
      )}

      {/* New Officer Dialog (creates profile + inspector) */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create New Officer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input value={newForm.first_name} onChange={e => { setNewForm(f => ({ ...f, first_name: e.target.value })); setNewErrors(er => ({ ...er, first_name: "" })); }} maxLength={50} className={newErrors.first_name ? "border-destructive" : ""} />
                {newErrors.first_name && <p className="text-xs text-destructive mt-1">{newErrors.first_name}</p>}
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={newForm.last_name} onChange={e => { setNewForm(f => ({ ...f, last_name: e.target.value })); setNewErrors(er => ({ ...er, last_name: "" })); }} maxLength={50} className={newErrors.last_name ? "border-destructive" : ""} />
                {newErrors.last_name && <p className="text-xs text-destructive mt-1">{newErrors.last_name}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={newForm.email} onChange={e => { setNewForm(f => ({ ...f, email: e.target.value })); setNewErrors(er => ({ ...er, email: "" })); }} maxLength={75} className={newErrors.email ? "border-destructive" : ""} />
                {newErrors.email && <p className="text-xs text-destructive mt-1">{newErrors.email}</p>}
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} maxLength={20} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Inspector Code</Label>
                <Input value={newForm.inspector_code} onChange={e => { setNewForm(f => ({ ...f, inspector_code: e.target.value })); setNewErrors(er => ({ ...er, inspector_code: "" })); }} maxLength={20} className={newErrors.inspector_code ? "border-destructive" : ""} />
                {newErrors.inspector_code && <p className="text-xs text-destructive mt-1">{newErrors.inspector_code}</p>}
              </div>
              <div>
                <Label>Max Caseload</Label>
                <Input type="number" value={newForm.max_caseload} onChange={e => setNewForm(f => ({ ...f, max_caseload: e.target.value }))} min={1} max={9999} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Zone</Label>
                <Select value={newForm.primary_zone_id || "none"} onValueChange={v => setNewForm(f => ({ ...f, primary_zone_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {zoneOptions.map(z => <SelectItem key={z.id} value={z.id}>{z.zone_name} ({z.zone_code})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Office Code</Label>
                <Input value={newForm.office_code} onChange={e => setNewForm(f => ({ ...f, office_code: e.target.value }))} maxLength={10} />
              </div>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={newForm.can_handle_review} onChange={e => setNewForm(f => ({ ...f, can_handle_review: e.target.checked }))} id="new-off-review" />
                <Label htmlFor="new-off-review">Can Handle Review</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={newForm.can_handle_legal} onChange={e => setNewForm(f => ({ ...f, can_handle_legal: e.target.checked }))} id="new-off-legal" />
                <Label htmlFor="new-off-legal">Can Handle Legal</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateNewOfficer} disabled={newSaving}>{newSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Officer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temporary Credentials Dialog (shown once after creation) */}
      <Dialog open={!!newCredentials} onOpenChange={(o) => { if (!o) setNewCredentials(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Officer Login Credentials</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Share these credentials with the officer. They will be required to change the
              password on first login.
            </p>
            <div className="rounded-md border p-3 space-y-2 bg-muted/40">
              <div><span className="font-medium">Email:</span> <span className="font-mono">{newCredentials?.email}</span></div>
              <div><span className="font-medium">Temporary Password:</span> <span className="font-mono">{newCredentials?.password}</span></div>
            </div>
            <p className="text-xs text-muted-foreground">
              This password will not be shown again. Copy it now.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (newCredentials) {
                  navigator.clipboard.writeText(
                    `Email: ${newCredentials.email}\nTemporary Password: ${newCredentials.password}`
                  );
                  toast.success("Credentials copied");
                }
              }}
            >
              Copy
            </Button>
            <Button onClick={() => setNewCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
