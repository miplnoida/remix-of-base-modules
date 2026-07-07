/**
 * Epic OM-6 — Department Inheritance Overview
 *
 * Renders effective organisation/communication settings for a department
 * using the CANONICAL `resolveEffectiveSettingsBundle`. Shows source
 * (Department Override / Organization Default / Missing), inheritance mode,
 * health, and a Reset action per supported setting.
 *
 * Uses the SAME resolver that runtime consumers call — preview and runtime
 * cannot silently disagree.
 */
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, RotateCcw, ShieldCheck, AlertTriangle, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { OrgActionGate } from '@/platform/organization/orgActionPermissions';
import {
  resolveEffectiveSettingsBundle,
  resetDepartmentSettingToInherited,
  validateInheritanceHealth,
  SUPPORTED_RESET_KEYS,
  type EffectiveSettingResult,
} from '@/platform/organization-settings';

interface Props {
  departmentId: string;
  departmentCode: string;
  departmentName?: string;
}

function ModeBadge({ s }: { s: EffectiveSettingResult }) {
  const variant: any =
    s.health === 'ERROR' ? 'destructive' :
    s.inheritanceMode === 'OVERRIDE' ? 'default' :
    s.inheritanceMode === 'MISSING' ? 'outline' :
    'secondary';
  return <Badge variant={variant}>{s.sourceLabel}</Badge>;
}

function HealthBadge({ s }: { s: EffectiveSettingResult }) {
  if (s.status === 'PLANNED') return <Badge variant="outline">Deferred</Badge>;
  const cls =
    s.health === 'OK' ? 'border-emerald-500 text-emerald-700' :
    s.health === 'WARN' ? 'border-amber-500 text-amber-700' :
    s.health === 'MISSING' ? 'border-muted-foreground text-muted-foreground' :
    'border-destructive text-destructive';
  return <Badge variant="outline" className={cls}>{s.health}</Badge>;
}

export function DepartmentInheritanceOverview({ departmentId, departmentCode, departmentName }: Props) {
  const qc = useQueryClient();
  const bundleKey = ['om6-effective-settings', departmentCode];
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: bundleKey,
    queryFn: () => resolveEffectiveSettingsBundle({ departmentCode }, { audit: true }),
    enabled: !!departmentCode,
  });

  const resetMut = useMutation({
    mutationFn: async (settingKey: string) => {
      await resetDepartmentSettingToInherited({ departmentId, departmentCode, settingKey, reason: 'Admin reset via Inheritance Overview' });
    },
    onSuccess: () => {
      toast.success('Reset to Organization Default');
      qc.invalidateQueries({ queryKey: bundleKey });
      qc.invalidateQueries({ queryKey: ['dept-effective-preview', departmentCode] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Reset failed'),
  });

  const healthMut = useMutation({
    mutationFn: () => validateInheritanceHealth({ departmentCodes: [departmentCode] }),
    onSuccess: (r) => toast.success(`Inheritance health: ${r.summary.errors} error(s), ${r.summary.warnings} warning(s)`),
    onError: (e: any) => toast.error(e?.message ?? 'Health check failed'),
  });

  const grouped = useMemo(() => {
    if (!data) return {} as Record<string, EffectiveSettingResult[]>;
    return data.ordered.reduce((acc, s) => {
      (acc[s.status === 'PLANNED' ? 'DEFERRED' : 'ACTIVE'] ||= []).push(s);
      return acc;
    }, {} as Record<string, EffectiveSettingResult[]>);
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resolving effective settings…
      </div>
    );
  }

  const errorCount = data.ordered.filter((s) => s.health === 'ERROR').length;
  const warnCount = data.ordered.filter((s) => s.health === 'WARN' || (s.health === 'MISSING' && s.status !== 'PLANNED')).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs text-muted-foreground mr-auto">
          Canonical effective settings for <span className="font-medium text-foreground">{departmentName ?? departmentCode}</span>.
          Preview uses the same resolver that runtime consumers call.
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Activity className="h-3 w-3 mr-1" />}
          Re-resolve
        </Button>
        <OrgActionGate permission="departments.manage" actionLabel="run inheritance health check">
          <Button size="sm" variant="outline" onClick={() => healthMut.mutate()} disabled={healthMut.isPending}>
            {healthMut.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
            Run health check
          </Button>
        </OrgActionGate>
      </div>

      {(errorCount > 0 || warnCount > 0) && (
        <Alert variant={errorCount > 0 ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {errorCount > 0 && `${errorCount} inheritance error${errorCount === 1 ? '' : 's'}`}
            {errorCount > 0 && warnCount > 0 && ' · '}
            {warnCount > 0 && `${warnCount} warning${warnCount === 1 ? '' : 's'}`}
          </AlertTitle>
          <AlertDescription className="text-xs">
            Fix conflicts (override selected but marked inheriting), missing values, or references to inactive resources.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Effective Settings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setting</TableHead>
                <TableHead>Effective Value</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(grouped.ACTIVE ?? []).map((s) => {
                const canReset = SUPPORTED_RESET_KEYS.includes(s.key) && (s.isOverride || s.inheritanceMode === 'CONFLICT');
                return (
                  <TableRow key={s.key}>
                    <TableCell className="font-medium">{s.label}</TableCell>
                    <TableCell className="text-sm">
                      <div className="truncate max-w-[280px]">{s.effectiveLabel}</div>
                      {s.warnings.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">{s.warnings[0]}</div>
                      )}
                    </TableCell>
                    <TableCell><ModeBadge s={s} /></TableCell>
                    <TableCell><HealthBadge s={s} /></TableCell>
                    <TableCell className="text-right">
                      {canReset ? (
                        <OrgActionGate permission="departments.manage" actionLabel={`reset ${s.label}`}>
                          <Button
                            size="sm" variant="ghost"
                            disabled={resetMut.isPending}
                            onClick={() => resetMut.mutate(s.key)}
                            title="Reset to Organization Default"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                          </Button>
                        </OrgActionGate>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(grouped.DEFERRED ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Deferred / Not currently configurable</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-xs text-muted-foreground space-y-1">
              {(grouped.DEFERRED ?? []).map((s) => (
                <li key={s.key}>
                  <span className="font-medium text-foreground">{s.label}</span> — {s.sourceLabel}
                  {s.note && <> · {s.note}</>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
