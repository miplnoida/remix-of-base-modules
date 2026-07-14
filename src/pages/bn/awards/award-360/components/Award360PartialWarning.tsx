/**
 * BN-AWARD360-B1 — Partial enrichment warning banner.
 * Shown when base rows loaded but an enrichment lookup failed.
 */
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const Award360PartialWarning: React.FC<{ warnings: string[] }> = ({ warnings }) => {
  if (!warnings?.length) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-xs">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-yellow-700" />
      <div>
        <div className="font-medium">Some enrichment data is unavailable</div>
        <ul className="mt-1 list-disc pl-4 text-muted-foreground">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
