/**
 * Legacy Claim 360 (read-only)
 * ----------------------------
 * Rendered by `/bn/claims/:id` when the route id is a legacy synthetic id
 * of the form `legacy:CLAIMNUMBER:SEQ`. Loads normalized data through
 * `unifiedClaimService.getUnifiedClaim` and presents the same 10-section
 * Claim 360 layout — but without any action buttons or editable fields.
 *
 * Source: cl_head + cl_detail_* + cl_cheques + cl_track + cl_notification
 * via historicalInquiryAdapter (read-only). No writes possible.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Lock, FileText, User, Wallet, Clock, History, Database } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import { unifiedClaimService } from '@/services/bn/unifiedClaimService';

interface LegacyClaim360ViewProps {
  /** Legacy claim number (cl_head.claim_number). */
  claimNumber: string;
  /** Legacy claim sequence (cl_head.claim_seq). */
  claimSeq: number;
}

const LegacyBadge: React.FC = () => (
  <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1">
    <Lock className="h-3 w-3" /> Legacy (BEMA) — read only
  </Badge>
);

const SectionCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  title, icon, children,
}) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        {icon} {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm">{children}</CardContent>
  </Card>
);

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-medium">{value ?? '—'}</div>
  </div>
);

const fmtCurrency = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'XCD' }).format(n);

export const LegacyClaim360View: React.FC<LegacyClaim360ViewProps> = ({ claimNumber, claimSeq }) => {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['bn', 'unifiedClaim', 'legacy', claimNumber, claimSeq],
    queryFn: () =>
      unifiedClaimService.getUnifiedClaim({
        sourceClaimNumber: claimNumber,
        sourceClaimSeq: claimSeq,
        includeRelated: true,
      }),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading legacy claim…</div>;
  }
  if (error || !data) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Unable to load legacy claim <span className="font-mono">{claimNumber}-{claimSeq}</span>.
      </div>
    );
  }

  const c = data;
  const benefitDetails = c.benefitDetails || {};
  const audit = c.audit || {};

  return (
    <div className="space-y-4">
      {/* Page chrome */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="t-page-title">
              Claim {c.claimNumber}
              <span className="text-muted-foreground"> · seq {c.claimSeq}</span>
            </h1>
            <p className="text-xs text-muted-foreground">{c.resolution.reason}</p>
          </div>
        </div>
        <LegacyBadge />
      </div>

      {/* 1. Claim Header */}
      <SectionCard title="Claim Header" icon={<FileText className="h-4 w-4" />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Claim Number" value={<span className="font-mono">{c.claimNumber}</span>} />
          <Field label="Sequence" value={c.claimSeq} />
          <Field label="Benefit" value={`${c.benefitCode ?? '—'}${c.benefitName ? ` · ${c.benefitName}` : ''}`} />
          <Field label="Status" value={<Badge variant="outline">{c.status ?? '—'}</Badge>} />
          <Field label="Date Received" value={c.claimDate ? formatDateForDisplay(c.claimDate) : '—'} />
          <Field label="Period Start" value={(benefitDetails as any).date_period_start ? formatDateForDisplay((benefitDetails as any).date_period_start) : '—'} />
          <Field label="Period End" value={(benefitDetails as any).date_period_end ? formatDateForDisplay((benefitDetails as any).date_period_end) : '—'} />
          <Field label="Date Processed" value={audit.processedAt ? formatDateForDisplay(audit.processedAt) : '—'} />
        </div>
      </SectionCard>

      {/* 2. Claimant Details */}
      <SectionCard title="Claimant Details" icon={<User className="h-4 w-4" />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="SSN" value={<span className="font-mono">{c.ssn ?? '—'}</span>} />
          <Field label="Name" value={c.claimant.name} />
          <Field label="Claimant ID" value={c.claimant.id} />
        </div>
      </SectionCard>

      {/* 3. Benefit Details */}
      <SectionCard title="Benefit Details" icon={<FileText className="h-4 w-4" />}>
        {c.rawLegacyRef?.detailTable ? (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Source: <span className="font-mono">{c.rawLegacyRef.detailTable}</span>
            </div>
            {Object.keys(benefitDetails).length === 0 ? (
              <p className="text-muted-foreground">No detail row found.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(benefitDetails).slice(0, 24).map(([k, v]) => (
                  <Field key={k} label={k} value={String(v ?? '—')} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No benefit-specific detail table for this claim type.</p>
        )}
      </SectionCard>

      {/* 4. Eligibility / Contribution Evidence */}
      <SectionCard title="Eligibility / Contribution Evidence" icon={<FileText className="h-4 w-4" />}>
        <p className="text-muted-foreground">
          Legacy eligibility is not modeled separately — refer to wages credited in the Calculation section below.
        </p>
      </SectionCard>

      {/* 5. Calculation */}
      <SectionCard title="Calculation" icon={<FileText className="h-4 w-4" />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Benefit Amount" value={fmtCurrency((c.rawLegacyRef?.header as any)?.benefit_amount)} />
          <Field label="Adjustment" value={fmtCurrency((c.rawLegacyRef?.header as any)?.adjustment_amount)} />
          <Field label="Paid To Date" value={fmtCurrency((c.rawLegacyRef?.header as any)?.paid_to_date)} />
          <Field label="Account Credited" value={(c.rawLegacyRef?.header as any)?.account_credited} />
        </div>
      </SectionCard>

      {/* 6. Documents / Evidence — legacy DMS not exposed by adapter */}
      <SectionCard title="Documents / Evidence" icon={<FileText className="h-4 w-4" />}>
        <p className="text-muted-foreground">Legacy document store is not exposed in this view.</p>
      </SectionCard>

      {/* 7. Decision History (legacy: status + processed/verified audit fields) */}
      <SectionCard title="Decision History" icon={<History className="h-4 w-4" />}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Entered By" value={audit.enteredBy} />
          <Field label="Entered At" value={audit.enteredAt ? formatDateForDisplay(audit.enteredAt) : '—'} />
          <Field label="Verified By" value={audit.verifiedBy} />
          <Field label="Verified At" value={audit.verifiedAt ? formatDateForDisplay(audit.verifiedAt) : '—'} />
          <Field label="Processed By" value={audit.processedBy} />
          <Field label="Processed At" value={audit.processedAt ? formatDateForDisplay(audit.processedAt) : '—'} />
          <Field label="Modified By" value={audit.modifiedBy} />
          <Field label="Modified At" value={audit.modifiedAt ? formatDateForDisplay(audit.modifiedAt) : '—'} />
        </div>
      </SectionCard>

      {/* 8. Payment History */}
      <SectionCard title="Payment History" icon={<Wallet className="h-4 w-4" />}>
        {c.payments.length === 0 ? (
          <p className="text-muted-foreground">No cheques recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="py-2">Cheque #</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Bank Acct</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {c.payments.map((p, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 font-mono">{p.reference ?? '—'}</td>
                    <td>{p.date ? formatDateForDisplay(p.date) : '—'}</td>
                    <td>{fmtCurrency(p.amount)}</td>
                    <td className="font-mono">{p.bank_account ?? '—'}</td>
                    <td>
                      {p.voided ? (
                        <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">Voided</Badge>
                      ) : (
                        <Badge variant="outline">{p.status ?? 'Issued'}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* 9. Timeline */}
      <SectionCard title="Timeline" icon={<Clock className="h-4 w-4" />}>
        {c.timeline.length === 0 ? (
          <p className="text-muted-foreground">No timeline events.</p>
        ) : (
          <ol className="space-y-3">
            {c.timeline.map((e, i) => (
              <li key={i} className="flex gap-3">
                <div className="text-xs text-muted-foreground w-32 shrink-0 pt-0.5">
                  {e.event_date ? formatDateForDisplay(e.event_date) : '—'}
                </div>
                <div>
                  <div className="font-medium">{e.event_type}</div>
                  <div className="text-sm text-muted-foreground">{e.description}</div>
                  {e.actor && <div className="text-xs text-muted-foreground">by {e.actor}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      {/* 10. Source Metadata (optional technical panel) */}
      <SectionCard title="Source Metadata" icon={<Database className="h-4 w-4" />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Source System" value={c.sourceSystem} />
          <Field label="Routing Basis" value={c.resolution.routingBasis} />
          <Field label="Cutoff Date" value={c.resolution.cutoffDate ?? '—'} />
          <Field label="Mapping" value={c.resolution.mapping ? 'Linked' : 'Not mapped'} />
        </div>
        <Separator className="my-3" />
        <p className="text-xs text-muted-foreground">
          This claim is served from legacy BEMA tables (cl_head and family). It is read-only;
          actions are disabled. Reason: {c.resolution.reason}
        </p>
      </SectionCard>
    </div>
  );
};

export default LegacyClaim360View;
