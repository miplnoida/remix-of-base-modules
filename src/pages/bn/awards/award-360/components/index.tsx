import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateForDisplay } from '@/lib/format-config';
import type { AlertSeverity } from '../viewModels';

export const dt = (v?: string | null) => (v ? formatDateForDisplay(v) : '—');

export const AwardMoney: React.FC<{ value: number | null | undefined; currency?: string | null }> = ({
  value,
  currency,
}) => {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const s = currency && currency !== 'XCD' ? `${currency} ${Number(value).toFixed(2)}` : formatCurrency(Number(value));
  return <span className="tabular-nums">{s}</span>;
};

export const AwardStatusBadge: React.FC<{ status: string | null | undefined; tone?: 'default' | 'warn' | 'breach' }> = ({
  status,
  tone,
}) => {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const variant = tone === 'breach' ? 'destructive' : tone === 'warn' ? 'secondary' : 'default';
  return <Badge variant={variant as any}>{status}</Badge>;
};

export const AwardHealthIndicator: React.FC<{ label: string; state: 'ok' | 'warn' | 'breach' | 'muted'; hint?: string }> = ({
  label,
  state,
  hint,
}) => {
  const dot =
    state === 'breach'
      ? 'bg-destructive'
      : state === 'warn'
        ? 'bg-yellow-500'
        : state === 'ok'
          ? 'bg-green-500'
          : 'bg-muted';
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
      <span className="text-muted-foreground">{label}</span>
      {hint ? <span className="font-medium">{hint}</span> : null}
    </div>
  );
};

export const AwardAlertCard: React.FC<{
  severity: AlertSeverity;
  title: string;
  detail: string;
  onOpen?: () => void;
}> = ({ severity, title, detail, onOpen }) => {
  const Icon = severity === 'breach' ? AlertTriangle : severity === 'warn' ? AlertTriangle : Info;
  const cls =
    severity === 'breach'
      ? 'border-destructive/60 bg-destructive/10 text-destructive-foreground'
      : severity === 'warn'
        ? 'border-yellow-500/60 bg-yellow-500/10'
        : 'border-muted-foreground/30 bg-muted/40';
  return (
    <div className={`flex items-start gap-3 rounded-md border p-3 ${cls}`}>
      <Icon className="mt-0.5 h-4 w-4 flex-none" />
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
      {onOpen ? (
        <Button size="sm" variant="outline" onClick={onOpen}>
          View
        </Button>
      ) : null}
    </div>
  );
};

export const TabEmptyState: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <div className="rounded-md border border-dashed p-8 text-center">
    <div className="text-sm font-medium">{title}</div>
    {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
  </div>
);

export const TabErrorState: React.FC<{ error: unknown; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-6 text-center">
    <div className="text-sm font-medium text-destructive">Failed to load this tab</div>
    <div className="mt-1 text-xs text-muted-foreground">{(error as any)?.message ?? String(error)}</div>
    {onRetry ? (
      <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
        Retry
      </Button>
    ) : null}
  </div>
);

export const TabLoading: React.FC = () => (
  <div className="space-y-3 p-4">
    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
    <div className="h-24 animate-pulse rounded bg-muted" />
    <div className="h-24 animate-pulse rounded bg-muted" />
  </div>
);

export const KV: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-2 gap-2 py-1 text-sm">
    <div className="text-muted-foreground">{label}</div>
    <div className="font-medium">{value ?? '—'}</div>
  </div>
);
