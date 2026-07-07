/**
 * Epic OM-9.7 — Card-based Communication Defaults for the Department Profile.
 *
 * Renders each supported setting as its own card showing:
 *   Setting name · Effective value · Source · Health · Mode · Actions
 *
 * Uses the CANONICAL `resolveEffectiveSettingsBundle` — the same resolver
 * runtime consumers call. Override/reset actions flip the corresponding
 * `inherit_*_from_org` flag via `setDepartmentSettingOverride` /
 * `resetDepartmentSettingToInherited`.
 */
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2, RotateCcw, AlertTriangle, CheckCircle2, ArrowRight, XCircle,
  ShieldCheck, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { OrgActionGate } from '@/platform/organization/orgActionPermissions';
import {
  resolveEffectiveSettingsBundle,
  resetDepartmentSettingToInherited,
  setDepartmentSettingOverride,
  SUPPORTED_RESET_KEYS,
  validateInheritanceHealth,
  type EffectiveSettingResult,
} from '@/platform/organization-settings';
import {
  useLetterheads, useEmailSignatures, useDisclaimers, usePrintFooters,
} from '@/hooks/comm/useCommAssets';
import { useOfficeLocations } from '@/hooks/comm/useOrgManagement';

interface Props {
  departmentId: string;
  departmentCode: string;
  departmentName?: string;
}

/** Which settings render as top cards in the "Communication Defaults" tab. */
const COMM_CARD_KEYS = [
  'default_letterhead',
  'default_email_signature',
  'default_disclaimer',
  'default_print_footer',
  'default_location',
  'default_logo',
  'default_seal',
  'default_watermark',
  'default_language',
  'default_document_template',
  'default_notification_template',
  'default_text_block',
  'default_output_channel',
  'default_retention_policy',
  'default_approval_workflow',
  'default_dms_folder',
];

function HealthPill({ s }: { s: EffectiveSettingResult }) {
  if (s.status === 'PLANNED') {
    return <Badge variant="outline" className="text-[10px]">Planned</Badge>;
  }
  if (s.health === 'OK') {
    return (
      <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-700">
        <CheckCircle2 className="h-3 w-3 mr-1" /> OK
      </Badge>
    );
  }
  if (s.health === 'WARN') {
    return (
      <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700">
        <AlertTriangle className="h-3 w-3 mr-1" /> Warning
      </Badge>
    );
  }
  if (s.health === 'MISSING') {
    return (
      <Badge variant="outline" className="text-[10px] border-muted-foreground text-muted-foreground">
        <Info className="h-3 w-3 mr-1" /> Missing
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] border-destructive text-destructive">
      <XCircle className="h-3 w-3 mr-1" /> Issue
    </Badge>
  );
}

function ModeBadge({ s }: { s: EffectiveSettingResult }) {
  if (s.status === 'PLANNED') return <Badge variant="outline">Not currently configurable</Badge>;
  if (s.isOverride) return <Badge>Override</Badge>;
  if (s.inheritanceMode === 'MISSING') return <Badge variant="outline">Missing</Badge>;
  if (s.inheritanceMode === 'CONFLICT') return <Badge variant="destructive">Conflict</Badge>;
  return <Badge variant="secondary">Inherited</Badge>;
}

export function DepartmentCommDefaultsCards({
  departmentId, departmentCode, departmentName,
}: Props) {
  const qc = useQueryClient();
  const bundleKey = ['om6-effective-settings', departmentCode];

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: bundleKey,
    queryFn: () => resolveEffectiveSettingsBundle({ departmentCode }, { audit: true }),
    enabled: !!departmentCode,
  });

  const [pickerFor, setPickerFor] = useState<EffectiveSettingResult | null>(null);
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: bundleKey });
    qc.invalidateQueries({ queryKey: ['dept-effective-preview', departmentCode] });
    qc.invalidateQueries({ queryKey: ['departmentsWithProfiles'] });
  };

  const resetMut = useMutation({
    mutationFn: async (settingKey: string) => {
      await resetDepartmentSettingToInherited({
        departmentId, departmentCode, settingKey,
        reason: 'Reset to Organization default via Comm Defaults card',
      });
    },
    onSuccess: () => { toast.success('Reset to Organization Default'); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? 'Reset failed'),
  });

  const setOverrideMut = useMutation({
    mutationFn: async (args: { settingKey: string; value: string | null }) => {
      await setDepartmentSettingOverride({
        departmentId, departmentCode,
        settingKey: args.settingKey, value: args.value,
        reason: 'Override set via Comm Defaults card',
      });
    },
    onSuccess: () => { toast.success('Override saved'); setPickerFor(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? 'Save failed'),
  });

  const resetAllMut = useMutation({
    mutationFn: async () => {
      const keys = (data?.ordered ?? [])
        .filter((s) => s.isOverride && SUPPORTED_RESET_KEYS.includes(s.key))
        .map((s) => s.key);
      for (const k of keys) {
        await resetDepartmentSettingToInherited({
          departmentId, departmentCode, settingKey: k,
          reason: 'Reset-all communication defaults to Organization',
        });
      }
      return keys.length;
    },
    onSuccess: (n) => { toast.success(`Reset ${n} override(s) to Organization Default`); setConfirmResetAll(false); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? 'Reset all failed'),
  });

  const healthMut = useMutation({
    mutationFn: () => validateInheritanceHealth({ departmentCodes: [departmentCode] }),
    onSuccess: (r) => toast.success(`Health: ${r.summary.errors} error(s), ${r.summary.warnings} warning(s), ${r.summary.ok} OK`),
    onError: (e: any) => toast.error(e?.message ?? 'Health check failed'),
  });

  const cards = useMemo(() => {
    if (!data) return [];
    const map = new Map(data.ordered.map((s) => [s.key, s]));
    return COMM_CARD_KEYS.map((k) => map.get(k)).filter((s): s is EffectiveSettingResult => !!s);
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resolving inherited settings…
      </div>
    );
  }

  const overrideCount = data.ordered.filter((s) => s.isOverride).length;
  const inheritedCount = data.ordered.filter((s) => s.isInherited).length;
  const missingCount = data.ordered.filter((s) => s.health === 'MISSING' && s.status !== 'PLANNED').length;
  const conflictCount = data.ordered.filter((s) => s.inheritanceMode === 'CONFLICT').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs text-muted-foreground mr-auto">
          Communication defaults for <span className="font-medium text-foreground">{departmentName ?? departmentCode}</span>.
          Cards show the effective value using the same resolver runtime consumers call.
        </div>
        <Badge variant="secondary">{inheritedCount} inherited</Badge>
        <Badge>{overrideCount} overridden</Badge>
        {missingCount > 0 && <Badge variant="outline" className="border-muted-foreground">{missingCount} missing</Badge>}
        {conflictCount > 0 && <Badge variant="destructive">{conflictCount} conflict</Badge>}
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
          Re-resolve
        </Button>
        <OrgActionGate permission="core.admin.org.departments.manage">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => healthMut.mutate()} disabled={healthMut.isPending}>
              {healthMut.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
              Run Health Check
            </Button>
            <Button
              size="sm" variant="outline"
              disabled={overrideCount === 0 || resetAllMut.isPending}
              onClick={() => setConfirmResetAll(true)}
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Reset All to Org Defaults
            </Button>
          </div>
        </OrgActionGate>

      </div>

      {conflictCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{conflictCount} inheritance conflict{conflictCount === 1 ? '' : 's'}</AlertTitle>
          <AlertDescription className="text-xs">
            An override value is selected but the setting is still marked as inheriting. Reset or re-apply the override to fix.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map((s) => {
          const canReset = SUPPORTED_RESET_KEYS.includes(s.key) && (s.isOverride || s.inheritanceMode === 'CONFLICT');
          const canOverride = SUPPORTED_RESET_KEYS.includes(s.key) && s.status !== 'PLANNED';
          return (
            <Card key={s.key} className={s.health === 'ERROR' ? 'border-destructive/60' : ''}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{s.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]" title={s.effectiveLabel}>
                      {s.effectiveLabel}
                    </div>
                  </div>
                  <HealthPill s={s} />
                </div>
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="text-muted-foreground">Source:</span>
                  <ModeBadge s={s} />
                  <Badge variant="outline" className="text-[10px]">{s.sourceLabel}</Badge>
                </div>
                {s.warnings.length > 0 && (
                  <div className="text-[11px] text-amber-700 border-t pt-2">
                    {s.warnings[0]}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1 border-t">
                  {canOverride && !s.isOverride && (
                    <OrgActionGate permission="core.admin.org.departments.manage">
                      <Button size="sm" variant="outline" onClick={() => setPickerFor(s)}>
                        Use Department Override <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </OrgActionGate>
                  )}
                  {canOverride && s.isOverride && (
                    <OrgActionGate permission="core.admin.org.departments.manage">
                      <Button size="sm" variant="outline" onClick={() => setPickerFor(s)}>
                        Change Override
                      </Button>
                    </OrgActionGate>
                  )}
                  {canReset && (
                    <OrgActionGate permission="core.admin.org.departments.manage">
                      <Button
                        size="sm" variant="ghost"
                        disabled={resetMut.isPending}
                        onClick={() => resetMut.mutate(s.key)}
                        title="Reset to Organization Default"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset to Org Default
                      </Button>
                    </OrgActionGate>
                  )}
                  {!canOverride && !canReset && (
                    <span className="text-xs text-muted-foreground">
                      {s.status === 'PLANNED' ? 'Not currently configurable' : 'Managed via Configuration Center'}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {pickerFor && (
        <OverridePickerDialog
          setting={pickerFor}
          onCancel={() => setPickerFor(null)}
          onSave={(val) => setOverrideMut.mutate({ settingKey: pickerFor.key, value: val })}
          isSaving={setOverrideMut.isPending}
        />
      )}

      <AlertDialog open={confirmResetAll} onOpenChange={setConfirmResetAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all overrides to Organization defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear every department-level override on this profile and revert to what the Organization Profile provides. This action is audited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetAllMut.mutate()} disabled={resetAllMut.isPending}>
              {resetAllMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Reset all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Picker dialog per setting                                           */
/* ------------------------------------------------------------------ */

function OverridePickerDialog({
  setting, onCancel, onSave, isSaving,
}: {
  setting: EffectiveSettingResult;
  onCancel: () => void;
  onSave: (value: string | null) => void;
  isSaving: boolean;
}) {
  const [value, setValue] = useState<string | null>(setting.effectiveValue);
  const { data: letterheads = [] } = useLetterheads();
  const { data: signatures = [] } = useEmailSignatures();
  const { data: disclaimers = [] } = useDisclaimers();
  const { data: footers = [] } = usePrintFooters();
  const { data: locations = [] } = useOfficeLocations();

  const options = useMemo(() => {
    switch (setting.key) {
      case 'default_letterhead':      return letterheads.map((o: any) => ({ id: o.id, label: o.name }));
      case 'default_email_signature': return signatures.map((o: any) => ({ id: o.id, label: o.name }));
      case 'default_disclaimer':      return disclaimers.map((o: any) => ({ id: o.id, label: o.name }));
      case 'default_print_footer':    return footers.map((o: any) => ({ id: o.id, label: o.name }));
      case 'default_location':        return locations.map((o: any) => ({ id: o.id, label: o.branch_name }));
      default:                        return [] as Array<{ id: string; label: string }>;
    }
  }, [setting.key, letterheads, signatures, disclaimers, footers, locations]);

  const hasOptions = options.length > 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Department override — {setting.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Choose the value this department should use. Leave as “Use Organization default” to inherit.
          </p>
          {hasOptions ? (
            <select
              className="w-full border rounded h-10 px-2 bg-background text-sm"
              value={value ?? ''}
              onChange={(e) => setValue(e.target.value || null)}
            >
              <option value="">— Use Organization default —</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Not directly editable here</AlertTitle>
              <AlertDescription className="text-xs">
                Overrides for “{setting.label}” are managed via the Configuration Center. Use the Advanced tab or Configuration Assignment page.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button>
          {hasOptions && (
            <Button onClick={() => onSave(value)} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Override
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DepartmentCommDefaultsCards;
