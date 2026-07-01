import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Users, Loader2, RotateCcw, Wand2 } from "lucide-react";
import {
  useDepartmentsWithProfiles,
  useDepartmentMasterMutation,
  useBackfillProfilesMutation,
  useResetProfileToDefaultsMutation,
} from "@/hooks/comm/useDepartmentMaster";
import {
  useDepartmentProfileMutation,
  useDepartmentLocationLinks,
  useOfficeLocations,
  useOrganizations,
} from "@/hooks/comm/useOrgManagement";
import {
  useLetterheads,
  useEmailSignatures,
  useDisclaimers,
  usePrintFooters,
} from "@/hooks/comm/useCommAssets";
import { useTeams, useWorkbaskets } from "@/hooks/comm/useOrgMasters";
import { useApprovedAssetsByCategories } from "@/hooks/comm/useApprovedAssets";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { UserCodeSelect } from "@/components/comm/UserCodeSelect";
import { TextBlockSelectField } from "@/components/comm/TextBlockSelectField";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { DepartmentEffectivePreview } from "@/components/comm/DepartmentEffectivePreview";

// Asset slots owned by the Department Profile (Phase 2). Each entry maps a
// `default_*_asset_id` column on `core_department_profile` to the underlying
// `comm_media_asset.category` it should be picked from.
const DEPT_ASSET_SLOTS: Array<{ key: string; label: string; categories: string[] }> = [
  { key: "default_logo_asset_id",         label: "Logo",            categories: ["logo"] },
  { key: "default_small_logo_asset_id",   label: "Small Logo",      categories: ["logo_small", "logo"] },
  { key: "default_header_asset_id",       label: "Letterhead Header", categories: ["letterhead_header"] },
  { key: "default_footer_asset_id",       label: "Letterhead Footer", categories: ["letterhead_footer"] },
  { key: "default_email_header_asset_id", label: "Email Header",    categories: ["email_header"] },
  { key: "default_email_footer_asset_id", label: "Email Footer",    categories: ["email_footer"] },
  { key: "default_watermark_asset_id",    label: "Watermark",       categories: ["watermark"] },
  { key: "default_seal_asset_id",         label: "Seal",            categories: ["seal"] },
  { key: "default_stamp_asset_id",        label: "Stamp",           categories: ["stamp"] },
  { key: "default_signature_asset_id",    label: "Signature",       categories: ["signature"] },
  { key: "default_qr_asset_id",           label: "QR Code",         categories: ["qr_code"] },
];

const DEPT_TEXT_BLOCK_FIELDS: Array<{ key: string; label: string; categories?: string[] }> = [
  { key: "confidentiality_text_block_code",   label: "Confidentiality",   categories: ["confidentiality", "disclaimer"] },
  { key: "privacy_notice_text_block_code",    label: "Privacy Notice",    categories: ["privacy", "disclaimer"] },
  { key: "appeal_rights_text_block_code",     label: "Appeal Rights",     categories: ["appeal", "legal"] },
  { key: "payment_instructions_text_block_code", label: "Payment Instructions", categories: ["payment", "instructions"] },
];

const PROFILE_LOCATION_FIELDS = [
  "primary_office_location_id",
  "secondary_office_location_id",
  "primary_mailing_location_id",
  "primary_physical_location_id",
] as const;

function DepartmentProfilesInner() {
  const { data: rows = [], isLoading } = useDepartmentsWithProfiles();
  const { data: orgs = [] } = useOrganizations();
  const { data: locations = [] } = useOfficeLocations();
  const { data: departmentLocationLinks = [] } = useDepartmentLocationLinks();
  const { data: letterheads = [] } = useLetterheads();
  const { data: signatures = [] } = useEmailSignatures();
  const { data: disclaimers = [] } = useDisclaimers();
  const { data: footers = [] } = usePrintFooters();
  const { data: teams = [] } = useTeams();
  const { data: workbaskets = [] } = useWorkbaskets();

  const masterMut = useDepartmentMasterMutation();
  const profileMut = useDepartmentProfileMutation();
  const backfillMut = useBackfillProfilesMutation();
  const resetMut = useResetProfileToDefaultsMutation();

  const [editingMaster, setEditingMaster] = useState<any | null>(null);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [masterErrors, setMasterErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const openProfile = (profile: any) => {
    const editable = { ...profile };
    for (const field of PROFILE_LOCATION_FIELDS) {
      const linkId = profile[field];
      const link = departmentLocationLinks.find((l: any) => l.id === linkId);
      editable[field] = link?.location_id ?? null;
    }
    if (!editable.primary_office_location_id && profile.primary_location_id) {
      editable.primary_office_location_id = profile.primary_location_id;
    }
    setEditingProfile(editable);
  };

  const openAddDept = () =>
    setEditingMaster({ is_active: true, organization_id: orgs[0]?.id ?? null });

  const saveMaster = () => {
    const e: Record<string, string> = {};
    if (!editingMaster.code?.trim()) e.code = "Required";
    if (!editingMaster.name?.trim()) e.name = "Required";
    if (!editingMaster.organization_id) e.organization_id = "Required";
    setMasterErrors(e);
    if (Object.keys(e).length) return;
    masterMut.mutate(editingMaster, { onSuccess: () => setEditingMaster(null) });
  };

  const saveProfile = () => {
    const payload = { ...editingProfile };
    payload.__locationSelections = Object.fromEntries(
      PROFILE_LOCATION_FIELDS.map((field) => [field, editingProfile[field] ?? null]),
    );
    // Coerce JSON-string AI context back to an object before save.
    if (typeof payload.ai_context_settings === "string") {
      const raw = payload.ai_context_settings.trim();
      if (!raw) {
        payload.ai_context_settings = {};
      } else {
        try {
          payload.ai_context_settings = JSON.parse(raw);
        } catch {
          // keep as string so the user sees the validation error from the API
        }
      }
    }
    // Strip UI-only / unmapped keys.
    profileMut.mutate(payload, { onSuccess: () => setEditingProfile(null) });
  };

  const overrides = (p: any) => {
    if (!p) return 0;
    return [
      "letterhead",
      "email_signature",
      "disclaimer",
      "print_footer",
      "logo",
      "seal",
      "location",
      "dms_folder",
    ].filter((k) => p[`inherit_${k}_from_org`] === false).length;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Department Profiles</h1>
            <p className="text-sm text-muted-foreground">
              Departments come from the Department Master. Each one has a profile that inherits
              from the Organization unless overridden.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => backfillMut.mutate()} disabled={backfillMut.isPending}>
            {backfillMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            Create missing profiles
          </Button>
          <Button onClick={openAddDept}><Plus className="h-4 w-4 mr-2" /> Add Department</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table sticky>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Overrides</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-40 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.master.id}>
                    <TableCell className="font-mono text-xs">{r.master.code}</TableCell>
                    <TableCell className="font-medium">{r.master.name}</TableCell>
                    <TableCell>
                      {r.profile ? (
                        <Badge variant="secondary">Exists</Badge>
                      ) : (
                        <Badge variant="outline" className="border-warning text-warning">Missing</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.profile ? (
                        overrides(r.profile) === 0 ? (
                          <span className="text-xs text-muted-foreground">All inherited</span>
                        ) : (
                          <Badge variant="outline">{overrides(r.profile)} override{overrides(r.profile) > 1 ? "s" : ""}</Badge>
                        )
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.master.is_active ? "secondary" : "outline"}>
                        {r.master.is_active ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditingMaster(r.master)} title="Edit master">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {r.profile && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => openProfile(r.profile)} title="Edit profile">
                            Profile
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resetMut.mutate(r.profile.id)}
                            disabled={resetMut.isPending}
                            title="Reset to org defaults"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!rows.length && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground p-8">No departments yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Department Master dialog */}
      <Dialog open={!!editingMaster} onOpenChange={(o) => !o && setEditingMaster(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMaster?.id ? "Edit Department" : "Add Department"}</DialogTitle>
          </DialogHeader>
          {editingMaster && (
            <div className="grid gap-3">
              <Field label="Code *" error={masterErrors.code}>
                <Input
                  value={editingMaster.code ?? ""}
                  onChange={(e) => setEditingMaster({ ...editingMaster, code: e.target.value.toUpperCase() })}
                  disabled={!!editingMaster.id}
                />
              </Field>
              <Field label="Name *" error={masterErrors.name}>
                <Input
                  value={editingMaster.name ?? ""}
                  onChange={(e) => setEditingMaster({ ...editingMaster, name: e.target.value })}
                />
              </Field>
              <Field label="Organization *" error={masterErrors.organization_id}>
                <select
                  className="w-full border rounded h-10 px-2 bg-background"
                  value={editingMaster.organization_id ?? ""}
                  onChange={(e) => setEditingMaster({ ...editingMaster, organization_id: e.target.value || null })}
                >
                  <option value="">—</option>
                  {orgs.map((o: any) => <option key={o.id} value={o.id}>{o.legal_name}</option>)}
                </select>
              </Field>
              <Field label="Description">
                <Textarea
                  value={editingMaster.description ?? ""}
                  onChange={(e) => setEditingMaster({ ...editingMaster, description: e.target.value })}
                />
              </Field>
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!editingMaster.is_active}
                  onCheckedChange={(v) => setEditingMaster({ ...editingMaster, is_active: v })}
                />
                <Label>Active</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                A profile is created automatically when you save a new department. Use the Profile button on the list to configure overrides.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMaster(null)}>Cancel</Button>
            <Button onClick={saveMaster} disabled={masterMut.isPending}>
              {masterMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Profile dialog */}
      <Dialog open={!!editingProfile} onOpenChange={(o) => !o && setEditingProfile(null)}>
        <DialogContent className="max-w-6xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle>Department Profile — {editingProfile?.department_name}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Any field left blank inherits from the Organization Profile. Fill a field only when this department needs to override the default.
            </p>
          </DialogHeader>
          {editingProfile && (
            <Tabs defaultValue="leadership" className="flex flex-col flex-1 min-h-0">
              <TabsList className="mx-6 mt-3 w-fit shrink-0">
                <TabsTrigger value="leadership">Leadership</TabsTrigger>
                <TabsTrigger value="office">Office</TabsTrigger>
                <TabsTrigger value="comm">Comm Defaults</TabsTrigger>
                <TabsTrigger value="legal">Legal Text</TabsTrigger>
                <TabsTrigger value="dms">DMS & AI</TabsTrigger>
                <TabsTrigger value="effective">Effective Preview</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto px-6 pb-4 pt-3">
                <TabsContent value="leadership" className="mt-0 grid md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                  <Field label="Department Manager">
                    <UserCodeSelect value={editingProfile.department_manager_user_code} onChange={(v) => setEditingProfile({ ...editingProfile, department_manager_user_code: v })} />
                  </Field>
                  <Field label="Deputy Manager">
                    <UserCodeSelect value={editingProfile.deputy_manager_user_code} onChange={(v) => setEditingProfile({ ...editingProfile, deputy_manager_user_code: v })} />
                  </Field>
                  <Field label="Escalation Contact">
                    <UserCodeSelect value={editingProfile.escalation_contact_user_code} onChange={(v) => setEditingProfile({ ...editingProfile, escalation_contact_user_code: v })} />
                  </Field>
                  <Field label="Default Document Owner">
                    <UserCodeSelect value={editingProfile.default_document_owner_user_code} onChange={(v) => setEditingProfile({ ...editingProfile, default_document_owner_user_code: v })} />
                  </Field>
                  <Field label="Contact Email">
                    <Input value={editingProfile.contact_email ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, contact_email: e.target.value })} />
                  </Field>
                  <Field label="Contact Phone">
                    <Input value={editingProfile.contact_phone ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, contact_phone: e.target.value })} />
                  </Field>
                  <Field label="Fax">
                    <Input value={editingProfile.contact_fax ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, contact_fax: e.target.value })} />
                  </Field>
                  <Field label="Website">
                    <Input value={editingProfile.contact_website ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, contact_website: e.target.value })} />
                  </Field>
                  <Field label="Office Hours">
                    <Input value={editingProfile.office_hours ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, office_hours: e.target.value })} placeholder="Mon–Fri 8:00–16:00" />
                  </Field>
                </TabsContent>

                <TabsContent value="office" className="mt-0 grid md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                  <Field label="Primary Office">
                    <LocationSelect value={editingProfile.primary_office_location_id ?? editingProfile.primary_location_id} onChange={(v) => setEditingProfile({ ...editingProfile, primary_office_location_id: v, primary_location_id: v })} locations={locations} />
                  </Field>
                  <Field label="Secondary Office">
                    <LocationSelect value={editingProfile.secondary_office_location_id} onChange={(v) => setEditingProfile({ ...editingProfile, secondary_office_location_id: v })} locations={locations} />
                  </Field>
                  <Field label="Primary Mailing Address">
                    <LocationSelect value={editingProfile.primary_mailing_location_id} onChange={(v) => setEditingProfile({ ...editingProfile, primary_mailing_location_id: v })} locations={locations} />
                  </Field>
                  <Field label="Primary Physical Address">
                    <LocationSelect value={editingProfile.primary_physical_location_id} onChange={(v) => setEditingProfile({ ...editingProfile, primary_physical_location_id: v })} locations={locations} />
                  </Field>
                </TabsContent>

                <TabsContent value="comm" className="mt-0 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Department-owned communication defaults. Leave blank to inherit from the Organization Profile. Fill a field only when this department needs its own value.
                  </p>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                    <Field label="Default Communication Profile">
                      <Input value={editingProfile.default_communication_profile_code ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, default_communication_profile_code: e.target.value })} placeholder="Inherit from organization" />
                    </Field>
                    <Field label="Default Salutation">
                      <Input value={editingProfile.default_salutation ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, default_salutation: e.target.value })} placeholder="Inherit from organization" />
                    </Field>
                    <Field label="Notification Sender Email">
                      <Input value={editingProfile.notification_sender_email ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, notification_sender_email: e.target.value })} placeholder="Inherit from organization" />
                    </Field>
                    <Field label="Notification Sender Name">
                      <Input value={editingProfile.notification_sender_name ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, notification_sender_name: e.target.value })} placeholder="Inherit from organization" />
                    </Field>
                    <Field label="Reply-to Email">
                      <Input value={editingProfile.reply_to_email ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, reply_to_email: e.target.value })} placeholder="Inherit from organization" />
                    </Field>
                    <Field label="Support Email">
                      <Input value={editingProfile.support_email ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, support_email: e.target.value })} placeholder="Inherit from organization" />
                    </Field>
                  </div>
                  <div className="text-xs font-semibold text-foreground/80 border-t pt-3">Brand assets</div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                    {DEPT_ASSET_SLOTS.map((slot) => (
                      <Field key={slot.key} label={slot.label}>
                        <ApprovedAssetSelect value={editingProfile[slot.key] ?? null} categories={slot.categories} onChange={(v) => setEditingProfile({ ...editingProfile, [slot.key]: v })} />
                      </Field>
                    ))}
                    <Field label="Default Letterhead">
                      <AssetSelect value={editingProfile.default_letterhead_id} onChange={(v) => setEditingProfile({ ...editingProfile, default_letterhead_id: v })} options={letterheads} />
                    </Field>
                    <Field label="Default Email Signature">
                      <AssetSelect value={editingProfile.default_email_signature_id} onChange={(v) => setEditingProfile({ ...editingProfile, default_email_signature_id: v })} options={signatures} />
                    </Field>
                    <Field label="Default Print Footer (legacy)">
                      <AssetSelect value={editingProfile.default_print_footer_id} onChange={(v) => setEditingProfile({ ...editingProfile, default_print_footer_id: v })} options={footers} />
                    </Field>
                  </div>
                </TabsContent>

                <TabsContent value="legal" className="mt-0 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Pick a Text Block from the master library. Use the pencil to edit its rich-text content, or the + to create a new one — every reference to the code stays in sync.
                  </p>
                  <div className="grid md:grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="Default Disclaimer">
                      <TextBlockSelectField value={editingProfile.default_disclaimer_text_block_code ?? null} onChange={(v) => setEditingProfile({ ...editingProfile, default_disclaimer_text_block_code: v })} categories={["disclaimer"]} />
                    </Field>
                    {DEPT_TEXT_BLOCK_FIELDS.map((f) => (
                      <Field key={f.key} label={f.label}>
                        <TextBlockSelectField value={editingProfile[f.key] ?? null} onChange={(v) => setEditingProfile({ ...editingProfile, [f.key]: v })} categories={f.categories} />
                      </Field>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="dms" className="mt-0 space-y-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                    <Field label="DMS Folder Root">
                      <Input value={editingProfile.dms_folder_root ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, dms_folder_root: e.target.value })} placeholder="Inherit from organization" />
                    </Field>
                    <Field label="Retention (days)">
                      <Input type="number" value={editingProfile.retention_days ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, retention_days: e.target.value ? Number(e.target.value) : null })} placeholder="Inherit from organization" />
                    </Field>
                    <Field label="Default Team">
                      <select className="w-full border rounded h-10 px-2 bg-background" value={editingProfile.default_team_id ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, default_team_id: e.target.value || null })}>
                        <option value="">— Inherit / None —</option>
                        {teams.map((t) => <option key={t.id} value={t.id}>{t.team_name} ({t.module_code})</option>)}
                      </select>
                    </Field>
                    <Field label="Default Workbasket">
                      <select className="w-full border rounded h-10 px-2 bg-background" value={editingProfile.default_workbasket_id ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, default_workbasket_id: e.target.value || null })}>
                        <option value="">— Inherit / None —</option>
                        {workbaskets.map((w) => <option key={w.id} value={w.id}>{w.workbasket_name} ({w.module_code})</option>)}
                      </select>
                    </Field>
                  </div>

                  <div className="border-t pt-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-foreground/80">Advanced</div>
                      <p className="text-[11px] text-muted-foreground">Folder patterns, AI prompt tuning and raw context JSON. Edit only if you know what you're doing.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">Show advanced</span>
                      <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
                    </div>
                  </div>

                  {showAdvanced && (
                    <>
                      <div className="grid md:grid-cols-2 gap-x-4 gap-y-3">
                        <Field label="DMS Folder Pattern">
                          <Input value={editingProfile.dms_folder_pattern ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, dms_folder_pattern: e.target.value })} placeholder="{year}/{module}/{case_no}" />
                        </Field>
                      </div>
                      <div className="grid md:grid-cols-2 gap-x-4 gap-y-3">
                        <Field label="AI Prompt Prefix">
                          <RichTextEditor value={editingProfile.ai_prompt_prefix ?? ""} onChange={(html) => setEditingProfile({ ...editingProfile, ai_prompt_prefix: html })} minHeight={120} />
                        </Field>
                        <Field label="AI Context Settings (JSON)">
                          <Textarea
                            rows={6}
                            className="font-mono text-xs"
                            value={typeof editingProfile.ai_context_settings === "string" ? editingProfile.ai_context_settings : JSON.stringify(editingProfile.ai_context_settings ?? {}, null, 2)}
                            onChange={(e) => setEditingProfile({ ...editingProfile, ai_context_settings: e.target.value })}
                            placeholder='{ "model": "gemini-2.5-flash", "tone": "formal" }'
                          />
                        </Field>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="effective" className="mt-0">
                  <DepartmentEffectivePreview
                    departmentCode={editingProfile.department_code}
                    departmentName={editingProfile.department_name}
                  />
                </TabsContent>
              </div>
            </Tabs>
          )}
          <DialogFooter className="px-6 py-3 border-t shrink-0 bg-muted/30">
            <Button variant="outline" onClick={() => setEditingProfile(null)}>Cancel</Button>
            <Button onClick={saveProfile} disabled={profileMut.isPending}>
              {profileMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DepartmentProfilesPage() {
  return (
    <PermissionWrapper moduleName="dept_profiles">
      <DepartmentProfilesInner />
    </PermissionWrapper>
  );
}

function LocationSelect({ value, onChange, locations }: any) {
  return (
    <select className="w-full border rounded h-10 px-2 bg-background" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">—</option>
      {locations.filter((l: any) => l.is_active !== false).map((l: any) => <option key={l.id} value={l.id}>{l.branch_name}</option>)}
    </select>
  );
}

function AssetSelect({ value, onChange, options }: any) {
  return (
    <select className="w-full border rounded h-10 px-2 bg-background" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">—</option>
      {options.filter((o: any) => o.is_active !== false).map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

function ApprovedAssetSelect({ value, onChange, categories }: { value: string | null; onChange: (v: string | null) => void; categories: string[] }) {
  const { data: options = [], isLoading } = useApprovedAssetsByCategories(categories);
  return (
    <select className="w-full border rounded h-10 px-2 bg-background" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} disabled={isLoading}>
      <option value="">{isLoading ? "Loading…" : "— Inherit / None —"}</option>
      {options.map((o: any) => <option key={o.id} value={o.id}>{o.name}{o.asset_code ? ` · ${o.asset_code}` : ""}</option>)}
    </select>
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

function InheritRow({ label, flagKey, editing, setEditing, children }: { label: string; flagKey: string; editing: any; setEditing: (v: any) => void; children: any }) {
  const inherit = editing[flagKey] !== false;
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Inherit from org</span>
          <Switch checked={inherit} onCheckedChange={(v) => setEditing({ ...editing, [flagKey]: v })} />
        </div>
      </div>
      {inherit ? (
        <div className="h-10 px-2 rounded border bg-muted/30 flex items-center text-xs text-muted-foreground">Using organization default</div>
      ) : (
        children
      )}
    </div>
  );
}
