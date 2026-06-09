/**
 * Phase 4: Communications & Payment Handoff Readiness
 *
 * For every ACTIVE bn_product_version, verifies:
 *  1. At least one bn_comm_mapping row exists for the key approval stages
 *     (SUBMITTED, AWARD_SETUP, PAYMENT_APPROVAL, REJECTED).
 *  2. Payable products (benefit_duration_type LONG_TERM or award_creation_rule
 *     AUTO) have a payment_workbasket_id AND at least one active bn_payment_method.
 *  3. Every bn_approval_policy row with audit_required=true belongs to a product
 *     that has a default_workbasket_id (so audit trail can resolve owner).
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Check = { label: string; ok: boolean; detail?: string };

export function HandoffReadinessCard() {
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState<Check[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: products }, { data: comms }, { data: methods }, { data: policies }] = await Promise.all([
          supabase.from('bn_product_version')
            .select('id, description, status, benefit_duration_type, award_creation_rule, payment_workbasket_id, default_workbasket_id')
            .eq('status', 'ACTIVE'),
          supabase.from('bn_comm_mapping').select('bn_product_version_id, event_code, active').eq('active', true),
          supabase.from('bn_payment_method').select('id, active').eq('active', true),
          supabase.from('bn_approval_policy').select('product_version_id, audit_required').eq('audit_required', true),
        ]);

        const prods = products ?? [];
        const commsBy = new Map<string, Set<string>>();
        (comms ?? []).forEach((c: any) => {
          if (!commsBy.has(c.bn_product_version_id)) commsBy.set(c.bn_product_version_id, new Set());
          commsBy.get(c.bn_product_version_id)!.add(c.event_code);
        });

        const REQUIRED_EVENTS = ['SUBMITTED', 'AWARD_SETUP', 'PAYMENT_APPROVAL', 'REJECTED'];
        const missingComms = prods.filter(p => {
          const set = commsBy.get(p.id) ?? new Set();
          return !REQUIRED_EVENTS.some(e => set.has(e));
        });

        const payable = prods.filter(p =>
          p.benefit_duration_type === 'LONG_TERM' || p.award_creation_rule === 'AUTO'
        );
        const missingPaymentWb = payable.filter(p => !p.payment_workbasket_id);
        const hasActiveMethod = (methods ?? []).length > 0;

        const auditProds = new Set((policies ?? []).map((p: any) => p.product_version_id).filter(Boolean));
        const missingAuditOwner = prods.filter(p => auditProds.has(p.id) && !p.default_workbasket_id);

        setChecks([
          {
            label: 'Approval-stage communications mapped',
            ok: missingComms.length === 0,
            detail: missingComms.length ? `${missingComms.length} product(s) missing comm mapping` : `${prods.length} product(s) covered`,
          },
          {
            label: 'Payable products have payment workbasket',
            ok: missingPaymentWb.length === 0,
            detail: missingPaymentWb.length ? `${missingPaymentWb.length} payable product(s) missing payment_workbasket_id` : `${payable.length} payable product(s) wired`,
          },
          {
            label: 'At least one active payment method',
            ok: hasActiveMethod,
            detail: hasActiveMethod ? `${methods!.length} active method(s)` : 'No active bn_payment_method rows',
          },
          {
            label: 'Audit-required policies resolve to an owner workbasket',
            ok: missingAuditOwner.length === 0,
            detail: missingAuditOwner.length ? `${missingAuditOwner.length} product(s) missing default_workbasket_id` : 'All audited products have owners',
          },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allOk = checks.every(c => c.ok);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Communications & Handoff Readiness</CardTitle>
          {!loading && (
            <Badge variant={allOk ? 'default' : 'destructive'}>
              {allOk ? 'Ready' : 'Action needed'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
          </div>
        ) : (
          <ul className="space-y-2">
            {checks.map(c => (
              <li key={c.label} className="flex items-start gap-2 text-sm">
                {c.ok
                  ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
                  : <AlertCircle className="h-4 w-4 mt-0.5 text-destructive" />}
                <div>
                  <div className="font-medium text-foreground">{c.label}</div>
                  {c.detail && <div className="text-xs text-muted-foreground">{c.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default HandoffReadinessCard;
