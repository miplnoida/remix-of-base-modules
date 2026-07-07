/**
 * Epic OM-9.5 — Organisation Comm Defaults panel.
 *
 * Grouped, business-friendly default-setting cards for Organisation Profile.
 * Each card surfaces: selected resource name/code, status, source, health,
 * and Preview / Change / Open Master / Test Resolve actions.
 *
 * The picker delegates to the existing <DefaultAssetPicker> for backwards
 * compatibility with letterheads/signatures/disclaimers/print-footers; the
 * card frame around it standardises the visual language and adds a health
 * badge sourced from the OM-9.5 defaults health inspector.
 */
import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertTriangle, XCircle, ExternalLink, Zap, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { DefaultAssetPicker, type DefaultAssetOption } from '@/components/comm/DefaultAssetPicker';
import { LetterheadPreview } from '@/components/comm/LetterheadPreview';
import {
  useLetterheadById,
  useEmailSignatureById,
  useDisclaimerById,
  usePrintFooterById,
} from '@/hooks/comm/useCommAssets';
import { validateOrganisationDefaultsHealth, type OrgDefaultFinding } from '@/platform/organization-defaults';
import { resolveEffectiveSettingsBundle } from '@/platform/organization-settings';

interface CommonPickerProps<T = string> {
  value: T | null | undefined;
  onChange: (v: T | null) => void;
  options: any[];
}

interface Props extends CommonPickerProps<string> {
  form: any;
  set: (k: string, v: any) => void;
  letterheads: any[];
  signatures: any[];
  disclaimers: any[];
  footers: any[];
  locations: any[];
  languages: { code: string; label: string }[];
}

/* ------------------------------------------------------------------ */
/*  Health helpers                                                     */
/* ------------------------------------------------------------------ */

function HealthBadge({ finding }: { finding?: OrgDefaultFinding }) {
  if (!finding) return <Badge variant="outline" className="text-[10px]">Unknown</Badge>;
  const map = {
    ok:      { icon: <CheckCircle2 className="h-3 w-3 mr-1" />, cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'OK' },
    info:    { icon: <Info className="h-3 w-3 mr-1" />,          cls: 'bg-sky-100 text-sky-800 border-sky-200',              label: 'Info' },
    warning: { icon: <AlertTriangle className="h-3 w-3 mr-1" />, cls: 'bg-amber-100 text-amber-900 border-amber-200',        label: 'Warning' },
    error:   { icon: <XCircle className="h-3 w-3 mr-1" />,       cls: 'bg-rose-100 text-rose-800 border-rose-200',            label: 'Missing' },
  } as const;
  const m = map[finding.severity];
  return <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${m.cls}`}>{m.icon}{m.label}</span>;
}

/* ------------------------------------------------------------------ */
/*  Card frame                                                         */
/* ------------------------------------------------------------------ */

function DefaultCard({
  title,
  finding,
  status,
  source,
  children,
  masterHref,
  hint,
}: {
  title: string;
  finding?: OrgDefaultFinding;
  status?: string;
  source?: string;
  masterHref?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <HealthBadge finding={finding} />
        </div>
        <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-muted-foreground">
          {status && <span>Status: <strong className="text-foreground">{status}</strong></span>}
          {source && <span>· Source: <strong className="text-foreground">{source}</strong></span>}
          {masterHref && (
            <Link to={masterHref} className="ml-auto inline-flex items-center gap-1 text-primary hover:underline">
              <ExternalLink className="h-3 w-3" /> Open Master
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {children}
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main panel                                                         */
/* ------------------------------------------------------------------ */

export function OrganizationCommDefaultsPanel({
  form, set, letterheads, signatures, disclaimers, footers, locations, languages,
}: Omit<Props, 'value' | 'onChange' | 'options'>) {
  const [health, setHealth] = useState<Record<string, OrgDefaultFinding>>({});
  const [loadingHealth, setLoadingHealth] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoadingHealth(true);
    validateOrganisationDefaultsHealth()
      .then((r) => {
        if (!alive) return;
        const idx: Record<string, OrgDefaultFinding> = {};
        r.findings.forEach((f) => { idx[f.settingKey] = f; });
        setHealth(idx);
      })
      .finally(() => alive && setLoadingHealth(false));
    return () => { alive = false; };
  }, [
    form.default_letterhead_id, form.default_email_signature_id,
    form.default_disclaimer_id, form.default_print_footer_id,
    form.default_language, form.default_location_id,
  ]);

  const testResolve = async (settingKey: string) => {
    try {
      const bundle = await resolveEffectiveSettingsBundle({});
      const result: any = bundle?.settings?.[settingKey];
      if (!result) { toast.info(`No result for ${settingKey}`); return; }
      toast.success(`${result.label}: ${result.effectiveLabel}`, {
        description: `Source: ${result.sourceLabel} · Health: ${result.health}`,
      });
    } catch (e: any) {
      toast.error(`Test Resolve failed`, { description: e?.message ?? 'resolver error' });
    }
  };

  const commonProps = (key: string, masterPath: string) => ({
    finding: health[key],
    status: health[key]?.isActive === false ? 'Inactive' : health[key]?.severity === 'ok' ? 'Active' : health[key]?.severity === 'error' ? 'Missing' : 'Warning',
    source: health[key]?.source === 'ORG_PROFILE_COLUMN' ? 'Organization Default'
          : health[key]?.source === 'GUIDED_ASSIGNMENT' ? 'Guided Assignment'
          : health[key]?.source === 'MISSING' ? 'Not Configured'
          : 'System Fallback',
    masterHref: masterPath,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground max-w-3xl">
          Organisation-wide defaults consumed by every department, letter, email, report and template.
          Each card shows the selected resource, health, and source. Use <em>Preview</em> to render,
          <em> Open Master</em> to edit the master record, and <em>Test Resolve</em> to run the same
          runtime resolver documents use.
        </p>
        {loadingHealth && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Document Defaults */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Document Defaults</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <DefaultCard title="Default Letterhead" {...commonProps('default_letterhead', '/admin/template-management/assets/letterheads')}>
            <DefaultAssetPicker
              label=""
              value={form.default_letterhead_id}
              onChange={(id) => set('default_letterhead_id', id)}
              options={toOptions(letterheads)}
              masterPath="/admin/template-management/assets/letterheads"
              renderPreview={(o) => <LetterheadPreviewFor id={o.id} />}
              onTestResolve={async () => { await testResolve('default_letterhead'); return null; }}
            />
          </DefaultCard>

          <DefaultCard title="Default Print Footer" {...commonProps('default_print_footer', '/admin/template-management/assets/headers-footers')}>
            <DefaultAssetPicker
              label=""
              value={form.default_print_footer_id}
              onChange={(id) => set('default_print_footer_id', id)}
              options={toOptions(footers)}
              masterPath="/admin/template-management/assets/headers-footers"
              renderPreview={(o) => <PrintFooterPreviewFor id={o.id} />}
              onTestResolve={async () => { await testResolve('default_print_footer'); return null; }}
            />
          </DefaultCard>

          <DefaultCard
            title="Default Document Template"
            finding={{ settingKey: 'default_document_template', label: 'Default Document Template', severity: 'info', source: 'GUIDED_ASSIGNMENT', message: 'Managed via Configuration Center guided assignments per business event.' }}
            source="Guided Assignment"
            masterHref="/admin/template-management/configuration-center"
            hint="Assign per business event in the Configuration Center. No single org-wide template — each event resolves its own."
          >
            <div className="text-xs text-muted-foreground border border-dashed rounded p-3 text-center">
              Configured via Configuration Center
            </div>
          </DefaultCard>

          <DefaultCard
            title="Default Retention Policy"
            finding={{ settingKey: 'default_retention_policy', label: 'Default Retention Policy', severity: 'info', source: 'GUIDED_ASSIGNMENT', message: 'Managed via Configuration Center.' }}
            source="Guided Assignment"
            masterHref="/admin/template-management/configuration-center"
          >
            <div className="text-xs text-muted-foreground border border-dashed rounded p-3 text-center">
              Configured via Configuration Center
            </div>
          </DefaultCard>
        </div>
      </section>

      {/* Email Defaults */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Email Defaults</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <DefaultCard title="Default Email Signature" {...commonProps('default_email_signature', '/admin/template-management/assets/signatures')}>
            <DefaultAssetPicker
              label=""
              value={form.default_email_signature_id}
              onChange={(id) => set('default_email_signature_id', id)}
              options={toOptions(signatures, 'scope_code')}
              masterPath="/admin/template-management/assets/signatures"
              renderPreview={(o) => <EmailSignaturePreviewFor id={o.id} />}
              onTestResolve={async () => { await testResolve('default_email_signature'); return null; }}
            />
          </DefaultCard>

          <DefaultCard title="Default Disclaimer" {...commonProps('default_disclaimer', '/admin/template-management/assets/disclaimers')}
            hint="Disclaimer body comes from the linked Text Block (single source of truth).">
            <DefaultAssetPicker
              label=""
              value={form.default_disclaimer_id}
              onChange={(id) => set('default_disclaimer_id', id)}
              options={toOptions(disclaimers)}
              masterPath="/admin/template-management/assets/disclaimers"
              renderPreview={(o) => <DisclaimerPreviewFor id={o.id} />}
              onTestResolve={async () => { await testResolve('default_disclaimer'); return null; }}
            />
          </DefaultCard>

          <DefaultCard title="Default Language" {...commonProps('default_language', '/admin/template-management/library/languages')}>
            <select
              className="w-full border rounded h-10 px-2 bg-background text-sm"
              value={form.default_language ?? ''}
              onChange={(e) => set('default_language', e.target.value)}
            >
              <option value="">— None —</option>
              {languages.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </DefaultCard>

          <DefaultCard
            title="Default Output Channel"
            finding={{ settingKey: 'default_output_channel', label: 'Default Output Channel', severity: 'info', source: 'GUIDED_ASSIGNMENT', message: 'Resolved per business event via Configuration Center.' }}
            source="Guided Assignment"
            masterHref="/admin/template-management/configuration-center"
          >
            <div className="text-xs text-muted-foreground border border-dashed rounded p-3 text-center">
              Configured via Configuration Center
            </div>
          </DefaultCard>
        </div>
      </section>

      {/* Location & Workflow */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Location & Workflow Defaults</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <DefaultCard title="Default Location" {...commonProps('default_location', '/admin/organization/locations')}>
            <select
              className="w-full border rounded h-10 px-2 bg-background text-sm"
              value={form.default_location_id ?? ''}
              onChange={(e) => set('default_location_id', e.target.value || null)}
            >
              <option value="">— None —</option>
              {locations.filter((l: any) => l.is_active).map((l: any) => (
                <option key={l.id} value={l.id}>{l.branch_name ?? l.name}</option>
              ))}
            </select>
          </DefaultCard>

          <DefaultCard
            title="Default Approval Workflow"
            finding={{ settingKey: 'default_approval_workflow', label: 'Default Approval Workflow', severity: 'info', source: 'GUIDED_ASSIGNMENT', message: 'Resolved via Configuration Center per business event.' }}
            source="Guided Assignment"
            masterHref="/admin/template-management/configuration-center"
          >
            <div className="text-xs text-muted-foreground border border-dashed rounded p-3 text-center">
              Configured via Configuration Center
            </div>
          </DefaultCard>

          <DefaultCard
            title="DMS Folder"
            finding={{ settingKey: 'default_dms_folder', label: 'DMS Folder', severity: 'info', source: 'MISSING', message: 'DMS folder catalogue is planned (OM-10+).' }}
            source="Planned"
            hint="DMS folder catalogue is not yet available. This default becomes selectable once the catalogue ships."
          >
            <div className="text-xs text-muted-foreground border border-dashed rounded p-3 text-center italic">
              Planned — Not Available
            </div>
          </DefaultCard>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function toOptions(list: any[], moduleField: string = 'module_code'): DefaultAssetOption[] {
  return (list ?? [])
    .filter((r) => r && r.id)
    .map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code ?? null,
      module_code: r[moduleField] ?? r.module_code ?? null,
      category: r.category ?? null,
      is_active: r.is_active !== false,
      is_default: r.is_default === true,
    }));
}

function LetterheadPreviewFor({ id }: { id: string }) {
  const { data, isLoading, error } = useLetterheadById(id);
  if (isLoading) return <div className="p-4 text-xs text-muted-foreground text-center flex items-center justify-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading preview…</div>;
  if (error || !data) return <div className="p-4 text-xs text-destructive text-center">Preview could not be generated.</div>;
  const d = (data as any).design_config ?? {};
  return (
    <LetterheadPreview
      design={{
        page_size: d.page_size ?? 'A4',
        orientation: d.orientation ?? 'portrait',
        margins: d.margins,
        header_asset_code: d.header_asset_code,
        footer_asset_code: d.footer_asset_code,
        logo_asset_code: d.logo_asset_code,
        seal_asset_code: d.seal_asset_code,
        watermark_asset_code: d.watermark_asset_code,
      }}
    />
  );
}

function EmailSignaturePreviewFor({ id }: { id: string }) {
  const { data, isLoading, error } = useEmailSignatureById(id);
  if (isLoading) return <div className="p-4 text-xs text-muted-foreground text-center flex items-center justify-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading preview…</div>;
  if (error || !data) return <div className="p-4 text-xs text-destructive text-center">Preview could not be generated.</div>;
  const d: any = data;
  return (
    <div className="p-4 bg-background border rounded">
      {d.html_signature
        ? <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: d.html_signature }} />
        : <pre className="text-xs whitespace-pre-wrap font-sans text-muted-foreground">{d.plain_text_signature ?? '(empty signature)'}</pre>}
    </div>
  );
}

function DisclaimerPreviewFor({ id }: { id: string }) {
  const { data, isLoading, error } = useDisclaimerById(id);
  if (isLoading) return <div className="p-4 text-xs text-muted-foreground text-center flex items-center justify-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading preview…</div>;
  if (error || !data) return <div className="p-4 text-xs text-destructive text-center">Preview could not be generated.</div>;
  const d: any = data;
  return (
    <div className="p-4 bg-background border rounded space-y-2">
      <div className="flex gap-2 text-[10px] text-muted-foreground">
        {d.category && <span>Category: <strong className="text-foreground">{d.category}</strong></span>}
        {d.language && <span>· Language: <strong className="text-foreground">{d.language}</strong></span>}
      </div>
      <div className="text-xs whitespace-pre-wrap text-foreground">{d.body ?? '(empty disclaimer)'}</div>
    </div>
  );
}

function PrintFooterPreviewFor({ id }: { id: string }) {
  const { data, isLoading, error } = usePrintFooterById(id);
  if (isLoading) return <div className="p-4 text-xs text-muted-foreground text-center flex items-center justify-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading preview…</div>;
  if (error || !data) return <div className="p-4 text-xs text-destructive text-center">Preview could not be generated.</div>;
  const d: any = data;
  return (
    <div className="p-4 bg-background border rounded space-y-2">
      <div className="border rounded p-6 min-h-[200px] bg-muted/20 flex flex-col justify-between">
        <div className="text-[10px] text-muted-foreground text-center">Document body area</div>
        <div className="border-t pt-2 mt-4">
          {d.footer_html
            ? <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: d.footer_html }} />
            : <div className="text-xs text-muted-foreground italic text-center">{d.page_footer ?? '(no footer content)'}</div>}
        </div>
      </div>
      {d.watermark_url && <div className="text-[10px] text-muted-foreground">Watermark: {d.watermark_url}</div>}
    </div>
  );
}

export default OrganizationCommDefaultsPanel;
