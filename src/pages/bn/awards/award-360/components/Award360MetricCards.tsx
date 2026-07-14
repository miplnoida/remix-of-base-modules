/**
 * BN-AWARD360-B1 — Award 360 metric card row.
 * Scoped to the Award 360 workspace only.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface Award360Metric {
  key: string;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'ok' | 'warn' | 'breach' | 'muted';
}

const toneCls: Record<NonNullable<Award360Metric['tone']>, string> = {
  default: '',
  ok: 'text-green-600',
  warn: 'text-yellow-600',
  breach: 'text-destructive',
  muted: 'text-muted-foreground',
};

export const Award360MetricCards: React.FC<{ metrics: Award360Metric[] }> = ({ metrics }) => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
    {metrics.map((m) => (
      <Card key={m.key}>
        <CardContent className="p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
          <div className={`mt-1 text-lg font-semibold tabular-nums ${toneCls[m.tone ?? 'default']}`}>
            {m.value ?? '—'}
          </div>
          {m.hint ? <div className="mt-0.5 text-[11px] text-muted-foreground">{m.hint}</div> : null}
        </CardContent>
      </Card>
    ))}
  </div>
);
