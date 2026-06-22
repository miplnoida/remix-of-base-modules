import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BackNavigation } from "@/components/ui/back-navigation";
import { Save, X, Building2, Workflow, Users, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLgReference } from "@/hooks/legal/useLgCases";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { useLegalOfficers } from "@/hooks/legal/useLegalOfficers";
import { useLegalTeams } from "@/hooks/legal/useLegalTeams";
import { Link } from "react-router-dom";

const DEFAULTS = {
  name: "St. Christopher and Nevis Social Security Board",
  address: "Bay Road, Basseterre, St. Kitts",
  contactPerson: "",
  email: "legal@socialsecurity.kn",
  phone: "+1 (869) 465-2535",
  departmentName: "Legal Department",
  defaultWorkbasketCode: "LEGAL_INTAKE_REVIEW",
  defaultTeamCode: "GENERAL_LEGAL",
  defaultAssignmentStrategy: "BY_WORKLOAD",
  defaultPriorityCode: "MEDIUM",
  allowManualOverride: true,
  autoAssignOnReferral: false,
  autoAssignOnManualCase: false,
  escalateUnassignedDays: 3,
};

const sb = supabase as any;

export default function LegalAdminComplainant() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const access = useLgAccess();
  const canEditRouting = access.isAdmin || access.roleTypes.includes("LG_ADMIN");

  const [data, setData] = useState({ ...DEFAULTS });

  const { data: workbaskets = [] } = useLgReference("LG_WORKBASKET");
  const { data: strategies   = [] } = useLgReference("LG_ASSIGNMENT_STRATEGY");
  const { data: priorities   = [] } = useLgReference("LG_PRIORITY");
  const { data: officers     = [] } = useLegalOfficers();
  const { data: teams        = [] } = useLegalTeams();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["complainant-settings"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("legal_complainant_settings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setData({
        name: settings.name || DEFAULTS.name,
        address: settings.address || DEFAULTS.address,
        contactPerson: settings.contact_person || "",
        email: settings.email || DEFAULTS.email,
        phone: settings.phone || DEFAULTS.phone,
        departmentName: settings.department_name || DEFAULTS.departmentName,
        defaultWorkbasketCode: settings.default_workbasket_code || DEFAULTS.defaultWorkbasketCode,
        defaultTeamCode: settings.default_team_code || "",
        defaultAssignmentStrategy: settings.default_assignment_strategy || DEFAULTS.defaultAssignmentStrategy,
        defaultPriorityCode: settings.default_priority_code || DEFAULTS.defaultPriorityCode,
        allowManualOverride: settings.allow_manual_override ?? true,
        autoAssignOnReferral: settings.auto_assign_on_referral ?? false,
        autoAssignOnManualCase: settings.auto_assign_on_manual_case ?? false,
        escalateUnassignedDays: settings.escalate_unassigned_days ?? 3,
      });
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: async (d: typeof data) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const payload: Record<string, any> = {
        name: d.name,
        address: d.address,
        contact_person: d.contactPerson,
        email: d.email,
        phone: d.phone,
        department_name: d.departmentName,
        default_workbasket_code: d.defaultWorkbasketCode,
        default_team_code: d.defaultTeamCode || null,
        default_assignment_strategy: d.defaultAssignmentStrategy,
        default_priority_code: d.defaultPriorityCode,
        allow_manual_override: d.allowManualOverride,
        auto_assign_on_referral: d.autoAssignOnReferral,
        auto_assign_on_manual_case: d.autoAssignOnManualCase,
        escalate_unassigned_days: d.escalateUnassignedDays,
        created_by: user.id,
      };
      if (settings?.id) {
        const { error } = await sb.from("legal_complainant_settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("legal_complainant_settings").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["complainant-settings"] });
      toast({ title: "Settings Saved" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const priorityFallback = [
    { code: "LOW", label: "Low" }, { code: "MEDIUM", label: "Medium" },
    { code: "HIGH", label: "High" }, { code: "URGENT", label: "Urgent" },
  ];
  const priorityOptions = priorities.length ? priorities : priorityFallback;

  return (
    <div className="p-6 space-y-6">
      <BackNavigation />
      <div className="flex items-center gap-3">
        <Building2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Legal Admin — Intake & Routing</h1>
          <p className="text-sm text-muted-foreground">
            Complainant identity and routing policy used when new legal cases are opened.
          </p>
        </div>
      </div>

      {!canEditRouting && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <ShieldAlert className="h-4 w-4" />
          You can view these settings, but only <strong>LEGAL_ADMIN</strong> / <strong>LEGAL_MANAGER</strong> can change routing policy.
        </div>
      )}

      {/* ─────────────────────────────  COMPLAINANT IDENTITY  ───────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Complainant Identity</CardTitle>
          <CardDescription>SSB profile used as the default complainant in new legal cases.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Complainant Name <span className="text-destructive">*</span></Label>
              <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input value={data.departmentName} onChange={(e) => setData({ ...data, departmentName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input value={data.contactPerson} onChange={(e) => setData({ ...data, contactPerson: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="+1 (869) XXX-XXXX" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Textarea rows={3} value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────  ROUTING & ASSIGNMENT  ───────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Workflow className="h-4 w-4" /> Routing & Assignment Policy</CardTitle>
          <CardDescription>
            Cases route into workbaskets first. An officer is then assigned manually or by the chosen strategy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Legal Intake Workbasket</Label>
              <Select
                value={data.defaultWorkbasketCode}
                onValueChange={(v) => setData({ ...data, defaultWorkbasketCode: v })}
                disabled={!canEditRouting}
              >
                <SelectTrigger><SelectValue placeholder="Select workbasket…" /></SelectTrigger>
                <SelectContent>
                  {workbaskets.map((w) => (
                    <SelectItem key={w.code} value={w.code}>{w.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Where new cases land when no officer is assigned.</p>
            </div>

            <div className="space-y-2">
              <Label>Default Assignment Strategy</Label>
              <Select
                value={data.defaultAssignmentStrategy}
                onValueChange={(v) => setData({ ...data, defaultAssignmentStrategy: v })}
                disabled={!canEditRouting}
              >
                <SelectTrigger><SelectValue placeholder="Select strategy…" /></SelectTrigger>
                <SelectContent>
                  {strategies.map((s) => (
                    <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Controls how cases get routed to officers.</p>
            </div>

            <div className="space-y-2">
              <Label>Default Team (optional)</Label>
              <Input
                value={data.defaultTeamCode}
                onChange={(e) => setData({ ...data, defaultTeamCode: e.target.value })}
                placeholder="e.g. LEGAL_TEAM_A"
                disabled={!canEditRouting}
              />
            </div>

            <div className="space-y-2">
              <Label>Default Priority</Label>
              <Select
                value={data.defaultPriorityCode}
                onValueChange={(v) => setData({ ...data, defaultPriorityCode: v })}
                disabled={!canEditRouting}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((p) => (
                    <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Selected from reference data (LG_PRIORITY).</p>
            </div>

            <div className="space-y-2">
              <Label>Escalate Unassigned After (days)</Label>
              <Input
                type="number" min={1} max={60}
                value={data.escalateUnassignedDays}
                onChange={(e) => setData({ ...data, escalateUnassignedDays: Number(e.target.value || 0) })}
                disabled={!canEditRouting}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 pt-2 border-t">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Allow Manual Override</Label>
                <p className="text-[11px] text-muted-foreground">Legal managers can override the strategy per case.</p>
              </div>
              <Switch
                checked={data.allowManualOverride}
                onCheckedChange={(v) => setData({ ...data, allowManualOverride: v })}
                disabled={!canEditRouting}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Auto-assign on Referral</Label>
                <p className="text-[11px] text-muted-foreground">Compliance referrals get an officer immediately.</p>
              </div>
              <Switch
                checked={data.autoAssignOnReferral}
                onCheckedChange={(v) => setData({ ...data, autoAssignOnReferral: v })}
                disabled={!canEditRouting}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Auto-assign on Manual Case</Label>
                <p className="text-[11px] text-muted-foreground">Manual cases get an officer immediately.</p>
              </div>
              <Switch
                checked={data.autoAssignOnManualCase}
                onCheckedChange={(v) => setData({ ...data, autoAssignOnManualCase: v })}
                disabled={!canEditRouting}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────  ELIGIBLE LEGAL OFFICERS (read-only roster)  ───────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Eligible Legal Officers</CardTitle>
          <CardDescription>
            Users holding <code>LEGAL_OFFICER</code>, <code>SENIOR_LEGAL_OFFICER</code>, <code>LEGAL_MANAGER</code> or <code>LEGAL_ADMIN</code>.
            Officer assignment on individual cases must pick from this roster — free-text names are no longer accepted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {officers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No users currently hold a legal role. Assign roles in <strong>Security → Users & Roles</strong> before enabling auto-assignment.
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {officers.map((o) => (
                <div key={o.user_id} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.full_name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {o.user_code ? `${o.user_code} · ` : ""}{o.email}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {o.roles.map((r) => (
                      <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={() => save.mutate(data)} disabled={save.isPending || isLoading || !canEditRouting} className="gap-2">
          <Save className="h-4 w-4" />{save.isPending ? "Saving..." : "Save Settings"}
        </Button>
        <Button variant="outline" disabled={save.isPending} onClick={() => settings && setData((d) => ({
          ...d,
          name: settings.name || DEFAULTS.name,
          address: settings.address || DEFAULTS.address,
          contactPerson: settings.contact_person || "",
          email: settings.email || DEFAULTS.email,
          phone: settings.phone || DEFAULTS.phone,
          departmentName: settings.department_name || DEFAULTS.departmentName,
          defaultWorkbasketCode: settings.default_workbasket_code || DEFAULTS.defaultWorkbasketCode,
          defaultTeamCode: settings.default_team_code || "",
          defaultAssignmentStrategy: settings.default_assignment_strategy || DEFAULTS.defaultAssignmentStrategy,
          defaultPriorityCode: settings.default_priority_code || DEFAULTS.defaultPriorityCode,
          allowManualOverride: settings.allow_manual_override ?? true,
          autoAssignOnReferral: settings.auto_assign_on_referral ?? false,
          autoAssignOnManualCase: settings.auto_assign_on_manual_case ?? false,
          escalateUnassignedDays: settings.escalate_unassigned_days ?? 3,
        }))} className="gap-2">
          <X className="h-4 w-4" />Cancel
        </Button>
      </div>
    </div>
  );
}
