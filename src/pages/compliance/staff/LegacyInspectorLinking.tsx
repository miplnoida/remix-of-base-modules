import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Link2, CheckCircle2, AlertTriangle, Unlink } from "lucide-react";
import { toast } from "sonner";

interface LegacyInspector {
  code: string;
  insp_name: string | null;
}

interface ProfileOption {
  id: string;
  full_name: string | null;
  email: string | null;
  user_code: string | null;
}

interface LinkedRecord {
  legacy_code: string;
  legacy_name: string | null;
  ce_inspector_id: string | null;
  profile_id: string | null;
  profile_name: string | null;
  status: "linked" | "unlinked";
}

const EXCLUDED_CODES = ["00", "OSC", "UNK"];

export default function LegacyInspectorLinking() {
  const [records, setRecords] = useState<LinkedRecord[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: legacyData }, { data: inspData }, { data: profileData }] = await Promise.all([
      supabase.from("tb_inspector").select("code, insp_name").order("code"),
      supabase.from("ce_inspectors").select("id, legacy_inspector_code, profile_id"),
      supabase.from("profiles").select("id, full_name, email, user_code").eq("is_active", true).order("full_name"),
    ]);

    setProfiles(profileData || []);

    // Map ce_inspectors by legacy_inspector_code
    const ceMap = new Map<string, { id: string; profile_id: string | null }>();
    (inspData || []).forEach(ci => {
      if (ci.legacy_inspector_code) {
        ceMap.set(ci.legacy_inspector_code, { id: ci.id, profile_id: ci.profile_id });
      }
    });

    // Profile lookup
    const profileMap = Object.fromEntries((profileData || []).map(p => [p.id, p]));

    // Build records for real inspectors only
    const linked: LinkedRecord[] = (legacyData || [])
      .filter(l => !EXCLUDED_CODES.includes(l.code))
      .map(l => {
        const ceEntry = ceMap.get(l.code);
        const profile = ceEntry?.profile_id ? profileMap[ceEntry.profile_id] : null;
        return {
          legacy_code: l.code,
          legacy_name: l.insp_name,
          ce_inspector_id: ceEntry?.id || null,
          profile_id: ceEntry?.profile_id || null,
          profile_name: profile?.full_name || null,
          status: ceEntry?.profile_id ? "linked" as const : "unlinked" as const,
        };
      });

    setRecords(linked);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Profiles already linked to any ce_inspector
  const linkedProfileIds = new Set(records.filter(r => r.profile_id).map(r => r.profile_id));

  const handleLink = async (legacyCode: string) => {
    const profileId = selections[legacyCode];
    if (!profileId) { toast.error("Select a profile first"); return; }

    setSaving(legacyCode);

    // Check if this legacy code already has a ce_inspectors entry
    const existing = records.find(r => r.legacy_code === legacyCode);

    if (existing?.ce_inspector_id) {
      // Update existing ce_inspectors record with profile_id
      const { error } = await supabase.from("ce_inspectors")
        .update({ profile_id: profileId })
        .eq("id", existing.ce_inspector_id);
      if (error) { toast.error("Link failed: " + error.message); setSaving(null); return; }
    } else {
      // Create new ce_inspectors record
      const { error } = await supabase.from("ce_inspectors").insert({
        profile_id: profileId,
        legacy_inspector_code: legacyCode,
        inspector_code: `INS-${legacyCode}`,
        is_active: true,
        max_caseload: 50,
      });
      if (error) { toast.error("Link failed: " + error.message); setSaving(null); return; }
    }

    toast.success(`Linked ${legacyCode} to profile`);
    setSelections(s => { const n = { ...s }; delete n[legacyCode]; return n; });
    setSaving(null);
    fetchData();
  };

  const handleUnlink = async (legacyCode: string) => {
    const existing = records.find(r => r.legacy_code === legacyCode);
    if (!existing?.ce_inspector_id) return;

    setSaving(legacyCode);
    const { error } = await supabase.from("ce_inspectors")
      .update({ profile_id: null })
      .eq("id", existing.ce_inspector_id);
    if (error) { toast.error("Unlink failed: " + error.message); setSaving(null); return; }
    toast.success(`Unlinked ${legacyCode}`);
    setSaving(null);
    fetchData();
  };

  const linkedCount = records.filter(r => r.status === "linked").length;
  const unlinkedCount = records.filter(r => r.status === "unlinked").length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Link Legacy Inspectors</h1>
        <p className="text-muted-foreground">
          Map legacy inspector records (tb_inspector) to system user profiles. This creates the compliance officer link.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{records.length}</p>
            <p className="text-sm text-muted-foreground">Real Inspectors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600">{linkedCount}</p>
            <p className="text-sm text-muted-foreground">Linked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-amber-600">{unlinkedCount}</p>
            <p className="text-sm text-muted-foreground">Unlinked</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Legacy Inspector Mapping</CardTitle>
          <CardDescription>
            For each legacy inspector, select the matching system profile. Clicking "Link" creates or updates their compliance officer record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Code</TableHead>
                  <TableHead>Legacy Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[250px]">Linked Profile</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.legacy_code} className={r.status === "linked" ? "bg-green-50/50 dark:bg-green-950/10" : ""}>
                    <TableCell className="font-mono font-bold">{r.legacy_code}</TableCell>
                    <TableCell className="font-medium">{r.legacy_name || "—"}</TableCell>
                    <TableCell>
                      {r.status === "linked" ? (
                        <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Linked</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-amber-700"><AlertTriangle className="h-3 w-3" /> Unlinked</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.status === "linked" ? (
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">{r.profile_name || "Profile linked"}</span>
                      ) : (
                        <Select
                          value={selections[r.legacy_code] || ""}
                          onValueChange={v => setSelections(s => ({ ...s, [r.legacy_code]: v }))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select profile..." />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles
                              .filter(p => !linkedProfileIds.has(p.id) || selections[r.legacy_code] === p.id)
                              .map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.full_name || p.email || p.id.slice(0, 12)}
                                  {p.user_code && <span className="text-muted-foreground ml-1">({p.user_code})</span>}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "linked" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlink(r.legacy_code)}
                          disabled={saving === r.legacy_code}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          {saving === r.legacy_code ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                          Unlink
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleLink(r.legacy_code)}
                          disabled={saving === r.legacy_code || !selections[r.legacy_code]}
                          className="gap-1"
                        >
                          {saving === r.legacy_code ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                          Link
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
