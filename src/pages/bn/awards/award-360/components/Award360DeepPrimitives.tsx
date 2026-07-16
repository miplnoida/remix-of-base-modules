/**
 * BN-AWARD360-B3D — Reusable read-only building blocks for deep tabs.
 */
import React from 'react';
import { AlertTriangle, Info, ShieldAlert, CheckCircle2, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type {
  Award360Warning,
  Award360ReadinessItem,
  Award360ReadinessState,
} from '../deepViewModels';

// ── Health grid ────────────────────────────────────────────────────────

export const Award360HealthGrid: React.FC<{
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'breach' | 'muted'; hint?: string }[];
  columns?: number;
}> = ({ items, columns = 3 }) => (
  <div
    className="grid gap-3"
    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
  >
    {items.map((it, i) => (
      <div key={i} className="rounded-md border bg-card p-3">
        <div className="text-xs text-muted-foreground">{it.label}</div>
        <div
          className={
            'mt-1 text-sm font-medium ' +
            (it.tone === 'breach'
              ? 'text-destructive'
              : it.tone === 'warn'
                ? 'text-yellow-700'
                : it.tone === 'muted'
                  ? 'text-muted-foreground'
                  : '')
          }
        >
          {it.value ?? '—'}
        </div>
        {it.hint ? <div className="mt-0.5 text-xs text-muted-foreground">{it.hint}</div> : null}
      </div>
    ))}
  </div>
);

// ── Warning list ──────────────────────────────────────────────────────

export const Award360WarningList: React.FC<{
  warnings: Award360Warning[];
  partialWarnings?: string[];
  emptyMessage?: string;
}> = ({ warnings, partialWarnings, emptyMessage }) => {
  if (!warnings?.length && !partialWarnings?.length) {
    return emptyMessage ? (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        {emptyMessage}
      </div>
    ) : null;
  }
  return (
    <div className="space-y-2">
      {warnings.map((w) => {
        const cls =
          w.severity === 'breach'
            ? 'border-destructive/60 bg-destructive/10'
            : w.severity === 'warn'
              ? 'border-yellow-500/60 bg-yellow-500/10'
              : 'border-muted-foreground/30 bg-muted/40';
        const Icon = w.severity === 'breach' ? ShieldAlert : w.severity === 'warn' ? AlertTriangle : Info;
        return (
          <div
            key={w.key}
            data-testid={`award360-warning-${w.key}`}
            className={`flex items-start gap-2 rounded-md border p-2 text-sm ${cls}`}
          >
            <Icon className="mt-0.5 h-4 w-4 flex-none" />
            <div>
              <div className="font-medium">{w.title}</div>
              {w.detail ? <div className="text-xs text-muted-foreground">{w.detail}</div> : null}
            </div>
          </div>
        );
      })}
      {partialWarnings && partialWarnings.length > 0 && (
        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/5 p-2 text-xs">
          <div className="font-medium">Some enrichment data could not be loaded</div>
          <ul className="mt-1 list-disc pl-4 text-muted-foreground">
            {partialWarnings.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ── Readiness badge / matrix ───────────────────────────────────────────

const readinessTone = (s: Award360ReadinessState) =>
  s === 'READY'
    ? 'bg-green-500/15 text-green-700 border-green-500/40'
    : s === 'PARTIAL'
      ? 'bg-yellow-500/15 text-yellow-700 border-yellow-500/40'
      : s === 'MISSING'
        ? 'bg-destructive/10 text-destructive border-destructive/40'
        : s === 'RESTRICTED'
          ? 'bg-muted text-muted-foreground border-muted-foreground/30'
          : 'bg-muted text-muted-foreground border-muted-foreground/30';

export const Award360ReadinessBadge: React.FC<{ state: Award360ReadinessState }> = ({ state }) => (
  <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${readinessTone(state)}`}>{state}</span>
);

export const Award360ReadinessMatrix: React.FC<{
  items: Award360ReadinessItem[];
}> = ({ items }) => (
  <div className="overflow-x-auto rounded-md border">
    <table className="w-full text-sm">
      <thead className="bg-muted/60 text-xs text-muted-foreground">
        <tr>
          <th className="px-3 py-2 text-left">Capability</th>
          <th className="px-3 py-2 text-left">State</th>
          <th className="px-3 py-2 text-left">Detail</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => (
          <tr key={it.key} data-testid={`readiness-${it.key}`} className="border-t">
            <td className="px-3 py-2 font-medium">{it.label}</td>
            <td className="px-3 py-2"><Award360ReadinessBadge state={it.state} /></td>
            <td className="px-3 py-2 text-xs text-muted-foreground">{it.explanation}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Related records ────────────────────────────────────────────────────

export const Award360RelatedRecords: React.FC<{
  title: string;
  items: { id: string; primary: string | null; secondary?: string | null; route?: string }[];
  emptyMessage?: string;
}> = ({ title, items, emptyMessage }) => (
  <div className="rounded-md border">
    <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium">{title}</div>
    {items.length === 0 ? (
      <div className="p-3 text-xs text-muted-foreground">{emptyMessage ?? 'No records.'}</div>
    ) : (
      <ul className="divide-y">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <div>
              <div className="font-medium">{it.primary ?? '—'}</div>
              {it.secondary ? <div className="text-xs text-muted-foreground">{it.secondary}</div> : null}
            </div>
            {it.route ? (
              <a
                className="text-xs underline"
                href={it.route}
                data-testid={`related-link-${it.id}`}
              >
                Open
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    )}
  </div>
);

// ── Timeline ────────────────────────────────────────────────────────────

export const Award360Timeline: React.FC<{
  events: {
    id: string;
    timestamp: string;
    kind: string;
    label: string;
    fromValue?: string | null;
    toValue?: string | null;
    actor?: string | null;
  }[];
}> = ({ events }) => {
  if (!events.length) {
    return <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">No timeline events.</div>;
  }
  return (
    <ol className="relative border-l pl-4">
      {events.map((e) => (
        <li key={e.id} className="mb-3">
          <span className="absolute -left-1.5 mt-1 inline-block h-3 w-3 rounded-full bg-muted-foreground/60" />
          <div className="text-xs text-muted-foreground">{e.timestamp}</div>
          <div className="text-sm font-medium">
            {e.label}
            <Badge variant="outline" className="ml-2 text-[10px]">{e.kind}</Badge>
          </div>
          {(e.fromValue || e.toValue) && (
            <div className="text-xs text-muted-foreground">
              {e.fromValue ?? '—'} → {e.toValue ?? '—'}
            </div>
          )}
          {e.actor ? <div className="text-xs text-muted-foreground">by {e.actor}</div> : null}
        </li>
      ))}
    </ol>
  );
};

// ── Restricted enrichment banner ────────────────────────────────────────

export const Award360RestrictedNotice: React.FC<{ message?: string }> = ({ message }) => (
  <div className="rounded-md border border-muted-foreground/30 bg-muted/40 p-3 text-xs text-muted-foreground">
    {message ?? 'Not available under current access.'}
  </div>
);
