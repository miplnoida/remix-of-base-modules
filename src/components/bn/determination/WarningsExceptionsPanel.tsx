import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Info, XCircle, ShieldAlert } from 'lucide-react';
import type { DeterminationWarning } from '@/services/bn/determinationService';

interface Props {
  warnings: DeterminationWarning[];
}

const severityConfig = {
  INFO: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800' },
  WARN: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800' },
  ERROR: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/5', border: 'border-destructive/20' },
  BLOCK: { icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
};

export const WarningsExceptionsPanel: React.FC<Props> = ({ warnings }) => {
  if (warnings.length === 0) return null;

  const sorted = [...warnings].sort((a, b) => {
    const order = { BLOCK: 0, ERROR: 1, WARN: 2, INFO: 3 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Warnings & Exceptions
          <span className="text-xs text-muted-foreground">({warnings.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((w, i) => {
          const cfg = severityConfig[w.severity];
          const Icon = cfg.icon;
          return (
            <div key={i} className={`rounded-md border p-3 ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-start gap-2">
                <Icon className={`h-4 w-4 mt-0.5 ${cfg.color}`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${cfg.color}`}>{w.message}</p>
                  {w.suggestedAction && (
                    <p className="text-xs text-muted-foreground mt-1">{w.suggestedAction}</p>
                  )}
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{w.source}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{w.code}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
