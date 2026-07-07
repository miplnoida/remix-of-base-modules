/**
 * Epic OM-9.7 — Canonical Department Preview & Health.
 *
 * Uses `resolveEffectiveSettingsBundle` from '@/platform/organization-settings'
 * — the SAME resolver runtime consumers call. Shows document/email/print-footer
 * previews plus effective settings, warnings and health issues.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  resolveEffectiveSettingsBundle,
  type EffectiveSettingResult,
} from '@/platform/organization-settings';

interface Props {
  departmentCode: string;
  departmentName?: string;
}

function ValueRow({ s }: { s: EffectiveSettingResult }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{s.label}</TableCell>
      <TableCell className="text-sm">
        <div className="truncate max-w-[300px]" title={s.effectiveLabel}>{s.effectiveLabel}</div>
      </TableCell>
      <TableCell>
        <Badge variant={s.isOverride ? 'default' : s.inheritanceMode === 'MISSING' ? 'outline' : 'secondary'}>
          {s.sourceLabel}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={
            s.health === 'OK' ? 'border-emerald-500 text-emerald-700'
            : s.health === 'WARN' ? 'border-amber-500 text-amber-700'
            : s.health === 'MISSING' ? 'border-muted-foreground text-muted-foreground'
            : 'border-destructive text-destructive'
          }
        >
          {s.status === 'PLANNED' ? 'Deferred' : s.health}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

export function DepartmentPreviewAndHealth({ departmentCode, departmentName }: Props) {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['om9-7-preview', departmentCode],
    // Timeout guard: canonical resolver must respond within 10s; otherwise we
    // surface an explicit error instead of an infinite spinner.
    queryFn: async () => {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Preview timed out after 10s. Please retry.')), 10_000),
      );
      return Promise.race([
        resolveEffectiveSettingsBundle({ departmentCode }, { audit: true }),
        timeout,
      ]) as ReturnType<typeof resolveEffectiveSettingsBundle>;
    },
    enabled: !!departmentCode,
    retry: false,
    staleTime: 30_000,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, EffectiveSettingResult>();
    (data?.ordered ?? []).forEach((s) => map.set(s.key, s));
    return {
      letterhead: map.get('default_letterhead'),
      docTemplate: map.get('default_document_template'),
      signature: map.get('default_email_signature'),
      disclaimer: map.get('default_disclaimer'),
      printFooter: map.get('default_print_footer'),
      notifTemplate: map.get('default_notification_template'),
      language: map.get('default_language'),
      channel: map.get('default_output_channel'),
      location: map.get('default_location'),
      logo: map.get('default_logo'),
      seal: map.get('default_seal'),
      watermark: map.get('default_watermark'),
      textBlock: map.get('default_text_block'),
      retention: map.get('default_retention_policy'),
      workflow: map.get('default_approval_workflow'),
      dms: map.get('default_dms_folder'),
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resolving effective preview…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Preview unavailable</AlertTitle>
        <AlertDescription className="text-xs space-y-2">
          <div>{(error as any)?.message ?? 'The canonical resolver could not produce an effective preview for this department.'}</div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const errCount = data.ordered.filter((s) => s.health === 'ERROR').length;
  const warnCount = data.ordered.filter((s) => s.health === 'WARN').length;
  const missCount = data.ordered.filter((s) => s.health === 'MISSING' && s.status !== 'PLANNED').length;
  const okCount = data.ordered.filter((s) => s.health === 'OK').length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs text-muted-foreground mr-auto">
          Canonical effective preview for <span className="font-medium text-foreground">{departmentName ?? departmentCode}</span>.
          Powered by <code className="text-[10px]">resolveEffectiveSettingsBundle</code>.
        </div>
        <Badge variant="outline" className="border-emerald-500 text-emerald-700">
          <CheckCircle2 className="h-3 w-3 mr-1" /> {okCount} OK
        </Badge>
        {warnCount > 0 && (
          <Badge variant="outline" className="border-amber-500 text-amber-700">{warnCount} Warning</Badge>
        )}
        {missCount > 0 && (
          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">{missCount} Missing</Badge>
        )}
        {errCount > 0 && (
          <Badge variant="destructive">{errCount} Error</Badge>
        )}
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
          Re-resolve
        </Button>
      </div>

      {(errCount + warnCount + missCount) > 0 && (
        <Alert variant={errCount > 0 ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {errCount > 0 && `${errCount} error${errCount === 1 ? '' : 's'}`}
            {errCount > 0 && (warnCount + missCount) > 0 && ' · '}
            {warnCount > 0 && `${warnCount} warning${warnCount === 1 ? '' : 's'}`}
            {warnCount > 0 && missCount > 0 && ' · '}
            {missCount > 0 && `${missCount} missing`}
          </AlertTitle>
          <AlertDescription className="text-xs">
            Address override conflicts, missing values, or references to inactive resources to keep runtime output consistent.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="document">
        <TabsList>
          <TabsTrigger value="document">Document</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="print">Print Footer</TabsTrigger>
          <TabsTrigger value="effective">Effective Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="document" className="mt-3 space-y-3">
          <PreviewCard title="Document defaults resolved">
            <PreviewRow label="Location"           s={grouped.location} />
            <PreviewRow label="Letterhead"         s={grouped.letterhead} />
            <PreviewRow label="Document template"  s={grouped.docTemplate} />
            <PreviewRow label="Disclaimer"         s={grouped.disclaimer} />
            <PreviewRow label="Print footer"       s={grouped.printFooter} />
            <PreviewRow label="Logo"               s={grouped.logo} />
            <PreviewRow label="Seal"               s={grouped.seal} />
            <PreviewRow label="Watermark"          s={grouped.watermark} />
            <PreviewRow label="Text blocks"        s={grouped.textBlock} />
            <PreviewRow label="Retention policy"   s={grouped.retention} />
            <PreviewRow label="Approval workflow"  s={grouped.workflow} />
          </PreviewCard>
        </TabsContent>

        <TabsContent value="email" className="mt-3 space-y-3">
          <PreviewCard title="Email defaults resolved">
            <PreviewRow label="Notification template" s={grouped.notifTemplate} />
            <PreviewRow label="Email signature"       s={grouped.signature} />
            <PreviewRow label="Disclaimer"            s={grouped.disclaimer} />
            <PreviewRow label="Language"              s={grouped.language} />
            <PreviewRow label="Output channel"        s={grouped.channel} />
          </PreviewCard>
        </TabsContent>

        <TabsContent value="print" className="mt-3 space-y-3">
          <PreviewCard title="Print footer defaults resolved">
            <PreviewRow label="Print footer" s={grouped.printFooter} />
            <PreviewRow label="Disclaimer"   s={grouped.disclaimer} />
            <PreviewRow label="Letterhead"   s={grouped.letterhead} />
          </PreviewCard>
        </TabsContent>

        <TabsContent value="effective" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">All effective settings</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setting</TableHead>
                    <TableHead>Effective Value</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ordered.map((s) => <ValueRow key={s.key} s={s} />)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PreviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">{children}</CardContent>
    </Card>
  );
}

function PreviewRow({ label, s }: { label: string; s?: EffectiveSettingResult }) {
  if (!s) return (
    <div className="flex items-center justify-between border-b pb-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">Not tracked</span>
    </div>
  );
  return (
    <div className="flex items-center justify-between gap-2 border-b pb-1.5 last:border-0">
      <span className="text-xs text-muted-foreground min-w-[140px]">{label}</span>
      <span className="text-sm truncate flex-1" title={s.effectiveLabel}>{s.effectiveLabel}</span>
      <Badge variant={s.isOverride ? 'default' : s.inheritanceMode === 'MISSING' ? 'outline' : 'secondary'} className="text-[10px]">
        {s.sourceLabel}
      </Badge>
    </div>
  );
}

export default DepartmentPreviewAndHealth;
