/**
 * BN-AWARD360-B1 — Restricted-state panel shown when the user lacks the
 * canonical view permission for a tab. No data query is issued.
 */
import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const Award360PermissionState: React.FC<{ moduleLabel: string; permissionKey?: string }> = ({
  moduleLabel,
  permissionKey,
}) => (
  <div
    role="alert"
    data-testid="award360-restricted"
    className="flex items-start gap-3 rounded-md border border-yellow-500/60 bg-yellow-500/10 p-4"
  >
    <ShieldAlert className="mt-0.5 h-5 w-5 flex-none text-yellow-700" />
    <div>
      <div className="text-sm font-medium">{moduleLabel} is restricted</div>
      <div className="text-xs text-muted-foreground">
        Your current effective roles do not grant the canonical view permission
        {permissionKey ? ` (${permissionKey})` : ''}. Data is not queried on this tab.
      </div>
    </div>
  </div>
);
