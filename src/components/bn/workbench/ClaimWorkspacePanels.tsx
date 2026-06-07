/**
 * Claim Workspace — extra panels used by /bn/claims/:id
 *
 * Self-contained panels that read directly from Lovable Cloud so the
 * Claim Workbench can present a complete, channel-agnostic processing
 * surface for every claim (public, staff, paper, migrated legacy).
 *
 *   - ApplicationDetailsPanel  → bn_claim_application + product version used
 *   - WorkflowTasksPanel       → workflow_tasks for the bound instance
 *   - PaymentsPanel            → bn_payment_instruction for the claim
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BnEmptyState, BnStatusBadge } from '@/components/bn/shared';
import { formatDateForDisplay } from '@/lib/format-config';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DynamicSectionRenderer, type FieldMeta } from './DynamicSectionRenderer';
import { AmendFieldDialog } from './AmendFieldDialog';
import { useClaimEditability } from '@/hooks/bn/useClaimEditability';

const db = supabase as any;

const CHANNEL_LABEL: Record<string, string> = {
  PUBLIC_ONLINE: 'Public Online',
  STAFF_OFFLINE: 'Staff Offline',
  ASSISTED_COUNTER: 'Assisted Counter',
  BACK_OFFICE_ENTRY: 'Back Office',
  MIGRATED_LEGACY: 'Migrated (Legacy)',
};

export function channelLabel(code?: string | null) {
  if (!code) return '—';
  return CHANNEL_LABEL[code] ?? code;
}

// ─── Application Details + Product Version Used ──────────────────────
export const ApplicationDetailsPanel: React.FC<{ claimId: string; productVersionId?: string | null }>
= ({ claimId, productVersionId }) => {
  const [amendField, setAmendField] = React.useState<FieldMeta | null>(null);
  const { data: editability } = useClaimEditability(claimId);
  const canAmend = !!editability?.anyEditable;
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['bn-claim-application', claimId, productVersionId],
    enabled: !!claimId,
    queryFn: async () => {
      const [appRes, versionRes] = await Promise.all([
        db.from('bn_claim_application')
          .select('*')
          .eq('claim_id', claimId)
          .order('submitted_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle(),
        productVersionId
          ? db.from('bn_product_version')
              .select('id, version_number, status, effective_from, effective_to, bn_product:product_id(benefit_name, benefit_code, category)')
              .eq('id', productVersionId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
      ]);
      if (appRes.error) throw appRes.error;
      if (versionRes.error) throw versionRes.error;
      return { app: appRes.data, version: versionRes.data };
    },
  });

  if (isLoading) return <BnEmptyState type="loading" title="Loading application…" />;
  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-6 space-y-3">
          <p className="text-sm text-destructive font-medium">Could not load application details</p>
          <p className="text-xs text-muted-foreground break-all">{(error as Error)?.message}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>Retry</Button>
        </CardContent>
      </Card>
    );
  }
  const app = data?.app;
  const version: any = data?.version;
  const rawJson = app?.raw_application_json;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Application Details</CardTitle></CardHeader>
        <CardContent>
          {!app ? (
            <p className="text-sm text-muted-foreground">No application record found for this claim.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 text-sm">
              <Field label="Channel" value={<Badge variant="secondary">{channelLabel(app.application_channel)}</Badge>} />
              <Field label="Submitted By Type" value={app.submitted_by_type ?? '—'} />
              <Field label="Submitted By" value={app.submitted_by_user_id ?? '—'} />
              <Field label="Submitted At" value={app.submitted_at ? formatDateForDisplay(app.submitted_at) : '—'} />
              <Field label="Entered At" value={app.entered_at ? formatDateForDisplay(app.entered_at) : '—'} />
              <Field label="Source IP" value={app.source_ip ?? '—'} />
              <Field label="User Agent" value={<span className="line-clamp-2 break-all">{app.user_agent ?? '—'}</span>} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Product Version Used</CardTitle></CardHeader>
        <CardContent>
          {!version ? (
            <p className="text-sm text-muted-foreground">Product version not resolved on this claim.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 text-sm">
              <Field label="Benefit" value={version.bn_product?.benefit_name ?? '—'} />
              <Field label="Benefit Code" value={version.bn_product?.benefit_code ?? '—'} />
              <Field label="Category" value={version.bn_product?.category ?? '—'} />
              <Field label="Version" value={`v${version.version_number}`} />
              <Field label="Effective" value={`${formatDateForDisplay(version.effective_from)} → ${version.effective_to ? formatDateForDisplay(version.effective_to) : 'open'}`} />
              <Field label="Status" value={<BnStatusBadge status={version.status} label={version.status} />} />
            </div>
          )}
        </CardContent>
      </Card>

      {productVersionId && rawJson && (
        <DynamicSectionRenderer
          productVersionId={productVersionId}
          channelCode={app?.application_channel === 'PUBLIC_ONLINE' ? 'ONLINE' : 'OFFLINE'}
          payload={rawJson}
          title="Submitted Application (catalog-driven view)"
          onEditField={canAmend ? (f) => setAmendField(f) : undefined}
        />
      )}

      <AmendFieldDialog
        claimId={claimId}
        field={amendField}
        currentValue={amendField ? (rawJson?.[amendField.field_code] ?? rawJson?.benefit_facts?.[amendField.field_code]) : undefined}
        open={!!amendField}
        onOpenChange={(o) => !o && setAmendField(null)}
      />

      {rawJson && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Raw Application Payload</CardTitle></CardHeader>
          <CardContent>
            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">Show raw JSON</summary>
              <pre className="mt-3 text-xs bg-muted/50 rounded p-3 overflow-auto max-h-96">{JSON.stringify(rawJson, null, 2)}</pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── Workflow Tasks ─────────────────────────────────────────────────
export const WorkflowTasksPanel: React.FC<{ claimId: string; workflowInstanceId?: string | null }>
= ({ claimId, workflowInstanceId }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['bn-claim-workflow-tasks', claimId, workflowInstanceId],
    enabled: !!claimId,
    queryFn: async () => {
      // Resolve instance via claim binding first, then via source_module
      let instId = workflowInstanceId ?? null;
      if (!instId) {
        const { data: inst } = await db
          .from('workflow_instances')
          .select('id, workflow_name, status, started_at, due_at')
          .eq('source_module', 'bn_claim')
          .eq('source_record_id', claimId)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (inst) instId = inst.id;
      }
      if (!instId) return { instance: null, tasks: [] as any[] };
      const [{ data: instance }, { data: tasks }] = await Promise.all([
        db.from('workflow_instances')
          .select('id, workflow_name, status, started_at, due_at, current_step_id')
          .eq('id', instId)
          .maybeSingle(),
        db.from('workflow_tasks')
          .select('id, step_name, status, assigned_to, assigned_role, due_at, created_at, completed_at')
          .eq('instance_id', instId)
          .order('created_at', { ascending: true }),
      ]);
      return { instance, tasks: tasks ?? [] };
    },
  });

  if (isLoading) return <BnEmptyState type="loading" title="Loading workflow tasks…" />;
  if (!data?.instance) {
    return (
      <BnEmptyState
        type="empty"
        title="No central workflow instance"
        description="This claim is governed by the bn_claim_transition_rule fallback. Use the action bar to drive the next status."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">{data.instance.workflow_name}</CardTitle>
            <BnStatusBadge status={data.instance.status} label={data.instance.status} />
          </div>
        </CardHeader>
        <CardContent className="text-sm grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Started" value={formatDateForDisplay(data.instance.started_at)} />
          <Field label="Due" value={data.instance.due_at ? formatDateForDisplay(data.instance.due_at) : '—'} />
          <div className="md:col-span-2 flex items-end justify-end">
            <Button variant="outline" size="sm" onClick={() => navigate('/workflow/my-tasks')}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Worklist
            </Button>
          </div>
        </CardContent>
      </Card>

      {data.tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks created yet.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-2 font-medium">Step</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium">Assigned</th>
                <th className="p-2 font-medium">Due</th>
                <th className="p-2 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody>
              {data.tasks.map((t: any) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2">{t.step_name}</td>
                  <td className="p-2"><BnStatusBadge status={t.status} label={t.status} /></td>
                  <td className="p-2">{t.assigned_to ?? t.assigned_role ?? '—'}</td>
                  <td className="p-2">{t.due_at ? formatDateForDisplay(t.due_at) : '—'}</td>
                  <td className="p-2">{t.completed_at ? formatDateForDisplay(t.completed_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Entitlement + Payments ─────────────────────────────────────────
export const PaymentsPanel: React.FC<{ claimId: string }> = ({ claimId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bn-claim-payments-and-entitlement', claimId],
    enabled: !!claimId,
    queryFn: async () => {
      const [ent, pay] = await Promise.all([
        db.from('bn_entitlement')
          .select('id, claim_id, ssn, claim_number, status, entitlement_type, payment_frequency, weekly_rate, monthly_rate, lump_sum_amount, total_entitlement, remaining_amount, effective_from, effective_to, activated_at, activated_by')
          .eq('claim_id', claimId)
          .order('activated_at', { ascending: false }),
        db.from('bn_payment_instruction')
          .select('id, claim_id, entitlement_id, amount, currency, status, due_date, paid_date, payment_method, bank_code, account_number, payment_reference, description, frequency')
          .eq('claim_id', claimId)
          .order('due_date', { ascending: false }),
      ]);
      return { entitlements: ent.data ?? [], payments: pay.data ?? [] };
    },
  });

  if (isLoading) return <BnEmptyState type="loading" title="Loading entitlement & payments…" />;
  if (error) return <BnEmptyState type="error" title="Failed to load" description={(error as any)?.message} />;

  const ents = data?.entitlements ?? [];
  const pays = data?.payments ?? [];

  return (
    <div className="space-y-6">
      {/* Entitlement / Award */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Entitlement / Award</h3>
        {ents.length === 0 ? (
          <BnEmptyState type="empty" title="No entitlement"
            description="No entitlement record has been created for this claim yet." />
        ) : (
          <div className="space-y-3">
            {ents.map((e: any) => (
              <div key={e.id} className="rounded-lg border p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Entitlement #" value={<span className="font-mono">{String(e.id).slice(0, 8)}</span>} />
                <Field label="Type" value={e.entitlement_type ?? '—'} />
                <Field label="Status" value={<BnStatusBadge status={e.status} label={e.status} />} />
                <Field label="Frequency" value={e.payment_frequency ?? '—'} />
                <Field label="Weekly Rate" value={e.weekly_rate != null ? Number(e.weekly_rate).toFixed(2) : '—'} />
                <Field label="Monthly Rate" value={e.monthly_rate != null ? Number(e.monthly_rate).toFixed(2) : '—'} />
                <Field label="Total" value={e.total_entitlement != null ? Number(e.total_entitlement).toFixed(2) : '—'} />
                <Field label="Remaining" value={e.remaining_amount != null ? Number(e.remaining_amount).toFixed(2) : '—'} />
                <Field label="Effective From" value={e.effective_from ? formatDateForDisplay(e.effective_from) : '—'} />
                <Field label="Effective To" value={e.effective_to ? formatDateForDisplay(e.effective_to) : '—'} />
                <Field label="Activated" value={e.activated_at ? formatDateForDisplay(e.activated_at) : '—'} />
                <Field label="By" value={e.activated_by ?? '—'} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Instructions */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Payment Instructions</h3>
        {pays.length === 0 ? (
          <BnEmptyState type="empty" title="No payments"
            description="No payment instructions have been raised for this claim." />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-2 font-medium">Instruction #</th>
                  <th className="p-2 font-medium">Amount</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Due</th>
                  <th className="p-2 font-medium">Paid</th>
                  <th className="p-2 font-medium">Method</th>
                  <th className="p-2 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {pays.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2 font-mono">{String(p.id).slice(0, 8)}</td>
                    <td className="p-2">{p.currency ?? ''} {Number(p.amount ?? 0).toFixed(2)}</td>
                    <td className="p-2"><BnStatusBadge status={p.status} label={p.status} /></td>
                    <td className="p-2">{p.due_date ? formatDateForDisplay(p.due_date) : '—'}</td>
                    <td className="p-2">{p.paid_date ? formatDateForDisplay(p.paid_date) : '—'}</td>
                    <td className="p-2">{p.payment_method ?? '—'}</td>
                    <td className="p-2">{p.payment_reference ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};


// ─── Helpers ────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="font-medium text-foreground">{value}</div>
  </div>
);
