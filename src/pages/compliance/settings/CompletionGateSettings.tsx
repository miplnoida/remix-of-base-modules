// ============================================
// COMPLETION GATE SETTINGS — Admin-tunable audit close-out rules
// Route: /compliance/settings/completion-gate
// ============================================

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, ShieldCheck, AlertTriangle, Info } from 'lucide-react';
import {
  fieldAuditService,
  type CompletionGateConfig,
  type EnforcementMode,
} from '@/services/fieldAuditService';
import { toast } from 'sonner';

const MODE_DESCRIPTIONS: Record<EnforcementMode, { label: string; desc: string; tone: string }> = {
  STRICT: {
    label: 'Strict',
    desc: 'Inspectors cannot close audits with unmet conditions. Supervisor override is logged.',
    tone: 'destructive',
  },
  SELF_SERVICE: {
    label: 'Self-Service',
    desc: 'Inspector can close with a written justification. All overrides are audit-logged.',
    tone: 'warning',
  },
  SOFT_WARNING: {
    label: 'Soft Warning',
    desc: 'Warnings shown but never block close-out. Lowest data integrity.',
    tone: 'muted',
  },
};

export default function CompletionGateSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<CompletionGateConfig | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const c = await fieldAuditService.getCompletionGateConfig('GLOBAL');
      setCfg(c);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!cfg) return;
    try {
      setSaving(true);
      await fieldAuditService.updateCompletionGateConfig('GLOBAL', {
        enforcementMode: cfg.enforcementMode,
        requireChecklistComplete: cfg.requireChecklistComplete,
        requireFindingsRecorded: cfg.requireFindingsRecorded,
        requireReportSaved: cfg.requireReportSaved,
        requireFollowupsForSeverity: cfg.requireFollowupsForSeverity,
        requireEvidenceMinCount: cfg.requireEvidenceMinCount,
        overrideRequiresRole: cfg.overrideRequiresRole,
      });
      toast.success('Completion gate configuration saved');
      load();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !cfg) {
    return <div className="p-6 text-muted-foreground">Loading…</div>;
  }

  const modeMeta = MODE_DESCRIPTIONS[cfg.enforcementMode];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Audit Completion Rules"
        subtitle="Define when inspectors can close an audit visit and what conditions are mandatory."
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Settings', href: '/compliance/settings' },
          { label: 'Completion Gate' },
        ]}
      />

      {/* Enforcement Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Enforcement Mode
          </CardTitle>
          <CardDescription>
            Controls how strictly the system blocks audit close-out when conditions are unmet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.keys(MODE_DESCRIPTIONS) as EnforcementMode[]).map((mode) => {
              const meta = MODE_DESCRIPTIONS[mode];
              const active = cfg.enforcementMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCfg({ ...cfg, enforcementMode: mode })}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    active
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="font-semibold mb-1">{meta.label}</div>
                  <div className="text-xs text-muted-foreground">{meta.desc}</div>
                </button>
              );
            })}
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/40 p-3 rounded">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              Currently selected: <Badge variant="outline">{modeMeta.label}</Badge> — {modeMeta.desc}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Required Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Required Conditions</CardTitle>
          <CardDescription>
            Toggle which conditions must be satisfied before an audit can be closed. Disabled items
            still appear in the workspace gate panel as informational.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ToggleRow
            label="Checklist must be 100% complete"
            description="All working-paper checklist items answered."
            checked={cfg.requireChecklistComplete}
            onChange={(v) => setCfg({ ...cfg, requireChecklistComplete: v })}
          />
          <ToggleRow
            label="At least one finding recorded"
            description="A structured finding (compliant or otherwise) must exist."
            checked={cfg.requireFindingsRecorded}
            onChange={(v) => setCfg({ ...cfg, requireFindingsRecorded: v })}
          />
          <ToggleRow
            label="Audit report saved (draft or final)"
            description="Employer audit report must exist for the visit."
            checked={cfg.requireReportSaved}
            onChange={(v) => setCfg({ ...cfg, requireReportSaved: v })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <Label>Minimum evidence items required</Label>
              <Input
                type="number"
                min={0}
                value={cfg.requireEvidenceMinCount}
                onChange={(e) =>
                  setCfg({
                    ...cfg,
                    requireEvidenceMinCount: Math.max(0, parseInt(e.target.value || '0', 10)),
                  })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set to 0 to make evidence optional.
              </p>
            </div>
            <div>
              <Label>Follow-up required for severity ≥</Label>
              <Select
                value={cfg.requireFollowupsForSeverity ?? 'NONE'}
                onValueChange={(v) =>
                  setCfg({
                    ...cfg,
                    requireFollowupsForSeverity:
                      v === 'NONE' ? null : (v as CompletionGateConfig['requireFollowupsForSeverity']),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not required</SelectItem>
                  <SelectItem value="LOW">Low and above</SelectItem>
                  <SelectItem value="MEDIUM">Medium and above</SelectItem>
                  <SelectItem value="HIGH">High and above</SelectItem>
                  <SelectItem value="CRITICAL">Critical only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Findings at or above this severity must have a follow-up action.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Override Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" /> Override Policy
          </CardTitle>
          <CardDescription>
            Role required to override the gate when in STRICT mode. Self-service mode allows the
            inspector to override with a reason.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Role allowed to override (STRICT mode)</Label>
          <Input
            value={cfg.overrideRequiresRole ?? ''}
            onChange={(e) => setCfg({ ...cfg, overrideRequiresRole: e.target.value || null })}
            placeholder="e.g. COMPLIANCE_SUPERVISOR"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? 'Saving…' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <Label className="text-base">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
