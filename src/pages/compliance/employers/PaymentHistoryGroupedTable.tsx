import { useMemo, useState, Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Eye } from 'lucide-react';

/**
 * Payment History (Employer 360)
 *
 * The upstream service returns one row per fund/sequence line
 * (`cn_payment`) plus posted ledger credits. Displaying those raw
 * rows makes a single cashier receipt look like N separate payments.
 *
 * This component collapses the lines into ONE row per payment
 * transaction (grouped by receipt / payment_id / ledger reference).
 * Users click "View Details" to expand the fund-level breakdown.
 */

interface RawRow {
  id: string;
  source: 'CASHIER' | 'LEDGER' | string;
  posted_at: string | null;
  period: string | null;
  fund_type: string | null;
  description: string | null;
  credit_amount: number;
  reference: string | null;
  status: string | null;
}

interface GroupedPayment {
  key: string;
  source: RawRow['source'];
  posted_at: string | null;
  reference: string | null;
  status: string | null;
  total: number;
  periods: Set<string>;
  lines: RawRow[];
}

const formatDate = (val: string | null) => {
  if (!val) return '—';
  try { return new Date(val).toLocaleDateString('en-GB'); } catch { return val; }
};

const formatCurrency = (amt: number | null) => {
  if (amt == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 2 }).format(amt);
};

// Derive the payment_id part from a cashier line id `P-<paymentId>-<seq>`
const cashierPaymentId = (id: string): string | null => {
  if (!id.startsWith('P-')) return null;
  const rest = id.slice(2);
  const lastDash = rest.lastIndexOf('-');
  return lastDash > 0 ? rest.slice(0, lastDash) : rest;
};

function groupPayments(rows: RawRow[]): GroupedPayment[] {
  const map = new Map<string, GroupedPayment>();
  for (const r of rows) {
    let key: string;
    if (r.source === 'CASHIER') {
      const pid = cashierPaymentId(r.id) ?? r.reference ?? r.id;
      key = `C::${pid}`;
    } else {
      // LEDGER rows: group by reference when present, otherwise treat as their own row.
      key = `L::${r.reference ?? r.id}`;
    }
    const existing = map.get(key);
    if (existing) {
      existing.total += Number(r.credit_amount) || 0;
      if (r.period) existing.periods.add(String(r.period));
      existing.lines.push(r);
      // Prefer the earliest posted_at as the transaction date.
      if (r.posted_at && (!existing.posted_at || r.posted_at < existing.posted_at)) {
        existing.posted_at = r.posted_at;
      }
    } else {
      map.set(key, {
        key,
        source: r.source,
        posted_at: r.posted_at,
        reference: r.reference,
        status: r.status,
        total: Number(r.credit_amount) || 0,
        periods: new Set(r.period ? [String(r.period)] : []),
        lines: [r],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const ta = a.posted_at ? new Date(a.posted_at).getTime() : 0;
    const tb = b.posted_at ? new Date(b.posted_at).getTime() : 0;
    return tb - ta;
  });
}

// Classify a line into a breakdown category based on description/entry_type text.
const categorize = (line: RawRow): string => {
  const s = `${line.description ?? ''}`.toLowerCase();
  if (s.includes('penalty')) return 'Penalty';
  if (s.includes('interest')) return 'Interest';
  if (s.includes('fee')) return 'Fees';
  if (s.includes('waiver')) return 'Waiver';
  if (s.includes('adjust')) return 'Adjustment';
  return 'Contribution';
};

export function PaymentHistoryGroupedTable({ rows }: { rows: RawRow[] }) {
  const grouped = useMemo(() => groupPayments(rows), [rows]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setExpanded((e) => ({ ...e, [key]: !e[key] }));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[32px]" />
          <TableHead>Date</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Periods</TableHead>
          <TableHead className="text-right">Total Amount</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {grouped.map((g) => {
          const isOpen = !!expanded[g.key];
          return (
            <Fragment key={g.key}>
              <TableRow className="hover:bg-muted/30">
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    aria-label={isOpen ? 'Collapse breakdown' : 'Expand breakdown'}
                    onClick={() => toggle(g.key)}
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </TableCell>
                <TableCell className="text-xs">{formatDate(g.posted_at)}</TableCell>
                <TableCell className="font-mono text-xs">{g.reference ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={g.source === 'CASHIER' ? 'default' : 'secondary'} className="text-[10px]">
                    {g.source}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {g.periods.size === 0 ? '—' : Array.from(g.periods).sort().join(', ')}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-green-600">
                  {formatCurrency(g.total)}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => toggle(g.key)}>
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    {isOpen ? 'Hide Details' : 'View Details'}
                  </Button>
                </TableCell>
              </TableRow>
              {isOpen && (
                <TableRow className="bg-muted/20">
                  <TableCell />
                  <TableCell colSpan={6} className="p-0">
                    <div className="p-3">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">
                        Payment Breakdown ({g.lines.length} line{g.lines.length === 1 ? '' : 's'})
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Category</TableHead>
                            <TableHead className="text-xs">Fund</TableHead>
                            <TableHead className="text-xs">Period</TableHead>
                            <TableHead className="text-xs">Description</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-right text-xs">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {g.lines.map((l) => (
                            <TableRow key={l.id}>
                              <TableCell className="text-xs">{categorize(l)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">{l.fund_type ?? '—'}</Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{l.period ?? '—'}</TableCell>
                              <TableCell className="text-xs max-w-md truncate">{l.description ?? '—'}</TableCell>
                              <TableCell className="text-xs">{l.status ?? '—'}</TableCell>
                              <TableCell className="text-right font-mono text-xs text-green-600">
                                {formatCurrency(Number(l.credit_amount) || 0)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default PaymentHistoryGroupedTable;
