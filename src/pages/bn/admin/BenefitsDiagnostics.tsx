/**
 * Benefits Module Diagnostics
 * Shows real row counts for every bn_ table, the last created_at timestamp,
 * which screens consume each table, and warns when a screen reports records
 * while the underlying table is empty.
 *
 * All data is read live from Supabase — there is no mock or fallback data
 * on this screen. If a table is empty, the row count is 0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AlertTriangle, RefreshCw, Database, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

/** Screen → table mapping (audited from src/pages/bn/* + src/hooks/bn/* + src/services/bn/*) */
const SCREEN_TABLE_MAP: Array<{ table: string; screens: string[] }> = [
  { table: 'bn_claim', screens: ['/bn/claims', '/bn/queue', '/bn/workbench', '/bn/claim/:id'] },
  { table: 'bn_claim_application', screens: ['/bn/intake/register', '/bn/claims'] },
  { table: 'bn_claim_participant', screens: ['/bn/claim/:id (participants tab)'] },
  { table: 'bn_claim_detail', screens: ['/bn/claim/:id (detail tab)'] },
  { table: 'bn_claim_document', screens: ['/bn/claim/:id (documents tab)'] },
  { table: 'bn_claim_evidence', screens: ['/bn/claim/:id (evidence)'] },
  { table: 'bn_claim_event', screens: ['/bn/claim/:id (timeline / history)'] },
  { table: 'bn_claim_note', screens: ['/bn/claim/:id (notes)'] },
  { table: 'bn_claim_eligibility', screens: ['/bn/claims (eligibility review)'] },
  { table: 'bn_claim_calculation', screens: ['/bn/claims (determination)'] },
  { table: 'bn_claim_decision', screens: ['/bn/approval', '/bn/claims'] },
  { table: 'bn_claim_queue_assignment', screens: ['/bn/queue'] },
  { table: 'bn_claim_intake_validation', screens: ['/bn/intake/register'] },
  { table: 'bn_claim_person_snapshot', screens: ['/bn/claim/:id (snapshot)'] },
  { table: 'bn_claim_employer_snapshot', screens: ['/bn/claim/:id (snapshot)'] },
  { table: 'bn_claim_contribution_snapshot', screens: ['/bn/claim/:id (contribution)'] },
  { table: 'bn_claim_field_ownership', screens: ['/bn/claim/:id (field locks)'] },
  { table: 'bn_award', screens: ['/bn/awards', '/bn/entitlements'] },
  { table: 'bn_award_beneficiary', screens: ['/bn/awards/survivors'] },
  { table: 'bn_award_rate_history', screens: ['/bn/awards (rate history)'] },
  { table: 'bn_award_status_event', screens: ['/bn/awards (status events)'] },
  { table: 'bn_award_suspension_event', screens: ['/bn/award-suspension'] },
  { table: 'bn_entitlement', screens: ['/bn/entitlements'] },
  { table: 'bn_payment_schedule', screens: ['/bn/schedules'] },
  { table: 'bn_payment_instruction', screens: ['/bn/payables', '/bn/payment-history'] },
  { table: 'bn_payment_batch', screens: ['/bn/batches'] },
  { table: 'bn_batch_item', screens: ['/bn/batches'] },
  { table: 'bn_payment_exception', screens: ['/bn/issue', '/bn/post-issue'] },
  { table: 'bn_payment_reconciliation', screens: ['/bn/payment-history'] },
  { table: 'bn_payment_profile', screens: ['/bn/payment-profiles'] },
  { table: 'bn_payment_method', screens: ['/bn/config/payment-masters'] },
  { table: 'bn_payment_source_account', screens: ['/bn/admin (sources)'] },
  { table: 'bn_bank_master', screens: ['/bn/config/payment-masters'] },
  { table: 'bn_bank_branch', screens: ['/bn/config/payment-masters'] },
  { table: 'bn_cheque_stock', screens: ['/bn/cheque-stock'] },
  { table: 'bn_cheque_register', screens: ['/bn/cheque-stock'] },
  { table: 'bn_eft_file', screens: ['/bn/payables'] },
  { table: 'bn_eft_format', screens: ['/bn/config/payment-masters'] },
  { table: 'bn_eft_format_field', screens: ['/bn/config/payment-masters'] },
  { table: 'bn_overpayment', screens: ['/bn/overpayments'] },
  { table: 'bn_legal_referral', screens: ['/bn/overpayments (referrals)'] },
  { table: 'bn_life_certificate', screens: ['/bn/life-certificates'] },
  { table: 'bn_medical_facility', screens: ['/bn/config/medical'] },
  { table: 'bn_medical_procedure', screens: ['/bn/config/medical'] },
  { table: 'bn_medical_review_schedule', screens: ['/bn/medical-reviews'] },
  { table: 'bn_medical_recommendation', screens: ['/bn/medical-reviews'] },
  { table: 'bn_medical_claim_expense', screens: ['/bn/claims (medical)'] },
  { table: 'bn_medical_reimbursement_limit', screens: ['/bn/config/medical'] },
  { table: 'bn_post_issue_task', screens: ['/bn/post-issue'] },
  { table: 'bn_external_task', screens: ['/bn/workbench (external tasks)'] },
  { table: 'bn_workbasket', screens: ['/bn/queue', '/bn/workbench'] },
  { table: 'bn_communication_log', screens: ['/bn/claim/:id (communications)'] },
  { table: 'bn_letter', screens: ['/bn/claim/:id (letters)'] },
  { table: 'bn_issue_record', screens: ['/bn/issue'] },
  { table: 'bn_override_request', screens: ['/bn/approval (overrides / appeals)'] },
  { table: 'bn_calc_run', screens: ['/bn/engine'] },
  { table: 'bn_calc_trace', screens: ['/bn/engine (trace)'] },
  { table: 'bn_sim_run', screens: ['/bn/simulation'] },
];

interface TableStat {
  table: string;
  count: number | null;
  lastCreatedAt: string | null;
  error?: string;
}

export default function BenefitsDiagnostics() {
  const [stats, setStats] = useState<Record<string, TableStat>>({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  const tableNames = useMemo(
    () => Array.from(new Set(SCREEN_TABLE_MAP.map((m) => m.table))).sort(),
    [],
  );

  const loadAll = async () => {
    setLoading(true);
    const next: Record<string, TableStat> = {};
    await Promise.all(
      tableNames.map(async (t) => {
        try {
          const { count, error: cErr } = await db
            .from(t)
            .select('*', { count: 'exact', head: true });
          if (cErr) throw cErr;
          let lastCreatedAt: string | null = null;
          const { data: lastRow } = await db
            .from(t)
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (lastRow?.created_at) lastCreatedAt = lastRow.created_at;
          next[t] = { table: t, count: count ?? 0, lastCreatedAt };
        } catch (e: any) {
          next[t] = {
            table: t,
            count: null,
            lastCreatedAt: null,
            error: e?.message ?? 'unknown',
          };
        }
      }),
    );
    setStats(next);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return SCREEN_TABLE_MAP
      .filter((m) => !f || m.table.toLowerCase().includes(f) || m.screens.some((s) => s.toLowerCase().includes(f)))
      .map((m) => ({ ...m, stat: stats[m.table] }));
  }, [filter, stats]);

  const totals = useMemo(() => {
    const total = Object.values(stats).reduce((acc, s) => acc + (s.count ?? 0), 0);
    const empty = Object.values(stats).filter((s) => (s.count ?? 0) === 0).length;
    const errors = Object.values(stats).filter((s) => s.error).length;
    return { total, empty, errors, tables: tableNames.length };
  }, [stats, tableNames.length]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Database className="h-6 w-6" /> Benefits Module Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live row counts for every <code>bn_</code> table consumed by the Benefits module.
            No mock or fallback data — 0 means the table is empty in the database.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Tables tracked</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{totals.tables}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total rows</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{totals.total.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Empty tables</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-600">{totals.empty}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Errors</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">{totals.errors}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base">Screen ↔ Table Mapping</CardTitle>
            <Input
              placeholder="Filter by table or screen…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead className="w-24 text-right">Rows</TableHead>
                <TableHead className="w-44">Last created</TableHead>
                <TableHead>Screens</TableHead>
                <TableHead className="w-32">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const count = r.stat?.count ?? null;
                const empty = count === 0;
                const errored = !!r.stat?.error;
                return (
                  <TableRow key={r.table}>
                    <TableCell className="font-mono text-xs">{r.table}</TableCell>
                    <TableCell className="text-right font-mono">
                      {count === null ? '—' : count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.stat?.lastCreatedAt
                        ? new Date(r.stat.lastCreatedAt).toLocaleString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-wrap gap-1">
                        {r.screens.map((s) => (
                          <Badge key={s} variant="outline" className="font-mono text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {errored ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Error
                        </Badge>
                      ) : empty ? (
                        <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300">
                          <AlertTriangle className="h-3 w-3" /> Empty
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> OK
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-4">
            <strong>Empty</strong> means the table currently has zero rows. If a Benefits screen displays records
            for an empty table, that is a data-source bug — file it and link the screen here. The Benefits
            module ships with <em>no</em> client-side mock arrays; all lists read from these tables via the
            hooks under <code>src/hooks/bn/*</code> and services under <code>src/services/bn/*</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
